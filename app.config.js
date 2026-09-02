// app.config.js - YENİDEN MARKALANMIŞ VE TEMİZLENMİŞ VERSİYON
import process from "node:process";

// The @sentry/react-native/expo config plugin adds an Xcode/Gradle build phase
// that runs `sentry-cli` to upload source maps — which fails the build unless a
// Sentry org + project are configured. Only wire it when they are; the runtime
// `Sentry.init()` in utils/sentry.ts works independently and no-ops without a DSN.
const sentryConfigured = Boolean(
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

export default {
  expo: {
    name: 'Gisbel',                                 // DEĞİŞTİ
    slug: 'therapynew',    
    owner: "barisgudul",                     
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
      [
        'expo-notifications',
        {
          color: '#5DA1D9',
          // TODO: add `icon: './assets/images/notification-icon.png'`
          // (96x96, white silhouette on transparent) — see launch checklist.
        },
      ],
      ...(sentryConfigured
        ? [[
            '@sentry/react-native/expo',
            {
              organization: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,
            },
          ]]
        : []),
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: "56e80492-e055-42f0-b974-5007f88c7a8c"
      },
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      EXPO_PUBLIC_RC_IOS_KEY: process.env.EXPO_PUBLIC_RC_IOS_KEY,
      EXPO_PUBLIC_RC_ANDROID_KEY: process.env.EXPO_PUBLIC_RC_ANDROID_KEY,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV,
    },
  },
};