// hooks/useSubscription.ts
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/Auth';
import * as SubAPI from '../services/subscription.service';
import { FeatureUsageResult, SubscriptionPlan, UsageStats, UserSubscription } from '../services/subscription.service';

/**
 * Kullanıcının mevcut abonelik durumunu ve planını yönetir.
 * Otomatik olarak güncellenir ve arayüzde reaktif veri sağlar.
 */
export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const subData = await SubAPI.getSubscriptionForUser(user.id);
      setSubscription(subData);
    } catch (error) {
      console.error('Abonelik bilgileri alınırken hata:', error);
      setSubscription(null); // Hata durumunda state'i temizle
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);
  
  // Ekrana her odaklanıldığında veriyi yenile
  useFocusEffect(useCallback(() => {
    fetchSubscription();
  }, [fetchSubscription]));

  return {
    subscription,
    plan: subscription?.plan,
    isPremium: subscription?.plan?.name === 'Premium',
    planName: subscription?.plan?.name || 'Free',
    loading,
    refresh: fetchSubscription,
  };
}

/**
 * Tüm mevcut abonelik planlarını getirir.
 */
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const planData = await SubAPI.getAllPlans();
      setPlans(planData);
    } catch (error) {
      console.error('Planlar alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, refresh: fetchPlans };
}

/**
 * Kullanıcının tüm özellikler için kullanım istatistiklerini getirir.
 */
export function useUsageStats() {
    const { user } = useAuth();
    const [usage, setUsage] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUsage = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const usageData = await SubAPI.getInitialUsageStats(user.id);
            setUsage(usageData);
        } catch (error) {
            console.error('Kullanım istatistikleri alınırken hata:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUsage();
    }, [fetchUsage]);
    
    // Ekrana her odaklanıldığında veriyi yenile
    useFocusEffect(useCallback(() => {
        fetchUsage();
    }, [fetchUsage]));

    // Düzgün bir şekilde state'leri döndür
    return {
        ...usage,
        loading,
        refresh: fetchUsage,
    };
}


/**
 * Belirli bir özelliğe erişim durumunu kontrol eder.
 * @param feature Kontrol edilecek özellik anahtarı.
 */
export function useFeatureAccess(feature: keyof UsageStats) {
  const { user } = useAuth();
  const [access, setAccess] = useState<FeatureUsageResult>({
    can_use: false,
    used_count: 0,
    limit_count: 0,
  });
  const [loading, setLoading] = useState(true);

  const checkAccess = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const accessData = await SubAPI.getUsageStatsForUser(user.id, feature);
      setAccess(accessData);
    } catch (error) {
      console.error(`${feature} için erişim kontrolü hatası:`, error);
    } finally {
      setLoading(false);
    }
  }, [user, feature]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return { ...access, loading, refresh: checkAccess };
}

// =================================================================
// HELPER FONKSİYONLAR (PremiumGate içinde kullanılabilir)
// =================================================================

/**
 * Kullanım metnini formatlar (örn: "5 / 10").
 */
export const formatUsageText = (used: number, limit: number): string => {
  if (limit === -1) return 'Sınırsız';
  if (limit === 0) return 'Mevcut Değil';
  
  // Haftalık limitler için özel formatlama (örn: 0.25 -> Haftada 1)
  if (limit > 0 && limit < 1) {
      const weeklyLimit = Math.round(limit * 7);
      const usedWeekly = Math.ceil(used * 7);
      const remainingWeekly = weeklyLimit - usedWeekly;
      return `${remainingWeekly > 0 ? remainingWeekly : 0} / ${weeklyLimit} haftalık hak`;
  }

  const remaining = limit - used;
  return `${remaining > 0 ? remaining : 0} / ${limit} günlük hak`;
};

/**
 * Kullanım yüzdesine göre renk döndürür.
 */
export const getUsageColor = (percentage: number): string => {
  if (percentage >= 100) return '#EF4444'; // Red
  if (percentage > 80) return '#F59E0B'; // Amber
  return '#10B981'; // Green
};

/**
 * Kullanım yüzdesini hesaplar.
 */
export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit <= 0) return 100;
  return (used / limit) * 100;
}; 