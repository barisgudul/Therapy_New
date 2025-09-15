// app/(guest)/softwall.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React from "react";
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Colors } from "../../constants/Colors";
import { logEvent } from "../../services/api.service";

export default function SoftWall() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={["#F4F6FF", "#FFFFFF"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.wrap}>
        <View style={styles.hero}>
          <Image source={require("../../assets/therapy-illustration.png")} style={styles.logo} />
          <Text style={styles.title}>{t("softwall.title")}</Text>
          <Text style={styles.subtitle}>
            {t("softwall.subtitle")}
          </Text>
        </View>

        <View style={styles.bullets}>
          <Item text={t("softwall.bullet1")} />
          <Item text={t("softwall.bullet2")} />
          <Item text={t("softwall.bullet3")} />
        </View>

        <Pressable
          style={styles.cta}
          onPress={() => {
            logEvent({ type: "register_click", data: { source: "softwall" } }).catch(()=>{});
            router.push("/register");
          }}>
          <Text style={styles.ctaText}>{t("softwall.cta_register")}</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>

        <Pressable onPress={() => router.push("/login")} style={{ marginTop: 16 }}>
          <Text style={styles.loginLink}>{t("softwall.login_link")}</Text>
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Item({ text }: { text: string }) {
  return (
    <View style={styles.item}>
      <View style={styles.tick}>
        <Ionicons name="checkmark" size={16} color="#fff" />
      </View>
      <Text style={styles.itemText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  hero: { alignItems: "center", marginBottom: 16 },
  logo: { width: 56, height: 56, marginBottom: 12, opacity: 0.9 },
  title: { fontSize: 28, fontWeight: "700", color: Colors.light.tint, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { marginTop: 8, color: "#4A5568", fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 320 },

  bullets: { width: "100%", maxWidth: 360, marginTop: 16, marginBottom: 24 },
  item: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 10,
    shadowColor: Colors.light.tint, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    borderWidth: 1, borderColor: "rgba(93,161,217,0.18)"
  },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.light.tint, alignItems: "center", justifyContent: "center", marginRight: 10 },
  itemText: { color: "#1A1F36", fontSize: 15, flex: 1 },

  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.light.tint, paddingVertical: 16, paddingHorizontal: 22,
    borderRadius: 16, width: "100%", maxWidth: 360,
    shadowColor: Colors.light.tint, shadowOpacity: 0.18, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20,
  },
  ctaText: { color: "#fff", fontWeight: "700", fontSize: 16, marginRight: 8 },
  loginLink: { color: Colors.light.tint, fontWeight: "600" },
});
