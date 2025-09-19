// utils/supabase.ts
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL/Anon Key eksik (app.config.js → extra).");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // RN’de URL'i biz işleyeceğiz:
    detectSessionInUrl: false,
    // Token’lar oturumu tutsun:
    persistSession: true,
    autoRefreshToken: true,
    // Mobil için PKCE önerilir:
    flowType: "pkce",
  },
});
