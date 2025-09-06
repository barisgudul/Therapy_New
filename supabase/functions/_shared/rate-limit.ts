// supabase/functions/_shared/rate-limit.ts
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function assertRateLimit(
  admin: SupabaseClient,
  userId: string,
  feature: string,
  limit: number, // örn 200
  windowSec: number, // örn 300 (5 dk)
) {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const key = `${userId}:${feature}:${bucket}`;

  const { data, error: _error } = await admin
    .from("usage_stats")
    .select("count")
    .eq("key", key)
    .maybeSingle();

  const count = (data?.count ?? 0) + 1;

  if (!data) {
    await admin.from("usage_stats").insert({
      key,
      user_id: userId,
      feature,
      bucket,
      count: 1,
      created_at: new Date().toISOString(),
    });
  } else {
    await admin.from("usage_stats").update({ count }).eq("key", key);
  }

  if (count > limit) {
    const error = new Error("Too Many Requests") as Error & { status: number };
    error.status = 429;
    throw error;
  }
}
