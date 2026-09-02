// components/shared/ConfirmDeleteModal.tsx
//
// Cross-platform account-deletion confirmation (replaces the iOS-only
// Alert.prompt flow). Two visible stages: what gets deleted + grace period,
// then an explicit "I understand" checkbox gating the destructive button.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ReactNativeModal from "react-native-modal";
import { useTranslation } from "react-i18next";

export function ConfirmDeleteModal({
  isVisible,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isVisible: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const [understood, setUnderstood] = useState(false);

  // Reset the checkbox whenever the modal is reopened.
  useEffect(() => {
    if (!isVisible) setUnderstood(false);
  }, [isVisible]);

  const items = t("settings.account.delete_items", {
    returnObjects: true,
  }) as string[];

  return (
    <ReactNativeModal
      isVisible={isVisible}
      onBackdropPress={isDeleting ? undefined : onCancel}
      onBackButtonPress={isDeleting ? undefined : onCancel}
      useNativeDriver
      useNativeDriverForBackdrop
      style={styles.modal}
    >
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="warning-outline" size={22} color="#BE123C" />
          <Text style={styles.title}>{t("settings.account.delete_title")}</Text>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.paragraph}>{t("settings.account.delete_body")}</Text>

          {Array.isArray(items) &&
            items.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}

          <Text style={styles.grace}>{t("settings.account.delete_grace")}</Text>
        </ScrollView>

        <Pressable
          style={styles.checkboxRow}
          onPress={() => setUnderstood((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: understood }}
          testID="confirm-delete-checkbox"
          disabled={isDeleting}
        >
          <Ionicons
            name={understood ? "checkbox" : "square-outline"}
            size={22}
            color={understood ? "#BE123C" : "#94A3B8"}
          />
          <Text style={styles.checkboxLabel}>
            {t("settings.account.delete_confirm_checkbox")}
          </Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={isDeleting}
            testID="confirm-delete-cancel"
          >
            <Text style={styles.cancelText}>
              {t("settings.security.alert_cancel")}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.deleteButton,
              (!understood || isDeleting) && styles.deleteButtonDisabled,
            ]}
            onPress={onConfirm}
            disabled={!understood || isDeleting}
            testID="confirm-delete-submit"
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.deleteText}>
                {t("settings.account.delete_confirm_cta")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </ReactNativeModal>
  );
}

const styles = StyleSheet.create({
  modal: { justifyContent: "center", margin: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    maxHeight: "82%",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#9F1239", flex: 1 },
  body: { marginTop: 14 },
  bodyContent: { paddingBottom: 4 },
  paragraph: { fontSize: 14, lineHeight: 21, color: "#475569", marginBottom: 12 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  bulletDot: { color: "#BE123C", fontSize: 14, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: "#334155" },
  grace: {
    fontSize: 13,
    lineHeight: 19,
    color: "#64748B",
    marginTop: 12,
    fontStyle: "italic",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 16,
  },
  checkboxLabel: { flex: 1, fontSize: 13, lineHeight: 19, color: "#334155" },
  actions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#334155" },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#BE123C",
  },
  deleteButtonDisabled: { opacity: 0.4 },
  deleteText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});
