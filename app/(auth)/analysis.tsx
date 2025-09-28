// app/(auth)/analysis.tsx
import { useRouter } from "expo-router/";
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import ProcessingScreen from "../../components/ProcessingScreen";
import { useOnboardingStore } from "../../store/onboardingStore";
import { Colors } from "../../constants/Colors";
import { generatePdf } from "../../utils/pdfGenerator";
import { useAuth } from "../../context/Auth";
import Toast from "react-native-toast-message";
import { supabase } from "../../utils/supabase";
import i18n from "../../utils/i18n";

// === YENİ COMPONENT: InsightCard ===
interface InsightCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  index: number;
}

function InsightCard({ icon, title, text, index }: InsightCardProps) {
  return (
    <Animated.View entering={FadeInUp.delay(index * 150).duration(600).springify().damping(12)}>
      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <LinearGradient colors={GRADIENT_COLORS} style={styles.insightIconContainer}>
            <Ionicons name={icon} size={22} color={Colors.light.tint} />
          </LinearGradient>
          <Text style={styles.insightTitle}>{title}</Text>
        </View>
        <Text style={styles.insightText}>{text}</Text>
      </View>
    </Animated.View>
  );
}

export default function Analysis() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const insight = useOnboardingStore((s) => s.onboardingInsight);
  const setOnboardingInsight = useOnboardingStore((s) => s.setOnboardingInsight);
  const answersArray = useOnboardingStore((s) => s.answersArray);
  const nicknameFromStore = useOnboardingStore((s) => s.nickname);
  const analysisUnlockedStore = useOnboardingStore((s) => s.analysisUnlocked);
  const setAnalysisUnlocked = useOnboardingStore((s) => s.setAnalysisUnlocked);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const [minDelayPassed, setMinDelayPassed] = useState(false);
  const [analysisUnlocked, setAnalysisUnlockedLocal] = useState(analysisUnlockedStore);

  // === YENİ STATE ===
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  // =================

  const hasInsight = Boolean(
    insight && (insight.pattern || insight.potential || insight.first_step)
  );

  // === VERİYİ GÖRSELLEŞTİRMEK İÇİN HAZIRLA ===
  const insightSections = useMemo(() => {
    if (!insight) return [];
    return [
      { icon: "bulb-outline", title: t("analysis.sections.pattern"), text: insight.pattern },
      { icon: "key-outline", title: t("analysis.sections.reframe"), text: insight.reframe },
      { icon: "sparkles-outline", title: t("analysis.sections.potential"), text: insight.potential },
      { icon: "rocket-outline", title: t("analysis.sections.first_step"), text: insight.first_step },
      { icon: "leaf-outline", title: t("analysis.sections.micro_habit"), text: insight.micro_habit },
      { icon: "trophy-outline", title: t("analysis.sections.success_metric"), text: insight.success_metric },
      { icon: "shield-checkmark-outline", title: t("analysis.sections.affirmation"), text: insight.affirmation },
      { icon: "calendar-outline", title: t("analysis.sections.plan_7d"), text: insight.plan_7d },
    ].filter((section) => Boolean(section.text));
  }, [insight, t]);

  // En az 2 saniye bekle, ardından insight hazırsa devam et
  useEffect(() => {
    const timerId = setTimeout(() => setMinDelayPassed(true), 2000);
    return () => clearTimeout(timerId);
  }, []);

  // Insight'ı güvenli şekilde üret
  useEffect(() => {
    const generateInsight = async () => {
      if (insight) return; // Zaten varsa tekrar üretme

      const a1 = answersArray[0]?.answer ?? "";
      const a2 = answersArray[1]?.answer ?? "";
      const a3 = answersArray[2]?.answer ?? "";
      const nickname = (user?.user_metadata?.nickname as string | undefined) || nicknameFromStore;

      if (!a1 || !a2 || !a3 || !nickname) {
        Toast.show({ type: "error", text1: "Analiz için gerekli veriler eksik." });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-onboarding-insight",
          {
            body: {
              answer1: a1,
              answer2: a2,
              answer3: a3,
              language: i18n.language,
              nickname,
            },
          },
        );

        if (error) {
          throw new Error(error.message);
        }

        const payload = typeof data === "string" ? JSON.parse(data) : data;
        setOnboardingInsight(payload as Record<string, string>);
      } catch (err) {
        console.error("[analysis] generate-onboarding-insight hata:", err);
        Toast.show({ type: "error", text1: "Analiz oluşturulamadı.", text2: "Lütfen tekrar dene." });
      }
    };

    generateInsight();
  }, [insight, answersArray, user, nicknameFromStore, setOnboardingInsight]);

  // Analiz bir kez açıldıktan sonra tekrar Processing'e dönmeyi engelle
  useEffect(() => {
    if (!analysisUnlocked && hasInsight && minDelayPassed) {
      setAnalysisUnlockedLocal(true);
      setAnalysisUnlocked(true);
    }
  }, [hasInsight, minDelayPassed, analysisUnlocked, setAnalysisUnlocked]);

  const handleExportPdf = async () => {
    // 1. İşlem zaten başlamışsa tekrar başlatma
    if (isGeneratingPdf) return;

    // 2. insight verisinin var olduğundan emin ol
    if (!insight) {
      Toast.show({ type: "error", text1: "Analiz verisi bulunamadı." });
      return;
    }

    // 3. Nickname'i GÜVENLİ bir şekilde al
    const nickname = user?.user_metadata?.nickname || "Dostum";

    // 4. İşlemi başlat ve butonu kilitle
    setIsGeneratingPdf(true);

    try {
      // 5. Asenkron olan asıl PDF oluşturma fonksiyonunu çağır
      await generatePdf(insight, nickname);
    } catch (error) {
      // generatePdf içinde zaten Toast gösteriliyor ama yine de loglayalım.
      console.error("handleExportPdf içinde hata:", error);
    } finally {
      // 6. İşlem bitince (hata olsa da olmasa da) butonu tekrar aktif et
      setIsGeneratingPdf(false);
    }
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
          <View style={styles.headerContainer}>
            <Text style={styles.title}>{t("analysis.title_emphasis")}</Text>
            <Text style={styles.subtitle}>{t("analysis.subtitle")}</Text>
          </View>

          <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentScrollContainer} showsVerticalScrollIndicator={false}>
            {hasInsight ? (
              insightSections.map((section, index) => (
                <InsightCard
                  key={section.title}
                  index={index}
                  icon={section.icon as any}
                  title={section.title}
                  text={section.text!}
                />
              ))
            ) : (
              <View style={styles.notFoundContainer}>
                <Text style={styles.messageMuted}>{t("analysis.not_found")}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.actionsContainer}>
            <Pressable
              onPress={handleContinue}
              // PDF üretilirken diğer butona da basılmasın
              disabled={isGeneratingPdf}
              accessibilityRole="button"
            >
              <LinearGradient
                // Buton pasifken soluk görünsün
                colors={isGeneratingPdf ? ["#B0BEC5", "#CFD8DC"] : ["#3E6B89", "#5DA1D9"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.buttonsPrimary}
              >
                <Text style={styles.buttonsPrimaryText}>{t("analysis.cta.continue")}</Text>
                <Ionicons name="arrow-forward-outline" size={20} color={"#FFFFFF"} />
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleExportPdf}
              // Butonu state'e göre kilitle
              disabled={isGeneratingPdf}
              style={[styles.buttonsSecondary, isGeneratingPdf && styles.buttonDisabled]} // Pasif stil ekle
              accessibilityRole="button"
            >
              <Ionicons
                name={isGeneratingPdf ? "hourglass-outline" : "download-outline"} // Yüklenirken ikonu değiştir
                size={18}
                color={Colors.light.tint}
              />
              <Text style={styles.buttonsSecondaryText}>
                {isGeneratingPdf ? "Rapor Hazırlanıyor..." : t("analysis.cta.export_pdf")}
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const GRADIENT_COLORS = ["#E0ECFD", "#F4E6FF"] as const;
const SPACING = { small: 8, medium: 16, large: 24, xlarge: 32 } as const;
const BORDER_RADIUS = { button: 22, card: 24 } as const;

const styles = StyleSheet.create({
  // === SAYFA TEMELİ ===
  pageContainer: { flex: 1 },
  pageSafeArea: { flex: 1 },
  pageWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // === BAŞLIK BÖLÜMÜ ===
  headerContainer: {
    alignItems: "center",
    marginBottom: SPACING.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.tint,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.softText,
    textAlign: "center",
    marginTop: 4,
    maxWidth: '85%',
  },

  // === SCROLL EDEN İÇERİK BÖLÜMÜ ===
  contentScroll: {
    flex: 1,
  },
  contentScrollContainer: {
    paddingBottom: 24,
  },

  // === YENİ İÇGÖRÜ KARTI STİLLERİ ===
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: BORDER_RADIUS.card,
    paddingVertical: SPACING.medium,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(93,161,217,0.15)",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.light.tint,
    flex: 1,
  },
  insightText: {
    fontSize: 16,
    color: "#4A5568",
    lineHeight: 24,
  },

  // Analiz bulunamazsa gösterilecek mesaj
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  messageMuted: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: 'center',
  },

  // === ALT AKSİYON BUTONLARI ===
  actionsContainer: {
    gap: 12,
    paddingVertical: SPACING.medium,
    borderTopWidth: 1,
    borderTopColor: 'rgba(93,161,217,0.15)',
    backgroundColor: '#F7FAFF',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  buttonsPrimary: {
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonsPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  buttonsSecondary: {
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonsSecondaryText: {
    color: Colors.light.tint,
    fontWeight: "600",
    fontSize: 16,
    opacity: 0.85,
  },

  // === PASİF BUTON STİLİ ===
  buttonDisabled: {
    opacity: 0.5,
  },
});
