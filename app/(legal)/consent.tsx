// app/(legal)/consent.tsx
//
// Blocking consent gate. Shown when a signed-in user has not accepted the
// current LEGAL_VERSION (new account via OAuth, pre-existing account, or a
// policy-version bump). Register has its own inline checkbox; this is the
// catch-all.
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { LEGAL_VERSION } from "../../constants/legal";
import { useConsentStore } from "../../store/consentStore";
import { Colors } from "../../constants/Colors";

export default function ConsentScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const accept = useConsentStore((s) => s.accept);
  const [checked, setChecked] = useState(false);

  const openDoc = (doc: "privacy" | "terms" | "disclaimer") =>
    router.push(`/(legal)/${doc}`);

  const onAccept = () => {
    if (!checked) return;
    accept(LEGAL_VERSION, i18n.language);
    router.replace("/(app)");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={["#F7F8FF", "#FFFFFF"]} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Ionicons
            name="shield-checkmark-outline"
            size={44}
            color={Colors.light.tint}
          />
          <Text style={styles.title}>{t("legal.consent.title")}</Text>
          <Text style={styles.body}>{t("legal.consent.body")}</Text>

          <View style={styles.links}>
            <LinkRow label={t("legal.doc_title.privacy")} onPress={() => openDoc("privacy")} />
            <LinkRow label={t("legal.doc_title.terms")} onPress={() => openDoc("terms")} />
            <LinkRow label={t("legal.doc_title.disclaimer")} onPress={() => openDoc("disclaimer")} />
          </View>

          <Pressable
            style={styles.checkboxRow}
            onPress={() => setChecked((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            testID="consent-checkbox"
          >
            <Ionicons
              name={checked ? "checkbox" : "square-outline"}
              size={24}
              color={checked ? Colors.light.tint : "#94A3B8"}
            />
            <Text style={styles.checkboxLabel}>{t("legal.consent.checkbox")}</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={onAccept}
            disabled={!checked}
            style={[styles.acceptButton, !checked && styles.acceptButtonDisabled]}
            accessibilityRole="button"
            testID="consent-accept"
          >
            <Text style={styles.acceptText}>{t("legal.consent.accept")}</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress} accessibilityRole="link">
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F7F8FF" },
  container: { flex: 1 },
  content: { padding: 24, alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 10,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
    textAlign: "center",
    marginBottom: 20,
  },
  links: {
    alignSelf: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkText: { fontSize: 15, fontWeight: "600", color: "#334155" },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    alignSelf: "stretch",
  },
  checkboxLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: "#475569" },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.6)",
  },
  acceptButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  acceptButtonDisabled: { opacity: 0.4 },
  acceptText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
