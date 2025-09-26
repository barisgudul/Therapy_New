// supabase/functions/delete-session-and-memories/index.ts

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
            throw new Error(
                "Silinecek seansın 'event_id'si eksik. Bu bir 'session_end' ID'si olmalı.",
            );
        }

        // Admin client, RLS'i bypass eder, bu yüzden yetki kontrolünü kendimiz yapacağız.
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        // KULLANICI KİMLİK DOĞRULAMA
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");
        const jwt = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
        if (!user) throw new Error("Geçersiz kullanıcı veya oturum.");

        // --- SİLME OPERASYONU ---

        // Adım 1: Silinmesi istenen 'session_end' olayını bul ve sahibinin bu kullanıcı olduğunu doğrula.
        const { data: sessionEndEvent, error: findError } = await supabaseAdmin
            .from("events")
            .select("id, created_at, user_id")
            .eq("id", event_id)
            .eq("type", "session_end")
            .eq("user_id", user.id)
            .single();

        if (findError || !sessionEndEvent) {
            // Eğer olay bulunamazsa veya sahibi bu kullanıcı değilse, sanki hiç var olmamış gibi davran.
            // Bu, başkalarının seanslarını taramaya çalışanları engeller.
            console.warn(
                `Kullanıcı ${user.id}, var olmayan veya kendine ait olmayan ${event_id} seansını silmeye çalıştı.`,
            );
            return new Response(
                JSON.stringify({ message: "Seans başarıyla silindi." }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                    status: 200, // Başarılıymış gibi dön, bilgi sızdırma.
                },
            );
        }

        // Adım 2: İlişkili 'text_session' olayını bul.
        // Bu, 'session_end' olayından hemen önce, aynı kullanıcı tarafından oluşturulmuş en son 'text_session' kaydıdır.
        const { data: relatedTextSessionEvent, error: textSessionError } =
            await supabaseAdmin
                .from("events")
                .select("id")
                .eq("user_id", user.id)
                .eq("type", "text_session")
                .lte("created_at", sessionEndEvent.created_at) // Bitiş zamanından önce veya aynı anda
                .order("created_at", { ascending: false }) // En son olanı bul
                .limit(1)
                .single();

        if (textSessionError) {
            console.warn(
                `'session_end' ${event_id} için ilişkili 'text_session' bulunamadı. Hata:`,
                textSessionError.message,
            );
            // İlişkili text_session olmasa bile devam et, en azından diğerlerini sil.
        }

        const eventsToDelete = [event_id];
        if (relatedTextSessionEvent) {
            eventsToDelete.push(relatedTextSessionEvent.id);
        }

        // Adım 3: İLİŞKİLİ TÜM 'cognitive_memories' KAYITLARINI SİL.
        // source_event_id'si 'session_end' ID'si olanları hedef alıyoruz.
        const { error: memoryError } = await supabaseAdmin
            .from("cognitive_memories")
            .delete()
            .eq("source_event_id", event_id)
            .eq("user_id", user.id);

        if (memoryError) {
            throw new Error(
                `İlişkili beyin anıları silinemedi: ${memoryError.message}`,
            );
        }

        // Adım 4: HEM 'session_end' HEM DE İLİŞKİLİ 'text_session' olaylarını SİL.
        // .in() kullanarak iki kaydı tek seferde siliyoruz.
        const { error: eventError } = await supabaseAdmin
            .from("events")
            .delete()
            .in("id", eventsToDelete)
            .eq("user_id", user.id);

        if (eventError) {
            throw new Error(
                `Ana seans kayıtları silinemedi: ${eventError.message}`,
            );
        }

        return new Response(
            JSON.stringify({
                message: "Seans ve ilgili tüm anılar başarıyla silindi.",
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error("Seans silme fonksiyonunda kritik hata:", error);
        return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
