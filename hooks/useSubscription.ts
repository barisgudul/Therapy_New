// hooks/useSubscription.ts

import { SubscriptionPlan, UsageStats } from '../services/subscription.service';
import { useSubscriptionStore } from '../store/subscriptionStore';


// =================================================================
// === HAYALET VERİ MERKEZİ ===
// Bu bölüm, Apple Developer hesabın olana kadar bizim veritabanımız olacak.
// =================================================================

const MOCK_PLANS: SubscriptionPlan[] = [
    {
        id: 'prod_premium123',
        name: 'Premium',
        price: 99.99,
        currency: '$',
        description: 'Tüm özelliklere sınırsız erişim ve öncelikli destek.',
        features: {
            text_sessions: 'Sınırsız',
            voice_sessions: 'Sınırsız',
            dream_analysis: 'Sınırsız',
            ai_reports: 'Sınırsız',
            therapist_selection: 'Tüm Terapistler',
            session_history: 'Sınırsız',
            pdf_export: 'Evet',
            priority_support: 'Evet',
        }
    },
    {
        id: 'prod_plus456',
        name: '+Plus',
        price: 19.99,
        currency: '$',
        description: 'Temel özelliklere genişletilmiş erişim.',
        features: {
            text_sessions: 'Sınırsız',
            dream_analysis: '1/hafta',
            ai_reports: '1/hafta',
            therapist_selection: '1 Terapist',
            session_history: '90 gün',
            pdf_export: 'Evet',
        }
    },
    {
        id: 'prod_free789',
        name: 'Free',
        price: 0,
        currency: '₺',
        description: 'Uygulamayı denemek için temel başlangıç.',
        features: {}
    }
];

const MOCK_USAGE_STATS: Record<'Free' | 'Premium', UsageStats> = {
  Free: {
    dream_analysis: { can_use: true, used_count: 0, limit_count: 1 },
    ai_reports: { can_use: false, used_count: 1, limit_count: 1 },
    diary_write: { can_use: true, used_count: 2, limit_count: 7 },
    daily_write: { can_use: true, used_count: 1, limit_count: 7 },
    text_sessions: { can_use: true, used_count: 2, limit_count: 5 },
    voice_sessions: { can_use: false, used_count: 0, limit_count: 0 },
    pdf_export: { can_use: false, used_count: 0, limit_count: 0 },
  },
  Premium: {
    dream_analysis: { can_use: true, used_count: 15, limit_count: -1 },
    ai_reports: { can_use: true, used_count: 4, limit_count: -1 },
    diary_write: { can_use: true, used_count: 10, limit_count: -1 },
    daily_write: { can_use: true, used_count: 7, limit_count: -1 },
    text_sessions: { can_use: true, used_count: 20, limit_count: -1 },
    voice_sessions: { can_use: true, used_count: 5, limit_count: -1 },
    pdf_export: { can_use: true, used_count: 1, limit_count: -1 },
  },
};


// =================================================================
// === HAYALET HOOK'LAR ===
// Bu hook'lar artık dışarıya veri sormuyor, yukarıdaki hayalet veriyi kullanıyor.
// Arayüzleri (döndürdükleri değerler) tamamen aynı.
// =================================================================

/**
 * Kullanıcının mevcut abonelik durumunu SİMÜLE EDER.
 * Gerçek API çağrısı yapmaz.
 */
// hooks/useSubscription.ts içindeki YENİ useSubscription

export function useSubscription() {
  const planName = useSubscriptionStore((state) => state.planName);
  // DİKKAT: Artık `toggle` değil, doğrudan `setPlanName` fonksiyonunu alıyoruz.
  const setPlanName = useSubscriptionStore((state) => state.setPlanName);

  const isPremium = planName === 'Premium';
  
  return {
    subscription: null,
    plan: MOCK_PLANS.find(p => p.name === planName),
    isPremium,
    planName,
    loading: false,
    // DİKKAT: `refresh` prop'u artık `setPlanName`'e bağlı.
    refresh: setPlanName, 
  };
}

/**
 * Tüm mevcut abonelik planlarını SİMÜLE EDER.
 */
// (Tek bir export, tekrar yok)
export function useSubscriptionPlans() {
  const sortedPlans = [...MOCK_PLANS].sort((a, b) => b.price - a.price);
  return {
    plans: sortedPlans,
    loading: false,
    refresh: () => console.log('[HAYALET MOD] Plan listesi yenilendi.'),
  };
}

/**
 * Kullanıcının kullanım istatistiklerini SİMÜLE EDER.
 */
// (Tek bir export, tekrar yok)
export function useUsageStats() {
  const planName = useSubscriptionStore((state) => state.planName);
  const usage = MOCK_USAGE_STATS[planName];
  return {
    ...usage,
    loading: false,
    refresh: () => console.log(`[HAYALET MOD] ${planName} için kullanım istatistikleri yenilendi.`),
  };
}


/**
 * Belirli bir özelliğe erişim durumunu SİMÜLE EDER.
 */
// (Tek bir export, tekrar yok)
export function useFeatureAccess(feature: keyof UsageStats) {
  const planName = useSubscriptionStore((state) => state.planName);
  const allUsage = MOCK_USAGE_STATS[planName];
  const access = allUsage[feature] || { can_use: false, used_count: 0, limit_count: 0 };
  return {
    ...access,
    loading: false,
    refresh: () => console.log(`[HAYALET MOD] '${feature}' için erişim durumu yenilendi.`),
  };
}


// =================================================================
// === YARDIMCI FONKSİYONLAR ===
// Bunlar saf mantık içerdiği için DEĞİŞMEZ. Hala geçerliler.
// =================================================================

// (Tek bir export, tekrar yok)
export const formatUsageText = (used: number, limit: number): string => {
  if (limit === -1) return 'Sınırsız';
  if (limit === 0) return 'Mevcut Değil';
  if (limit > 0 && limit < 1) {
    const weeklyLimit = Math.round(limit * 7);
    const usedWeekly = Math.ceil(used * 7);
    const remainingWeekly = weeklyLimit - usedWeekly;
    return `${remainingWeekly > 0 ? remainingWeekly : 0} / ${weeklyLimit} haftalık hak`;
  }
  const remaining = limit - used;
  return `${remaining > 0 ? remaining : 0} / ${limit} günlük hak`;
};

export const getUsageColor = (percentage: number): string => {
  if (percentage >= 100) return '#EF4444';
  if (percentage > 80) return '#F59E0B';
  return '#10B981';
};

export const getUsagePercentage = (used: number, limit: number): number => {
  if (limit <= 0) return 100;
  return (used / limit) * 100;
};
