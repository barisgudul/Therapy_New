import { createClient } from "@supabase/supabase-js";

// React Native için URL polyfill - sadece gerekli olduğunda import et
// import 'react-native-url-polyfill/auto';

// Ortam değişkenleri için Deno ve web uyumlu yaklaşım
const supabaseUrl = Deno.env.get("EXPO_PUBLIC_SUPABASE_URL") ||
  Deno.env.get("SUPABASE_URL") ||
  (typeof window !== "undefined"
    ? (window as unknown as {
      __ENV__?: { EXPO_PUBLIC_SUPABASE_URL?: string };
    }).__ENV__?.EXPO_PUBLIC_SUPABASE_URL
    : undefined);

const supabaseAnonKey = Deno.env.get("EXPO_PUBLIC_SUPABASE_ANON_KEY") ||
  Deno.env.get("SUPABASE_ANON_KEY") ||
  (typeof window !== "undefined"
    ? (window as unknown as {
      __ENV__?: { EXPO_PUBLIC_SUPABASE_ANON_KEY?: string };
    }).__ENV__?.EXPO_PUBLIC_SUPABASE_ANON_KEY
    : undefined);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL veya Anon Key ortam değişkenlerinde bulunamadı. .env dosyanı kontrol et.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
