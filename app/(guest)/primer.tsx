// app/(guest)/primer.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Colors } from "../../constants/Colors";

// BU SABİTLER AYNI KALIYOR. TUTARLILIK ESASTIR.
const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = {
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
};
const BORDER_RADIUS = {
  button: 22, // Butonları daha tok göstermek için radius'u arttırdım.
  card: 32,
  pill: 999,
};

export default function Primer() {
  const router = useRouter();
  const { t } = useTranslation();
  const start = () => router.replace("/(guest)/step1");

  return (
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={styles.pageContainer}>
      <SafeAreaView style={styles.pageSafeArea}>
        {/*
          ANA YAPIYI DEĞİŞTİRDİM. ARTIK HER ŞEYİ KENDİSİNE AYRILAN ALANDA KONTROL EDİYORUZ.
          space-between SAÇMALIĞINI BIRAKTIK.
        */}
        <View style={styles.pageWrapper}>
          {/*
            ANA İÇERİK (HEADER VE KART). BU BÖLÜM flex: 1 ALARAK MEVCUT ALANI DOLDURUR
            VE İÇERİĞİ KENDİ İÇİNDE ORTALAR. BUTONLARI AŞAĞI İTER.
          */}
          <View style={styles.pageMainContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.headerBrand}>
                lumen<Text style={styles.headerDot}>.</Text>
              </Text>
            </View>

            <View style={styles.cardContainer}>
              <LinearGradient colors={GRADIENT_COLORS} style={styles.cardAura} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
              <Image source={require("../../assets/logo.png")} style={styles.cardLogo} />
              <Text style={styles.cardTitle}>{t("primer.hero_title")}</Text>
              <Text style={styles.cardSubtitle}>{t("primer.hero_subtitle_big")}</Text>
              <LinearGradient colors={GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardFreeBadge}>
                <Ionicons name="sparkles-outline" size={14} color={Colors.light.tint} />
                <Text style={styles.cardFreeBadgeText}>{t("primer.free_badge")}</Text>
              </LinearGradient>
            </View>
          </View>

          {/* ACTIONS - BUTONLAR ARTIK KENDİ BAĞIMSIZ ALANINDA. */}
          <View style={styles.actionsContainer}>
            <Pressable onPress={start} accessibilityRole="button">
              <LinearGradient colors={GRADIENT_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonsPrimary}>
                <Text style={styles.buttonsPrimaryText}>{t("primer.cta_analysis")}</Text>
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => router.push("/login")} style={styles.buttonsSecondary} accessibilityRole="button">
              <Text style={styles.buttonsSecondaryText}>{t("primer.have_account")}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// STİLLERİNİ BÖYLE GRUPLANDIRACAKSIN. OKUNABİLİR VE YÖNETİLEBİLİR OLACAK.
// Page styles
const styles = StyleSheet.create({
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1 },
  // Wrapper artık içeriği yaymak yerine sarmalıyor. Butonların genişliği buradan kontrol ediliyor.
  pageWrapper: {
    flex: 1,
    paddingHorizontal: 16, // BUTONLARI GENİŞLETMEK İÇİN YATAY PADDING'İ AZALTTIM.
    paddingBottom: Platform.OS === 'ios' ? 0 : SPACING.medium, // Android'de altta ekstra boşluk bırak.
  },
  // YENİ ANA İÇERİK KONTEYNERİ
  pageMainContent: {
    flex: 1, // Bu kritik. Kendine ayrılan tüm boşluğu doldurur.
    justifyContent: "center", // İçeriği (header ve kart) dikeyde ortalar.
  },

  // Header styles
  headerContainer: {
    alignItems: "center",
    // Kart ile header arasındaki boşluğu artık kartın margin'i ile kontrol ediyoruz.
    // Bu sayede merkezleme daha doğru çalışıyor.
  },
  headerBrand: {
    fontSize: 32,
    fontWeight: "600",
    color: Colors.light.tint,
    textTransform: "lowercase",
    letterSpacing: -0.5,
  },
  headerDot: {
    color: Colors.light.tint,
    fontSize: 36,
    fontWeight: "900",
  },

  // Card styles
  cardContainer: {
    marginTop: SPACING.large, // Header ile arasına boşluk koyduk.
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.xlarge, // Her yönden eşit padding, daha temiz.
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.12)",
    position: "relative",
    shadowColor: "#6C63FF", // Gölge rengini daha belirgin yaptım.
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardAura: {
    position: "absolute",
    top: -80,
    width: "150%",
    height: 200,
    borderRadius: 200,
    opacity: 0.25,
    transform: [{ rotate: "10deg" }],
  },
  cardLogo: {
    width: 72,
    height: 72,
    marginBottom: SPACING.large,
    opacity: 0.95,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "600",
    color: Colors.light.tint,
    textAlign: "center",
    marginBottom: SPACING.small,
  },
  cardSubtitle: {
    color: "#4A5568",
    opacity: 0.85,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  cardFreeBadge: {
    marginTop: SPACING.large,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
  },
  cardFreeBadgeText: {
    color: Colors.light.tint,
    fontWeight: "600",
    letterSpacing: -0.2,
    fontSize: 12,
  },

  // Actions styles
  actionsContainer: {
    gap: 12, // Butonlar arası boşluğu biraz açtım.
    paddingVertical: SPACING.large, // Kart ile butonlar arasına net bir boşluk.
  },

  // Button styles
  buttonsPrimary: {
    paddingVertical: 20, // Daha dolgun butonlar.
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonsPrimaryText: {
    color: Colors.light.tint,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: -0.5, // Fontu hafif büyüttüm, daha okunaklı.
  },
  buttonsSecondary: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    width: "100%",
  },
  buttonsSecondaryText: {
    color: Colors.light.tint,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.5,
    opacity: 0.8,
  },
});