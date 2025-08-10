// supabase/functions/delete-dream-memory/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Test edilebilir arayüzler
interface SupabaseAuthLike {
  getUser(jwt: string): Promise<{ data: { user: { id: string } | null } }>;
}

interface SupabaseFromLike {
  delete(): SupabaseFromLike;
  eq(column: string, value: string): SupabaseFromLike;
}

interface SupabaseClientLike {
  auth: SupabaseAuthLike;
  from(table: string): SupabaseFromLike;
}

export async function handleDeleteDreamMemory(
  req: Request,
  providedClient?: SupabaseClientLike,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { event_id } = await req.json();
    if (!event_id) {
      throw new Error("Silinecek rüyanın 'event_id'si eksik.");
    }

    const supabaseAdmin: SupabaseClientLike = providedClient ?? createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    ) as unknown as SupabaseClientLike;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Geçersiz kullanıcı veya oturum.");

    // 1. ÖNCE BEYNİN HAFIZASINI SİL
    await supabaseAdmin
      .from("memory_embeddings")
      .delete()
      .eq("source_event_id", event_id)
      .eq("user_id", user.id);

    // 2. SONRA GÜNLÜK KAYDINI (RESMİ RAPORU) SİL
    await supabaseAdmin
      .from("events")
      .delete()
      .eq("id", event_id)
      .eq("user_id", user.id);

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
}

if (import.meta.main) {
  Deno.serve((req) => handleDeleteDreamMemory(req));
}
