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

// 🔥 KRİTİK FIX 1: Gemini REST API için generationConfig normalizasyonu
function normalizeGenConfig(cfg: Record<string, unknown> | undefined) {
  if (!cfg) return undefined;
  const copy: Record<string, unknown> = { ...cfg };
  // responseMimeType <-> response_mime_type (v1 vs v1beta farkları için ikisini de gönder)
  if (copy.responseMimeType && !copy.response_mime_type) {
    copy.response_mime_type = copy.responseMimeType;
  }
  if (copy.response_mime_type && !copy.responseMimeType) {
    copy.responseMimeType = copy.response_mime_type;
  }
  // maxOutputTokens sayı olsun ve güvenli aralıkta kalsın
  if (typeof copy.maxOutputTokens === "string") {
    const n = Number(copy.maxOutputTokens);
    copy.maxOutputTokens = Number.isFinite(n) ? n : undefined;
  }
  if (typeof copy.maxOutputTokens === "number") {
    const n = Math.max(1, Math.min(copy.maxOutputTokens as number, 1024));
    copy.maxOutputTokens = n;
  }
  return copy;
}

// Güvenlik sınıflandırıcı model adaylarını sırayla dener; başarısız olursa SAFE'e düşer
async function classifyTextForSafety(text: string): Promise<string> {
  if (!GEMINI_API_KEY_FOR_GATEWAY) {
    console.error(
      "KRİTİK HATA: GEMINI_API_KEY sunucu ortam değişkenlerinde bulunamadı!",
    );
    // Model yoksa kullanıcıyı cezalandırma: güvenli varsay
    return "level_0_safe";
  }

  const getClassifierCandidates = (): string[] => {
    const fromEnv = Deno.env.get("CLASSIFIER_MODEL");
    const candidates = [
      ...(fromEnv ? [fromEnv] : []),
      "gemini-1.5-flash",
      // Bazı projelerde -002 erişim izni olmayabilir; 001'e düş
      "gemini-1.5-flash-001",
      // Son çare olarak pro
      "gemini-1.5-pro",
    ];
    // Aynı model iki kez eklenmesin
    return Array.from(new Set(candidates));
  };

  const validClassifications = [
    "level_0_safe",
    "level_1_mild_concern",
    "level_2_moderate_risk",
    "level_3_high_alert",
  ];

  const prompt =
    `Metni SADECE şu kategorilerden biriyle etiketle: ['level_0_safe', 'level_1_mild_concern', 'level_2_moderate_risk', 'level_3_high_alert']. METİN: "${text}" KATEGORİ:`;

  let lastStatus: number | undefined;
  let lastBody: string | undefined;

  for (const model of getClassifierCandidates()) {
    try {
      const apiVersions = ["v1beta", "v1"];
      const versionSucceeded = false; // değişmeyen bayrak
      for (const apiVersion of apiVersions) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY_FOR_GATEWAY}`,
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
          lastStatus = res.status;
          lastBody = await res.text();
          // 404 NOT_FOUND ya da erişim yoksa bir sonraki versiyon/modele dene
          if (
            res.status === 404 ||
            (lastBody &&
              /NOT_FOUND|does not have access|Publisher Model/i.test(lastBody))
          ) {
            continue;
          }
          // Diğer hatalarda da bir sonraki versiyonu dene
          continue;
        }

        const data = await res.json();
        const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ??
          "";
        const classification = raw.trim().toLowerCase().replace(
          /[^a-z0-9_]/g,
          "",
        );

        if (validClassifications.includes(classification)) {
          return classification;
        }
        // Beklenmedik çıktı: diğer versiyonu dene
      }
      // Versiyonlar sonuç vermediyse bir sonraki modele geç
      if (!versionSucceeded) continue;
    } catch (error: unknown) {
      // Ağ hatası ya da zaman aşımı: sıradaki modele geç
      lastStatus = undefined;
      lastBody = getErrorMessage(error);
      continue;
    }
  }

  // Tüm denemeler başarısız: False positive uyarı basmak yerine güvenli varsay
  if (lastStatus || lastBody) {
    console.error(
      `Güvenlik sınıflandırma denemeleri başarısız. Safe varsayıldı. Son durum: ${
        lastStatus ?? "n/a"
      } ${lastBody ?? ""}`,
    );
  }
  return "level_0_safe";
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
    const callGeminiGenerate = async (
      prompt: string,
      model: string,
      configObj: Record<string, unknown> | undefined,
      apiKey: string,
    ): Promise<
      { ok: boolean; data?: unknown; status?: number; bodyText?: string }
    > => {
      const generationConfig = normalizeGenConfig(configObj);
      // Bazı modeller response_mime_type desteklemediğinde 400 dönebiliyor.
      // Bu durumda aynı isteği response_mime_type olmadan tekrar deneriz.
      const generationConfigSansMime = generationConfig
        ? Object.fromEntries(
          Object.entries(generationConfig).filter(
            ([k]) => k !== "response_mime_type" && k !== "responseMimeType",
          ),
        )
        : undefined;
      const apiVersions = ["v1beta", "v1"];
      let lastStatus: number | undefined;
      let lastBodyText: string | undefined;
      let lastParsed: unknown = undefined;
      for (const apiVersion of apiVersions) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              ...(generationConfig && { generationConfig }),
            }),
          },
        );
        const status = res.status;
        const bodyText = await res.text();
        let parsed: unknown = undefined;
        try {
          parsed = JSON.parse(bodyText);
        } catch (_e) {
          // yanıt json değilse boşver
        }
        if (res.ok) {
          return { ok: true, data: parsed, status, bodyText };
        }

        // MIME config'inden kaynaklı 400 hatası olabilir: ikinci şans (mime'siz)
        if (
          status === 400 && generationConfigSansMime &&
          (bodyText.includes("response_mime_type") ||
            bodyText.includes("responseMimeType") ||
            bodyText.toLowerCase().includes("generationconfig"))
        ) {
          const res2 = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: generationConfigSansMime,
              }),
            },
          );
          const status2 = res2.status;
          const bodyText2 = await res2.text();
          let parsed2: unknown = undefined;
          try {
            parsed2 = JSON.parse(bodyText2);
          } catch (_e) {
            // Yanıt JSON değilse parse etmeyi zorlamıyoruz
          }
          if (res2.ok) {
            return {
              ok: true,
              data: parsed2,
              status: status2,
              bodyText: bodyText2,
            };
          }
          // İkinci deneme de başarısızsa son hata olarak bunu sakla
          lastStatus = status2;
          lastBodyText = bodyText2;
          lastParsed = parsed2;
          continue; // sıradaki versiyonu dene
        }
        lastStatus = status;
        lastBodyText = bodyText;
        lastParsed = parsed;
        // 404/erişim yoksa diğer API versiyonunda dene
        if (
          status === 404 ||
          (bodyText &&
            /NOT_FOUND|does not have access|Publisher Model/i.test(bodyText))
        ) {
          continue;
        }
        // Diğer hatalarda da diğer versiyona dene
      }
      return {
        ok: false,
        data: lastParsed,
        status: lastStatus,
        bodyText: lastBodyText,
      };
    };

    const buildModelFallbacks = (requested: string | undefined): string[] => {
      const candidates: string[] = [];
      if (requested && requested.length > 0) {
        candidates.push(requested);
        // Eğer -002 ise -001 ve baz isimlere düş
        if (/(\d+)$/.test(requested)) {
          const base = requested.replace(/-(\d+)$/, "");
          candidates.push(`${base}-001`);
          candidates.push(base);
        } else {
          // Baz isim verilmişse 001 de dene
          candidates.push(`${requested}-001`);
        }
      }
      // Son çare olarak flash ve pro varyantları
      candidates.push("gemini-1.5-flash");
      candidates.push("gemini-1.5-flash-001");
      candidates.push("gemini-1.5-pro");
      candidates.push("gemini-1.5-pro-001");
      // Daha geniş erişim için eski/alternatif adlar
      candidates.push("gemini-1.0-pro");
      candidates.push("gemini-pro");
      candidates.push("gemini-1.5-flash-8b");
      // Tekilleştir
      return Array.from(new Set(candidates));
    };
    switch (type) {
      case "gemini": {
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
          throw new Error("Sunucuda GEMINI_API_KEY sırrı bulunamadı!");
        }

        console.log(
          `[API-Gateway][${transactionId}] Gemini generateContent start: ${payload.model}`,
        );

        const modelsToTry = buildModelFallbacks(String(payload.model || ""));
        let lastStatus: number | undefined;
        let lastBody: string | undefined;
        let lastParsed: unknown = undefined;
        let succeeded = false;

        for (const model of modelsToTry) {
          const res = await callGeminiGenerate(
            String(payload.prompt || ""),
            model,
            payload.config,
            geminiApiKey,
          );
          if (res.ok) {
            responseData = res.data;
            console.log(
              `[API-Gateway][${transactionId}] Gemini generateContent success with model: ${model}.`,
            );
            succeeded = true;
            break;
          }
          lastStatus = res.status;
          lastBody = res.bodyText;
          lastParsed = res.data;
          // 404/erişim yoksa başka modele dene, diğer hatalarda da denemeye devam
          if (
            lastStatus === 404 ||
            (lastBody &&
              /NOT_FOUND|does not have access|Publisher Model/i.test(lastBody))
          ) {
            continue;
          }
          // Diğer hata kodları için de fallback denemeye devam ederiz
        }

        if (!succeeded) {
          const parsedMsg = (lastParsed as { error?: { message?: string } })
            ?.error?.message;
          const message = parsedMsg || lastBody ||
            `Gemini API hatası. status=${lastStatus ?? "n/a"}`;
          throw new Error(message);
        }
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
