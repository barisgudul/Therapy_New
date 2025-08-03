// utils/supabase.ts

import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
// import Constants from 'expo-constants'; // << Şimdilik Constants'a ihtiyacımız yok

// >> KESİN SONUÇ TESTİ <<
// Anahtarları Constants'dan almak yerine doğrudan buraya yapıştırın.
const supabaseUrl = "https://ijtcqbxagcdgfxrgamis.supabase.co"
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdGNxYnhhZ2NkZ2Z4cmdhbWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNTAyMDEsImV4cCI6MjA2NzcyNjIwMX0.LPZoZbbIkfN0IsZLA9DyD6Y8iydlhemUdcRmlr_Els0';

// Anahtarların dolu olduğundan emin olmak için kontrol edelim.
console.log("ELLE GİRİLEN URL:", supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);