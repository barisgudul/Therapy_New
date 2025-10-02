// supabase/functions/orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { cors, corsHeaders as _corsHeaders } from "../_shared/cors.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import { getUserVault } from "../_shared/vault.service.ts";
import {
  eventHandlers,
  type HandlerDependencies,
} from "../_shared/services/orchestration.handlers.ts";
import type { EventPayload } from "../_shared/services/event.service.ts";
import type { InteractionContext } from "../_shared/types/context.ts";
import { isAppError } from "../_shared/errors.ts";
import { LoggingService } from "../_shared/utils/LoggingService.ts";
import { assertAndConsumeQuota, type FeatureKey } from "../_shared/quota.ts";
import * as AiService from "../_shared/services/ai.service.ts";
import * as VaultService from "../_shared/services/vault.service.ts";
import * as RagService from "../_shared/services/rag.service.ts";
import * as Context from "../_shared/contexts/session.context.builder.ts";
import * as DailyReflectionContext from "../_shared/contexts/dailyReflection.context.service.ts";
import * as DreamContext from "../_shared/contexts/dream.context.service.ts";
import { logRagInvocation } from "../_shared/utils/logging.service.ts";

function generateId(): string {
  // Deno'da crypto.randomUUID() standarttır ve daha güvenlidir.
  return crypto.randomUUID();
}

function mapEventTypeToFeature(type: string): FeatureKey | null {
  switch (type) {
    case "dream_analysis":
      return "dream_analysis";
    case "daily_reflection":
      return "daily_reflection";
    case "text_session":
      return "text_sessions";
    case "diary_entry":
      return "diary_write";
    default:
      return null;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors(req) } });
  }

  const cid = req.headers.get("x-correlation-id") ?? crypto.randomUUID();

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

    // BODYGUARD: Kota kontrolü (özelliğe göre)
    const feature = mapEventTypeToFeature(eventPayload.type);
    if (feature) {
      try {
        await assertAndConsumeQuota(adminClient, user.id, feature, 1);
      } catch (quotaError) {
        const status =
          (quotaError as { status?: number } | undefined)?.status ?? 500;
        const message = status === 402
          ? "quota_exceeded"
          : "internal_server_error";
        return new Response(JSON.stringify({ error: message }), {
          headers: {
            ...cors(req),
            "x-correlation-id": cid,
            "Content-Type": "application/json",
          },
          status,
        });
      }
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

    // DEPENDENCIES OLUŞTUR
    const dependencies: HandlerDependencies = {
      supabaseClient: adminClient,
      aiService: AiService,
      vaultService: VaultService,
      ragService: RagService,
      logRagInvocation,
      contextBuilder: {
        buildTextSessionContext: Context.buildTextSessionContext,
        buildDailyReflectionContext:
          DailyReflectionContext.buildDailyReflectionContext,
        buildDreamAnalysisContext: DreamContext.buildDreamAnalysisContext,
      },
    };

    // DOĞRU HANDLER'I BUL VE ÇALIŞTIR
    const handler = eventHandlers[eventPayload.type] ||
      eventHandlers["default"];
    if (!handler) {
      throw new Error(`'${eventPayload.type}' için handler bulunamadı.`);
    }

    const result = await handler(dependencies, context);

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
      headers: {
        ...cors(req),
        "x-correlation-id": cid,
        "Content-Type": "application/json",
      },
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
      headers: {
        ...cors(req),
        "x-correlation-id": cid,
        "Content-Type": "application/json",
      },
      status: statusCode,
    });
  }
});
