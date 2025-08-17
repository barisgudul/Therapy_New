// supabase/functions/orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { ControlledHybridPipeline } from "../_shared/controlled-hybrid-pipeline.service.ts";
import { SystemHealthMonitor } from "../_shared/system-health-monitor.service.ts";
import type { EventPayload } from "../_shared/event.service.ts";
import type { InteractionContext } from "../_shared/types/context.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { getUserVault } from "../_shared/vault.service.ts";

function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(jwt);
    if (!user) throw new Error("Kullanıcı doğrulanamadı.");

    const { eventPayload } = await req.json() as { eventPayload: EventPayload };
    if (!eventPayload || !eventPayload.type) {
      throw new Error("Geçersiz eventPayload.");
    }

    // Vault'u sunucuda al
    const initialVault = await getUserVault(user.id, adminClient) ?? {};

    const context: InteractionContext = {
      transactionId: generateId(),
      userId: user.id,
      initialVault,
      initialEvent: {
        ...eventPayload,
        id: generateId(),
        user_id: user.id,
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
      },
      derivedData: {},
    };

    // Sistem sağlığı
    const systemHealth = await SystemHealthMonitor.evaluateSystemHealth();
    if (systemHealth.health_score < 60) {
      return new Response(
        JSON.stringify("Sistem şu an yoğun, lütfen daha sonra tekrar deneyin."),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pipeline tipi belirle (basit eşleştirme)
    const pipelineType = (() => {
      switch (eventPayload.type) {
        case "text_session":
        case "voice_session":
        case "video_session":
          return "therapy_session";
        case "dream_analysis":
          return "dream_analysis";
        case "daily_reflection":
          return "daily_reflection";
        case "diary_entry":
          return "diary_management";
        case "ai_analysis":
          return "deep_analysis";
        case "onboarding_completed":
          return "insight_synthesis";
        default:
          return "deep_analysis";
      }
    })();

    const result = await ControlledHybridPipeline.executeComplexQuery(
      context,
      pipelineType,
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
