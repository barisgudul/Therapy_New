// components/shared/DisclaimerBanner.tsx
//
// Compact, low-emphasis reminder shown on AI-powered screens (text/voice
// sessions, dream, diary, daily reflection). Tapping opens the full Health
// Disclaimer.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router/";
import React from "react";
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";

type Tone = "light" | "dark";

export function DisclaimerBanner({
  tone = "light",
  style,
}: {
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const color = tone === "dark" ? "rgba(255,255,255,0.6)" : "#64748B";

  return (
    <Pressable
      onPress={() => router.push("/(legal)/disclaimer")}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={t("legal.banner.a11y")}
      testID="disclaimer-banner"
    >
      <Ionicons name="information-circle-outline" size={14} color={color} />
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {t("legal.banner.text")}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  text: { flex: 1, fontSize: 11, lineHeight: 15 },
});
