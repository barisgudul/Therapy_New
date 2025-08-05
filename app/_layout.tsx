// app/_layout.tsx - SENTRY'SİZ, ONARILMIŞ VE TAM HALİ

import 'react-native-get-random-values';

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // QueryClientProvider'ı import et
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router/';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller'; // BU ÖNEMLİ, EKLE
import 'react-native-reanimated';
import Toast from 'react-native-toast-message'; // Toast'u import et
import UndoToast from '../components/dream/UndoToast';
import { AuthProvider, useAuth } from '../context/Auth'; // AuthProvider'ı import et
import { LoadingProvider } from '../context/Loading';
import { useGlobalLoading } from '../hooks/useGlobalLoading';
// QueryClient'ı oluştur.
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
  
  useGlobalLoading();
  
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const loading = isLoading || !fontsLoaded;

  useEffect(() => {
    if (loading) {
      return;
    }
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register' || segments[0] === 'forgot-password';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (inOnboardingGroup) {
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/login');
    } else if (session && inAuthGroup && segments[0] === 'login') {
      router.replace('/');
    }
  }, [loading, session, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  return <RootNavigation />;
};

function RootNavigation() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" /> 
        <Stack.Screen name="register" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="(settings)" />
        <Stack.Screen name="dream" />
      </Stack>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <>
      <QueryClientProvider client={queryClient}> 
        <KeyboardProvider>
          <AuthProvider>
            <LoadingProvider>  {/* <-- EKSİK PARÇA BURAYA GELDİ */}
              <InitialLayout />
            </LoadingProvider>
          </AuthProvider>
        </KeyboardProvider>
      </QueryClientProvider>
      <Toast config={toastConfig} />
    </>
  );
}