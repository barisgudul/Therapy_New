// hooks/useSubscription.ts - ADAM EDİLMİŞ HALİ

import { useCallback } from "react";
import i18n from "../utils/i18n";
import { SubscriptionPlan, UsageStats } from "../services/subscription.service";
import { useSubscriptionStore } from "../store/subscriptionStore";

// =================================================================
// === MOCK VERİLER (BUNLARA DOKUNMA) ===
// =================================================================

const MOCK_PLANS: SubscriptionPlan[] = [
  {
    id: "prod_premium123",
    name: "Premium",
    price: 99.99,
    currency: "$",
    description: i18n.t("settings.subscription.subtitle"),
    features: {
      text_sessions: i18n.t("settings.subscription.feature_text_sessions"),
      voice_sessions: i18n.t("settings.subscription.feature_voice_sessions"),
      dream_analysis: i18n.t("settings.subscription.feature_dream_analysis"),
      ai_reports: i18n.t("settings.subscription.feature_ai_reports"),
      session_history: i18n.t("settings.subscription.feature_session_history"),
      pdf_export: i18n.t("settings.subscription.feature_pdf_export"),
      priority_support: i18n.t(
        "settings.subscription.feature_priority_support",
      ),
    },
  },
  {
    id: "prod_plus456",
    name: "+Plus",
    price: 19.99,
    currency: "$",
    description: i18n.t("settings.subscription.subtitle"),
    features: {
      text_sessions: i18n.t("settings.subscription.feature_text_sessions"),
      voice_sessions: i18n.t("settings.subscription.feature_voice_sessions"),
      dream_analysis: i18n.t("settings.subscription.feature_dream_analysis"),
      ai_reports: i18n.t("settings.subscription.feature_ai_reports"),
      session_history: i18n.t("settings.subscription.feature_session_history"),
      pdf_export: i18n.t("settings.subscription.feature_pdf_export"),
      priority_support: i18n.t(
        "settings.subscription.feature_priority_support",
      ),
    },
  },
  {
    id: "prod_free789",
    name: "Free",
    price: 0,
    currency: "₺",
    description: i18n.t("settings.subscription.subtitle"),
    features: {},
  },
];

const MOCK_USAGE_STATS: Record<"Free" | "+Plus" | "Premium", UsageStats> = {
  Free: {
    dream_analysis: { can_use: true, used_count: 0, limit_count: 1 },
    ai_reports: { can_use: false, used_count: 1, limit_count: 1 },
    diary_write: { can_use: true, used_count: 2, limit_count: 7 },
    daily_write: { can_use: true, used_count: 1, limit_count: 7 },
    text_sessions: { can_use: true, used_count: 2, limit_count: 5 },
    voice_sessions: { can_use: false, used_count: 0, limit_count: 0 },
    pdf_export: { can_use: false, used_count: 0, limit_count: 0 },
    dream_dialogue: { can_use: true, used_count: 0, limit_count: 3 },
  },
  "+Plus": {
    dream_analysis: { can_use: true, used_count: 5, limit_count: -1 },
    ai_reports: { can_use: false, used_count: 0, limit_count: 0 },
    diary_write: { can_use: true, used_count: 15, limit_count: -1 },
    daily_write: { can_use: true, used_count: 20, limit_count: -1 },
    text_sessions: { can_use: true, used_count: 30, limit_count: -1 },
    voice_sessions: { can_use: true, used_count: 2, limit_count: 5 },
    pdf_export: { can_use: false, used_count: 0, limit_count: 0 },
    dream_dialogue: { can_use: true, used_count: 10, limit_count: -1 },
  },
  Premium: {
    dream_analysis: { can_use: true, used_count: 15, limit_count: -1 },
    ai_reports: { can_use: true, used_count: 4, limit_count: -1 },
    diary_write: { can_use: true, used_count: 10, limit_count: -1 },
    daily_write: { can_use: true, used_count: 7, limit_count: -1 },
    text_sessions: { can_use: true, used_count: 20, limit_count: -1 },
    voice_sessions: { can_use: true, used_count: 5, limit_count: -1 },
    pdf_export: { can_use: true, used_count: 1, limit_count: -1 },
    dream_dialogue: { can_use: true, used_count: 5, limit_count: -1 },
  },
};

// =================================================================
// === ADAM GİBİ HOOK'LAR ===
// Bütün `refresh` fonksiyonları artık `useCallback` ile güvende.
// =================================================================

export function useSubscription() {
  const planName = useSubscriptionStore((state) => state.planName);
  const setPlanName = useSubscriptionStore((state) => state.setPlanName);

  const isPremium = planName === "Premium";

  // setPlanName zaten Zustand tarafından stabil hale getiriliyor, o yüzden useCallback'e gerek yok.
  // Bu hook zaten doğruymuş.
  return {
    subscription: null,
    plan: MOCK_PLANS.find((p) => p.name === planName),
    isPremium,
    planName,
    loading: false,
    refresh: setPlanName,
  };
}

export function useSubscriptionPlans() {
  const sortedPlans = [...MOCK_PLANS].sort((a, b) => b.price - a.price);

  // BU FONKSİYON ARTIK STABİL BİR REFERANSA SAHİP
  const refreshPlans = useCallback(() => {
  }, []);

  return {
    plans: sortedPlans,
    loading: false,
    refresh: refreshPlans,
  };
}

/**
 * Belirli bir özelliğe erişim durumunu SİMÜLE EDER.
 * İŞTE BU SENİN ASIL SORUNUNDU.
 */
export function useFeatureAccess(feature: keyof UsageStats) {
  const planName = useSubscriptionStore((state) => state.planName);
  const allUsage = MOCK_USAGE_STATS[planName];
  const access = allUsage[feature] ||
    { can_use: false, used_count: 0, limit_count: 0 };

  // BU FONKSİYON ARTIK STABİL BİR REFERANSA SAHİP
  const refreshAccess = useCallback(() => {
    // Gerçek bir uygulamada burada API çağrısı ve state güncellemesi olurdu.
  }, []);

  return {
    ...access,
    loading: false,
    refresh: refreshAccess, // ARTIK STABİL BİR FONKSİYON DÖNDÜRÜYORUZ
  };
}

// =================================================================
// === YARDIMCI FONKSİYONLAR (BUNLARA DOKUNMA) ===
// =================================================================

export const formatUsageText = (used: number, limit: number): string => {
  if (limit === -1) return i18n.t("subscription.usage.unlimited");
  if (limit === 0) return i18n.t("subscription.usage.not_available");
  if (limit > 0 && limit < 1) {
    const weeklyLimit = Math.round(limit * 7);
    const usedWeekly = Math.ceil(used * 7);
    const remainingWeekly = weeklyLimit - usedWeekly;
    return `${remainingWeekly > 0 ? remainingWeekly : 0} / ${weeklyLimit} ${
      i18n.t("subscription.usage.weekly_quota")
    }`;
  }
  const remaining = limit - used;
  return `${remaining > 0 ? remaining : 0} / ${limit} ${
    i18n.t("subscription.usage.daily_quota")
  }`;
};

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 100) return "#EF4444";
  if (percentage > 80) return "#F59E0B";
  return "#10B981";
};

export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit <= 0) return 100;
  return (used / limit) * 100;
};
