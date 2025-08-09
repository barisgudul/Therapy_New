// supabase/functions/update-user-dna/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
// DNA çıkarma mantığını ayrı modülden import et
import { extractMiniDna, type MiniDnaProfile } from "./dna-extractor.ts";

// Veritabanındaki user_dna tablosu yapısı
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

interface RequestBody {
    user_id: string;
    event_content: string;
    // event_type ve event_time şu an kullanılmıyor, gelecekte kullanılacak
    _event_type?: string; // _ ile linter'ı sustur
    _event_time?: string; // _ ile linter'ı sustur
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// === EMA (ÜSTEL HAREKETLİ ORTALAMA) GÜNCELLEYICI ===
function updateDnaWithEma(
    currentDna: UserDna,
    newMiniDna: MiniDnaProfile,
    alpha: number = 0.1,
): UserDna {
    return {
        ...currentDna,
        sentiment_score: (alpha * newMiniDna.sentiment_score) +
            ((1 - alpha) * currentDna.sentiment_score),
        energy_level: (alpha * newMiniDna.energy_level) +
            ((1 - alpha) * currentDna.energy_level),
        complexity_score: (alpha * newMiniDna.complexity_score) +
            ((1 - alpha) * currentDna.complexity_score),
        introspection_depth: (alpha * newMiniDna.introspection_depth) +
            ((1 - alpha) * currentDna.introspection_depth),
        social_connection: (alpha * newMiniDna.social_connection) +
            ((1 - alpha) * currentDna.social_connection),
        last_updated: new Date().toISOString(),
        total_events_processed: currentDna.total_events_processed + 1,
    };
}

// === ANA FONKSİYON ===
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_id, event_content } = await req
            .json() as RequestBody;

        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        console.log(
            `🧬 [DNA_UPDATER] ${user_id} için DNA güncelleme başlıyor...`,
        );

        // 1) Yeni event'ten mini DNA çıkar - HIZLI VE BEDAVA!
        const miniDna = extractMiniDna(event_content);
        console.log(`🔬 [DNA_UPDATER] Mini DNA çıkarıldı:`, miniDna);

        // 2) Mevcut DNA'yı çek
        const { data: currentDna, error: fetchError } = await adminClient
            .from("user_dna")
            .select("*")
            .eq("user_id", user_id)
            .maybeSingle();

        if (fetchError) {
            throw new Error(`DNA çekilirken hata: ${fetchError.message}`);
        }

        let updatedDna: UserDna;

        if (!currentDna) {
            // İlk kez DNA oluşturuluyor
            console.log(
                `🆕 [DNA_UPDATER] ${user_id} için ilk DNA profili oluşturuluyor`,
            );
            updatedDna = {
                user_id,
                sentiment_score: miniDna.sentiment_score,
                energy_level: miniDna.energy_level,
                complexity_score: miniDna.complexity_score,
                introspection_depth: miniDna.introspection_depth,
                social_connection: miniDna.social_connection,
                last_updated: new Date().toISOString(),
                total_events_processed: 1,
            };
        } else {
            // Mevcut DNA'yı EMA ile güncelle
            console.log(`🔄 [DNA_UPDATER] Mevcut DNA EMA ile güncelleniyor`);
            updatedDna = updateDnaWithEma(currentDna, miniDna, 0.1);
        }

        // 3) Güncellenmiş DNA'yı kaydet
        const { error: upsertError } = await adminClient
            .from("user_dna")
            .upsert(updatedDna);

        if (upsertError) {
            throw new Error(`DNA kaydedilirken hata: ${upsertError.message}`);
        }

        console.log(
            `✅ [DNA_UPDATER] DNA başarıyla güncellendi. İşlenen event sayısı: ${updatedDna.total_events_processed}`,
        );

        // === ZEKİ TETİKLEME: Anlamlı DNA değişikliği varsa tahmin motorunu tetikle ===
        if (currentDna) {
            const sentimentChange = Math.abs(
                currentDna.sentiment_score - updatedDna.sentiment_score,
            );
            const energyChange = Math.abs(
                currentDna.energy_level - updatedDna.energy_level,
            );
            const significantChange = sentimentChange > 0.15 ||
                energyChange > 0.2;

            if (significantChange) {
                console.log(
                    `💥 [DNA_UPDATER] Anlamlı DNA değişikliği tespit edildi (sentiment: ${
                        sentimentChange.toFixed(2)
                    }, energy: ${
                        energyChange.toFixed(2)
                    }), tahmin motoru tetikleniyor...`,
                );

                // === DOĞRU YÖNTEM: ÖNCE LOG KAYDET, SONRA ATEŞLe VE TAKİP ET ===

                // 1) Önce görevi kaydet - bu kritik!
                const { data: logEntry, error: logInsertError } =
                    await adminClient
                        .from("system_logs")
                        .insert({
                            user_id: user_id,
                            function_name: "prediction-engine",
                            status: "triggered", // Henüz başlamadı, sadece tetiklendi
                            details: {
                                trigger_reason: "dna_change",
                                sentiment_change: sentimentChange,
                                energy_change: energyChange,
                            },
                            created_at: new Date().toISOString(),
                        })
                        .select("id")
                        .single();

                if (logInsertError) {
                    console.error(
                        "🚨 [CRITICAL] Loglama görevi bile başarısız oldu!",
                        logInsertError,
                    );
                    // Burada dur, çünkü görevi takip edemeyeceksin.
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error:
                                "Sistem logging başarısız, güvenlik nedeniyle işlem durduruldu",
                        }),
                        {
                            headers: {
                                ...corsHeaders,
                                "Content-Type": "application/json",
                            },
                            status: 500,
                        },
                    );
                }

                // 2) Şimdi görevi ateşle ve takip et
                const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
                const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

                fetch(`${supabaseUrl}/functions/v1/prediction-engine`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        user_id: user_id,
                        trigger_reason: "dna_change",
                    }),
                })
                    .then(async (response) => {
                        if (response.ok) {
                            const result = await response.json();
                            console.log(
                                `✅ [DNA_UPDATER] Tahmin motoru başarıyla tetiklendi:`,
                                result.message,
                            );

                            // Başarı durumunda log kaydını GÜNCELLE
                            const { error: updateError } = await adminClient
                                .from("system_logs")
                                .update({
                                    status: "success",
                                    details: {
                                        trigger_reason: "dna_change",
                                        sentiment_change: sentimentChange,
                                        energy_change: energyChange,
                                        predictions_generated:
                                            result.predictions?.length || 0,
                                        completed_at: new Date().toISOString(),
                                    },
                                })
                                .eq("id", logEntry.id);

                            if (updateError) {
                                console.warn(
                                    "⚠️ Log güncelleme başarısız:",
                                    updateError,
                                );
                            }
                        } else {
                            const errorText = await response.text();
                            throw new Error(
                                `HTTP ${response.status}: ${errorText}`,
                            );
                        }
                    })
                    .catch(async (err) => {
                        console.error(
                            "⛔️ [DNA_UPDATER] Tahmin motoru tetikleme hatası:",
                            err.message,
                        );

                        // Hata durumunda log kaydını GÜNCELLE
                        const { error: updateError } = await adminClient
                            .from("system_logs")
                            .update({
                                status: "failed",
                                error_message: err.message,
                                details: {
                                    trigger_reason: "dna_change",
                                    sentiment_change: sentimentChange,
                                    energy_change: energyChange,
                                    failed_at: new Date().toISOString(),
                                    error_details: err.stack || err.toString(),
                                },
                            })
                            .eq("id", logEntry.id);

                        if (updateError) {
                            console.error(
                                "🚨 [CRITICAL] Hem tahmin motoru hem de log güncellemesi başarısız:",
                                updateError,
                            );
                        }
                    });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: "DNA başarıyla güncellendi",
                updated_dna: updatedDna,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error("⛔️ [DNA_UPDATER] Hata:", getErrorMessage(error));
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
