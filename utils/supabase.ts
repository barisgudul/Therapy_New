// utils/supabase.ts
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
// React Native ortamında sadece Expo Constants kullan
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as
  | string
  | undefined;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase URL veya Anon Key bulunamadı. Lütfen app.config.js'deki 'extra' alanını kontrol et.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
