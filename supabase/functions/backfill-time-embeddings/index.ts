// supabase/functions/backfill-time-embeddings/index.ts (NİHAİ, PROD'A HAZIR VERSİYON)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Tipleri tanımlıyoruz, 'any' virüsüne yer yok.
interface User {
    id: string;
}
interface Vault {
    vault_data: Record<string, unknown>;
}
interface AppEvent {
    id: number;
    created_at: string;
    type: string;
    mood?: string;
    data: {
        dreamText?: string;
        todayNote?: string;
        initialEntry?: string;
        text?: string;
        [key: string]: unknown;
    };
}

// Zamanı koklayan makinemiz.
class TimeEmbeddingGenerator {
    static generate(
        event: AppEvent,
        _vault: Record<string, unknown>,
    ): number[] {
        const time = new Date(event.created_at);
        const features = [
            time.getHours() / 23,
            time.getDay() / 6,
            (new Date(time.getFullYear(), 0, 1).getTime() - time.getTime()) /
                        86400000 % 30 / 29,
            this.calculateMoodVelocity(event, _vault),
            0,
        ];
        return this.padVector(features, 768);
    }
    private static calculateMoodVelocity(
        event: AppEvent,
        _vault: Record<string, unknown>,
    ): number {
        const moodMap: Record<string, number> = {
            "mutlu": 1,
            "neşeli": 0.8,
            "huzurlu": 0.6,
            "nötr": 0,
            "yorgun": -0.4,
            "üzgün": -0.8,
            "kaygılı": -1,
        };
        return moodMap[event.mood || "nötr"] || 0;
    }
    private static padVector(
        features: number[],
        targetLength: number,
    ): number[] {
        const padded = [...features];
        while (padded.length < targetLength) padded.push(0);
        return padded;
    }
}

// İçeriği koklayan makinemiz.
async function embedContent(
    apiKey: string,
    content: string,
): Promise<number[] | null> {
    try {
        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: `models/embedding-001`,
                    content: { parts: [{ text: content }] },
                }),
            },
        );
        if (!res.ok) {
            const err = await res.json();
            throw new Error(
                `Google API error: ${res.status} - ${JSON.stringify(err)}`,
            );
        }
        const data = await res.json();
        return data.embedding?.values || null;
    } catch (error) {
        console.error("Embedding hatası:", error);
        return null;
    }
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// Ana Operasyon
Deno.serve(async (_req) => {
    try {
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY bulunamadı");

        console.log(
            "🔄 Geçmiş verileri yeni hafıza sistemine taşıma işlemi başlıyor...",
        );

        const { data: { users }, error: userError } = await supabaseAdmin.auth
            .admin.listUsers();
        if (userError) throw userError;

        let totalProcessed = 0;
        let totalErrors = 0;

        for (const user of users) {
            console.log(`👤 Kullanıcı işleniyor: ${user.id}`);
            const { data: vault } = await supabaseAdmin.from("user_vaults")
                .select("vault_data").eq("user_id", user.id).single();
            const { data: events } = await supabaseAdmin.from("events").select(
                "*",
            ).eq("user_id", user.id).order("created_at", { ascending: true });

            if (!events || events.length === 0) {
                console.log(
                    `- Kullanıcı ${user.id} için event bulunamadı, atlanıyor.`,
                );
                continue;
            }

            console.log(
                `- Kullanıcı ${user.id} için ${events.length} event işlenecek.`,
            );

            for (const event of (events as AppEvent[])) {
                try {
                    const content = event.data?.dreamText ||
                        event.data?.todayNote || event.data?.initialEntry ||
                        event.data?.text || "içerik yok";
                    if (
                        content === "içerik yok" || content.trim().length < 10
                    ) {
                        continue;
                    }

                    const content_vector = await embedContent(
                        GEMINI_API_KEY,
                        content,
                    );
                    if (!content_vector) {
                        console.error(
                            `- ⚠️ Event ${event.id} için embedding oluşturulamadı, atlanıyor.`,
                        );
                        totalErrors++;
                        continue;
                    }

                    const time_vector = TimeEmbeddingGenerator.generate(
                        event,
                        (vault as Vault)?.vault_data || {},
                    );

                    const { error: insertError } = await supabaseAdmin.from(
                        "event_time_embeddings",
                    ).upsert({
                        user_id: user.id,
                        event_id: event.id,
                        content,
                        event_time: event.created_at,
                        content_vector,
                        time_vector,
                        metadata: { type: event.type },
                    }, { onConflict: "event_id" });

                    if (insertError) {
                        console.error(
                            `- ❌ Event ${event.id} kaydedilirken veritabanı hatası:`,
                            insertError,
                        );
                        totalErrors++;
                    } else {
                        totalProcessed++;
                    }
                } catch (eventError) {
                    console.error(
                        `- ❌ Event ${event.id} işlenirken kritik hata:`,
                        eventError,
                    );
                    totalErrors++;
                }
            }
        }

        const finalMessage =
            `🎉 İşlem tamamlandı! Toplam: ${totalProcessed} anı hafızaya kazındı, ${totalErrors} hata oluştu.`;
        console.log(finalMessage);
        return new Response(JSON.stringify({ message: finalMessage }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (e: unknown) {
        console.error("❌ Backfill işlemi sırasında ölümcül hata:", e);
        return new Response(JSON.stringify({ error: getErrorMessage(e) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
