// app/_layout.tsx --- KESİN VE NİHAİ VERSİYON

import "react-native-get-random-values";
import "expo-standard-web-crypto";
import * as WebBrowser from "expo-web-browser";
import "../utils/i18n"; // i18n polyfill'lerden SONRA gelmeli
import "react-native-reanimated";

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter, useSegments } from "expo-router/";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import Toast, { BaseToastProps } from "react-native-toast-message";
// Yeni AppToast'ımızı içeri al
import { AppToast } from "../components/shared/AppToast";

import ErrorBoundary from "react-native-error-boundary";
import UndoToast from "../components/dream/UndoToast";
import { CrisisModal } from "../components/shared/CrisisModal";
import { ErrorFallbackUI } from "../components/shared/ErrorFallbackUI";
import { AuthProvider, useAuth } from "../context/Auth";
import { LoadingProvider } from "../context/Loading";
import { RevenueCatProvider } from "../providers/RevenueCatProvider";
import { useOnboardingStore } from "../store/onboardingStore";
import { hasCurrentConsent, useConsentStore } from "../store/consentStore";
import { captureException, initSentry, wrap } from "../utils/sentry";

WebBrowser.maybeCompleteAuthSession();

// Crash/error reporting — no-op unless EXPO_PUBLIC_SENTRY_DSN is set.
initSentry();

// Bildirim uygulama önplandayken de banner/ses olarak gösterilsin
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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
  const { session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();
  const recallEligibleAt = useOnboardingStore((s) => s.recallEligibleAt);
  const answersArray = useOnboardingStore((s) => s.answersArray);
  const acceptedConsentVersion = useConsentStore((s) => s.acceptedVersion);
  const consentHydrated = useConsentStore((s) => s._hydrated);

  const [fontsLoaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Artık tüm yönlendirme mantığı burada değil.
  // Sadece session durumuna göre ana gruplar arasında yönlendirme yapacağız.
  const inAuthGroup = segments[0] === "(auth)";
  const inAppGroup = segments[0] === "(app)";
  const inLegalGroup = segments[0] === "(legal)";
  const inAnalysisPage = segments.includes("analysis");
  const isOnAnalysisRoute = Boolean(pathname && pathname.includes("/(auth)/analysis"));

  // Router yönlendirmelerini render sırasında değil, useEffect içinde yap
  React.useEffect(() => {
    // Eğer kullanıcı giriş yapmamışsa ve app grubuna girmeye çalışıyorsa
    // onu misafir akışına yönlendir.
    if (!session && inAppGroup) {
      router.replace("/(guest)/primer");
      return;
    }

    // ONAY KAPISI: Giriş yapmış ama güncel yasal sürümü kabul etmemiş
    // kullanıcıyı (OAuth kaydı, eski hesap, politika sürüm artışı) onay ekranına al.
    if (
      session &&
      consentHydrated &&
      !hasCurrentConsent(acceptedConsentVersion) &&
      !inLegalGroup
    ) {
      router.replace("/(legal)/consent");
      return;
    }

    // Eğer kullanıcı giriş yapmışsa ve auth grubundaysa, burada hiçbir şey yapma.
    // Register/login kendi yönlendirmesini zaten yapıyor. Extra replace flicker'a yol açıyor.
    if (session && inAuthGroup) {
      return;
    }

    // RECALL MANTIĞI: Kullanıcı giriş yapmamış, onboarding tamamlanmış ve recall zamanı geçmişse
    // recall sayfasına yönlendir.
    const now = Date.now();
    const hasCompletedOnboarding = answersArray.length >= 3; // 3 adım tamamlanmış
    const isRecallTime = recallEligibleAt && now >= recallEligibleAt;

    if (!session && !inAuthGroup && !inAppGroup && hasCompletedOnboarding && isRecallTime) {
      router.replace("/(guest)/recall");
      return;
    }
  }, [session, inAuthGroup, inAppGroup, inLegalGroup, inAnalysisPage, isOnAnalysisRoute, router, recallEligibleAt, answersArray, acceptedConsentVersion, consentHydrated]);

  // Bildirime tıklanınca ilgili ekrana yönlendir (deep-link).
  // Hem önplan/arkaplan yanıtını hem de uygulama kapalıyken açılışı (cold start) ele alır.
  React.useEffect(() => {
    const routeFromData = (data: unknown) => {
      const route = (data as { route?: unknown })?.route;
      if (typeof route !== "string" || !route) return;
      // Yalnızca giriş yapmış kullanıcıyı app ekranlarına yönlendir
      if (!session) return;
      try {
        router.push(route as never);
      } catch (e) {
        console.warn("[notifications] yönlendirme başarısız:", e);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => routeFromData(response.notification.request.content.data),
    );

    // Cold start: uygulama bir bildirime tıklanarak açıldıysa
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        routeFromData(response.notification.request.content.data);
      }
    });

    return () => sub.remove();
  }, [session, router]);

  // Yükleme ekranı - Fontlar veya Auth hazır değilse bekle
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
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
function RootLayout() {
  return (
    <View style={styles.container}>
      <ErrorBoundary
        FallbackComponent={ErrorFallbackUI}
        onError={(error) => captureException(error)}
      >
        <QueryClientProvider client={queryClient}>
          <KeyboardProvider>
            <LoadingProvider>
              <AuthProvider>
                <RevenueCatProvider>
                  <RootLayoutNav />
                </RevenueCatProvider>
              </AuthProvider>
            </LoadingProvider>
          </KeyboardProvider>
        </QueryClientProvider>
      </ErrorBoundary>

      {/* Kriz (level_3_high_alert) ekranı — tüm AI gateway akışları için ortak.
          Toast'tan SONRA gelir ki her zaman en üstte render edilsin. */}
      <CrisisModal />

      <Toast config={toastConfig} />
    </View>
  );
}

export default wrap(RootLayout);

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