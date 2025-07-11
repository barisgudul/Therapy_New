// utils/supabase.ts

import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Anahtarları Constants üzerinden güvenli bir şekilde al
// Bu değişkenlerin app.config.js dosyasında tanımlandığından emin olacağız.
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl as string;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey as string;

// Supabase istemcisini oluştur ve dışarı aktar
export const supabase = createClient(supabaseUrl, supabaseAnonKey);