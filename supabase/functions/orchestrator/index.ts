// supabase/functions/orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { getUserVault } from "../_shared/vault.service.ts";
import { eventHandlers } from "../_shared/orchestration.handlers.ts";
import type { EventPayload } from "../_shared/event.service.ts";
import type { InteractionContext } from "../_shared/types/context.ts";
import { isAppError } from "../_shared/errors.ts";
import { LoggingService } from "../_shared/utils/LoggingService.ts";

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
    const transactionId = generateId();

    // LOGGER'I OLUŞTUR
    const logger = new LoggingService(transactionId, user.id);
    logger.info("Orchestrator", "İşlem başlıyor", {
      eventType: eventPayload.type,
    });

    const initialVault = await getUserVault(user.id, adminClient) ?? {};
    const context: InteractionContext = {
      transactionId,
      userId: user.id,
      initialVault,
      initialEvent: {
        ...eventPayload,
        id: generateId(),
        user_id: user.id,
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
      },
      logger,
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

    if (typeof result === "string") {
      // RÜYA ANALİZİ vb. için string ise eventId olarak sarmala
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
    console.error(
      "[Orchestrator] KRİTİK HATA:",
      (error as Error)?.message,
      error,
    );

    let responseBody: { error: string; code: string };
    let statusCode: number;

    // Hatanın bizim tanımladığımız özel bir hata olup olmadığını kontrol ediyoruz
    if (isAppError(error)) {
      responseBody = {
        error: error.message,
        code: error.code, // Hatanın etiketini (örn: "VALIDATION_ERROR") ekliyoruz
      };
      // Genellikle kullanıcıdan kaynaklı hatalar 400'dür.
      statusCode = 400;
    } else {
      // Eğer bizim tanımlamadığımız, beklenmedik bir sistem hatasıysa
      responseBody = {
        error: "Sistemde beklenmedik bir sorun oluştu.",
        code: "INTERNAL_SERVER_ERROR", // Genel sistem hatası etiketi
      };
      // Bu bizim suçumuz, sunucu hatası olarak 500 dönmeliyiz.
      statusCode = 500;
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: statusCode,
    });
  }
});
