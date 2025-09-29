// hooks/useSubscription.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FeatureKey,
  getAllPlans,
  getCurrentSubscription,
  getUsageStats,
  SubscriptionPlan,
  updateUserPlan,
  UsageStats,
} from "../services/subscription.service";
import { PlanName } from "../store/subscriptionStore";

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

/**
 * Kullanıcının planını değiştirmek için kullanılan hook.
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newPlan: PlanName) => updateUserPlan(newPlan),
    onSuccess: () => { // onSettled yerine onSuccess kullan
      queryClient.invalidateQueries({ queryKey: queryKeys.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    },
    onError: () => { // Hata durumunda da invalidate et
      queryClient.invalidateQueries({ queryKey: queryKeys.current });
      queryClient.invalidateQueries({ queryKey: queryKeys.usage });
    },
  });
}
