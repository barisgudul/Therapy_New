// hooks/useSubscription.ts
import { useQuery } from "@tanstack/react-query";
import {
  FeatureKey,
  getAllPlans,
  getCurrentSubscription,
  getUsageStats,
  SubscriptionPlan,
  UsageStats,
} from "../services/subscription.service";

// React Query için anahtar (key) tanımları
const queryKeys = {
  plans: ["subscriptionPlans"],
  current: ["currentSubscription"],
  usage: ["usageStats"],
};

/**
 * Tüm abonelik planlarını getiren hook.
 */
export function useSubscriptionPlans() {
  return useQuery<SubscriptionPlan[], Error>({
    queryKey: queryKeys.plans,
    queryFn: getAllPlans,
  });
}

/**
 * Kullanıcının mevcut aboneliğini ve durumunu getiren hook.
 */
export function useSubscription() {
  const { data: subscription, isLoading, isError } = useQuery({
    queryKey: queryKeys.current,
    queryFn: getCurrentSubscription,
  });

  const isPremium = subscription?.name === "Premium";
  const planName = subscription?.name ?? "Free"; // Eğer abonelik yoksa Free varsay.

  return {
    subscription,
    planName,
    isPremium,
    isLoading,
    isError,
  };
}

/**
 * Kullanıcının TÜM özellikler için kullanım istatistiklerini getiren hook.
 */
export function useUsageStats() {
  return useQuery<UsageStats | null, Error>({
    queryKey: queryKeys.usage,
    queryFn: getUsageStats,
  });
}

/**
 * Belirli bir özelliğe erişim durumunu döndüren hook.
 */
export function useFeatureAccess(feature: FeatureKey) {
  const { data: usageStats, ...queryInfo } = useUsageStats();

  const access = usageStats?.[feature] ?? {
    can_use: false,
    used_count: 0,
    limit_count: 0,
    period: "month",
  };

  return { ...access, ...queryInfo };
}

// Plan changes are driven server-side by the RevenueCat webhook
// (revenuecat-webhook -> assign_plan_to_user via service_role). There is no
// client-side plan mutation: assign_plan_to_user is no longer callable by
// anon/authenticated.
