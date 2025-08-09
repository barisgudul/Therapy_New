// supabase/functions/migrate-legacy-data/index.ts
import {
    createClient,
    SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type DbEvent = {
    id: number;
    user_id: string;
    type: string;
    data: Record<string, unknown> | null;
    created_at: string;
    mood?: string | null;
};

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

function extractContentFromEventData(data: DbEvent["data"]): string | null {
    if (!data) return null;
    const obj = data as Record<string, unknown>;
    const candidates = [
        obj["dreamText"],
        obj["userMessage"],
        obj["initialEntry"],
        obj["todayNote"],
        obj["content"],
    ];
    const text = candidates.find((v) => typeof v === "string") as
        | string
        | undefined;
    return text?.trim() ? text : null;
}

async function alreadyEmbedded(
    admin: SupabaseClient,
    eventId: number | string,
) {
    const { data, error } = await admin
        .from("event_time_embeddings")
        .select("id")
        .eq("event_id", eventId)
        .maybeSingle();
    if (error) throw error;
    return !!data;
}

async function processBatch(admin: SupabaseClient, events: DbEvent[]) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const tasks = events.map(async (evt) => {
        try {
            const content = extractContentFromEventData(evt.data);
            if (!content) return;

            // Eğer bu event zaten işlendi ise atla
            const exists = await alreadyEmbedded(admin, evt.id);
            if (exists) return;

            const payload = {
                source_event_id: evt.id,
                user_id: evt.user_id,
                content,
                event_time: evt.created_at,
                mood: evt.mood ?? undefined,
                metadata: { type: evt.type },
            };

            const res = await fetch(
                `${supabaseUrl}/functions/v1/process-and-embed-memory`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify(payload),
                },
            );

            if (!res.ok) {
                const t = await res.text();
                console.error(
                    "[MIGRATE] İşleme hatası:",
                    evt.id,
                    res.status,
                    t,
                );
            }
        } catch (e) {
            console.error("[MIGRATE] Event hata:", evt.id, getErrorMessage(e));
        }
    });

    await Promise.allSettled(tasks);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Basit koruma: Sadece service role ile çağrılabilsin
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    try {
        const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const BATCH_SIZE = 500;
        let lastId: number | null = null;
        let totalProcessed = 0;

        while (true) {
            const query = admin
                .from("events")
                .select("id,user_id,type,data,created_at,mood")
                .order("id", { ascending: true })
                .limit(BATCH_SIZE);

            if (lastId !== null) {
                query.gt("id", lastId);
            }

            const { data: rows, error } = await query;
            if (error) throw error;
            if (!rows || rows.length === 0) break;

            await processBatch(admin, rows as DbEvent[]);

            totalProcessed += rows.length;
            lastId = (rows[rows.length - 1] as DbEvent).id;
        }

        return new Response(
            JSON.stringify({
                message: `Migrasyon bitti. Toplam: ${totalProcessed}`,
            }),
            { status: 200, headers: corsHeaders },
        );
    } catch (error: unknown) {
        return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
            status: 500,
            headers: corsHeaders,
        });
    }
});
