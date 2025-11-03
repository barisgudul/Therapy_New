// supabase/functions/generate-report/index.ts
import { Sentry } from "../_shared/sentry.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { cors } from "../_shared/cors.ts";
import { getAuthContext, isPreflight } from "../_shared/auth.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { generateElegantReport } from "../_shared/services/ai.service.ts";
import { logRagInvocation } from "../_shared/utils/logging.service.ts";
import { getUserVault } from "../_shared/services/vault.service.ts";

const RequestBodySchema = z.object({
  days: z.number().int().min(1).max(365),
  language: z.enum(["tr", "en", "de"]).optional(),
});

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function handler(req: Request): Promise<Response> {
  const headers = cors(req);
  if (isPreflight(req)) return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth via user JWT (RLS için kim, admin için veri erişimi)
    const { user } = await getAuthContext(req);

    const body = await req.json();
    const parsed = RequestBodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    const { days, language } = parsed.data;

    const admin = getSupabaseAdmin();

    // 1) Kullanıcı vault'u
    const vault = await getUserVault(user.id, admin);
    if (!vault) {
      return new Response(JSON.stringify({ error: "vault_not_found" }), {
        status: 404,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    // 2) Embed tabanlı hafıza eşleşmesi (RPC: match_memories)
    const therapyGoals = vault.profile?.therapyGoals || "kişisel gelişim";
    const searchQuery = days <= 10
      ? `Son ${days} gün: günlük olaylar, duygusal değişimler ve zorluklar.`
      : `Hedef: ${therapyGoals}. Son ${days} gün: kalıcı temalar ve desenler.`;

    const { data: embedData, error: embedError } = await admin.functions.invoke(
      "api-gateway",
      { body: { type: "gemini-embed", payload: { content: searchQuery } } },
    );
    if (embedError || !embedData?.embedding) {
      throw new Error("embedding_failed");
    }
    const query_embedding = embedData.embedding as number[];

    const startDateIso = new Date(Date.now() - days * 86400000).toISOString();
    const { data: memories, error: memoriesError } = await admin.rpc(
      "match_memories",
      {
        query_embedding,
        match_threshold: days <= 7 ? 0.45 : days <= 15 ? 0.5 : 0.55,
        match_count: days <= 7 ? 40 : days <= 15 ? 30 : 25,
        p_user_id: user.id,
        start_date: startDateIso,
      },
    );
    if (memoriesError) throw memoriesError;

    await logRagInvocation(admin, {
      user_id: user.id,
      source_function: "ai_summary",
      search_query: searchQuery,
      retrieved_memories: memories || [],
    });

    // 3) Rapor üretimi
    const report = await generateElegantReport(
      { supabase: admin },
      vault,
      memories || [],
      days,
      undefined,
      language,
    );

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    Sentry.captureException(error);
    const message = getErrorMessage(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors(req), "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handler(req));
}
