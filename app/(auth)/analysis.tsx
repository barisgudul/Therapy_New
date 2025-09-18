// app/(auth)/analysis.tsx
import { useRouter } from "expo-router/";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import ProcessingScreen from "../../components/ProcessingScreen";
import { useOnboardingStore } from "../../store/onboardingStore";
import { Colors } from "../../constants/Colors";
import { generatePdf } from "../../utils/pdfGenerator";
import type { AnalysisReportContent } from "../../types/analysis";

export default function Analysis() {
  const router = useRouter();
  const { t } = useTranslation();
  const insight = useOnboardingStore((s) => s.onboardingInsight);
  const analysisUnlockedStore = useOnboardingStore((s) => s.analysisUnlocked);
  const setAnalysisUnlocked = useOnboardingStore((s) => s.setAnalysisUnlocked);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  const [analysisUnlocked, setAnalysisUnlockedLocal] = useState(analysisUnlockedStore);

  const followUps = useMemo(() => {
    if (!insight?.follow_ups) return [] as string[];
    return insight.follow_ups.split("•").map((s) => s.trim()).filter(Boolean);
  }, [insight]);

  const hasInsight = Boolean(
    insight && (insight.pattern || insight.potential || insight.first_step)
  );

  // En az 2 saniye bekle, ardından insight hazırsa devam et
  useEffect(() => {
    const timerId = setTimeout(() => setMinDelayPassed(true), 2000);
    return () => clearTimeout(timerId);
  }, []);

  // Analiz bir kez açıldıktan sonra tekrar Processing'e dönmeyi engelle
  useEffect(() => {
    if (!analysisUnlocked && hasInsight && minDelayPassed) {
      setAnalysisUnlockedLocal(true);
      setAnalysisUnlocked(true);
    }
  }, [hasInsight, minDelayPassed, analysisUnlocked, setAnalysisUnlocked]);

  const handleExportPdf = async () => {
    if (!insight) return;
    const content: AnalysisReportContent = {
      reportSections: {
        mainTitle: t('analysis.pdf.title'),
        overview: `${t('analysis.pdf.pattern')}\n${insight.pattern || ""}\n\n${t('analysis.pdf.reframe')}\n${insight.reframe || ""}`,
        goldenThread: `${t('analysis.pdf.potential')}\n${insight.potential || ""}\n\n${t('analysis.pdf.first_step')}\n${insight.first_step || ""}\n\n${t('analysis.pdf.micro_habit')}\n${insight.micro_habit || ""}`,
        blindSpot: `${t('analysis.pdf.root_cause')}\n${insight.root_cause || ""}\n\n${t('analysis.pdf.success_metric')}\n${insight.success_metric || ""}\n\n${t('analysis.pdf.follow_ups')}\n${insight.follow_ups || ""}\n\n${t('analysis.pdf.plan_7d')}\n${insight.plan_7d || ""}`,
      },
      reportAnalogy: { title: "", text: "" },
      derivedData: { readMinutes: 2, headingsCount: 6 },
    };
    await generatePdf(content);
  };

  const handleContinue = () => {
    resetOnboarding(); // Onboarding state'ini temizle
    router.replace("/(app)"); // Ana uygulama ekranına yönlendir
  };

  const _handleContinue = () => {
    // kullanılmıyor
  };

  const showProcessing = !analysisUnlocked;
  if (showProcessing) {
    return (
      <ProcessingScreen
        text={t('analysis.processing_text')}
        onComplete={() => {}}
      />
    );
  }

  return (
    <LinearGradient colors={["#F7FAFF", "#FFFFFF"]} style={styles.pageContainer}>
      <SafeAreaView style={styles.pageSafeArea}>
        <View style={styles.pageWrapper}>
          <View style={styles.pageMainContent}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>{t("analysis.title")}</Text>
              <Text style={styles.subtitle}>{t("analysis.subtitle")}</Text>
            </View>

            <View style={styles.cardContainer}>
              <ScrollView
                style={styles.cardScroll}
                contentContainerStyle={styles.cardScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {hasInsight ? (
                  <View style={styles.sectionsWrapper}>
                    {insight?.pattern ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.pattern")}</Text>
                        <Text style={styles.sectionText}>{insight.pattern}</Text>
                      </View>
                    ) : null}
                    {insight?.reframe ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.reframe")}</Text>
                        <Text style={styles.sectionText}>{insight.reframe}</Text>
                      </View>
                    ) : null}
                    {insight?.potential ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.potential")}</Text>
                        <Text style={styles.sectionText}>{insight.potential}</Text>
                      </View>
                    ) : null}
                    {insight?.first_step ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.first_step")}</Text>
                        <Text style={styles.sectionText}>{insight.first_step}</Text>
                      </View>
                    ) : null}
                    {insight?.micro_habit ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.micro_habit")}</Text>
                        <Text style={styles.sectionText}>{insight.micro_habit}</Text>
                      </View>
                    ) : null}
                    {insight?.success_metric ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.success_metric")}</Text>
                        <Text style={styles.sectionText}>{insight.success_metric}</Text>
                      </View>
                    ) : null}
                    {insight?.affirmation ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.affirmation")}</Text>
                        <Text style={styles.sectionText}>{insight.affirmation}</Text>
                      </View>
                    ) : null}
                    {followUps.length > 0 ? (
                      <View style={styles.sectionBlock}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.follow_ups")}</Text>
                        <View style={styles.bulletsWrapper}>
                          {followUps.map((q, idx) => (
                            <View key={`${idx}-${q}`} style={styles.bulletRow}>
                              <Ionicons name="help-circle-outline" size={16} color={Colors.light.tint} />
                              <Text style={styles.bulletText}>{q}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                    {insight?.plan_7d ? (
                      <View style={styles.sectionBlockLast}>
                        <Text style={styles.sectionTitle}>{t("analysis.sections.plan_7d")}</Text>
                        <Text style={styles.sectionText}>{insight.plan_7d}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.messageMuted}>{t('analysis.not_found')}</Text>
                )}
              </ScrollView>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <Pressable onPress={handleContinue} accessibilityRole="button">
              <LinearGradient
                colors={GRADIENT_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonsPrimary}
              >
                <Text style={styles.buttonsPrimaryText}>{t("analysis.cta.continue")}</Text>
                <Ionicons name="arrow-forward-outline" size={20} color={Colors.light.tint} />
              </LinearGradient>
            </Pressable>

            <Pressable onPress={handleExportPdf} style={styles.buttonsSecondary} accessibilityRole="button">
              <Ionicons name="download-outline" size={18} color={Colors.light.tint} />
              <Text style={styles.buttonsSecondaryText}>{t("analysis.cta.export_pdf")}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = { small: 8, medium: 16, large: 24, xlarge: 32 } as const;
const BORDER_RADIUS = { button: 22, card: 32, pill: 999 } as const;

const styles = StyleSheet.create({
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1 },
  pageWrapper: {
    flex: 1,
    paddingHorizontal: 16,
  },
  pageMainContent: {
    flex: 1,
    justifyContent: "center",
  },

  headerContainer: { alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", color: "#111827", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 4 },

  cardContainer: {
    marginTop: SPACING.large,
    backgroundColor: "#fff",
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.xlarge,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.12)",
    position: "relative",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardScroll: { maxHeight: 420 },
  cardScrollContent: { paddingBottom: 4 },
  cardText: { fontSize: 16, color: "#111827", lineHeight: 24 },
  messageMuted: { fontSize: 16, color: "#6B7280" },

  // Yeni bölüm stilleri - primer/login ile uyumlu tipografi ve aralıklar
  sectionsWrapper: { gap: 16 },
  sectionBlock: { marginBottom: 12 },
  sectionBlockLast: { marginBottom: 0 },
  sectionTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  sectionText: { fontSize: 16, color: "#111827", lineHeight: 24 },
  bulletsWrapper: { gap: 8 },
  bulletRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulletText: { fontSize: 15, color: "#111827", flex: 1 },

  actionsContainer: {
    gap: 12,
    paddingVertical: SPACING.large,
  },
  buttonsPrimary: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  buttonsPrimaryText: {
    color: Colors.light.tint,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: -0.5,
  },
  buttonsSecondary: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    flexDirection: "row",
    gap: 8,
  },
  buttonsSecondaryText: {
    color: Colors.light.tint,
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: -0.5,
    opacity: 0.85,
  },
});
