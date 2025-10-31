// supabase/functions/unified-ai-gateway/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  createSupabaseClient,
  getUserVault,
} from "../_shared/supabase-client.ts";
import { transformRequest } from "../_shared/utils.ts";
import { cors, corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { assertAndConsumeQuota, type FeatureKey } from "../_shared/quota.ts";
import { createErrorResponse, getErrorMessage } from "../_shared/errors.ts";

console.log("Unified AI Gateway function initialized");

// Intent'ten FeatureKey'e mapping
function mapIntentToFeature(intent: string): FeatureKey | null {
  switch (intent) {
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
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: cors(req),
    });
  }

  const transactionId = crypto.randomUUID();
  const correlationId = req.headers.get("x-correlation-id") ?? transactionId;

  try {
    const originalRequestBody = await req.json();
    const supabase = createSupabaseClient(req);

    // 1. ADAPTÖR: Gelen isteği dahili formata dönüştür
    const { intent, payload, mood, language } = transformRequest(
      originalRequestBody,
    );
    console.log(`[${transactionId}] Intent received: ${intent}`);

    // 2. KULLANICI DOĞRULAMA VE VERİ ÇEKME
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Kullanıcı doğrulanamadı.");
    }

    // Vault'u kullanıcının kendi yetkileriyle çek (RLS güvenliği için)
    const userVault = await getUserVault(supabase, user.id);
    if (!userVault) {
      console.warn(
        `[${transactionId}] User vault not found for user ${user.id}`,
      );
      // Vault yoksa boş obje kullan (mevcut sistem davranışı ile uyumlu)
    }

    // Admin client SADECE quota gibi RLS-dışı işlemler için kullanılmalıdır
    const adminClient = getSupabaseAdmin();

    // 3. QUOTA KONTROLÜ (özelliğe göre)
    const feature = mapIntentToFeature(intent);
    if (feature) {
      try {
        await assertAndConsumeQuota(adminClient, user.id, feature, 1);
      } catch (quotaError) {
        const status =
          (quotaError as { status?: number } | undefined)?.status ?? 500;
        const message = status === 402
          ? "quota_exceeded"
          : (quotaError as Error)?.message || "internal_server_error";
        return new Response(JSON.stringify({ error: message }), {
          headers: {
            ...cors(req),
            "x-correlation-id": correlationId,
            "Content-Type": "application/json",
          },
          status,
        });
      }
    }

    // 4. BAĞIMSIZ GÜVENLİK SERVİSİNİ ÇAĞIRMA
    try {
      const { data: safetyData, error: safetyError } = await supabase.functions
        .invoke("safety-guard", {
          body: { text: JSON.stringify(payload) },
        });

      if (safetyError) {
        throw new Error(`Safety Guard check failed: ${safetyError.message}`);
      }

      // Safety guard başarısız olduysa (400 status) buraya gelmez, zaten hata fırlatır
      if (safetyData && !safetyData.safe) {
        throw new Error("Güvenlik kontrolü başarısız oldu.");
      }
    } catch (safetyCheckError) {
      // Safety guard'dan gelen hata mesajını koru
      if (safetyCheckError instanceof Error) {
        return new Response(
          JSON.stringify({ error: safetyCheckError.message }),
          {
            status: 400,
            headers: {
              ...cors(req),
              "x-correlation-id": correlationId,
              "Content-Type": "application/json",
            },
          },
        );
      }
      throw safetyCheckError;
    }

    // 5. YÖNLENDİRME
    let handlerResponse: unknown;

    switch (intent) {
      case "dream_analysis":
        {
          // Auth başlığını al ve handler'a aktar (RLS güvenliği için)
          const authHeader = req.headers.get("Authorization");
          if (!authHeader) {
            throw new Error("Authorization header bulunamadı");
          }

          const { data: dreamData, error: dreamError } = await supabase
            .functions.invoke("dream-analysis-handler", {
              body: {
                userVault: userVault ?? {},
                payload,
                transactionId,
                userId: user.id,
              },
              // KULLANICININ YETKİSİNİ AKTAR (RLS güvenliği için)
              headers: {
                Authorization: authHeader,
              },
            });
          if (dreamError) throw dreamError;
          handlerResponse = dreamData;
        }
        break;

      // YENİ HANDLER'LAR BURAYA EKLENECEK
      // case 'daily_reflection':
      //   const { data: dailyData, error: dailyError } = await supabase.functions.invoke('daily-reflection-handler', {
      //     body: { userVault, payload, transactionId, mood, language },
      //   });
      //   if (dailyError) throw dailyError;
      //   handlerResponse = dailyData;
      //   break;

      default:
        // Bilinmeyen veya henüz taşınmamış intent'ler için eski sisteme yönlendir
        console.log(
          `[${transactionId}] Intent '${intent}' is unknown, forwarding to orchestrator.`,
        );
        const { data: defaultOrchData, error: defaultOrchError } =
          await supabase.functions.invoke("orchestrator", {
            body: originalRequestBody, // Eski sisteme orijinal formatı gönder
          });
        if (defaultOrchError) throw defaultOrchError;
        handlerResponse = defaultOrchData;
        break;
    }

    // 6. MERKEZİ LOGLAMA (Başarılıysa)
    try {
      await adminClient.from("ai_logs").insert({
        transaction_id: transactionId,
        user_id: user.id,
        intent: intent,
        success: true,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Loglama hatası işlemi durdurmamalı
      console.error(`[${transactionId}] Logging failed:`, logError);
    }

    return new Response(JSON.stringify(handlerResponse), {
      status: 200,
      headers: {
        ...cors(req),
        "x-correlation-id": correlationId,
        "Content-Type": "application/json",
      },
    });
  } catch (error: unknown) {
    // Hata loglama (eğer user bilgisi varsa)
    try {
      const supabase = createSupabaseClient(req);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const adminClient = getSupabaseAdmin();
        await adminClient.from("ai_logs").insert({
          transaction_id: transactionId,
          user_id: user.id,
          intent: "unknown",
          success: false,
          error_message: getErrorMessage(error),
          created_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      // Loglama hatası görmezden gel
      console.error(`[${transactionId}] Error logging failed:`, logError);
    }

    return createErrorResponse(req, error, transactionId, {
      ...cors(req),
      "x-correlation-id": correlationId,
    });
  }
});
