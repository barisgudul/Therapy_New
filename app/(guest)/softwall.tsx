// app/(guest)/softwall.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "../../constants/Colors";
import { logEvent } from "../../services/api.service";

// PRIMER'DAN GELEN VE TUTARLILIĞI SAĞLAYAN SABİTLER
const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = {
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
};
const BORDER_RADIUS = {
  button: 22,
  card: 32,
};

// FeatureItem component'ini ana component'in DIŞINDA tanımla. Daha temiz.
function FeatureItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <View style={styles.featuresItem}>
      {/* İKONLARI DAHA CANLI HALE GETİRDİM. AĞIR DÜZ RENK YERİNE GRADYAN KULLANDIM. */}
      <LinearGradient colors={GRADIENT_COLORS} style={styles.featuresIconContainer}>
        <Ionicons name={icon as any} size={24} color={Colors.light.tint} />
      </LinearGradient>
      <View style={styles.featuresContent}>
        <Text style={styles.featuresTitle}>{title}</Text>
        <Text style={styles.featuresDescription}>{description}</Text>
      </View>
    </View>
  );
}

export default function SoftWall() {
  const router = useRouter();
  const { t } = useTranslation();

  const handleRegister = () => {
    logEvent({ type: "register_click", data: { source: "softwall" } }).catch(() => {});
    router.push("/register");
  };

  return (
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={styles.pageContainer}>
      <SafeAreaView style={styles.pageSafeArea}>
        {/* ScrollView KULLANMAYA DEVAM, AMA İÇERİĞİ TEK BİR ANA KARTTA TOPLUYORUZ */}
        <ScrollView contentContainerStyle={styles.pageScrollContent} showsVerticalScrollIndicator={false}>
          {/* TEK, BÜYÜK BİR KART KULLANIYORUZ. DAĞINIKLIĞI ORTADAN KALDIRIYOR. */}
          <View style={styles.cardContainer}>
            <Image source={require("../../assets/logo.png")} style={styles.cardLogo} />
            <Text style={styles.cardTitle}>{t("softwall.title")}</Text>
            <Text style={styles.cardSubtitle}>{t("softwall.subtitle")}</Text>

            <View style={styles.divider} />

            <Text style={styles.cardFeaturesHeader}>{t("softwall.features_title")}</Text>

            <View style={styles.featuresList}>
              <FeatureItem
                icon="analytics-outline" // Daha analitik bir ikon
                title={t("softwall.feature_pattern_title")}
                description={t("softwall.feature_pattern_desc")}
              />
              <FeatureItem
                icon="key-outline" // Potansiyel, bir kapıyı açan anahtar gibi
                title={t("softwall.feature_potential_title")}
                description={t("softwall.feature_potential_desc")}
              />
              <FeatureItem
                icon="compass-outline" // İlk adım, bir yol gösterici
                title={t("softwall.feature_step_title")}
                description={t("softwall.feature_step_desc")}
              />
            </View>
          </View>

          {/* BUTONLAR ARTIK PRIMER İLE BİREBİR AYNI STİLDE */}
          <View style={styles.actionsContainer}>
            <Pressable onPress={handleRegister} accessibilityRole="button">
              <LinearGradient colors={GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonsPrimary}>
                <Text style={styles.buttonsPrimaryText}>{t("softwall.cta_register")}</Text>
                <Ionicons name="arrow-forward" size={20} color={Colors.light.tint} />
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.push("/login")} style={styles.buttonsSecondary} accessibilityRole="button">
              <Text style={styles.buttonsSecondaryText}>{t("softwall.login_link")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // Sayfa stilleri
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1 },
  pageScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },

  // Kart stilleri
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
  cardLogo: { width: 64, height: 64, marginBottom: SPACING.medium },
  cardTitle: { fontSize: 28, fontWeight: "600", color: Colors.light.tint, textAlign: "center", marginBottom: SPACING.small, letterSpacing: -0.5 },
  cardSubtitle: { color: "#4A5568", opacity: 0.85, textAlign: "center", lineHeight: 24, fontSize: 16, letterSpacing: -0.2 },
  cardFeaturesHeader: { fontSize: 24, fontWeight: "600", color: Colors.light.tint, marginBottom: SPACING.large, letterSpacing: -0.5 },

  // Divider stili
  divider: {
    height: 1,
    backgroundColor: "rgba(93,161,217,0.15)",
    width: "40%",
    marginVertical: SPACING.large,
  },

  // Özellikler stilleri
  featuresList: { gap: SPACING.large, width: "100%" },
  featuresItem: { flexDirection: "row", alignItems: "center", gap: SPACING.medium },
  featuresIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  featuresContent: { flex: 1 },
  featuresTitle: { fontSize: 16, fontWeight: "600", color: Colors.light.tint, marginBottom: 4 },
  featuresDescription: { fontSize: 14, color: "#4A5568", lineHeight: 20, letterSpacing: -0.2 },

  // Aksiyon stilleri
  actionsContainer: {
    gap: 12,
    paddingTop: SPACING.large,
  },

  // Buton stilleri
  buttonsPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 20,
    borderRadius: BORDER_RADIUS.button,
  },
  buttonsPrimaryText: { color: Colors.light.tint, fontWeight: "700", fontSize: 16, letterSpacing: -0.5 },
  buttonsSecondary: {
    width: "100%",
    paddingVertical: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
  },
  buttonsSecondaryText: { color: Colors.light.tint, fontWeight: "600", fontSize: 16, letterSpacing: -0.5, opacity: 0.8 },
});
