import 'react-native-get-random-values';
// app/_layout.tsx

import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router/';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '../context/Auth';

const InitialLayout = () => {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
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

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}