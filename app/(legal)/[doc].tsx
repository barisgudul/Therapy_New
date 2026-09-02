// app/(legal)/[doc].tsx
//
// Renders one legal document (privacy | terms | disclaimer) from
// constants/legal as Markdown.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router/";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import { useTranslation } from "react-i18next";
import { getLegalDoc, type LegalDoc } from "../../constants/legal";
import { Colors } from "../../constants/Colors";

const VALID: LegalDoc[] = ["privacy", "terms", "disclaimer"];

export default function LegalDocScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ doc?: string }>();
  const doc = (VALID as string[]).includes(params.doc ?? "")
    ? (params.doc as LegalDoc)
    : "privacy";

  const body = getLegalDoc(doc, i18n.language);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={["#F7F8FF", "#FFFFFF"]} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t(`legal.doc_title.${doc}`)}</Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel={t("legal.close")}
            testID="legal-close"
          >
            <Ionicons name="close" size={26} color="#1E293B" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Markdown style={markdownStyles}>{body}</Markdown>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FF" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#1E293B", flex: 1 },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 24,
    padding: 6,
  },
  content: { paddingHorizontal: 20, paddingBottom: 48 },
});

const markdownStyles = {
  body: { color: "#334155", fontSize: 15, lineHeight: 23 },
  heading1: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 8,
    marginBottom: 12,
  },
  heading2: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 20,
    marginBottom: 8,
  },
  strong: { fontWeight: "700", color: "#1E293B" },
  bullet_list: { marginBottom: 8 },
  link: { color: Colors.light.tint },
} as const;
