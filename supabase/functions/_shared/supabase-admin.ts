// supabase/functions/_shared/supabase-admin.ts

import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

// Bu fonksiyon, her çağrıldığında yeni, izole bir client oluşturur.
export function getSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set!",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
