// supabase/functions/_shared/ai.service.ts

import { supabase } from "./supabase-admin.ts"; // Admin client'ı buradan alacağız
import { ApiError } from "./errors.ts";
import { VaultData } from "./types/context.ts"; // VaultData tipini import et

// Bu fonksiyonu bu dosyanın içine taşıdık.
export async function invokeGemini(
  prompt: string,
  model: string,
  config?: {
    temperature?: number;
    responseMimeType?: string;
    maxOutputTokens?: number;
  },
  transactionId?: string,
  userMessage?: string, // YENİ PARAMETRE: Kullanıcının orijinal mesajı
): Promise<string> {
  try {
    const start = Date.now();
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "gemini",
        payload: {
          model,
          prompt,
          config,
          transaction_id: transactionId,
          userMessage: userMessage, // YENİ ALAN: Güvenlik kontrolü için
        },
      },
    });

    if (error) throw error;

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("API Gateway'den boş Gemini yanıtı alındı.");
    const durationMs = Date.now() - start;
    // JSON geçerliliğini opsiyonel olarak kontrol et (yalnızca application/json istendiyse)
    let isValidJson: boolean | null = null;
    if (config?.responseMimeType === "application/json") {
      try {
        JSON.parse(reply);
        isValidJson = true;
      } catch (_e) {
        isValidJson = false;
      }
    }
    // AI interaction'ı kaydet (artık await kullanıyoruz)
    try {
      await supabase.from("ai_interactions").insert({
        transaction_id: transactionId ?? null,
        model,
        prompt,
        response: reply,
        is_valid_json: isValidJson,
        duration_ms: durationMs,
      });
    } catch (logError) {
      // Loglama hatası ana işlemi etkilemesin
      console.warn("[invokeGemini] Loglama hatası:", logError);
    }

    return reply;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[invokeGemini] Hatası:", msg);
    throw new ApiError("AI servisi şu anda kullanılamıyor.");
  }
}

// Sözleşme: AI'dan beklediğimiz paket tipi
// Sözleşme: AI'dan beklediğimiz YENİ ve AKILLI paket tipi
export interface ElegantReportPayload {
  // Artık tek bir markdown yok. Her parçanın kendi kimliği var.
  reportSections: {
    mainTitle: string; // Ana Başlık
    overview: string; // Genel Bakış
    goldenThread: string; // Altın İplik
    blindSpot: string; // Kör Nokta
  };
  // Metafor: Kelimelerin ötesine geçmek için.
  reportAnalogy: {
    title: string; // Metafor Başlığı
    text: string; // Metaforun açıklaması
  };
  // Türetilmiş veri (keywords kaldırıldı)
  derivedData: {
    readMinutes: number;
    headingsCount: number;
  };
}

// Tahmin öğesi tipi (kullanımda sadece title ve description alanları okunuyor)
export interface Prediction {
  title: string;
  description: string;
}

// Rapor tarafında kullanılan işlenmiş hafıza tipi
export interface ProcessedMemory {
  content: string;
  sentiment_data: { dominant_emotion?: string; [key: string]: unknown };
  event_time: string;
}

// Paket üreten raporlayıcı
export async function generateElegantReport(
  vault: VaultData,
  memories: ProcessedMemory[],
  days: number,
  predictions?: Prediction[],
): Promise<ElegantReportPayload> {
  const formattedMemories = memories.length > 0
    ? memories.map((m) => {
      const sentiment = m.sentiment_data?.dominant_emotion || "belirsiz";
      return `- ${
        new Date(m.event_time).toLocaleDateString("tr-TR")
      }: [${sentiment}] "${String(m.content).substring(0, 150)}..."`;
    }).join("\n")
    : "- Bu dönemde öne çıkan bir anı kaydedilmemiş.";

  const userName = vault?.profile?.nickname ?? null;
  const userContextLine = userName
    ? `KULLANICI BİLGİSİ: İsmi ${userName}.`
    : "";
  const goalLine = vault?.profile?.therapyGoals
    ? `KULLANICININ HEDEFİ: ${String(vault.profile.therapyGoals)}`
    : "";

  const predictionsBlock = (predictions && predictions.length > 0)
    ? `\n### GEÇMİŞ TAHMİNLER (Son ${days} Gün) ###\n` +
      predictions.map((p) => `- ${p.title}: ${p.description}`).join("\n")
    : "";

  const prompt = `
  ROL: Sen, bilge ve empatik bir "Zihin Arkeoloğu"sun. Bir robot gibi değil, bir yol arkadaşı gibi konuş.

  GÖREV: Sana verilen yapısal verilerden yola çıkarak, Zihin Panosu için TEK BİR JSON objesi üret.

  SAĞLANAN VERİLER:

  ### KULLANICI PROFİLİ (VAULT) ###
  Bu, kullanıcının kim olduğunun özeti.
  ${userContextLine}
  ${goalLine}
  Temel İnançları: ${JSON.stringify(vault.coreBeliefs || {})}

  ### EN ALAKALI ANILAR (Son ${days} Gün) ###
  Bunlar, kullanıcının zihninde son zamanlarda yer etmiş önemli anlar.
  ${formattedMemories}

  ${predictionsBlock}

  İSTENEN JSON ÇIKTI YAPISI (KESİNLİKLE UYULMALIDIR):
  {
    "reportSections": {
      "mainTitle": "Bu dönemin en vurucu ve özet başlığını YAZ.",
      "overview": "2-3 cümlelik, dönemin ana temasını (Vault ve Anılardan yola çıkarak) özetleyen bir giriş paragrafı YAZ.",
      "goldenThread": "Anılar arasındaki ana neden-sonuç ilişkisini anlatan 2 paragraflık bir analiz YAZ. 'Günlük Kayıtların Analizi' bölümü bu olacak.",
      "blindSpot": "'Fark ettin mi?' ile başlayan ve görmediği bir kalıbı (Vault ve Anıları birleştirerek) ortaya çıkaran 1 paragraflık bölümü YAZ."
    },
    "reportAnalogy": {
      "title": "Tüm analizi özetleyen bir metafor veya analoji başlığı YAZ. Örn: 'Pusulasını Arayan Kaptan'.",
      "text": "Bu metaforu 1-2 cümleyle açıkla."
    },
    "derivedData": { "readMinutes": 2, "headingsCount": 4 }
  }

  KURALLAR:
  - **EN ÖNEMLİ KURAL: Tüm metni doğrudan ikinci tekil şahıs ('sen') kullanarak yaz. Ona kendisinden üçüncü bir şahıs gibi ASLA bahsetme.**
  - Eğer ismini biliyorsan ('Ahmet'), cümlenin başına bir kere ismiyle hitap et, sonra 'sen' diye devam et.
  - Cevabın SADECE yukarıdaki JSON formatında olsun. Başka hiçbir şey ekleme.
  - Markdown kullanMA. Vurgu için **kelime** formatını KULLANABİLİRSİN.
  - Emoji YOK. Liste YOK.
  `;

  const responseText = await invokeGemini(prompt, "gemini-1.5-pro", {
    responseMimeType: "application/json",
    temperature: 0.7,
  });

  try {
    const parsed = JSON.parse(responseText) as ElegantReportPayload;
    if (parsed && parsed.reportSections && parsed.reportAnalogy) {
      return parsed;
    }
  } catch (e) {
    console.error("AI'dan dönen JSON parse edilemedi:", e, responseText);
  }

  // Güvenli fallback
  return {
    reportSections: {
      mainTitle: "Analiz Başarısız Oldu",
      overview: "Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
      goldenThread: "",
      blindSpot: "",
    },
    reportAnalogy: { title: "Veri Akışı Kesintisi", text: "Sinyal alınamadı." },
    derivedData: { readMinutes: 1, headingsCount: 1 },
  };
}

// Embedding helper - API Gateway üstünden Gemini Embedding çağrısı
export type EmbedContentResponse = {
  embedding: number[] | null;
  error?: string;
};
export async function embedContent(
  content: string,
): Promise<EmbedContentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "gemini-embed",
        payload: { content },
      },
    });
    if (error) throw error;
    return data as EmbedContentResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[embedContent] Hatası:", msg);
    return { embedding: null, error: msg } as EmbedContentResponse;
  }
}

// Batch embedding helper - Tek ağ çağrısında birden fazla metni embed eder
export type BatchEmbedContentsResponse = {
  embeddings: (number[] | null)[];
  error?: string;
};
export async function embedContentsBatch(
  texts: string[],
  transactionId?: string,
): Promise<BatchEmbedContentsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("api-gateway", {
      body: {
        type: "gemini-embed-batch",
        payload: { texts, transaction_id: transactionId },
      },
    });
    if (error) throw error;
    const embeddings = (data?.embeddings as (number[] | null)[]) || [];
    return { embeddings } as BatchEmbedContentsResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[embedContentsBatch] Hatası:", msg);
    return { embeddings: [], error: msg } as BatchEmbedContentsResponse;
  }
}
