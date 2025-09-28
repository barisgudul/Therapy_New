// app.config.js - YENİDEN MARKALANMIŞ VE TEMİZLENMİŞ VERSİYON
import process from "node:process";

export default {
  expo: {
    name: 'Gisbel',                                 // DEĞİŞTİ
    slug: 'gisbel',                                 // DEĞİŞTİ
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/logo.png',
    scheme: 'gisbel',                               // DEĞİŞTİ
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      infoPlist: {ITSAppUsesNonExemptEncryption: false},
      bundleIdentifier: "com.barisgudul.gisbel"     // DEĞİŞTİ VE STANDARTLAŞTIRILDI
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: "com.barisgudul.gisbel"              // DEĞİŞTİ VE STANDARTLAŞTIRILDI
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

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
      'expo-audio',
      'expo-localization',
      'expo-secure-store',
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "56e80492-e055-42f0-b974-5007f88c7a8c"
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};