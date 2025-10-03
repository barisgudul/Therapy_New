// supabase/functions/orchestrator/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { cors, corsHeaders as _corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { getUserVault } from "../_shared/services/vault.service.ts";
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
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Dependency injection interfaces
interface OrchestratorDependencies {
  supabaseClient?: SupabaseClient;
  aiService?: typeof AiService;
  vaultService?: typeof VaultService;
  ragService?: typeof RagService;
  contextBuilder?: {
    buildTextSessionContext: typeof Context.buildTextSessionContext;
    buildDailyReflectionContext:
      typeof DailyReflectionContext.buildDailyReflectionContext;
    buildDreamAnalysisContext: typeof DreamContext.buildDreamAnalysisContext;
  };
  logRagInvocation?: typeof logRagInvocation;
  assertAndConsumeQuota?: typeof assertAndConsumeQuota;
  getUserVault?: typeof getUserVault;
  eventHandlers?: typeof eventHandlers;
}

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

export async function handleOrchestrator(
  req: Request,
  dependencies?: OrchestratorDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors(req) } });
  }

  const cid = req.headers.get("x-correlation-id") ?? crypto.randomUUID();

  try {
    const body = await req.json();
    const { eventPayload } = body as { eventPayload: EventPayload };

    // GÜVENLİK KONTROLÜ
    const adminClient = dependencies?.supabaseClient ?? getSupabaseAdmin();
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
        const quotaFn = dependencies?.assertAndConsumeQuota ??
          assertAndConsumeQuota;
        await quotaFn(adminClient, user.id, feature, 1);
      } catch (quotaError) {
        const status =
          (quotaError as { status?: number } | undefined)?.status ?? 500;
        const message = status === 402
          ? "quota_exceeded"
          : (quotaError as Error)?.message || "internal_server_error";
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

    const getUserVaultFn = dependencies?.getUserVault ?? getUserVault;
    const initialVault = await getUserVaultFn(user.id, adminClient) ?? {};
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
    const handlerDependencies: HandlerDependencies = {
      supabaseClient: adminClient,
      aiService: dependencies?.aiService ?? AiService,
      vaultService: dependencies?.vaultService ?? VaultService,
      ragService: dependencies?.ragService ?? RagService,
      logRagInvocation: dependencies?.logRagInvocation ?? logRagInvocation,
      contextBuilder: dependencies?.contextBuilder ?? {
        buildTextSessionContext: Context.buildTextSessionContext,
        buildDailyReflectionContext:
          DailyReflectionContext.buildDailyReflectionContext,
        buildDreamAnalysisContext: DreamContext.buildDreamAnalysisContext,
      },
    };

    // DOĞRU HANDLER'I BUL VE ÇALIŞTIR
    const handlers = dependencies?.eventHandlers ?? eventHandlers;
    const handler = handlers[eventPayload.type] || handlers["default"];
    if (!handler) {
      throw new Error(`'${eventPayload.type}' için handler bulunamadı.`);
    }

    const result = await handler(handlerDependencies, context);

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
    const message = (error as Error)?.message || "Bilinmeyen bir hata oluştu.";
    console.error("[Orchestrator] KRİTİK HATA:", message, error);

    // Hatanın bizim özel hatamız olup olmadığını kontrol et
    const isValidationError = isAppError(error);

    return new Response(
      JSON.stringify({
        error: message,
        code: isValidationError ? error.code : "INTERNAL_SERVER_ERROR",
      }),
      {
        headers: {
          ...cors(req),
          "x-correlation-id": cid,
          "Content-Type": "application/json",
        },
        status: isValidationError ? 400 : 500, // Validation hataları için 400, diğer her şey için 500 dön
      },
    );
  }
}

serve((req: Request) => handleOrchestrator(req));
