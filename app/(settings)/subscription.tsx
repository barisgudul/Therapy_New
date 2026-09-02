// app/(settings)/subscription.tsx
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router/";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import RevenueCatUI from "react-native-purchases-ui";
import { Colors } from "../../constants/Colors";
import { useRevenueCat } from "../../hooks/useRevenueCat";

const SUBSCRIPTION_KEY = ["currentSubscription"] as const;
const USAGE_KEY = ["usageStats"] as const;

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { restore } = useRevenueCat();

  const syncAndClose = () => {
    queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
    queryClient.invalidateQueries({ queryKey: USAGE_KEY });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={restore} style={styles.restoreButton} accessibilityRole="button">
          <Text style={styles.restoreText}>{t("subscription.restore_button")}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.subscription.title")}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} accessibilityRole="button">
          <Ionicons name="close" size={28} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      <RevenueCatUI.Paywall
        style={styles.paywall}
        options={{ displayCloseButton: false }}
        onPurchaseCompleted={syncAndClose}
        onRestoreCompleted={() => {
          queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY });
          queryClient.invalidateQueries({ queryKey: USAGE_KEY });
        }}
        onDismiss={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  paywall: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    textAlign: "center",
    flex: 1,
  },
  restoreButton: { paddingVertical: 6, minWidth: 64 },
  restoreText: { fontSize: 14, fontWeight: "600", color: Colors.light.tint },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 30,
    padding: 8,
    minWidth: 64,
    alignItems: "flex-end",
  },
});
