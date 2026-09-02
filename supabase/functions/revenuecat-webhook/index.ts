// supabase/functions/revenuecat-webhook/index.ts
//
// Receives RevenueCat webhook events and mirrors the resulting entitlement into
// our plan tables via the existing `assign_plan_to_user` RPC, so server-side
// feature enforcement (`check_feature_usage`) stays in sync with real purchases.
//
// Deploy:  supabase functions deploy revenuecat-webhook --no-verify-jwt
// Secret:  supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random-string>
// Dashboard → Integrations → Webhooks:
//   URL    = https://<project>.functions.supabase.co/revenuecat-webhook
//   Header = Authorization: Bearer <same random-string>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type PlanName = "Free" | "+Plus" | "Premium";

const ENTITLEMENT_PREMIUM = "gisbel";
const ENTITLEMENT_PLUS = "plus";

interface RevenueCatEvent {
  id?: string;
  type: string;
  app_user_id?: string;
  aliases?: string[];
  original_app_user_id?: string;
  entitlement_ids?: string[] | null;
}

function resolvePlan(entitlementIds: readonly string[]): PlanName {
  if (entitlementIds.includes(ENTITLEMENT_PREMIUM)) return "Premium";
  if (entitlementIds.includes(ENTITLEMENT_PLUS)) return "+Plus";
  return "Free";
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function handleRevenueCatWebhook(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Shared-secret auth (RevenueCat sends the header we configured).
  const expected = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 2. Parse.
  let event: RevenueCatEvent;
  try {
    const payload = await req.json();
    event = payload?.event;
    if (!event?.type) throw new Error("missing event");
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  // 3. Only events that change entitlement state need a write. Others are ack'd.
  const ACTIONABLE = new Set([
    "INITIAL_PURCHASE",
    "RENEWAL",
    "PRODUCT_CHANGE",
    "UNCANCELLATION",
    "EXPIRATION",
    "SUBSCRIPTION_PAUSED",
    "TRANSFER",
    "BILLING_ISSUE",
  ]);
  if (!ACTIONABLE.has(event.type)) {
    return json({ ok: true, skipped: event.type }, 200);
  }

  const userId = event.app_user_id ?? event.original_app_user_id;
  if (!userId || userId.startsWith("$RCAnonymousID:")) {
    // Anonymous customer never logged in — nothing to sync server-side.
    return json({ ok: true, skipped: "anonymous" }, 200);
  }

  const plan = resolvePlan(event.entitlement_ids ?? []);

  // 4. Write via service role.
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Server misconfigured" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.rpc("assign_plan_to_user", {
    p_user_id: userId,
    p_plan_name: plan,
  });

  if (error) {
    console.error(`[revenuecat-webhook] assign_plan_to_user failed for ${userId}:`, error.message);
    // 500 so RevenueCat retries.
    return json({ error: error.message }, 500);
  }

  console.log(`[revenuecat-webhook] ${event.type} -> ${userId} = ${plan}`);
  return json({ ok: true, plan }, 200);
}

if (import.meta.main) {
  Deno.serve((req) => handleRevenueCatWebhook(req));
}
