// app.config.js dosyasının YENİ içeriği bu olacak:

export default {
  expo: {
    name: 'Therapy_New',
    slug: 'Therapy_New',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png', // DOKTORUN UYARDIĞI YANLIŞ İKONU DÜZELTTİM, DOĞRUSUNU KOYDUM
    scheme: 'therapy',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true, // Yeni mimari desteği

    // IOS ve ANDROID için özel ayarlar
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
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
      [
        '@sentry/react-native/expo',
        {
          // URL'i Sentry.io'daki proje ayarlarından alabilirsin, şimdilik böyle kalsın.
          url: 'https://sentry.io/', 
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
        // Bu, Sentry'nin build sırasında anahtarlarını güvenli bir şekilde almasını sağlar
        projectId: "PROJENIN_EAS_ID_SI" // Bu ID'yi Expo'daki proje sayfasından bulabilirsin, şimdilik böyle kalsın.
      },
      // Supabase anahtarların burada
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};