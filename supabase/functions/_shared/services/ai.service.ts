// supabase/functions/_shared/services/ai.service.ts

import { ApiError } from "../errors.ts";
import { VaultData } from "../types/context.ts"; // VaultData tipini import et
import { config, LLM_LIMITS } from "../config.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Bu fonksiyonu bu dosyanın içine taşıdık.
export async function invokeGemini(
    supabase: SupabaseClient,
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
        // Güvenlik tavanı: hiçbir çağrı 1024 token'ı aşamasın
        const safeConfig = config
            ? {
                ...config,
                maxOutputTokens: Math.min(config.maxOutputTokens ?? 256, 1024),
            }
            : { maxOutputTokens: 256 };

        const start = Date.now();
        const { data, error } = await supabase.functions.invoke("api-gateway", {
            body: {
                type: "gemini",
                payload: {
                    model,
                    prompt,
                    config: safeConfig,
                    transaction_id: transactionId,
                    userMessage: userMessage, // YENİ ALAN: Güvenlik kontrolü için
                },
            },
        });

        if (error) throw error;

        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!reply) {
            throw new Error("API Gateway'den boş Gemini yanıtı alındı.");
        }
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
        console.error("[invokeGemini] Orijinal hata:", err);
        throw new ApiError(`AI servisi hatası: ${msg}`);
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
    dependencies: { supabase: SupabaseClient },
    vault: VaultData,
    memories: ProcessedMemory[],
    days: number,
    predictions?: Prediction[],
    language?: string,
): Promise<ElegantReportPayload> {
    const lang = ["tr", "en", "de"].includes(String(language))
        ? String(language)
        : "en";

    // Dil kaynakları
    const L = {
        tr: {
            locale: "tr-TR",
            unknownSentiment: "belirsiz",
            noMemories: "- Bu dönemde öne çıkan bir anı kaydedilmemiş.",
            userContext: (name: string) => `KULLANICI BİLGİSİ: İsmi ${name}.`,
            goalLine: (goal: string) => `KULLANICININ HEDEFİ: ${goal}`,
            coreBeliefsLabel: "Temel İnançları",
            predictionsHeading: (d: number) =>
                `### GEÇMİŞ TAHMİNLER (Son ${d} Gün) ###`,
            blindSpotPrefix: "Fark ettin mi?",
            fallback: {
                title: "Analiz Başarısız Oldu",
                overview:
                    "Rapor oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
                analogyTitle: "Veri Akışı Kesintisi",
                analogyText: "Sinyal alınamadı.",
            },
        },
        en: {
            locale: "en-US",
            unknownSentiment: "unknown",
            noMemories: "- No standout memory was recorded in this period.",
            userContext: (name: string) => `USER INFO: Name is ${name}.`,
            goalLine: (goal: string) => `USER GOAL: ${goal}`,
            coreBeliefsLabel: "Core Beliefs",
            predictionsHeading: (d: number) =>
                `### PAST PREDICTIONS (Last ${d} Days) ###`,
            blindSpotPrefix: "Did you notice?",
            fallback: {
                title: "Analysis Failed",
                overview:
                    "An error occurred while creating the report. Please try again.",
                analogyTitle: "Signal Drop",
                analogyText: "No signal could be captured.",
            },
        },
        de: {
            locale: "de-DE",
            unknownSentiment: "unbekannt",
            noMemories:
                "- In diesem Zeitraum wurde keine herausragende Erinnerung aufgezeichnet.",
            userContext: (name: string) => `NUTZERINFO: Name ist ${name}.`,
            goalLine: (goal: string) => `NUTZERZIEL: ${goal}`,
            coreBeliefsLabel: "Kernüberzeugungen",
            predictionsHeading: (d: number) =>
                `### VERGANGENE PROGNOSE (Letzte ${d} Tage) ###`,
            blindSpotPrefix: "Ist dir aufgefallen?",
            fallback: {
                title: "Analyse fehlgeschlagen",
                overview:
                    "Beim Erstellen des Berichts ist ein Fehler aufgetreten. Bitte versuche es erneut.",
                analogyTitle: "Signalverlust",
                analogyText: "Kein Signal empfangen.",
            },
        },
    } as const;
    const I = L[lang as keyof typeof L];

    const formattedMemories = memories.length > 0
        ? memories.map((m) => {
            const sentiment = m.sentiment_data?.dominant_emotion ||
                I.unknownSentiment;
            return `- ${
                new Date(m.event_time).toLocaleDateString(I.locale)
            }: [${sentiment}] "${String(m.content).substring(0, 150)}..."`;
        }).join("\n")
        : I.noMemories;

    const userName = vault?.profile?.nickname ?? null;
    const userContextLine = userName ? I.userContext(userName) : "";
    const goalLine = vault?.profile?.therapyGoals
        ? I.goalLine(String(vault.profile.therapyGoals))
        : "";

    const predictionsBlock = (predictions && predictions.length > 0)
        ? `\n${I.predictionsHeading(days)}\n` +
            predictions.map((p) => `- ${p.title}: ${p.description}`).join("\n")
        : "";

    // Çok dilli prompt şablonları
    type PromptArgs = {
        days: number;
        userContextLine: string;
        goalLine: string;
        coreBeliefsLabel: string;
        formattedMemories: string;
        predictionsBlock: string;
        blindSpotPrefix: string;
    };

    const PROMPTS: Record<string, (a: PromptArgs) => string> = {
        tr: (
            {
                days,
                userContextLine,
                goalLine,
                coreBeliefsLabel,
                formattedMemories,
                predictionsBlock,
                blindSpotPrefix,
            },
        ) => `
GÖREV: Aşağıdaki verilerden yola çıkarak Zihin Panosu için TEK BİR JSON nesnesi üret. Bir robot gibi değil, yol arkadaşı gibi ve doğrudan ikinci tekil şahıs ("sen") ile konuş.

SAĞLANAN VERİLER:

### KULLANICI PROFİLİ (VAULT) ###
${userContextLine}
${goalLine}
${coreBeliefsLabel}: ${JSON.stringify(vault.coreBeliefs || {})}

### EN ALAKALI ANILAR (Son ${days} Gün) ###
${formattedMemories}

${predictionsBlock}

İSTENEN JSON ÇIKTI YAPISI (KESİN):
{
  "reportSections": {
    "mainTitle": "Bu dönemi özetleyen vurucu bir başlık YAZ.",
    "overview": "Vault ve anılardan yola çıkarak 2-3 cümlede ana temayı ÖZETLE.",
    "goldenThread": "Anılar arasındaki neden-sonuç ilişkisini 2 paragrafta ANLAT.",
    "blindSpot": "'${blindSpotPrefix}' ile başlayan ve gözden kaçan bir kalıbı gösteren 1 paragraf YAZ."
  },
  "reportAnalogy": {
    "title": "Analizi tek metaforda ÖZETLEYEN bir başlık YAZ.",
    "text": "Bu metaforu 1-2 cümlede AÇIKLA."
  },
  "derivedData": { "readMinutes": 2, "headingsCount": 4 }
}

KURALLAR:
- Sadece GEÇERLİ JSON üret, ek açıklama yazma.
- Tamamen Türkçe yaz ve "sen" diye hitap et.
- Emoji ve Markdown KULLANMA.
`.trim(),

        en: (
            {
                days,
                userContextLine,
                goalLine,
                coreBeliefsLabel,
                formattedMemories,
                predictionsBlock,
                blindSpotPrefix,
            },
        ) => `
TASK: From the data below, produce ONE JSON object for the Mind Board. Speak like a companion, not a robot, and use second person ("you").

PROVIDED DATA:

### USER PROFILE (VAULT) ###
${userContextLine}
${goalLine}
${coreBeliefsLabel}: ${JSON.stringify(vault.coreBeliefs || {})}

### MOST RELEVANT MEMORIES (Last ${days} Days) ###
${formattedMemories}

${predictionsBlock}

REQUIRED JSON OUTPUT SHAPE (STRICT):
{
  "reportSections": {
    "mainTitle": "WRITE a concise title summarizing this period.",
    "overview": "WRITE a 2-3 sentence intro summarizing the main theme (from Vault & Memories).",
    "goldenThread": "WRITE a 2-paragraph analysis explaining the key cause-effect across memories.",
    "blindSpot": "WRITE 1 paragraph starting with '${blindSpotPrefix}' that reveals a blind spot."
  },
  "reportAnalogy": {
    "title": "WRITE a metaphor/analogy title summarizing the analysis.",
    "text": "Explain this metaphor in 1-2 sentences."
  },
  "derivedData": { "readMinutes": 2, "headingsCount": 4 }
}

RULES:
- Output ONLY valid JSON; no extra text.
- Entirely in English and use second person.
- No emojis, no Markdown.
`.trim(),

        de: (
            {
                days,
                userContextLine,
                goalLine,
                coreBeliefsLabel,
                formattedMemories,
                predictionsBlock,
                blindSpotPrefix,
            },
        ) => `
AUFGABE: Erstelle aus den folgenden Daten EIN JSON-Objekt für das Gedanken-Board. Sprich wie ein Begleiter, nicht wie ein Roboter, und benutze die zweite Person Singular ("du").

BEREITGESTELLTE DATEN:

### NUTZERPROFIL (VAULT) ###
${userContextLine}
${goalLine}
${coreBeliefsLabel}: ${JSON.stringify(vault.coreBeliefs || {})}

### RELEVANTESTE ERINNERUNGEN (Letzte ${days} Tage) ###
${formattedMemories}

${predictionsBlock}

ERFORDERLICHES JSON-AUSGABEFORMAT (STRICT):
{
  "reportSections": {
    "mainTitle": "SCHREIBE einen prägnanten Titel, der diesen Zeitraum zusammenfasst.",
    "overview": "SCHREIBE eine Einführung in 2–3 Sätzen, die das Hauptthema (aus Vault & Erinnerungen) zusammenfasst.",
    "goldenThread": "SCHREIBE eine Analyse in 2 Absätzen, die die wichtigsten Ursache-Wirkungs-Zusammenhänge erklärt.",
    "blindSpot": "SCHREIBE 1 Absatz beginnend mit '${blindSpotPrefix}', der einen blinden Fleck sichtbar macht."
  },
  "reportAnalogy": {
    "title": "SCHREIBE einen Metapher-/Analogie-Titel, der die Analyse zusammenfasst.",
    "text": "Erkläre diese Metapher in 1–2 Sätzen."
  },
  "derivedData": { "readMinutes": 2, "headingsCount": 4 }
}

REGELN:
- Gib NUR gültiges JSON aus; keine zusätzlichen Texte.
- Vollständig auf Deutsch und in der zweiten Person.
- Keine Emojis, kein Markdown.
`.trim(),
    };

    const getPrompt = PROMPTS[lang] || PROMPTS.en;
    const prompt = getPrompt({
        days,
        userContextLine,
        goalLine,
        coreBeliefsLabel: I.coreBeliefsLabel,
        formattedMemories,
        predictionsBlock,
        blindSpotPrefix: I.blindSpotPrefix,
    });

    const responseText = await invokeGemini(
        dependencies.supabase,
        prompt,
        config.AI_MODELS.ADVANCED, // config'ten (hardcoded gemini-1.5-pro kaldırıldı)
        {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: LLM_LIMITS.AI_ANALYSIS, // 🔒 1024 tavan
        },
    );

    try {
        const parsed = JSON.parse(responseText) as ElegantReportPayload;
        if (parsed && parsed.reportSections && parsed.reportAnalogy) {
            return parsed;
        }
    } catch (e) {
        console.error("AI'dan dönen JSON parse edilemedi:", e, responseText);
    }

    // Güvenli fallback (dil duyarlı)
    return {
        reportSections: {
            mainTitle: I.fallback.title,
            overview: I.fallback.overview,
            goldenThread: "",
            blindSpot: "",
        },
        reportAnalogy: {
            title: I.fallback.analogyTitle,
            text: I.fallback.analogyText,
        },
        derivedData: { readMinutes: 1, headingsCount: 1 },
    };
}

// Tahmin (predicted_outcomes) üretimi
// Eskiden predicted_outcomes tablosuna HİÇ yazılmıyordu; rüya/rapor prompt'larındaki
// "tahminler" bölümü daima boştu. Bu fonksiyon, rapor üretimi sırasında kullanıcının
// son dönem anılarından kısa, eyleme dönük tahminler üretir.
export interface PredictionDraft {
    prediction_type: string;
    title: string;
    description: string;
    probability_score: number; // 0.0 - 1.0
    time_horizon_hours: number;
    suggested_action?: string;
}

export async function generatePredictions(
    dependencies: { supabase: SupabaseClient },
    vault: VaultData,
    memories: ProcessedMemory[],
    language?: string,
): Promise<PredictionDraft[]> {
    const lang = ["tr", "en", "de"].includes(String(language))
        ? String(language)
        : "en";

    if (!memories || memories.length === 0) return [];

    const formattedMemories = memories
        .slice(0, 20)
        .map((m) => {
            const sentiment =
                (m.sentiment_data?.dominant_emotion as string | undefined) ??
                    "";
            return `- [${sentiment}] ${String(m.content).slice(0, 160)}`;
        })
        .join("\n");

    const langHint: Record<string, string> = {
        tr: "Tüm metinleri Türkçe yaz.",
        en: "Write all text in English.",
        de: "Schreibe alle Texte auf Deutsch.",
    };

    const goal = vault?.profile?.therapyGoals
        ? `\nKULLANICININ HEDEFİ: ${String(vault.profile.therapyGoals)}`
        : "";

    const prompt = `${langHint[lang]}
GÖREV: Aşağıdaki anılardan ve kullanıcının hedefinden yola çıkarak 1-3 KISA, nazik ve
eyleme dönük "tahmin" üret. Kesin hüküm verme; olasılık ve destekleyici ton kullan. Tıbbi teşhis yok.
${goal}

ANILAR:
${formattedMemories}

SADECE şu JSON'ı döndür:
{
  "predictions": [
    {
      "prediction_type": "mood | behavior | theme",
      "title": "Kısa başlık",
      "description": "1-2 cümle, destekleyici",
      "probability_score": 0.6,
      "time_horizon_hours": 168,
      "suggested_action": "Küçük, uygulanabilir bir öneri"
    }
  ]
}`;

    try {
        const raw = await invokeGemini(
            dependencies.supabase,
            prompt,
            config.AI_MODELS.FAST,
            {
                responseMimeType: "application/json",
                temperature: 0.6,
                maxOutputTokens: LLM_LIMITS.AI_ANALYSIS,
            },
        );
        const parsed = JSON.parse(raw) as { predictions?: PredictionDraft[] };
        const list = Array.isArray(parsed?.predictions)
            ? parsed.predictions
            : [];
        // Güvenli normalizasyon + sınırlama
        return list.slice(0, 3).map((p) => ({
            prediction_type: String(p.prediction_type ?? "theme").slice(0, 40),
            title: String(p.title ?? "").slice(0, 120),
            description: String(p.description ?? "").slice(0, 500),
            probability_score: Math.max(
                0,
                Math.min(1, Number(p.probability_score) || 0.5),
            ),
            time_horizon_hours: Math.max(
                1,
                Math.min(8760, Math.round(Number(p.time_horizon_hours) || 168)),
            ),
            suggested_action: p.suggested_action
                ? String(p.suggested_action).slice(0, 300)
                : undefined,
        })).filter((p) => p.title && p.description);
    } catch (e) {
        console.warn("[generatePredictions] Tahmin üretimi başarısız:", e);
        return [];
    }
}

// Embedding helper - API Gateway üstünden Gemini Embedding çağrısı
export type EmbedContentResponse = {
    embedding: number[] | null;
    error?: string;
};
export async function embedContent(
    supabase: SupabaseClient,
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
    supabase: SupabaseClient,
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
