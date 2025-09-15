// app/_layout.tsx --- KESİN VE NİHAİ VERSİYON

import "../utils/i18n"; // <-- BU SATIRI EN ÜSTE EKLE
import "react-native-get-random-values";
import "react-native-reanimated";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { useRouter, useSegments } from "expo-router/";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast, { BaseToastProps } from "react-native-toast-message";
// Yeni AppToast'ımızı içeri al
import { AppToast } from "../components/shared/AppToast";

import UndoToast from "../components/dream/UndoToast";
import { AuthProvider, useAuth } from "../context/Auth";
import { LoadingProvider } from "../context/Loading";

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

    const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Yükleme ekranı - Fontlar veya Auth hazır değilse bekle
  if (!fontsLoaded || isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  // Artık tüm yönlendirme mantığı burada değil.
  // Sadece session durumuna göre ana gruplar arasında yönlendirme yapacağız.
  const inAuthGroup = segments[0] === "(auth)";
  const inAppGroup = segments[0] === "(app)";

  // Eğer kullanıcı giriş yapmamışsa ve app grubuna girmeye çalışıyorsa
  // onu misafir akışına yönlendir.
  if (!session && inAppGroup) {
      router.replace("/(guest)/primer");
      return null;
  }

  // Eğer kullanıcı giriş yapmışsa ve auth grubuna girmeye çalışıyorsa
  // onu ana sayfaya yönlendir.
  if (session && inAuthGroup) {
      router.replace("/");
      return null;
  }

  // Geri kalan her şey için, navigasyonu göster.
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