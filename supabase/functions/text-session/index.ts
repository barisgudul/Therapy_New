// supabase/functions/text-session/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import * as AiService from "../_shared/ai.service.ts";
import * as RagService from "../_shared/rag.service.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { AI_MODELS, PROMPT_LIMITS, RAG_CONFIG } from "../_shared/config.ts";

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
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Geçersiz mesaj formatı");
    }

    const userMessage = messages[messages.length - 1].text;

    // === ADIM 2.1: NİYET TESPİTİ ===
    const intentPrompt =
      `Bu mesajın niyetini şu kategorilerden biriyle etiketle: [Greeting, Question, DeepThought, Farewell, Trivial]. Cevabın SADECE JSON formatında olsun. Örnek: {"intent": "Question"}. Mesaj: "${userMessage}"`;

    const rawIntent = await AiService.invokeGemini(
      intentPrompt,
      AI_MODELS.INTENT,
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
      console.log(
        `[RAG] Niyet "${intent}" olarak tespit edildi, HyDE sorgusu üretiliyor...`,
      );

      // --- HİPOTEZ ÜRETEN SORGULAMA (HyDE) ADIMI ---
      // 1. Varsayımsal bir doküman üretmesi için AI'ı görevlendir.
      const hydePrompt =
        `Kullanıcının şu cümlesini oku: "${userMessage}". Bu cümlenin detaylı bir cevabı olabilecek, hafıza veritabanında arama yapmak için kullanılabilecek, ideal bir anı metni oluştur. Bu metin, cümlenin arkasındaki ana temayı, duyguyu ve konuyu içersin. Cevabın SADECE bu üretilen metin olsun.`;

      // 2. Hızlı ve ucuz bir modelle bu varsayımsal metni (gelişmiş sorguyu) üret.
      const enhancedQuery = await AiService.invokeGemini(
        hydePrompt,
        AI_MODELS.INTENT, // Yine hızlı olanı kullan
        { temperature: 0.3 }, // Yaratıcılık değil, tutarlılık lazım
      );

      console.log(
        `[HyDE] Orijinal: "${userMessage}" -> Gelişmiş Sorgu: "${
          enhancedQuery.substring(0, 100)
        }..."`,
      );
      // --- HyDE ADIMI BİTTİ ---

      // 3. RAG servisini, kullanıcının ham mesajıyla değil, bu yeni ürettiğimiz zeki sorguyla çağır!
      retrievedMemories = await RagService.retrieveContext(
        userId,
        enhancedQuery, // BURASI DEĞİŞTİ!
        { threshold: RAG_CONFIG.THRESHOLD, count: RAG_CONFIG.COUNT },
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
3.  KULLANICININ SON SÖZÜ: "${userMessage}"

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

Şimdi, bu kurallara göre, sanki her şeyi doğal olarak hatırlıyormuş gibi cevap ver:

${
      isFarewell
        ? "ÖNEMLİ NOT: Kullanıcı sohbete veda ediyor. 'Sohbeti canlı tut' kuralını BU SEFERLİK görmezden gel. Ona iyi dileklerde bulun ve sohbeti nazikçe sonlandır. ASLA yeni bir soru sorma."
        : ""
    }`;

    const aiResponseText = await AiService.invokeGemini(
      masterPrompt,
      AI_MODELS.RESPONSE,
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
        ragQuery: userMessage,
        ragResults: retrievedMemories,
        finalPrompt: masterPrompt.substring(0, PROMPT_LIMITS.MAX_PROMPT_LENGTH),
        finalResponse: aiResponseText.substring(
          0,
          PROMPT_LIMITS.MAX_RESPONSE_LENGTH,
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
