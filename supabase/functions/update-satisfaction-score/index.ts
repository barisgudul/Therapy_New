// supabase/functions/update-satisfaction-score/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { ValidationError } from "../_shared/errors.ts";
import { LoggingService } from "../_shared/utils/LoggingService.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpdateSatisfactionRequest {
  log_id: string;
  score: number;
}

export async function handleUpdateSatisfaction(
  req: Request,
  providedClient?: SupabaseClient,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Kullanıcı kimlik doğrulaması
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new ValidationError("Yetkilendirme başlığı eksik");
    }

    const adminClient = providedClient ?? getSupabaseAdmin();
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(jwt);
    if (!user) {
      throw new ValidationError("Kullanıcı doğrulanamadı");
    }

    // Logger oluştur
    const logger = new LoggingService(crypto.randomUUID(), user.id);

    // İstek gövdesini parse et
    const body: UpdateSatisfactionRequest = await req.json();
    const { log_id, score } = body;

    // Validasyon
    if (!log_id || typeof log_id !== "string") {
      throw new ValidationError("Geçersiz log_id");
    }

    if (typeof score !== "number" || (score !== 1 && score !== -1)) {
      throw new ValidationError(
        "Geçersiz skor. Sadece 1 (thumbs up) veya -1 (thumbs down) kabul edilir",
      );
    }

    logger.info(
      "UpdateSatisfaction",
      `Log ${log_id} için skor güncellemesi: ${score}`,
    );

    // Güvenli güncelleme: Sadece kullanıcının kendi logunu güncellemesine izin ver
    const { data, error } = await adminClient
      .from("ai_decision_log")
      .update({
        user_satisfaction_score: score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", log_id)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) {
      console.error("[UpdateSatisfaction] Veritabanı hatası:", error);
      throw new ValidationError("Skor güncellenirken bir hata oluştu");
    }

    if (!data) {
      throw new ValidationError("Log bulunamadı veya güncelleme yetkiniz yok");
    }

    logger.info(
      "UpdateSatisfaction",
      `Başarıyla güncellendi: log ${log_id}, skor ${score}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Skor başarıyla güncellendi",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("[UpdateSatisfaction] Hata:", error);

    // Hata türüne göre yanıt
    let statusCode = 500;
    let errorMessage = "Bir hata oluştu";

    if (error instanceof ValidationError) {
      statusCode = 400;
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode,
      },
    );
  }
}

serve((req: Request) => handleUpdateSatisfaction(req));
