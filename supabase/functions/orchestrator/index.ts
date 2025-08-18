// supabase/functions/orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { getUserVault } from "../_shared/vault.service.ts";
import { eventHandlers } from "../_shared/orchestration.handlers.ts";
import type { EventPayload } from "../_shared/event.service.ts";
import type { InteractionContext } from "../_shared/types/context.ts";

function generateId(): string {
  // Deno'da crypto.randomUUID() standarttır ve daha güvenlidir.
  return crypto.randomUUID();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { eventPayload } = body as { eventPayload: EventPayload };

    // GÜVENLİK KONTROLÜ
    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(jwt);
    if (!user) throw new Error("Kullanıcı doğrulanamadı.");
    if (!eventPayload || !eventPayload.type) {
      throw new Error("Geçersiz eventPayload.");
    }

    // CONTEXT OLUŞTURMA
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

    // DOĞRU HANDLER'I BUL VE ÇALIŞTIR
    const handler = eventHandlers[eventPayload.type] ||
      eventHandlers["default"];
    if (!handler) {
      throw new Error(`'${eventPayload.type}' için handler bulunamadı.`);
    }

    const result = await handler(context);

    // SON DİKİŞ: DÖNEN SONUCUN TİPİNİ KONTROL ET VE STANDARTLAŞTIR
    let responsePayload: unknown;

    // RÜYA ANALİZİ GİBİ SADECE ID DÖNEN DURUMLAR İÇİN: her zaman tutarlı bir JSON objesi döndür.
    if (typeof result === "string") {
      responsePayload = { eventId: result };
    } else {
      // GÜNLÜK GİBİ KOMPLEKS OBJE DÖNEN DURUMLAR İÇİN: zaten obje olanı olduğu gibi kullan.
      responsePayload = result;
    }

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    console.error("[Orchestrator] KRİTİK HATA:", message, error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
