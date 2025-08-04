import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL veya Anon Key ortam değişkenlerinde bulunamadı. .env dosyanı kontrol et.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);