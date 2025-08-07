// supabase/functions/delete-dream-memory/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { event_id } = await req.json();
        if (!event_id) {
            throw new Error("Silinecek rüyanın 'event_id'si eksik.");
        }

        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");

        const jwt = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
        if (!user) throw new Error("Geçersiz kullanıcı veya oturum.");

        // 1. ÖNCE BEYNİN HAFIZASINI SİL
        // source_event_id kullanarak doğru hafıza kaydını buluyoruz.
        const { error: memoryError } = await supabaseAdmin
            .from("memory_embeddings")
            .delete()
            .eq("source_event_id", event_id)
            .eq("user_id", user.id); // Sadece bu kullanıcıya ait olanı sil

        if (memoryError) {
            console.error(
                `Hafıza silme hatası (Event ID: ${event_id}):`,
                memoryError.message,
            );
            // Hata olsa bile devam et, en azından resmi raporu silmeyi deneyelim.
        } else {
            console.log(
                `[MEMORY-DELETE] Event ${event_id} ile ilişkili hafıza kaydı silindi.`,
            );
        }

        // 2. SONRA GÜNLÜK KAYDINI (RESMİ RAPORU) SİL
        const { error: eventError } = await supabaseAdmin
            .from("events")
            .delete()
            .eq("id", event_id)
            .eq("user_id", user.id); // Sadece bu kullanıcıya ait olanı sil

        if (eventError) throw eventError;
        console.log(`[EVENT-DELETE] Event ${event_id} resmi kaydı silindi.`);

        return new Response(
            JSON.stringify({
                message: "Rüya ve ilgili anılar başarıyla silindi.",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
