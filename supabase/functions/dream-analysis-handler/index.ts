// supabase/functions/dream-analysis-handler/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";
import { cors, corsHeaders } from "../_shared/cors.ts";
import { LoggingService } from "../_shared/utils/LoggingService.ts";
import * as DreamService from "../_shared/services/dream.service.ts";
import { createErrorResponse, ValidationError } from "../_shared/errors.ts";

serve(async (req: Request) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors(req) });
  }

  let transactionId: string | undefined;
  try {
    // Gateway'den gelen payload'ı al
    const body = await req.json();
    const { userVault, payload } = body;
    transactionId = body.transactionId;

    if (!transactionId || typeof transactionId !== "string") {
      throw new ValidationError("transactionId gerekli");
    }

    if (!userVault) {
      throw new ValidationError("userVault gerekli");
    }

    // Payload'dan dreamText ve language'i al
    const { dreamText, language } = payload as {
      dreamText?: string;
      language?: string;
    };

    if (
      !dreamText || typeof dreamText !== "string" ||
      dreamText.trim().length < 10
    ) {
      throw new ValidationError("Analiz için yetersiz rüya metni.");
    }

    // Gateway'den userId'yi al
    const userId = body.userId;
    if (!userId || typeof userId !== "string") {
      throw new ValidationError("userId gerekli");
    }

    // KULLANICI CLIENT'I OLUŞTUR (RLS güvenliği için)
    // Gateway'den gelen Authorization header'ı kullanarak RLS politikalarına uyan istemci oluşturuluyor
    const supabaseClient = createSupabaseClient(req);

    // Logger oluştur
    const logger = new LoggingService(transactionId, userId);

    // Merkezi servisi kullan
    const result = await DreamService.analyzeDream({
      supabaseClient,
      userId,
      dreamText,
      transactionId,
      language: language ?? "en",
      logger,
    });

    return new Response(
      JSON.stringify({ eventId: result.eventId }),
      {
        status: 200,
        headers: {
          ...cors(req),
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: unknown) {
    const finalTransactionId = transactionId ?? crypto.randomUUID();
    return createErrorResponse(req, error, finalTransactionId, corsHeaders);
  }
});
