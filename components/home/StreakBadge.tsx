// components/home/StreakBadge.tsx
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface StreakBadgeProps {
  streak: number;
  /** Bugün yansıma yapıldı mı — alev "canlı" mı yoksa "soluk" mu gösterilsin. */
  activeToday?: boolean;
  onPress?: () => void;
}

/**
 * Günlük yansıma serisini gösteren alev rozeti. Seri 0 ise hiçbir şey çizmez
 * (boş/utandırıcı "0 gün" göstermeyiz — terapötik olarak nazik kalır).
 */
export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  activeToday = true,
  onPress,
}) => {
  const { t } = useTranslation();
  if (!streak || streak <= 0) return null;

  const colors = activeToday
    ? (["#FB923C", "#F97316"] as const) // canlı turuncu
    : (["#FCD9B6", "#F6C28B"] as const); // soluk (bugün henüz yapılmadı, dün canlı)

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t("streak.a11y_label", { count: streak })}
      style={({ pressed }) => [
        styles.wrapper,
        { transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
      testID="streak-badge"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Ionicons name="flame" size={16} color="#FFFFFF" />
        <Text style={styles.count}>{streak}</Text>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    shadowColor: "#F97316",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  count: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
