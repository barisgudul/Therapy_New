// hooks/useProtectedRoute.ts
import { useRouter, useSegments } from "expo-router/";
import { useEffect } from "react";
import { useAuth } from "../context/Auth";
import { useVault } from "./useVault"; // YENİ SİLAHINI ÇAĞIR

export const useProtectedRoute = () => {
  const { user, isLoading: isAuthLoading } = useAuth();

  // ESKİ HALİ:
  // const { vault, isLoading: isVaultLoading } = useVaultStore();

  // YENİ HALİ (Tek satır):
  const { data: vault, isLoading: isVaultLoading } = useVault();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isLoading = isAuthLoading || isVaultLoading;
    if (isLoading) {
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";

    // Analiz sayfasında olup olmadığımızı kontrol et
    const inAnalysisPage = segments.includes("analysis");

    if (!user) {
      if (!inAuthGroup) {
        router.replace("/(auth)/login");
      }
      return;
    }
    // Eğer (auth) grubundaysak ama analiz sayfasında DEĞİLSEK yönlendir.
    if (user && inAuthGroup && !inAnalysisPage) {
      router.replace("/(app)");
    }
  }, [user, vault, isAuthLoading, isVaultLoading, segments, router]);
};
