// app/(guest)/recall.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router/";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";

// TUTARLILIK İÇİN AYNI SABİTLERİ KULLANIYORUZ
const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = { medium: 16, large: 24 };
const BORDER_RADIUS = { button: 22, card: 32 };

export default function Recall() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={styles.pageContainer}>
      <SafeAreaView style={styles.pageSafeArea}>
        {/* Ana İçerik Kardı - Artık primer/softwall ile aynı stilde */}
        <View style={styles.cardContainer}>
          <View style={styles.cardIconContainer}>
            <Ionicons name="refresh-outline" size={48} color={Colors.light.tint} />
          </View>

          <Text style={styles.cardTitle}>{t("recall.title")}</Text>
          <Text style={styles.cardSubtitle}>{t("recall.subtitle")}</Text>

          {/* Motivasyonel Mesaj */}
          <View style={styles.cardMotivationBox}>
            <Ionicons name="bulb-outline" size={20} color={Colors.light.tint} />
            <Text style={styles.cardMotivationText}>{t("recall.motivation_text")}</Text>
          </View>
        </View>

        {/* Aksiyon Butonları - Artık primer/softwall ile aynı stilde */}
        <View style={styles.actionsContainer}>
          <Pressable onPress={() => router.replace("/(guest)/softwall")}>
            <LinearGradient colors={GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonPrimary}>
              <Text style={styles.buttonPrimaryText}>{t("recall.cta")}</Text>
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => router.replace("/(guest)/step1")} style={styles.buttonSecondary}>
            <Text style={styles.buttonSecondaryText}>{t("recall.restart")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1, paddingHorizontal: 16, justifyContent: "center" },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.large,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.12)",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(224, 236, 253, 0.7)", // Gradyan renginin açığı
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.medium,
  },
  cardTitle: { fontSize: 26, fontWeight: "700", color: Colors.light.tint, textAlign: "center", marginBottom: SPACING.medium },
  cardSubtitle: { color: "#4A5568", textAlign: "center", lineHeight: 24, fontSize: 16 },
  cardMotivationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(224, 236, 253, 0.5)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginTop: SPACING.large,
    gap: 8,
  },
  cardMotivationText: { color: "#4A5568", fontSize: 14, flex: 1, fontWeight: "500" },
  actionsContainer: {
    gap: 12,
    marginTop: SPACING.large,
  },
  buttonPrimary: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
    borderRadius: BORDER_RADIUS.button,
  },
  buttonPrimaryText: { color: Colors.light.tint, fontWeight: "700", fontSize: 16 },
  buttonSecondary: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
  },
  buttonSecondaryText: { color: Colors.light.tint, fontWeight: "600", fontSize: 15, opacity: 0.8 },
});
