// app/(onboarding)/summary.tsx
import { useRouter } from "expo-router/";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useUpdateVault, useVault } from "../../hooks/useVault.ts"; // YENİ SİLAHLARINI ÇAĞIR
import { useOnboardingStore } from "../../store/onboardingStore.ts";

export default function SummaryScreen() {
  const router = useRouter();
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const onboardingAnswers = useOnboardingStore((s) => s.answers);
  const nickname = useOnboardingStore((s) => s.nickname);

  // updateAndSyncVault artık useVaultStore'dan gelmiyor.
  const { data: vault } = useVault(); // Mevcut vault'u almak için
  const { mutate: updateVaultMutation } = useUpdateVault(); // Vault'u GÜNCELLEMEK için

  const [status, setStatus] = useState(
    "Onboarding cevaplarınız kaydediliyor...",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // summary.tsx - DOĞRU useEffect KULLANIMI
  useEffect(() => {
    // Flag'i kontrol etme mantığı doğru, kalsın.
    if (isProcessing) return;

    const saveOnboardingData = () => {
      // Bu fonksiyon zaten sadece bu useEffect içinde kullanılıyor.
      // O yüzden burada yaşaması en doğrusu.
      setIsProcessing(true);

      try {
        setStatus("Onboarding cevaplarınız kaydediliyor...");

        const newVaultData = {
          ...(vault && typeof vault === "object"
            ? vault as Record<string, unknown>
            : {}),
          onboarding: onboardingAnswers,
          profile: {
            ...(vault && typeof vault === "object" && "profile" in vault
              ? (vault as { profile?: Record<string, unknown> }).profile || {}
              : {}),
            nickname: nickname || "Kullanıcı",
          },
          metadata: {
            ...(vault && typeof vault === "object" && "metadata" in vault
              ? (vault as { metadata?: Record<string, unknown> }).metadata || {}
              : {}),
            onboardingCompleted: true,
          },
        };

        updateVaultMutation(newVaultData); // YENİ YÖNTEM BU.

        setStatus("Profiliniz oluşturuluyor...");

        resetOnboarding();

        setTimeout(() => {
          router.replace("/");
        }, 1500);
      } catch (error) {
        console.error("❌ Onboarding verileri kaydedilirken hata:", error);
        setStatus("Bir hata oluştu, ana sayfaya yönlendiriliyorsunuz...");

        setTimeout(() => {
          router.replace("/");
        }, 2000);
      }
    };

    saveOnboardingData();

    // İŞTE BÜTÜN SİHİR BURADA. REACT'E DOĞRUYU SÖYLÜYORUZ.
  }, [
    isProcessing,
    router,
    onboardingAnswers,
    nickname,
    vault,
    updateVaultMutation,
    resetOnboarding,
  ]); // Dependency array'e vault ve updateVaultMutation ekledim

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>Harika bir başlangıç!</Text>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F9F9F9",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1c1c1e",
  },
  status: {
    fontSize: 16,
    textAlign: "center",
    color: "#8e8e93",
    lineHeight: 22,
  },
});
