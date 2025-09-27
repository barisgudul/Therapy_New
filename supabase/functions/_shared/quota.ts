// supabase/functions/_shared/quota.ts

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type FeatureKey =
  | "text_sessions"
  | "dream_analysis"
  | "diary_write"
  | "daily_reflection"
  | "ai_reports"
  | "voice_minutes";

export async function assertAndConsumeQuota(
  admin: SupabaseClient,
  userId: string,
  feature: FeatureKey,
  amount = 1,
): Promise<void> {
  const { error } = await admin.rpc("consume_feature", {
    user_uuid: userId,
    feature_name: feature,
    amount: amount,
  });

  if (error) {
    // Veritabanından gelen 'P0001' kodlu hata, bizim 'quota_exceeded' hatamızdır.
    if (error.code === "P0001") {
      type QuotaError = Error & { status?: number };
      const quotaError = new Error(
        "Quota exceeded for this feature.",
      ) as QuotaError;
      quotaError.status = 402; // 402 Payment Required
      throw quotaError;
    }
    // Başka bir beklenmedik veritabanı hatasıysa, onu da olduğu gibi fırlat
    throw error;
  }
  // Hata yoksa, her şey yolunda demektir. Fonksiyon sessizce biter.
}
