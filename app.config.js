// app.config.js - DÜZELTİLMİŞ VE TAM HALİ
import process from "node:process";

export default {
  expo: {
    name: 'Therapy_New',
    slug: 'therapynew',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'therapy',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    // IOS ve ANDROID için özel ayarlar
    ios: {
      supportsTablet: true,
      // --- BU SATIR EKLENDİ ---
      bundleIdentifier: "com.barisgudul.TherapyNew"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      // --- BU SATIR EKLENDİ ---
      package: "com.barisgudul.TherapyNew"
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    // TÜM PLUGIN'LER BURADA BİRLEŞTİRİLDİ
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      
    ],

    // Typed Routes deneyi
    experiments: {
      typedRoutes: true,
    },

    // SENİN GİZLİ ANAHTARLARIN BURADA GÜVENDE
    extra: {
      eas: {
        projectId: "56e80492-e055-42f0-b974-5007f88c7a8c" 
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};