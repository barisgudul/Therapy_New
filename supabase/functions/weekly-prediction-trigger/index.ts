// supabase/functions/weekly-prediction-trigger/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// === HAFTALIK TAHMİN TETİKLEYİCİSİ ===
// Bu fonksiyon, cron job veya manuel çağrı ile haftada bir çalışabilir
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        console.log(
            `📅 [WEEKLY_TRIGGER] Haftalık tahmin tetikleyicisi başlıyor...`,
        );

        // 1) Aktif kullanıcıları bul (son 7 günde event'i olan kullanıcılar)
        const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000))
            .toISOString();

        // DOĞRU YÖNTEM: Önce tüm eventleri çek, sonra unique user_id'leri ayıkla
        const { data: allEvents, error: usersError } = await adminClient
            .from("events")
            .select("user_id")
            .gte("created_at", sevenDaysAgo);

        if (usersError) {
            throw new Error(
                `Aktif kullanıcılar çekilirken hata: ${usersError.message}`,
            );
        }

        if (!allEvents || allEvents.length === 0) {
            console.log("📭 [WEEKLY_TRIGGER] Aktif kullanıcı bulunamadı");
            return new Response(
                JSON.stringify({ message: "Aktif kullanıcı bulunamadı" }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                },
            );
        }

        // Tekrar eden ID'leri Set ile temizle - JAVASCRIPT 101!
        const activeUserIds = [...new Set(allEvents.map((e) => e.user_id))];

        console.log(
            `👥 [WEEKLY_TRIGGER] ${activeUserIds.length} aktif kullanıcı bulundu`,
        );

        // 2) Her aktif kullanıcı için tahmin motorunu tetikle
        const results = [];

        for (const userId of activeUserIds) {
            try {
                const response = await fetch(
                    `${
                        Deno.env.get("SUPABASE_URL")
                    }/functions/v1/prediction-engine`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${
                                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
                            }`,
                        },
                        body: JSON.stringify({
                            user_id: userId, // userRecord değil, userId kullan
                            trigger_reason: "weekly_schedule",
                        }),
                    },
                );

                if (response.ok) {
                    results.push({
                        user_id: userId, // userRecord değil, userId kullan
                        status: "success",
                    });
                    console.log(
                        `✅ [WEEKLY_TRIGGER] ${userId} için tahminler üretildi`,
                    );
                } else {
                    results.push({
                        user_id: userId, // userRecord değil, userId kullan
                        status: "failed",
                        error: await response.text(),
                    });
                    console.error(
                        `⛔️ [WEEKLY_TRIGGER] ${userId} için tahmin hatası`,
                    );
                }

                // Rate limiting için kısa bekleme
                await new Promise((resolve) => setTimeout(resolve, 500));
            } catch (error) {
                results.push({
                    user_id: userId, // userRecord değil, userId kullan
                    status: "failed",
                    error: getErrorMessage(error),
                });
                console.error(
                    `⛔️ [WEEKLY_TRIGGER] ${userId} işlenirken hata:`,
                    error,
                );
            }
        }

        const successCount = results.filter((r) =>
            r.status === "success"
        ).length;
        const failCount = results.filter((r) => r.status === "failed").length;

        console.log(
            `📊 [WEEKLY_TRIGGER] Tamamlandı: ${successCount} başarılı, ${failCount} hatalı`,
        );

        return new Response(
            JSON.stringify({
                success: true,
                message: `Haftalık tahmin tetikleyicisi tamamlandı`,
                total_users: activeUserIds.length, // activeUsers değil, activeUserIds kullan
                successful: successCount,
                failed: failCount,
                results: results,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error(
            "⛔️ [WEEKLY_TRIGGER] Genel hata:",
            getErrorMessage(error),
        );
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
});
