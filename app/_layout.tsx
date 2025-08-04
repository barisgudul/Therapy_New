// app/_layout.tsx
import 'react-native-get-random-values';


import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router/';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast from 'react-native-toast-message';
import ErrorState from '../components/dream/ErrorState';
import UndoToast from '../components/dream/UndoToast';
import { AuthProvider, useAuth } from '../context/Auth';
import { LoadingProvider } from '../context/Loading';
import { useGlobalLoading } from '../hooks/useGlobalLoading';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'https://fc3049277d1bf518a27956cc2ffc8ad9@o4509786496696320.ingest.de.sentry.io/4509786497155152',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: false,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // Güvenlik: Hassas verileri filtrele
  beforeSend(event) {
    // Kullanıcı email'ini sil
    if (event.user) {
      delete event.user.email;
    }
    // Diğer hassas verileri de temizle
    if (event.contexts?.app) {
      delete event.contexts.app.version;
    }
    return event;
  },

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

// YENİ: QueryClient'ı oluştur.
const queryClient = new QueryClient();

// Toast konfigürasyonu
const toastConfig = {
  custom: ({ props }: any) => (
    <UndoToast onUndo={props.onUndo} />
  ),
};

const InitialLayout = () => {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Global loading state'i başlat
  useGlobalLoading();
  
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // DEĞİŞİKLİK 1: Yükleme durumunu daha net hale getirdik.
  const loading = isLoading || !fontsLoaded;

  useEffect(() => {
    // Yükleme devam ediyorsa, yönlendirme yapmayı deneme!
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    // Onboarding sırasında otomatik yönlendirme yapma
    if (inOnboardingGroup) {
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup && segments[0] === 'login') {
      // Sadece login sayfasından gelen kullanıcıları ana sayfaya yönlendir
      // Register sayfasındaki kullanıcıları onboarding'e gitmek için bırak
      router.replace('/');
    }
  }, [loading, session, segments, router]); // Artık sadece loading durumuna tepki veriyor.

  // DEĞİŞİKLİK 2: Yükleme tamamlanana kadar sadece dönen çubuğu göster.
  // Bu, alttaki <Stack>'in erken render olmasını engeller.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Yükleme BİTTİĞİNDE, navigasyon yapısını güvenle render et.
  return <RootNavigation />;
};

function RootNavigation() {
  // const colorScheme = useColorScheme();

  return (
    // ThemeProvider'ın value prop'una doğrudan DefaultTheme'i verin
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" /> 
        <Stack.Screen name="register" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="(settings)" />
      </Stack>
      {/* Status Bar stilini de 'dark' olarak sabitleyerek 
          aydınlık tema ile uyumlu olmasını sağlayabilirsiniz. */}
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default Sentry.wrap(function RootLayout() {
  return (
    <Sentry.ErrorBoundary 
      fallback={({ error }) => <ErrorState message={(error as Error).message} />}
    >
      <>
        {/* YENİ: Provider'ı en dışa sar */}
        <QueryClientProvider client={queryClient}> 
          <KeyboardProvider>
            <LoadingProvider>
              <AuthProvider>
                <InitialLayout />
              </AuthProvider>
            </LoadingProvider>
          </KeyboardProvider>
        </QueryClientProvider>
        <Toast config={toastConfig} />
      </>
    </Sentry.ErrorBoundary>
  );
});