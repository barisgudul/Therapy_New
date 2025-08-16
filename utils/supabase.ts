// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// React Native için doğru ortam değişkeni yaklaşımı
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL veya Anon Key bulunamadı. app.config.js'i kontrol et.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
