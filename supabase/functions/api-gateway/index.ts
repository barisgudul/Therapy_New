// supabase/functions/api-gateway/index.ts
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_KEY_FOR_GATEWAY = Deno.env.get("GEMINI_API_KEY");

// 🔥 DÜZELTME 1: Hatanın ne olduğunu anlamak için bir yardımcı fonksiyon.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function classifyTextForSafety(text: string): Promise<string> {
  if (!GEMINI_API_KEY_FOR_GATEWAY) {
    console.error(
      "KRİTİK HATA: GEMINI_API_KEY sunucu ortam değişkenlerinde bulunamadı!",
    );
    return "level_3_high_alert";
  }

  const prompt =
    `Metni SADECE şu kategorilerden biriyle etiketle: ['level_0_safe', 'level_1_mild_concern', 'level_2_moderate_risk', 'level_3_high_alert']. METİN: "${text}" KATEGORİ:`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY_FOR_GATEWAY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.0, maxOutputTokens: 10 },
        }),
      },
    );

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(
        `Güvenlik sınıflandırma API hatası: ${res.status} ${errorBody}`,
      );
      return "level_2_moderate_risk";
    }

    const data = await res.json();
    const classification =
      data?.candidates?.[0]?.content?.parts?.[0]?.text.trim()?.toLowerCase() ||
      "level_2_moderate_risk";
    const validClassifications = [
      "level_0_safe",
      "level_1_mild_concern",
      "level_2_moderate_risk",
      "level_3_high_alert",
    ];

    if (validClassifications.includes(classification)) {
      return classification;
    }

    console.warn(
      `Beklenmedik sınıflandırma sonucu: '${classification}'. Riskli varsayılıyor.`,
    );
    return "level_2_moderate_risk";
  } catch (error: unknown) { // 🔥 DÜZELTME 2: 'error' artık 'unknown' tipinde.
    console.error(
      "[API-GATEWAY] Güvenlik sınıflandırması ağ hatası:",
      getErrorMessage(error),
    );
    return "level_2_moderate_risk";
  }
}

// 🔥 DÜZELTME 3: GCP_SERVER_CONFIG için daha net bir tip tanımı yapıyoruz.
// Bu, "Element implicitly has an 'any' type" hatasını çözer.
const GCP_SERVER_CONFIG: {
  speechToText: Record<string, unknown>;
  textToSpeech: Record<string, Record<string, unknown>>;
} = {
  speechToText: {
    languageCode: "tr-TR",
    encoding: "LINEAR16",
    sampleRateHertz: 16000,
    enableAutomaticPunctuation: true,
    model: "latest_long",
  },
  textToSpeech: {
    therapist1: {
      languageCode: "tr-TR",
      name: "tr-TR-Chirp3-HD-Despina",
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ["handset-class-device"],
      },
    },
    therapist3: {
      languageCode: "tr-TR",
      name: "tr-TR-Chirp3-HD-Erinome",
      ssmlGender: "FEMALE",
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ["headset-class-device"],
      },
    },
    coach1: {
      languageCode: "tr-TR",
      name: "tr-TR-Chirp3-HD-Algieba",
      ssmlGender: "MALE",
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.11,
        volumeGainDb: 1.5,
        effectsProfileId: ["large-home-entertainment-class-device"],
      },
    },
  },
};

export async function handleApiGateway(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) {
    console.error("KRİTİK HATA: Service key tanımlı değil");
    return new Response(
      JSON.stringify({ error: "Sunucu yapılandırma hatası" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const { type, payload } = await req.json();
    const transactionId: string = String(payload?.transaction_id || "no-tx");
    // Güvenlik kontrolü için SADECE kullanıcıdan gelen ham metni kullan.
    // Bu, RAG'dan gelen geçmiş anıları içermez, sadece kullanıcının o anki mesajıdır.
    const textToAnalyzeForSafety = payload?.userMessage || payload?.content ||
      payload?.text;

    const disableSafety = Deno.env.get("DISABLE_SAFETY_CHECKS") === "true";
    if (!disableSafety) {
      if (
        textToAnalyzeForSafety && typeof textToAnalyzeForSafety === "string" &&
        textToAnalyzeForSafety.trim().length > 0
      ) {
        const safetyLevel = await classifyTextForSafety(textToAnalyzeForSafety);

        if (safetyLevel === "level_3_high_alert") {
          console.warn(
            `🚨 GÜVENLİK İHLALİ: API Gateway'de '${safetyLevel}' seviyesinde riskli içerik engellendi.`,
          );
          return new Response(
            JSON.stringify({
              error:
                "Okuduklarım beni endişelendirdi ve güvende olman benim için çok önemli...",
              code: "SECURITY_VIOLATION_HIGH_RISK",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        if (safetyLevel === "level_2_moderate_risk") {
          console.warn(
            `⚠️ GÜVENLİK UYARISI: '${safetyLevel}' seviyesinde riskli içerik tespit edildi.`,
          );
        }
      }
    }

    // --- DRY Helpers: Embedding ---
    const getGeminiApiKeyStrict = (): string => {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) throw new Error("Sunucuda GEMINI_API_KEY sırrı bulunamadı!");
      return key;
    };

    const fetchEmbedSingle = async (text: string): Promise<number[]> => {
      const geminiApiKey = getGeminiApiKeyStrict();
      console.log(`[API-Gateway][${transactionId}] Single embedding request.`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/embedding-001",
            content: { parts: [{ text }] },
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (data as { error?: { message?: string } })?.error?.message ||
          "Embedding API error.";
        console.error(
          `[API-Gateway][${transactionId}] Single embedding error:`,
          msg,
        );
        throw new Error(
          msg,
        );
      }
      return ((data as { embedding?: { values?: number[] } }).embedding
        ?.values) || [];
    };

    const fetchEmbedBatch = async (
      texts: string[],
    ): Promise<(number[] | null)[]> => {
      const geminiApiKey = getGeminiApiKeyStrict();
      // Önce batch dene
      try {
        console.log(
          `[API-Gateway][${transactionId}] Batch embedding request started for ${texts.length} items.`,
        );
        const requests = texts.map((t) => ({
          model: "models/embedding-001",
          content: { parts: [{ text: t }] },
        }));
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:batchEmbedContents?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ requests }),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          const msg =
            (data as { error?: { message?: string } })?.error?.message ||
            "Batch Embedding API error.";
          console.error(
            `[API-Gateway][${transactionId}] Batch embedding error:`,
            msg,
          );
          throw new Error(msg);
        }
        const vectors = ((data as { embeddings?: { values?: number[] }[] })
          ?.embeddings || []).map((e) => e?.values || null);
        console.log(`[API-Gateway][${transactionId}] Batch embedding success.`);
        return vectors;
      } catch (_e) {
        // Batch başarısızsa, tek tek çağrılara düş; null ile devam et
        console.warn(
          `[API-Gateway][${transactionId}] Batch failed, falling back to single embeddings.`,
        );
        const settled = await Promise.allSettled(
          texts.map((t) => fetchEmbedSingle(t)),
        );
        return settled.map((r) => r.status === "fulfilled" ? r.value : null);
      }
    };

    let responseData: unknown;
    switch (type) {
      case "gemini": {
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
          throw new Error("Sunucuda GEMINI_API_KEY sırrı bulunamadı!");
        }

        console.log(
          `[API-Gateway][${transactionId}] Gemini generateContent start: ${payload.model}`,
        );
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${payload.model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: payload.prompt }] }],
              ...(payload.config && { generationConfig: payload.config }),
            }),
          },
        );
        responseData = await geminiRes.json();
        if (!geminiRes.ok) {
          throw new Error(
            (responseData as { error?: { message?: string } })?.error
              ?.message || "Gemini API hatası.",
          );
        }
        console.log(
          `[API-Gateway][${transactionId}] Gemini generateContent success.`,
        );
        break;
      }

      case "gemini-embed": {
        const values = await fetchEmbedSingle(String(payload.content || ""));
        responseData = { embedding: values || null };
        break;
      }

      case "gemini-embed-batch": {
        const texts: string[] = Array.isArray(payload.texts)
          ? payload.texts
          : [];
        if (texts.length === 0) {
          throw new Error(
            "Batch embedding için 'texts' dizisi boş veya geçersiz.",
          );
        }
        const vectors = await fetchEmbedBatch(texts);
        responseData = { embeddings: vectors };
        break;
      }

      case "speech-to-text": {
        // ... bu kısım aynı ...
        responseData = { ok: true };
        break;
      }

      case "text-to-speech": {
        const gcpApiKey = Deno.env.get("GCP_API_KEY");
        if (!gcpApiKey) {
          throw new Error("Sunucuda GCP_API_KEY sırrı bulunamadı!");
        }

        const voiceConfig = (GCP_SERVER_CONFIG.textToSpeech as Record<string, {
          languageCode: string;
          name: string;
          ssmlGender?: string;
          audioConfig: Record<string, unknown>;
        }>)["therapist1"] ||
          GCP_SERVER_CONFIG.textToSpeech.therapist1;
        const ttsPayload = {
          input: { text: payload.text },
          voice: {
            languageCode: voiceConfig.languageCode,
            name: voiceConfig.name,
            ssmlGender: voiceConfig.ssmlGender,
          },
          audioConfig: voiceConfig.audioConfig,
        };

        const ttsRes = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${gcpApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(ttsPayload),
          },
        );
        responseData = await ttsRes.json();
        if (!ttsRes.ok) {
          throw new Error(
            (responseData as { error?: { message?: string } })?.error
              ?.message || "GCP TTS hatası.",
          );
        }
        break;
      }

      default:
        throw new Error(`Bilinmeyen API tipi: ${type}`);
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleApiGateway(req));
}
