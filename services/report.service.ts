// services/report.service.ts
import { supabase } from "../utils/supabase.ts";

// Bu, veritabanındaki user_reports tablosunun tip tanımıdır.
// Kendi tablonla eşleştiğinden emin ol.
export interface UserReport {
    id: string;
    user_id: string;
    report_title: string;
    report_content_markdown: string;
    generated_at: string;
    read_at: string | null; // okunduysa tarih, okunmadıysa null
    feedback: number | null;
}

/**
 * Kullanıcının en son oluşturulmuş raporunu getirir.
 * @returns {Promise<UserReport | null>} En son raporu veya bulunamazsa null döner.
 */
export async function getLatestUserReport(): Promise<UserReport | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from("user_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(); // ya bir tane döner ya da hiç

    if (error) {
        console.error("⛔️ Son rapor çekilirken hata:", error);
        throw error;
    }

    return data;
}

/**
 * Belirli bir raporu "okundu" olarak işaretler.
 * @param reportId Okundu olarak işaretlenecek raporun ID'si.
 */
export async function markReportAsRead(reportId: string): Promise<void> {
    const { error } = await supabase
        .from("user_reports")
        .update({ read_at: new Date().toISOString() })
        .eq("id", reportId);

    if (error) {
        console.error("⛔️ Rapor 'okundu' olarak işaretlenirken hata:", error);
        // Hata fırlatma, bu kritik bir işlem değil, UI çökmesin.
    } else {
        console.log(`✅ Rapor ${reportId} okundu olarak işaretlendi.`);
    }
}
