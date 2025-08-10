// supabase/functions/assign-free-plan/index.ts (MODERN VE SAĞLAM VERSİYON)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts"; // 🔥 DÜZELTME 1: Standart cors import'unu kullanıyoruz.

// Hata mesajlarını güvenli bir şekilde almak için standart yardımcımız.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// Test edilebilir minimal Supabase arayüzü
interface SupabaseAuthLike {
  getUser(
    jwt: string,
  ): Promise<{ data: { user: { id: string } | null }; error: unknown | null }>;
}

interface SupabaseFromLike {
  select(columns: string): SupabaseFromLike;
  eq(column: string, value: string): SupabaseFromLike;
  maybeSingle(): Promise<
    { data: { id: string } | null; error: unknown | null }
  >;
  single(): Promise<{ data: { id: string } | null; error: unknown | null }>;
  insert(values: Record<string, unknown>): Promise<{ error: unknown | null }>;
}

interface SupabaseClientLike {
  auth: SupabaseAuthLike;
  from(table: string): SupabaseFromLike;
}

export async function handleAssignFreePlan(
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Yetkilendirme başlığı eksik.");

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth
      .getUser(jwt);

    if (userError) throw userError;
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const { data: existingSubscription, error: selectError } =
      await supabaseAdmin
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
    if (selectError) throw selectError;

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ message: "Kullanıcının zaten bir aboneliği var." }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const { data: freePlan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("name", "Free")
      .single();
    if (planError) throw planError;
    if (!freePlan) {
      throw new Error('"Free" abonelik planı veritabanında bulunamadı.');
    }

    const endsAt = new Date();
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    const { error: insertError } = await supabaseAdmin
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: freePlan.id,
        status: "active",
        starts_at: new Date().toISOString(),
        ends_at: endsAt.toISOString(),
        auto_renew: false,
      });
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ message: '"Free" plan başarıyla atandı.' }),
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

// 🔥 DÜZELTME 2: Artık modern Deno.serve kullanıyoruz ve test edilebilir handler'a delegasyon yapıyoruz.
if (import.meta.main) {
  Deno.serve((req) => handleAssignFreePlan(req));
}
