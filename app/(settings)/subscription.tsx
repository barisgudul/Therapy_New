// app/(settings)/subscription.tsx
import FeatureComparisonTable from "@/components/subscription/FeatureComparisonTable";
import PlanCard from "@/components/subscription/PlanCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
import Toast from "react-native-toast-message"; // Toast'u import et
import { Colors } from "../../constants/Colors";
import { useAuth } from "../../context/Auth";
import {
  useSubscription,
  useSubscriptionPlans,
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
  const { user } = useAuth();
  const router = useRouter();
  const { planName, refresh: setSubscriptionPlan } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const handleUpgrade = (plan: SubscriptionPlan) => {
    if (!user || isUpgrading) return;
    setIsUpgrading(plan.id);
    try {
      // ARTIK HANGİ PLANA GEÇECEĞİNİ SÖYLÜYORUZ!
      setSubscriptionPlan(plan.name as PlanName); // `PlanName` tipini import etmeyi unutma

      Toast.show({
        type: "success",
        text1: "Simülasyon Başarılı!",
        text2: `Tebrikler, ${plan.name} planına geçtiniz.`,
      });
      router.replace("/profile");
    } catch (error) {
      console.error(error); // Hata varsa logla!
      Toast.show({ type: "error", text1: "Hata", text2: "Bir sorun oluştu." });
    } finally {
      setIsUpgrading(null);
    }
  };
  // ... handleUpgrade fonksiyonundan sonra ...

  const comparisonData = useMemo(() => {
    if (plans.length === 0) return [];

    const premiumPlan = plans.find((p) => p.name === "Premium");
    const plusPlan = plans.find((p) => p.name === "+Plus");

    if (!premiumPlan || !plusPlan) return [];

    // Tüm özelliklerin bir listesini çıkaralım (varsayılan ikonlarla)
    const allFeatureKeys = [
      {
        key: "text_sessions",
        name: "Metin Seansları",
        icon: "chatbubble-ellipses-outline" as const,
      },
      { key: "voice_sessions", name: "Sesli Seanslar", icon: "mic-outline" as const },
      { key: "dream_analysis", name: "Rüya Analizi", icon: "moon-outline" as const },
      { key: "ai_reports", name: "AI Raporları", icon: "analytics-outline" as const },
      {
        key: "therapist_selection",
        name: "Terapist Seçimi",
        icon: "people-outline" as const,
      },
      { key: "session_history", name: "Seans Geçmişi", icon: "time-outline" as const },
      { key: "pdf_export", name: "PDF Export", icon: "download-outline" as const },
      {
        key: "priority_support",
        name: "Öncelikli Destek",
        icon: "headset-outline" as const,
      },
    ];

    return allFeatureKeys.map((feature) => ({
      feature: feature.name,
      // Backend'den gelen 'features' objesinden değeri al, yoksa '❌' bas.
      plus: String(plusPlan.features[feature.key] || "❌"),
      premium: String(premiumPlan.features[feature.key] || "❌"),
      icon: feature.icon, // Artık as const ile tanımlandı
    }));
  }, [plans]); // Sadece planlar değiştiğinde yeniden hesapla
  // DÜZELTİLDİ: Orijinal diziyi bozmuyor ve her render'da yeniden hesaplanmıyor.
  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => b.price - a.price);
  }, [plans]);

  if (plansLoading) {
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
      <TouchableOpacity
        onPress={() =>
          router.back()}
        style={styles.backButton}
      >
        <Ionicons name="close" size={28} color={Colors.light.tint} />
      </TouchableOpacity>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Potansiyelini Ortaya Çıkar</Text>
          <Text style={styles.headerSubtitle}>
            Sınırsız erişim ile zihinsel sağlık yolculuğunda yeni bir sayfa aç.
          </Text>
        </View>

        <View style={styles.plansContainer}>
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              // ARTIK DOĞRU YAPIYORSUN. DİNAMİK VERİYE GÖRE TEMA SEÇİYORSUN.
              theme={getThemeForPlan(plan.name)}
              isCurrent={planName === plan.name}
              isLoading={isUpgrading === plan.id}
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
    </LinearGradient>
  );
}
// STİL DOSYASI ARTIK DAHA KÜÇÜK VE SADECE BU SAYFAYA AİT STİLLERİ BARINDIRIYOR.
const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 30,
    padding: 8,
  },
  header: {
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 32,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 18,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 26,
    maxWidth: "90%",
  },
  plansContainer: { paddingHorizontal: 20, gap: 24, marginBottom: 50 },
});
