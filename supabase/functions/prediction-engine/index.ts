// supabase/functions/prediction-engine/index.ts
import {
    createClient,
    SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Tahmin sonucu tipi
interface PredictionOutcome {
    id?: string;
    user_id: string;
    prediction_type: "trigger_risk" | "mood_forecast" | "behavior_pattern";
    title: string;
    description: string;
    probability_score: number; // 0-1 arası
    time_horizon_hours: number; // 24, 48, 72 gibi
    suggested_action?: string;
    generated_at: string;
    expires_at: string;
}

// DNA profili tipi
interface UserDna {
    user_id: string;
    sentiment_score: number;
    energy_level: number;
    complexity_score: number;
    introspection_depth: number;
    social_connection: number;
    last_updated: string;
    total_events_processed: number;
}

// Son anılar tipi
interface RecentMemory {
    content: string;
    event_time: string;
    sentiment_data?: Record<string, unknown>;
}

interface RequestBody {
    user_id: string;
    trigger_reason?: "weekly_schedule" | "dna_change" | "manual";
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// === SİMÜLASYON TETİKLEYİCİSİ ===
async function triggerSimulationsForHighRiskPredictions(
    _adminClient: SupabaseClient,
    predictions: PredictionOutcome[],
    userId: string,
): Promise<void> {
    console.log(
        `[PREDICTION_ENGINE] 🎭 Yüksek riskli tahminler için simülasyon kontrol ediliyor...`,
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Yüksek riskli tahminleri filtrele (probability > 0.7)
    const highRiskPredictions = predictions.filter((p) =>
        p.probability_score > 0.7
    );

    if (highRiskPredictions.length === 0) {
        console.log(
            `[PREDICTION_ENGINE] Yüksek riskli tahmin yok, simülasyon tetiklenmiyor`,
        );
        return;
    }

    console.log(
        `[PREDICTION_ENGINE] ${highRiskPredictions.length} yüksek riskli tahmin için simülasyon tetikleniyor`,
    );

    // Her yüksek riskli tahmin için simülasyon çalıştır
    const simulationPromises = highRiskPredictions.map(async (prediction) => {
        try {
            const simulationPrompt = createSimulationPromptFromPrediction(
                prediction,
            );

            const response = await fetch(
                `${supabaseUrl}/functions/v1/run-simulation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        user_id: userId,
                        setup_prompt: simulationPrompt,
                        trigger_prediction_id: prediction.id,
                        simulation_type: getSimulationTypeFromPrediction(
                            prediction,
                        ),
                    }),
                },
            );

            if (response.ok) {
                const result = await response.json();
                console.log(
                    `[PREDICTION_ENGINE] ✅ Simülasyon tetiklendi: ${prediction.title} -> ${result.simulation_id}`,
                );
            } else {
                console.error(
                    `[PREDICTION_ENGINE] ❌ Simülasyon tetiklenemedi: ${prediction.title}`,
                );
            }
        } catch (error) {
            console.error(
                `[PREDICTION_ENGINE] Simülasyon tetikleme hatası:`,
                error,
            );
        }
    });

    // Tüm simülasyonları paralel çalıştır, hata olsa da devam et
    await Promise.allSettled(simulationPromises);
}

// === TAHMİNDEN SİMÜLASYON PROMPT'U OLUŞTUR ===
function createSimulationPromptFromPrediction(
    prediction: PredictionOutcome,
): string {
    switch (prediction.prediction_type) {
        case "trigger_risk":
            return `${prediction.title} durumu gerçekleşiyor. ${prediction.description} Bu durumda nasıl tepki verirsin ve ne hissedersin?`;

        case "mood_forecast":
            return `Yaklaşan dönemde ${prediction.description} Bu ruh hali değişimini nasıl yaşarsın? Günlük rutinin nasıl etkilenir?`;

        case "behavior_pattern":
            return `${prediction.description} Bu davranış kalıbı tekrar ortaya çıkıyor. Nasıl tepki verirsin ve bu durumu nasıl yönetirsin?`;

        default:
            return `${prediction.title} durumu yaşanıyor. ${prediction.description} Bu senaryoda nasıl davranırsın?`;
    }
}

// === TAHMİN TİPİNDEN SİMÜLASYON TİPİ BELİRLE ===
function getSimulationTypeFromPrediction(
    prediction: PredictionOutcome,
): string {
    switch (prediction.prediction_type) {
        case "trigger_risk":
            return "stress_test";
        case "mood_forecast":
            return "scenario_walkthrough";
        case "behavior_pattern":
            return "social_interaction";
        default:
            return "scenario_walkthrough";
    }
}

// === AI TABANLI TAHMİN ÜRETİCİSİ ===
async function generatePredictions(
    userDna: UserDna,
    recentMemories: RecentMemory[],
    geminiApiKey: string,
): Promise<PredictionOutcome[]> {
    // DNA profilini okunabilir hale getir
    const dnaDescription = `
Kullanıcı DNA Profili:
- Genel Ruh Hali: ${
        userDna.sentiment_score > 0.2
            ? "Pozitif"
            : userDna.sentiment_score < -0.2
            ? "Negatif"
            : "Nötr"
    } (${userDna.sentiment_score.toFixed(2)})
- Enerji Seviyesi: ${
        userDna.energy_level > 0.7
            ? "Yüksek"
            : userDna.energy_level < 0.3
            ? "Düşük"
            : "Orta"
    } (${userDna.energy_level.toFixed(2)})
- Düşünce Karmaşıklığı: ${
        userDna.complexity_score > 0.7
            ? "Yüksek"
            : userDna.complexity_score < 0.3
            ? "Basit"
            : "Orta"
    } (${userDna.complexity_score.toFixed(2)})
- İçe Dönüklük: ${
        userDna.introspection_depth > 0.7
            ? "Çok İçe Dönük"
            : userDna.introspection_depth < 0.3
            ? "Dışa Dönük"
            : "Dengeli"
    } (${userDna.introspection_depth.toFixed(2)})
- Sosyal Bağlantı: ${
        userDna.social_connection > 0.7
            ? "Yüksek"
            : userDna.social_connection < 0.3
            ? "Düşük"
            : "Orta"
    } (${userDna.social_connection.toFixed(2)})
- İşlenen Event Sayısı: ${userDna.total_events_processed}
`;

    // Son anıları özetle
    const recentContext = recentMemories.length > 0
        ? recentMemories.map((m) =>
            `- ${new Date(m.event_time).toLocaleDateString("tr-TR")}: "${
                m.content.substring(0, 100)
            }..."`
        ).join("\n")
        : "Son günlerde anı bulunamadı.";

    const predictionPrompt = `
### ROL: AKILLI PSİKOLOJİK TAHMİN MOTORU ###
Sen, insan psikolojisinin derinliklerini anlayan bir tahmin uzmanısın. 
Kullanıcının DNA profiline ve son anılarına dayanarak, önümüzdeki 48 saat için 3 farklı kategoride tahmin üret.

### KULLANICI DNA PROFİLİ ###
${dnaDescription}

### SON ANILAR ###
${recentContext}

### TAHMİN STRATEJİSİ VE KALITE KURALLARI ###
1. **DNA Analizi**: Kullanıcının DNA profilindeki ani değişikliklere odaklan
2. **Zamansal Bağlantılar**: Son anılar ile DNA arasındaki tutarlılıkları yakala  
3. **Psikolojik Döngüler**: İnsan davranışındaki doğal ritim ve kalıpları göz önünde bulundur
4. **Spesifik Ol**: "Stresli hissedeceksin" değil, "İş toplantısı öncesi kaygı artabilir" de
5. **Ulaşılabilir Ol**: Tahminlerin kullanıcının kontrol edebileceği alanlarla ilgili olsun

### İYİ TAHMİN ÖRNEKLERİ ###

**Örnek 1 - Negatif Duygu + Düşük Enerji DNA'sı:**
- **Tetikleyici Risk**: "Sosyal ortamlarda enerji tükenmesi riski yüksek. Önümüzdeki 24-48 saat içinde grup aktivitelerinden kaçınma eğilimi gösterebilirsiniz."
- **Ruh Hali**: "Mevcut düşük enerji seviyeniz, yarın akşam saatlerinde hafif melankoli hissine dönüşebilir."
- **Davranış**: "Rutin işleri erteleme eğilimi artabilir. Özellikle ev işleri ve kişisel bakım konularında motivasyon düşüklüğü yaşayabilirsiniz."

**Örnek 2 - Yüksek Karmaşıklık + Artan İçe Dönüklük:**
- **Tetikleyici Risk**: "Zihinsel aşırı yüklenme riski mevcut. Çok fazla bilgi girişi olan durumlar (sosyal medya, haberler) sizi bunaltabilir."
- **Ruh Hali**: "Derin düşünce süreçleriniz, önümüzdeki 24 saat içinde anlamlı bir 'aha!' anı yaşamanıza sebep olabilir."
- **Davranış**: "Yalnız zaman geçirme ihtiyacınız artacak. Kitap okuma, yazı yazma gibi soliter aktivitelere yönelim gösterebilirsiniz."

**Örnek 3 - Sosyal Bağlantı Artışı + Pozitif Duygu:**
- **Tetikleyici Risk**: "Aşırı sosyalleşme sonucu enerji tükenmesi riski. 48 saat içinde 'sosyal yorgunluk' hissedebilirsiniz."
- **Ruh Hali**: "Mevcut pozitif ruh haliniz, yarın sabah saatlerinde yaratıcı projeler için ilham verebilir."
- **Davranış**: "İletişim kurma isteğiniz artacak. Eski arkadaşlarla iletişime geçme veya yeni bağlantılar kurma eğilimi gösterebilirsiniz."

### TAHMİN KATEGORİLERİ ###
1. "trigger_risk" - Tetikleyici riskler ve hassasiyet noktaları
2. "mood_forecast" - Ruh hali değişiklikleri ve duygusal dalgalanmalar  
3. "behavior_pattern" - Davranış eğilimleri ve alışkanlık değişiklikleri

### ÇIKTI FORMATI (SADECE JSON) ###
[
  {
    "prediction_type": "trigger_risk",
    "title": "24-48 Saat İçinde Dikkat Edilecek Risk",
    "description": "DNA profiline dayalı spesifik ve ulaşılabilir risk tahmini", 
    "probability_score": 0.75,
    "time_horizon_hours": 48,
    "suggested_action": "Somut ve uygulanabilir önleyici eylem"
  },
  {
    "prediction_type": "mood_forecast",
    "title": "Yaklaşan Ruh Hali Değişimi",
    "description": "Duygusal durumda beklenen değişiklik ve zamanlaması",
    "probability_score": 0.65,
    "time_horizon_hours": 36,
    "suggested_action": "Ruh hali değişimine hazırlık önerisi"
  },
  {
    "prediction_type": "behavior_pattern", 
    "title": "Davranış Eğilimi Tahmini",
    "description": "Beklenen davranış değişiklikleri ve motivasyon dalgalanmaları",
    "probability_score": 0.80,
    "time_horizon_hours": 24,
    "suggested_action": "Davranış değişikliğini destekleyici eylem"
  }
]

### KRİTİK KURALLAR ###
- probability_score: 0.1 ile 0.9 arasında olmalı
- Türkçe, empatik ve yapıcı dil kullan
- Kesinlikle olumsuz/karamsar tahminlerden kaçın
- Her kategoriden tam olarak 1 tahmin üret, toplam 3 tahmin
- Tahminler spesifik, ulaşılabilir ve DNA profiline dayalı olmalı
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: predictionPrompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                    maxOutputTokens: 1500,
                },
            }),
        },
    );

    if (!response.ok) {
        throw new Error(`Gemini tahmin hatası: ${response.statusText}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;

    try {
        const predictions = JSON.parse(resultText);

        // Gelen veriyi doğrula ve type-safe hale getir
        if (!Array.isArray(predictions)) {
            throw new Error("AI'dan gelen tahmin verisi array değil");
        }

        // Her tahmini tam formata dönüştür - TYPE SAFE!
        return predictions.map((pred: {
            prediction_type:
                | "trigger_risk"
                | "mood_forecast"
                | "behavior_pattern";
            title: string;
            description: string;
            probability_score: number;
            time_horizon_hours: number;
            suggested_action?: string;
        }) => ({
            user_id: userDna.user_id,
            prediction_type: pred.prediction_type as
                | "trigger_risk"
                | "mood_forecast"
                | "behavior_pattern",
            title: pred.title,
            description: pred.description,
            probability_score: Math.max(
                0.1,
                Math.min(0.9, pred.probability_score),
            ), // 0.1-0.9 arası sınırla
            time_horizon_hours: pred.time_horizon_hours,
            suggested_action: pred.suggested_action,
            generated_at: new Date().toISOString(),
            expires_at: new Date(
                Date.now() + (pred.time_horizon_hours * 60 * 60 * 1000),
            ).toISOString(),
        }));
    } catch (parseError) {
        console.warn("Gemini tahmin çıktısı parse edilemedi:", parseError);
        // Fallback tahminler
        return [
            {
                user_id: userDna.user_id,
                prediction_type: "mood_forecast" as const,
                title: "Genel Durum Tahmini",
                description: "Mevcut ruh halinizin devam etmesi bekleniyor.",
                probability_score: 0.6,
                time_horizon_hours: 48,
                suggested_action: "Düzenli aktivitelerinizi sürdürün",
                generated_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + (48 * 60 * 60 * 1000))
                    .toISOString(),
            },
        ];
    }
}

// === ANA FONKSİYON ===
type FromApi = {
    select: (sel: string) => FromApi;
    eq: (c: string, v: string) => FromApi;
    single: () => Promise<
        {
            data: Record<string, unknown> | null;
            error: { message: string } | null;
        }
    >;
    gte: (c: string, v: string) => FromApi;
    order: (_: string, __: { ascending: boolean }) => FromApi;
    limit: (
        n: number,
    ) => Promise<
        {
            data: Record<string, unknown>[] | null;
            error: { message: string } | null;
        }
    >;
    delete: () => {
        eq: (
            c: string,
            v: string,
        ) => {
            lt: (
                c: string,
                v: string,
            ) => Promise<{ error: { message: string } | null }>;
        };
    };
    insert: (vals: unknown) => Promise<{ error: { message: string } | null }>;
};

type SupabaseClientLike = {
    from: (table: string) => FromApi;
};

export async function handlePredictionEngine(
    req: Request,
    providedClient?: SupabaseClientLike,
): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, trigger_reason = "manual" } = await req
            .json() as RequestBody;

        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const adminClient: SupabaseClientLike = providedClient ?? createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        ) as unknown as SupabaseClientLike;

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY bulunamadı");
        }

        console.log(
            `🔮 [PREDICTION_ENGINE] ${user_id} için tahmin motoru başlıyor... (Sebep: ${trigger_reason})`,
        );

        // 1) Kullanıcının DNA profilini çek
        const { data: userDna, error: dnaError } = await adminClient
            .from("user_dna")
            .select("*")
            .eq("user_id", user_id)
            .single();

        if (dnaError || !userDna) {
            throw new Error(
                `Kullanıcı DNA profili bulunamadı: ${dnaError?.message}`,
            );
        }

        // userDna'yı UserDna tipine cast et
        const typedUserDna = userDna as unknown as UserDna;

        // 2) Son 7 günün anılarını çek
        const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
            .toISOString();
        const { data: recentMemories, error: memoryError } = await adminClient
            .from("cognitive_memories")
            .select("content, event_time, sentiment_data")
            .eq("user_id", user_id)
            .gte("event_time", sevenDaysAgo)
            .order("event_time", { ascending: false })
            .limit(10);

        if (memoryError) {
            console.warn("Son anılar çekilirken hata:", memoryError.message);
        }

        // recentMemories'i RecentMemory[] tipine cast et
        const typedRecentMemories =
            (recentMemories || []) as unknown as RecentMemory[];

        // 3) AI ile tahminleri üret
        const predictions = await generatePredictions(
            typedUserDna,
            typedRecentMemories,
            GEMINI_API_KEY,
        );

        console.log(
            `🎯 [PREDICTION_ENGINE] ${predictions.length} tahmin üretildi`,
        );

        // 4) Eski tahminleri temizle (süresi dolmuş olanlar)
        await adminClient
            .from("predicted_outcomes")
            .delete()
            .eq("user_id", user_id)
            .lt("expires_at", new Date().toISOString());

        // 5) Yeni tahminleri kaydet
        const { error: insertError } = await adminClient
            .from("predicted_outcomes")
            .insert(predictions);

        if (insertError) {
            throw new Error(
                `Tahminler kaydedilirken hata: ${insertError.message}`,
            );
        }

        console.log(`✅ [PREDICTION_ENGINE] Tahminler başarıyla kaydedildi`);

        // 🎭 YENİ: YÜKSEK RİSKLİ TAHMİNLER İÇİN SİMÜLASYON TETİKLE
        await triggerSimulationsForHighRiskPredictions(
            adminClient as unknown as SupabaseClient,
            predictions,
            user_id,
        );

        return new Response(
            JSON.stringify({
                success: true,
                message: `${predictions.length} tahmin başarıyla üretildi`,
                predictions: predictions,
                trigger_reason,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error("⛔️ [PREDICTION_ENGINE] Hata:", getErrorMessage(error));
        return new Response(
            JSON.stringify({
                success: false,
                error: getErrorMessage(error),
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
}

if (import.meta.main) {
    Deno.serve((req) => handlePredictionEngine(req));
}
