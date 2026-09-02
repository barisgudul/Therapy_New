// supabase/functions/_shared/services/feedback.service.ts
//
// Geri besleme döngüsü: ai_decision_log'a yazılan kullanıcı memnuniyet skorları
// (update-satisfaction-score; +1 beğeni / -1 beğenmeme) eskiden HİÇ okunmuyordu —
// "öğrenen sistem" değil, ölü loglama idi. Bu servis o veriyi okunur kılar ve
// gelecekteki AI davranışını ayarlamak için bir sinyal üretir.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SatisfactionSignal {
    avgScore: number | null; // son skorların ortalaması (-1..1) ya da null (veri yok)
    total: number; // değerlendirilmiş karar sayısı (pencere içinde)
    lowSatisfaction: boolean; // yaklaşımı değiştirmeyi tetikleyen bayrak
}

const EMPTY: SatisfactionSignal = {
    avgScore: null,
    total: 0,
    lowSatisfaction: false,
};

/**
 * Kullanıcının son N puanlanmış AI kararının memnuniyet sinyalini döndürür.
 * Hata/boş veri durumunda nötr sinyal döner (asıl akışı asla bozmaz).
 */
export async function getSatisfactionSignal(
    supabaseClient: SupabaseClient,
    userId: string,
    options: { window?: number } = {},
): Promise<SatisfactionSignal> {
    const window = options.window ?? 5;
    try {
        const { data, error } = await supabaseClient
            .from("ai_decision_log")
            .select("user_satisfaction_score, reviewed_at, created_at")
            .eq("user_id", userId)
            .not("user_satisfaction_score", "is", null)
            .order("created_at", { ascending: false })
            .limit(window);

        if (error || !data || data.length === 0) return EMPTY;

        const scores = data
            .map((r) => Number(r.user_satisfaction_score))
            .filter((n) => Number.isFinite(n));
        if (scores.length === 0) return EMPTY;

        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const negativeCount = scores.filter((s) => s < 0).length;

        // Düşük memnuniyet: ortalama negatif YA DA puanların yarısından çoğu negatif
        const lowSatisfaction = avg < 0 ||
            negativeCount > scores.length / 2;

        return { avgScore: avg, total: scores.length, lowSatisfaction };
    } catch (e) {
        console.warn("[feedback] Memnuniyet sinyali okunamadı:", e);
        return EMPTY;
    }
}
