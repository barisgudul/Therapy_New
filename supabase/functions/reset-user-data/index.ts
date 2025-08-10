// supabase/functions/reset-user-data/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 🔥 DÜZELTME 1: Diğer fonksiyonlarda yaptığımız gibi,
// hataları güvenli bir şekilde metne çeviren yardımcı fonksiyonumuzu ekliyoruz.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

interface SupabaseAuthAdminLike {
  updateUserById(
    userId: string,
    params: { user_metadata: Record<string, unknown> },
  ): Promise<{ error: unknown | null }>;
}

interface SupabaseClientLike {
  auth: {
    getUser(
      jwt: string,
    ): Promise<
      {
        data: {
          user: { id: string; user_metadata?: Record<string, unknown> } | null;
        };
      }
    >;
    admin: SupabaseAuthAdminLike;
  };
}

export async function handleResetUserData(
  req: Request,
  providedClient?: SupabaseClientLike,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin: SupabaseClientLike = providedClient ?? createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as unknown as SupabaseClientLike;

    // Gelen token'ı kontrol et
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Geçersiz kullanıcı veya oturum.");

    // Kullanıcıyı silinme durumuna al
    const { error: updateError } = await supabaseAdmin.auth.admin
      .updateUserById(
        user.id,
        {
          user_metadata: {
            ...(user.user_metadata || {}),
            status: "pending_deletion",
            deletion_scheduled_at: new Date().toISOString(),
          },
        },
      );
    if (updateError) throw updateError;

    // Başarılı yanıtı gönder
    return new Response(
      JSON.stringify({ message: "Hesap silinme için sıraya alındı." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) { // 🔥 DÜZELTME 2: 'error' artık 'unknown' tipinde.
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401, // Yetkilendirme veya genel hata için 401 veya 400 daha uygun.
    });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handleResetUserData(req));
}
