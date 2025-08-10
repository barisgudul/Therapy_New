// services/prediction.service.ts
import { supabase } from "../utils/supabase.ts";

// Tahmin sonucu tipi (Edge Function ile aynı)
export interface PredictionOutcome {
    id: string;
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

/**
 * Kullanıcının aktif (süresi dolmamış) tahminlerini getirir
 */
export async function getActivePredictions(): Promise<PredictionOutcome[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from("predicted_outcomes")
        .select("*")
        .eq("user_id", user.id)
        .gt("expires_at", new Date().toISOString()) // Süresi dolmamış olanlar
        .order("probability_score", { ascending: false }); // En yüksek olasılıktan başla

    if (error) {
        console.error("⛔️ Tahminler çekilirken hata:", error);
        return [];
    }

    return data || [];
}

/**
 * Kullanıcı için yeni tahminler üretilmesini tetikler
 * @param reason Tetikleme sebebi
 */
export async function triggerPredictionGeneration(
    reason: "weekly_schedule" | "dna_change" | "manual" = "manual",
): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Kullanıcı giriş yapmamış");
        }

        console.log(
            `🔮 [PREDICTION_SERVICE] Tahmin motoru tetikleniyor... (Sebep: ${reason})`,
        );

        const { data, error } = await supabase.functions.invoke(
            "prediction-engine",
            {
                body: {
                    user_id: user.id,
                    trigger_reason: reason,
                },
            },
        );

        if (error) {
            console.error("⛔️ Tahmin motoru tetiklenirken hata:", error);
            return false;
        }

        console.log(
            "✅ [PREDICTION_SERVICE] Tahmin motoru başarıyla tetiklendi:",
            data,
        );
        return true;
    } catch (error) {
        console.error("⛔️ Tahmin tetikleme hatası:", (error as Error).message);
        return false;
    }
}

/**
 * Kullanıcının DNA profilini getirir
 */
export async function getUserDna() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from("user_dna")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (error) {
        console.error("⛔️ DNA profili çekilirken hata:", error);
        return null;
    }

    return data;
}

/**
 * DNA profilindeki değişiklikleri kontrol eder ve gerekirse tahmin motorunu tetikler
 * Bu fonksiyon, DNA güncellendiğinde çağrılabilir
 */
export async function checkDnaChangeAndTriggerPredictions(): Promise<void> {
    try {
        // Son tahmin üretilme zamanını kontrol et
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: latestPrediction } = await supabase
            .from("predicted_outcomes")
            .select("generated_at")
            .eq("user_id", user.id)
            .order("generated_at", { ascending: false })
            .limit(1)
            .single();

        // Eğer son tahmin 24 saatten eski ise yeni tahmin üret
        const twentyFourHoursAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
        const shouldGenerateNewPredictions = !latestPrediction ||
            new Date(latestPrediction.generated_at) < twentyFourHoursAgo;

        if (shouldGenerateNewPredictions) {
            console.log(
                "🔄 [PREDICTION_SERVICE] DNA değişikliği nedeniyle yeni tahmin üretiliyor",
            );
            await triggerPredictionGeneration("dna_change");
        }
    } catch (error) {
        console.error("⛔️ DNA değişiklik kontrolü hatası:", error);
    }
}
