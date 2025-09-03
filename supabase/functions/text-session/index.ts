// supabase/functions/text-session/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as AiService from "../_shared/ai.service.ts";
import * as RagService from "../_shared/rag.service.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { config } from "../_shared/config.ts";
// RAG_CONFIG için geriye uyumluluk - artık config.RAG_PARAMS.DEFAULT kullanıyoruz

// Loglama fonksiyonu
async function logAiDecision(logData: {
  transactionId: string;
  userId: string;
  intent: string;
  ragQuery: string;
  ragResults: unknown[];
  finalPrompt: string;
  finalResponse: string;
  executionTimeMs: number;
  success: boolean;
}) {
  const { error } = await adminClient.from("ai_logs").insert({
    transaction_id: logData.transactionId,
    user_id: logData.userId,
    intent: logData.intent,
    rag_query: logData.ragQuery,
    rag_results: logData.ragResults,
    final_prompt: logData.finalPrompt,
    final_response: logData.finalResponse,
    execution_time_ms: logData.executionTimeMs,
    success: logData.success,
  });

  if (error) {
    console.error("AI log insert hatası:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const transactionId = crypto.randomUUID();

  try {
    // === GÜVENLİK DUVARLARI ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header eksik. Kullanıcı giriş yapmamış.");
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      jwt,
    );

    if (authError || !user) {
      throw new Error("Kullanıcı doğrulanamadı veya JWT geçersiz.");
    }
    const userId = user.id; // İŞTE GÜVENLİ userId BUDUR!

    // Client'tan gelen body'den userId'yi okumayı SİL.
    const { messages, pendingSessionId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Geçersiz mesaj formatı");
    }

    // === YENİ: SICAK BAŞLANGIÇ KONTROLÜ ===
    // Frontend'den messages: [] (boş dizi) gelirse, bu sıcak başlangıçtır
    const isWarmStartAttempt = Array.isArray(messages) && messages.length === 0;

    // userMessage'ı sadece sıcak başlangıç değilse tanımla
    let userMessage: string;
    if (!isWarmStartAttempt) {
      if (messages.length === 0) {
        throw new Error("Devam eden sohbet için mesaj gerekli");
      }
      userMessage = messages[messages.length - 1].text;
    }

    if (pendingSessionId && isWarmStartAttempt) {
      // 1. Geçici hafızayı veritabanından çek ve SİL.
      const { data: pendingData, error: fetchError } = await adminClient
        .from("pending_text_sessions")
        .delete() // Çektiğimiz anda siliyoruz ki tekrar kullanılmasın.
        .match({ id: pendingSessionId, user_id: userId })
        .select("context_data")
        .single();

      if (fetchError || !pendingData) {
        throw new Error("Geçici oturum bulunamadı veya süresi doldu.");
      }

      const context = pendingData.context_data as {
        originalNote: string;
        aiReflection: string;
        theme: string;
      };

      // 2. "Sıcak Başlangıç" için ÖZEL bir prompt oluştur.
      const warmStartPrompt = `
        SENİN ROLÜN: Sen, az önce bir kullanıcıya günlük yansıması yapmış bir zihin aynasısın. Şimdi o yansıma üzerinden sohbete devam edeceksin.

        BAĞLAM (KULLANICI BUNU BİLMİYOR, SEN BİLİYORSUN):
        - Kullanıcının Günlüğü: "${context.originalNote}"
        - Senin Az Önceki Yansıtman: "${context.aiReflection}"
        - Ana Tema: "${context.theme}"

        GÖREVİN: Sohbete BAŞLAT. Kullanıcıya "Sohbet Et" butonuna bastığı için bir karşılama mesajı yaz. Mesajın, yukarıdaki bağlamı bildiğini hissettirsin ama "kayıtlara göre" gibi robotik olmasın. Doğal bir geçiş yap.

        ÖRNEK CEVAPLAR:
        - "Az önceki yansımamızda bahsettiğin o proje ve başarı hissine biraz daha yakından bakalım mı? Bu dinginlik hissini neye borçlusun sence?"
        - "Yansımanı paylaştığın için teşekkürler. O 'sakinlik' anı üzerine biraz daha konuşmak istersen buradayım. Seni bu noktaya getiren neydi?"

        Şimdi, bu kurallara göre sohbeti başlatan ilk cümleni kur:
      `;

      // 3. AI'ı bu özel prompt ile çağır ve ilk mesajı al.

      const firstAiMessage = await AiService.invokeGemini(
        warmStartPrompt,
        config.AI_MODELS.RESPONSE,
        { temperature: 0.7 },
      );

      // 4. Bu ilk mesajı, sanki normal bir sohbetin ilk mesajıymış gibi ön yüze döndür.
      return new Response(
        JSON.stringify({ aiResponse: firstAiMessage, usedMemory: null }), // İlk mesajda RAG hafızası yok.
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // === SICAK BAŞLANGIÇ KONTROLÜ SONU ===

    // === ADIM 2.1: NİYET TESPİTİ ===
    const intentPrompt =
      `Bu mesajın niyetini şu kategorilerden biriyle etiketle: [Greeting, Question, DeepThought, Farewell, Trivial]. Cevabın SADECE JSON formatında olsun. Örnek: {"intent": "Question"}. Mesaj: "${userMessage!}"`;

    const rawIntent = await AiService.invokeGemini(
      intentPrompt,
      config.AI_MODELS.INTENT,
      { responseMimeType: "application/json" },
    );

    // === GRANİT GİBİ HATA YÖNETİMİ ===
    let intent: string;
    try {
      const parsedIntent = JSON.parse(rawIntent);
      intent = parsedIntent.intent;

      // Intent değerini doğrula
      const validIntents = new Set([
        "Greeting",
        "Question",
        "DeepThought",
        "Farewell",
        "Trivial",
      ]);
      if (!validIntents.has(intent)) {
        console.warn(
          `Bilinmeyen niyet: ${intent}. Varsayılan olarak Trivial kabul ediliyor.`,
        );
        intent = "Trivial"; // RAG'e gitmesin
      }
    } catch (parseError) {
      console.error(
        "Intent JSON parse hatası:",
        parseError,
        "Raw response:",
        rawIntent,
      );
      intent = "Trivial"; // Hata durumunda varsayılan
    }

    let retrievedMemories: { content: string; source_layer: string }[] = [];
    let isFarewell = false; // Veda durumunu takip etmek için bir bayrak

    if (intent === "Farewell") {
      isFarewell = true;
      // Veda mesajı için RAG'e gitmeye gerek yok.
    } else if (intent === "DeepThought" || intent === "Question") {
      // --- HİPOTEZ ÜRETEN SORGULAMA (HyDE) ADIMI ---
      // 1. Varsayımsal bir doküman üretmesi için AI'ı görevlendir.
      const hydePrompt =
        `Kullanıcının şu cümlesini oku: "${userMessage!}". Bu cümlenin detaylı bir cevabı olabilecek, hafıza veritabanında arama yapmak için kullanılabilecek, ideal bir anı metni oluştur. Bu metin, cümlenin arkasındaki ana temayı, duyguyu ve konuyu içersin. Cevabın SADECE bu üretilen metin olsun.`;

      // 2. Hızlı ve ucuz bir modelle bu varsayımsal metni (gelişmiş sorguyu) üret.
      const enhancedQuery = await AiService.invokeGemini(
        hydePrompt,
        config.AI_MODELS.INTENT, // Yine hızlı olanı kullan
        { temperature: 0.3 }, // Yaratıcılık değil, tutarlılık lazım
      );

      // --- HyDE ADIMI BİTTİ ---

      // 3. RAG servisini, kullanıcının ham mesajıyla değil, bu yeni ürettiğimiz zeki sorguyla çağır!
      retrievedMemories = await RagService.retrieveContext(
        userId,
        enhancedQuery, // BURASI DEĞİŞTİ!
        {
          threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
          count: config.RAG_PARAMS.DEFAULT.COUNT,
        },
      );
    }
    // Greeting ve Trivial için de RAG'e gitmiyoruz, bu mantık zaten doğru.

    // === ADIM 2.2: ZİNCİRLEME PROMPT MÜHENDİSLİĞİ ===
    const hasRelevantMemory = retrievedMemories.length > 0;

    const pastContext = hasRelevantMemory
      ? retrievedMemories.map((m: { content: string }) => `- ${m.content}`)
        .join("\n")
      : "Yok";

    const shortTermMemory = messages.slice(0, -1).map((
      m: { sender: string; text: string },
    ) => `${m.sender === "user" ? "Danışan" : "Sen"}: ${m.text}`).join("\n");

    // ANA PROMPT'U OLUŞTUR
    const masterPrompt = `
SENİN KARAKTERİN: Sen doğal, akıcı ve hafızası olan bir sohbet arkadaşısın. Amacın terapi yapmak veya analiz sunmak DEĞİL, sadece iyi bir sohbet etmek. Bazen derin, bazen yüzeysel, tamamen sohbetin akışına göre...

ELİNDEKİ GİZLİ BİLGİLER (BUNLARI KULLANICIYA ASLA 'İŞTE BİLGİLER' DİYE SUNMA):
${hasRelevantMemory ? `1.  GEÇMİŞTEN ALAKALI BİR NOT: ${pastContext}` : ""}
2.  SON KONUŞULANLAR: ${shortTermMemory || "Bu sohbetin başlangıcı."}
3.  KULLANICININ SON SÖZÜ: "${userMessage!}"

GÖREVİN:
1.  Kullanıcının son sözüne DOĞRUDAN ve DOĞAL bir cevap ver.
2.  Cevabını oluştururken, elindeki GİZLİ BİLGİLERİ bir ilham kaynağı olarak kullan.
    -   **ÖNEMLİ KURAL:** Eğer GEÇMİŞTEN NOTLAR anlamsızsa (sadece bir selamlama gibi) veya kullanıcının son sözüyle tamamen alakasızsa, O NOTLARI **TAMAMEN GÖRMEZDEN GEL** ve sadece sohbete odaklan.
    -   Eğer kullanıcı "projemle uğraşıyorum" derse ve GEÇMİŞ NOTLARDA "iş stresi" varsa, cevabın "Umarım projen iyi gidiyordur, stresli bir şeye benzemiyor" gibi, o bilgiyi hissettiren ama söylemeyen bir cevap olabilir.
    -   Eğer kullanıcı "canım sıkkın" derse ve SON KONUŞULANLARDA "gözlükçü olayı" varsa, cevabın "Hala o gözlükçü olayına mı canın sıkkın yoksa başka bir şey mi var?" olabilir.
3.  **KIRMIZI ÇİZGİ (EN ÖNEMLİ KURAL):** Sen bir yapay zekasın. Kendi kişisel anıların, deneyimlerin veya geçmişin YOK. ASLA "ben de...", "benim de başıma gelmişti...", "bir keresinde ben de..." gibi ifadeler kullanarak yaşanmışlık iddia ETME. Empati kurmak için, "Bunun ne kadar zorlayıcı olduğunu hayal edebiliyorum," veya "Bu konuda yalnız olmadığını bilmek önemli," gibi ifadeler kullan. Konu hakkında bilgin varsa paylaş, ama deneyimin varmış gibi davranma. BU KURALI ASLA ÇİĞNEME.
4.  ASLA YAPMA: "Geçmiş kayıtlarına baktığımda...", "Hatırlanan Anı:", "Analizime göre..." gibi robotik ifadeler kullanma. Bildiklerini, normal bir insanın arkadaşını hatırlaması gibi, sohbetin içine doğal bir şekilde doku.
5.  Sohbeti her zaman canlı tut. Soru sor, merak et, konuyu değiştir ama asla "Kendine iyi bak" gibi sohbeti bitiren cümleler kurma.
6.  SOHBETİN RİTMİNİ KORU: Cevapların kullanıcıyı bunaltmamalı. Bir yorum yap, sonra sohbeti devam ettirmek için genellikle tek ve açık uçlu bir soru sor. Bazen, sadece bir gözlemde bulunup kullanıcının tepki vermesini beklemek de güçlü bir yöntemdir. Her mesajın bir sorgulama olmak zorunda değil. Kullanıcıya düşünmesi ve nefes alması için alan bırak.

7.  **PAPAĞAN OLMA (KESİNLİKLE UYULMASI GEREKEN KURAL):** Kullanıcının son cümlesini alıp basitçe tekrar etme. "Canım sıkkın dediğini anlıyorum, neden canın sıkkın?" gibi tembel cevaplar VERME. Elindeki GİZLİ BİLGİLERİ ve sohbetin genel akışını kullanarak DAHA DERİN bir soru sor veya bir BAĞLANTI kur. Kullanıcı "işteki hatalardan" bahsediyorsa, "Bu hatalar sana yetersiz mi hissettiriyor?" gibi bir soru sor. Yüzeysel kalma, bir katman derine in.

Şimdi, bu kurallara göre, sanki her şeyi doğal olarak hatırlıyormuş gibi cevap ver:

${
      isFarewell
        ? "ÖNEMLİ NOT: Kullanıcı sohbete veda ediyor. 'Sohbeti canlı tut' kuralını BU SEFERLİK görmezden gel. Ona iyi dileklerde bulun ve sohbeti nazikçe sonlandır. ASLA yeni bir soru sorma."
        : ""
    }`;

    const aiResponseText = await AiService.invokeGemini(
      masterPrompt,
      config.AI_MODELS.RESPONSE,
      { temperature: 0.8 },
    );
    const usedMemory = retrievedMemories.length > 0
      ? retrievedMemories[0]
      : null;

    // === ADIM 3.1: LOGLAMA ===
    const executionTime = Date.now() - startTime;
    try {
      await logAiDecision({
        transactionId,
        userId,
        intent,
        ragQuery: userMessage!,
        ragResults: retrievedMemories,
        finalPrompt: masterPrompt.substring(
          0,
          config.PROMPT_LIMITS.MAX_PROMPT_LENGTH,
        ),
        finalResponse: aiResponseText.substring(
          0,
          config.PROMPT_LIMITS.MAX_RESPONSE_LENGTH,
        ),
        executionTimeMs: executionTime,
        success: true,
      });
    } catch (logError) {
      console.error("Loglama hatası:", logError);
      // Loglama hatası ana işlemi etkilemesin
    }

    // Son olarak, bu sonucu client'a geri döndür.
    return new Response(
      JSON.stringify({ aiResponse: aiResponseText, usedMemory }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    const executionTime = Date.now() - startTime;

    // Hata durumunda da loglama yap
    try {
      await logAiDecision({
        transactionId,
        userId: "unknown",
        intent: "error",
        ragQuery: "",
        ragResults: [],
        finalPrompt: "",
        finalResponse: "",
        executionTimeMs: executionTime,
        success: false,
      });
    } catch (logError) {
      console.error("Hata loglama hatası:", logError);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
