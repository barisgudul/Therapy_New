// app/(guest)/primer.tsx
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useOnboardingStore, AppMode } from "../../store/onboardingStore";
import { logEvent } from "../../services/api.service";

export default function Primer() {
  const router = useRouter();
  const setFirstLaunchSeen = useOnboardingStore((s) => s.setFirstLaunchSeen);
  const setMode = useOnboardingStore((s) => s.setMode);
  const isGuest = useOnboardingStore((s) => s.isGuest);
  const firstLaunchSeen = useOnboardingStore((s) => s.firstLaunchSeen);

  useEffect(() => {
    logEvent({ type: "primer_seen", data: {} });
    if (firstLaunchSeen) {
      // İlk sefer atılmışsa, doğrudan misafir adımlarına geç
      router.replace("/(guest)/step1");
    }
  }, [firstLaunchSeen, router]);

  const start = () => {
    setFirstLaunchSeen();
    if (!isGuest) return router.replace("/");
    setMode(AppMode.GuestFlow);
    router.replace("/(guest)/step1");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        2 dakikada sana özel mini plan.
      </Text>
      <Text style={styles.subtitle}>
        Ücretsiz başla, istersen sonra kaydedersin.
      </Text>
      <Pressable onPress={start} style={styles.button}>
        <Text style={styles.buttonText}>Hemen Başla</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#0a7ea4",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
