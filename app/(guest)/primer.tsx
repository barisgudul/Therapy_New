// app/(guest)/primer.tsx
import { useRouter } from "expo-router";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { changeLanguage, SUPPORTED_LANGUAGES } from "../../utils/i18n"; // Yeni fonksiyonları import et

export default function Primer() {
  const router = useRouter();
  const { i18n, t } = useTranslation();

  const start = () => {
    // Bu fonksiyon aynı kalıyor
    router.replace("/(guest)/step1");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t("primer.title")}
      </Text>
      <Text style={styles.subtitle}>
        {t("primer.subtitle")}
      </Text>

      {/* GEÇİCİ DİL DEĞİŞTİRME BUTONLARI */}
      <View style={styles.languageSelector}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <Pressable
            key={lang}
            onPress={() => changeLanguage(lang)}
            style={[styles.langButton, i18n.language === lang && styles.langButtonActive]}
          >
            <Text style={[styles.langButtonText, i18n.language === lang && styles.langButtonTextActive]}>
              {lang.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.currentLangText}>Aktif Dil: {i18n.language}</Text>

      <Pressable onPress={start} style={styles.button}>
        <Text style={styles.buttonText}>{t("primer.cta")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 12 },
  subtitle: { color: "#6b7280", textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#0a7ea4", paddingVertical: 14, paddingHorizontal: 24, borderRadius: 999, marginTop: 20 },
  buttonText: { color: "white", fontWeight: "600" },
  languageSelector: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  langButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  langButtonActive: { backgroundColor: '#0a7ea4', borderColor: '#0a7ea4' },
  langButtonText: { color: '#333' },
  langButtonTextActive: { color: 'white' },
  currentLangText: { fontSize: 12, color: '#999' },
});
