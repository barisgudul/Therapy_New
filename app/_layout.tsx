// app/_layout.tsx --- KESİN VE NİHAİ VERSİYON

import "react-native-get-random-values";
import "react-native-reanimated";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { useRouter, useSegments } from "expo-router/";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast, { BaseToastProps } from "react-native-toast-message";
// Yeni AppToast'ımızı içeri al
import { AppToast } from "../components/shared/AppToast";

import UndoToast from "../components/dream/UndoToast";
import { AuthProvider, useAuth } from "../context/Auth";
import { LoadingProvider } from "../context/Loading";
import { useGlobalLoading } from "../hooks/useGlobalLoading";

const queryClient = new QueryClient();

// ESKİ VE YENİ DÜNYAYI BİRLEŞTİRİYORUZ
const toastConfig = {
  // Senin özel 'undo' toast'ın burada güvende.
  custom: ({ props }: { props: { onUndo: () => void } }) => (
    <UndoToast onUndo={props.onUndo} />
  ),
  // VE İŞTE BİZİM YENİ, MARKALI TİPLERİMİZ
  success: (props: BaseToastProps) => <AppToast variant="success" {...props} />,
  error: (props: BaseToastProps) => <AppToast variant="error" {...props} />,
  info: (props: BaseToastProps) => <AppToast variant="info" {...props} />,
};

// ======================================================================
// ANA NAVİGASYON VE YÖNLENDİRME MANTIĞI
// ======================================================================
function RootLayoutNav() {
  const { session, isLoading: isAuthLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useGlobalLoading();

  const [fontsLoaded, fontError] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    // Henüz hiçbir şey hazır değilse, bekle.
    if (isAuthLoading || (!fontsLoaded && !fontError)) {
      return;
    }

    // Kullanıcının bulunduğu rotanın ilk segmenti, hangi grupta olduğunu söyler.
    const inAppGroup = segments[0] === "(app)";
    const inAuthGroup = segments[0] === "(auth)";

    // KURAL 1: Eğer kullanıcı giriş yapmamışsa VE uygulama içinde bir yere gitmeye çalışıyorsa,
    // onu acımasızca login ekranına fırlat.
    if (!session && inAppGroup) {
      router.replace("/(auth)/login");
    } 
    // KURAL 2: Eğer kullanıcı giriş yapmışsa VE login/register gibi auth ekranlarındaysa,
    // onu ait olduğu yere, anasayfaya (yani (app) grubuna) gönder.
    else if (session && inAuthGroup) {
      router.replace("/"); // '/' otomatik olarak (app)/index.tsx'e yönlenir
    }
  }, [session, isAuthLoading, fontsLoaded, fontError, segments, router]);

  // Yükleme ekranı
  if (isAuthLoading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Her şey hazır, ana navigasyonu göster.
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

// ======================================================================
// UYGULAMANIN GİRİŞ NOKTASI (Provider'lar burada)
// ======================================================================
export default function RootLayout() {
  return (
    <View style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <LoadingProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </LoadingProvider>
        </KeyboardProvider>
      </QueryClientProvider>
      
      <Toast config={toastConfig} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});