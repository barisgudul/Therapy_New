// components/OnboardingStep.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import Animated, { FadeIn } from "react-native-reanimated"; // Animasyon için

// TUTARLILIK İÇİN SABİTLERİ BURAYA DA GETİRİYORUZ
const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = { small: 8, medium: 16, large: 24, xlarge: 32 };
const BORDER_RADIUS = { button: 22, card: 24 };

interface OnboardingStepProps {
  step: number;
  totalSteps: number;
  questionKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  onNextPress: (answer: string) => void;
  isLastStep?: boolean;
  minChars?: number;
}

export default function OnboardingStep({
  step,
  totalSteps,
  questionKey,
  icon,
  onNextPress,
  isLastStep = false,
  minChars = 3,
}: OnboardingStepProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const isButtonDisabled = text.trim().length < minChars;

  return (
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={styles.pageContainer}>
      <SafeAreaView style={styles.pageSafeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.pageContainer}
        >
          {/* ScrollView, küçük ekranlarda klavye açılınca içeriğin sığmasını sağlar */}
          <ScrollView contentContainerStyle={styles.pageScrollContent}>

            {/* YAPI: Tüm sayfayı kaplayan ve içeriği dağıtan yapı */}
            <View style={styles.contentWrapper}>
              {/* ÜST BÖLÜM: İkon, Adım Sayacı ve Progress Bar */}
              <View style={styles.headerContainer}>
                <View style={styles.headerStepIndicator}>
                  <View style={styles.headerIconContainer}>
                    <Ionicons name={icon} size={20} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.headerStepText}>{t("common.stepCounter", { step, total: totalSteps })}</Text>
                </View>
                <View style={styles.headerProgressBarBackground}>
                  <Animated.View
                    entering={FadeIn}
                    style={[styles.headerProgressBarFill, { width: `${(step / totalSteps) * 100}%` }]}
                  />
                </View>
              </View>

              {/* ORTA BÖLÜM: Soru ve Metin Girişi */}
              <View style={styles.contentMain}>
                <Text style={styles.typographyQuestion}>{t(`${questionKey}.question`)}</Text>
                <Text style={styles.typographyDetails}>{t(`${questionKey}.details`)}</Text>
                <TextInput
                  style={styles.inputContainer}
                  multiline
                  placeholder={t("common.placeholder_freeWrite")}
                  placeholderTextColor="#A0AEC0"
                  value={text}
                  onChangeText={setText}
                  autoFocus // Otomatik olarak input'a odaklansın
                />
              </View>
            </View>

            {/* ALT BÖLÜM: Devam Butonu */}
            <View style={styles.actionsContainer}>
              <Pressable onPress={() => onNextPress(text)} disabled={isButtonDisabled}>
                <LinearGradient
                  colors={isButtonDisabled ? ["#E2E8F0", "#EDF2F7"] : GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.buttonsPrimary, isButtonDisabled && styles.buttonsDisabled]}
                >
                  <Text style={[styles.buttonsPrimaryText, isButtonDisabled && styles.buttonsDisabledText]}>
                    {isLastStep ? t("common.finishAndStart") : t("common.continue")}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={isButtonDisabled ? "#A0AEC0" : Colors.light.tint} />
                </LinearGradient>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1 },
  pageScrollContent: { flexGrow: 1, justifyContent: "space-between", padding: SPACING.medium },
  contentWrapper: { flex: 1, justifyContent: "flex-start" },
  contentMain: { marginTop: SPACING.large },
  headerContainer: { gap: SPACING.medium },
  headerStepIndicator: { flexDirection: "row", alignItems: "center", gap: SPACING.small },
  headerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(224, 236, 253, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerStepText: { fontSize: 14, fontWeight: "500", color: "#4A5568" },
  headerProgressBarBackground: { height: 6, backgroundColor: "#E2E8F0", borderRadius: 3 },
  headerProgressBarFill: { height: 6, backgroundColor: Colors.light.tint, borderRadius: 3 },
  typographyQuestion: { fontSize: 28, fontWeight: "700", color: Colors.light.tint, marginBottom: SPACING.small },
  typographyDetails: { fontSize: 16, color: "#4A5568", lineHeight: 24 },
  inputContainer: {
    marginTop: SPACING.large,
    height: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.medium,
    fontSize: 16,
    textAlignVertical: "top", // Android için
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.2)",
  },
  actionsContainer: { paddingTop: SPACING.medium },
  buttonsPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, width: "100%", paddingVertical: 20,
    borderRadius: BORDER_RADIUS.button,
  },
  buttonsPrimaryText: { color: Colors.light.tint, fontWeight: "700", fontSize: 16 },
  buttonsDisabled: { shadowOpacity: 0 },
  buttonsDisabledText: { color: "#A0AEC0" },
});
