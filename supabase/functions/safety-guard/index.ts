// supabase/functions/safety-guard/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getCrisisPayload } from "../_shared/crisis-resources.ts";
import { config } from "../_shared/config.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

// Hata mesajını çıkar
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// Güvenlik sınıflandırıcı model adaylarını sırayla dener; başarısız olursa SAFE'e düşer
async function classifyTextForSafety(text: string): Promise<string> {
  if (!GEMINI_API_KEY) {
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
      config.AI_MODELS.CLASSIFIER,
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
      let versionSucceeded = false;
      for (const apiVersion of apiVersions) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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
          versionSucceeded = true;
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

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { text, language } = body;

    if (typeof text !== "string") {
      return new Response(
        JSON.stringify({ error: '"text" field must be a string.' }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Güvenlik sınıflandırması yap
    const safetyLevel = await classifyTextForSafety(text);

    // level_3_high_alert: AI sohbetine devam etmek yerine ŞEFKATLİ yönlendirme +
    // gerçek acil yardım kaynakları döndür (dile özel, tamamlanmış mesaj).
    if (safetyLevel === "level_3_high_alert") {
      console.warn(
        `🚨 KRİZ: Safety Guard'da '${safetyLevel}' tespit edildi, kullanıcı kriz kaynaklarına yönlendiriliyor.`,
      );
      return new Response(
        JSON.stringify(getCrisisPayload(language)),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // level_2_moderate_risk durumunda uyarı logla ama geç
    if (safetyLevel === "level_2_moderate_risk") {
      console.warn(
        `⚠️ GÜVENLİK UYARISI: '${safetyLevel}' seviyesinde riskli içerik tespit edildi.`,
      );
    }

    // İçerik güvenliyse, başarılı bir yanıt döndür
    return new Response(
      JSON.stringify({ safe: true, safetyLevel }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in Safety Guard:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
