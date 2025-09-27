// app/(settings)/subscription.tsx
import FeatureComparisonTable from "@/components/subscription/FeatureComparisonTable";
import PlanCard from "@/components/subscription/PlanCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router/";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message"; // Toast'u import et
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/Auth";
import {
  useSubscription,
  useSubscriptionPlans,
  useUpdateSubscription,
} from "../../hooks/useSubscription";
import { SubscriptionPlan } from "../../services/subscription.service";
// Diğer importlarının yanına
import { PlanName } from "../../store/subscriptionStore"; // PlanName'i buradan import et

const getThemeForPlan = (planName: string) => {
  const themes = {
    Premium: {
      gradient: ["#F4E6FF", "#EBF0FF"],
      textColor: "#5B21B6",
      borderColor: "rgba(124, 58, 237, 0.3)",
      shadowColor: "rgba(124, 58, 237, 0.4)",
      icon: "diamond-outline" as const,
    },
    "+Plus": {
      gradient: ["#EFF6FF", "#E0F2FE"],
      textColor: "#075985",
      borderColor: "rgba(14, 165, 233, 0.3)",
      shadowColor: "rgba(14, 165, 233, 0.4)",
      icon: "star-outline" as const,
    },
    Free: {
      gradient: ["#F8FAFC", "#F1F5F9"],
      textColor: "#475569",
      borderColor: "rgba(203, 213, 225, 0.6)",
      shadowColor: "#94A3B8",
      icon: "person-outline" as const,
    },
  };
  return themes[planName as keyof typeof themes] || themes.Free;
};

export default function SubscriptionScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const router = useRouter();
  // YENİ HOOK'LAR
  const { planName, isLoading: subscriptionLoading } = useSubscription();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { mutate: upgradePlan, isPending: _isPending } = useUpdateSubscription();
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  // YENİ handleUpgrade
  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (!user || updatingPlanId) return;

    setUpdatingPlanId(plan.id);

    upgradePlan(plan.name as PlanName, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: t('settings.subscription.toast_success_title'),
          text2: t('settings.subscription.toast_success_body', { planName: plan.name }),
        });
      },
      onError: (error) => {
        console.error("Plan yükseltme hatası:", error);
        Toast.show({ type: "error", text1: t('settings.subscription.toast_error_title'), text2: t('settings.subscription.toast_error_body') });
      },
      onSettled: () => {
        setUpdatingPlanId(null);
      }
    });
  };
  // ... handleUpgrade fonksiyonundan sonra ...

  const comparisonData = useMemo(() => {
    // Statik karşılaştırma matrisi (veritabanında limit tablosu olduğu için plan nesnesinde yok)
    const values: Record<string, { plus: string; premium: string; icon: keyof typeof Ionicons.glyphMap; name: string }> = {
      text_sessions: { plus: "Sınırsız", premium: "Sınırsız", icon: "chatbubble-ellipses-outline", name: t('settings.subscription.feature_text_sessions') },
      voice_sessions: { plus: "Evet", premium: "Evet", icon: "mic-outline", name: t('settings.subscription.feature_voice_sessions') },
      dream_analysis: { plus: "Evet", premium: "Evet", icon: "moon-outline", name: t('settings.subscription.feature_dream_analysis') },
      ai_reports: { plus: "❌", premium: "Evet", icon: "analytics-outline", name: t('settings.subscription.feature_ai_reports') },
      therapist_selection: { plus: "❌", premium: "Tüm Terapistler", icon: "people-outline", name: t('settings.subscription.feature_therapist_selection') },
      session_history: { plus: "Evet", premium: "Evet", icon: "time-outline", name: t('settings.subscription.feature_session_history') },
      pdf_export: { plus: "❌", premium: "Evet", icon: "download-outline", name: t('settings.subscription.feature_pdf_export') },
      priority_support: { plus: "❌", premium: "Evet", icon: "headset-outline", name: t('settings.subscription.feature_priority_support') },
    };

    return Object.keys(values).map((key) => ({
      feature: values[key].name,
      plus: values[key].plus,
      premium: values[key].premium,
      icon: values[key].icon,
    }));
  }, [t]);
  // DÜZELTİLDİ: Orijinal diziyi bozmuyor ve her render'da yeniden hesaplanmıyor.
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => b.price - a.price);
  }, [plans]);

  if (plansLoading || subscriptionLoading) {
    return (
      <LinearGradient
        colors={["#fdf2f8", "#eef2ff"]}
        style={styles.loadingContainer}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#F4F6FF", "#FFFFFF"]} style={styles.container}>
      <SafeAreaView style={styles.flex}>
        {/* YENİ HEADER */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>{t('settings.subscription.title')}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={28} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          <Text style={styles.headerSubtitle}>
            {t('settings.subscription.subtitle')}
          </Text>

        <View style={styles.plansContainer}>
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={{ id: plan.id, name: plan.name, price: plan.price }}
              // ARTIK DOĞRU YAPIYORSUN. DİNAMİK VERİYE GÖRE TEMA SEÇİYORSUN.
              theme={getThemeForPlan(plan.name)}
              isCurrent={planName === plan.name}
              isLoading={updatingPlanId === plan.id}
              onUpgrade={() => handleUpgrade(plan)}
            />
          ))}
        </View>

        {/* ARTIK TEMİZ BİR COMPONENT ÇAĞRISI. İÇİNDE NE OLDUĞU BU SAYFANIN UMURUNDA DEĞİL. */}
        {/* ARTIK GERÇEKTEN TEMİZ. */}
        <FeatureComparisonTable
          comparisonData={comparisonData} // DİNAMİK VERİ
          themeColors={{
            plusColor: getThemeForPlan("+Plus").textColor, // TEMADAN RENK
            premiumColor: getThemeForPlan("Premium").textColor, // TEMADAN RENK
          }}
        />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
// STİL DOSYASI ARTIK DAHA KÜÇÜK VE SADECE BU SAYFAYA AİT STİLLERİ BARINDIRIYOR.
const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    // position, top, right, zIndex SİLİNDİ
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 30,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 24, // Biraz küçült
    fontWeight: "800",
    color: "#1f2937",
    textAlign: 'center',
    flex: 1, // Ortalanması için
  },
  headerSpacer: {
    width: 44 // Kapatma butonunun genişliği kadar
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: "90%",
    paddingHorizontal: 28, // ScrollView içine girdiği için padding'i buraya taşı
    paddingBottom: 32,
  },
  plansContainer: { paddingHorizontal: 20, gap: 24, marginBottom: 50 },
});
