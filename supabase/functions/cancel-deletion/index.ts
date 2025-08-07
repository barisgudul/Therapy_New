// supabase/functions/cancel-deletion/index.ts (ZIRHLI VERSİYON)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Hata mesajlarını güvenli bir şekilde almak için standart yardımcımız.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Geçersiz kullanıcı veya oturum.");

    // Kullanıcı durumunu tekrar 'active' yap
    const { error: updateError } = await supabaseAdmin.auth.admin
      .updateUserById(
        user.id,
        {
          user_metadata: {
            ...user.user_metadata,
            status: "active",
            deletion_scheduled_at: null,
          },
        },
      );
    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: "Hesap silme işlemi iptal edildi." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) { // Hataları güvenli bir şekilde yakala
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
