// services/subscription.service.ts

// Types
export interface SubscriptionPlan {
  id: string;
  name: 'Free' | '+Plus' | 'Premium';
  price: number;
  description?: string; // Planlar için açıklama alanı
  features: string[];
}

export interface UserSubscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: 'active' | 'inactive' | 'cancelled';
    current_period_start: string;
    current_period_end: string;
    created_at: string;
    plan?: SubscriptionPlan; // Plan detayları opsiyonel olarak eklenebilir
}

export interface FeatureUsageResult {
    used_count: number;
    limit_count: number; // -1 for unlimited
    can_use: boolean;
}

// Mock Data (Normalde bu veritabanından gelir)
const MOCK_PLANS: SubscriptionPlan[] = [
    {
        id: 'plan_free_1',
        name: 'Free',
        price: 0,
        description: 'Uygulamayı keşfetmek için temel özellikler.',
        features: ['Limitli Metin Seansları', 'Haftalık 1 Rüya Analizi', '7 Günlük Seans Geçmişi'],
    },
    {
        id: 'plan_plus_monthly',
        name: '+Plus',
        price: 999.99,
        description: 'Sürekli destek ve daha derin analizler için.',
        features: ['Sınırsız Metin Seansı', 'Günlük 1 Rüya Analizi', '90 Günlük Seans Geçmişi', '1 Terapist Seçimi'],
    },
    {
        id: 'plan_premium_monthly',
        name: 'Premium',
        price: 3999.99,
        description: 'Tüm potansiyelinizi ortaya çıkaracak tam erişim.',
        features: ['Tüm özelliklere sınırsız erişim', 'Sesli Seanslar', 'Gelişmiş AI Raporları', 'PDF Dışa Aktarma', 'Öncelikli Destek'],
    }
];

// Mock API'nin durum bilgisi tutması için basit bir in-memory store
const mockUserSubscriptions: { [userId: string]: 'Free' | '+Plus' | 'Premium' } = {};


/**
 * Mevcut tüm abonelik planlarını getirir.
 * @returns {Promise<SubscriptionPlan[]>} Planların bir listesi.
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
    console.log('[API] Mock planlar getiriliyor...');
    await new Promise(resolve => setTimeout(resolve, 500)); // Network gecikmesini simüle et
    return MOCK_PLANS;
}

/**
 * Belirli bir planın detaylarını getirir
 */
export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    console.log(`[API] Mock plan getiriliyor: ${planId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    const plan = MOCK_PLANS.find(p => p.id === planId);
    return plan || null;
}

export interface UsageStats {
    diary_write: FeatureUsageResult;
    daily_write: FeatureUsageResult;
    dream_analysis: FeatureUsageResult;
    ai_reports: FeatureUsageResult;
    text_sessions: FeatureUsageResult;
    voice_sessions: FeatureUsageResult;
    pdf_export: FeatureUsageResult;
}

const getLimitsForPlan = (planName: 'Free' | '+Plus' | 'Premium'): Record<keyof UsageStats, number> => {
    switch (planName) {
        case 'Premium':
            return {
                diary_write: -1, 
                daily_write: -1, 
                dream_analysis: -1,
                ai_reports: -1, 
                text_sessions: -1, 
                voice_sessions: -1, 
                pdf_export: -1,
            };
        case '+Plus':
            return {
                diary_write: -1, // Plus'ta günlük ve diary yazımı sınırsız olmalı
                daily_write: -1, 
                dream_analysis: 1,
                ai_reports: 1, 
                text_sessions: -1, 
                voice_sessions: 0,
                pdf_export: 0,
            };
        case 'Free':
        default:
            return {
                diary_write: 1, 
                daily_write: 1, 
                dream_analysis: 0, 
                ai_reports: 0, 
                text_sessions: 0, 
                voice_sessions: 0,
                pdf_export: 0,
            };
    }
};


/**
 * Kullanıcının mevcut abonelik durumunu getirir.
 */
export async function getSubscriptionForUser(userId: string): Promise<UserSubscription | null> {
    console.log(`[API] Kullanıcı aboneliği getiriliyor: ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Kullanıcının yükseltilmiş bir planı var mı diye hafızadan kontrol et
    const currentPlanName = mockUserSubscriptions[userId] || 'Free';
    const plan = MOCK_PLANS.find(p => p.name === currentPlanName)!;

    return {
        id: `sub_${plan.id}_${userId}`,
        user_id: userId,
        plan_id: plan.id,
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        plan: plan
    };
}


/**
 * Belirli bir özellik için kullanıcının kullanım istatistiklerini getirir.
 */
export async function getUsageStatsForUser(userId: string, feature: keyof UsageStats): Promise<FeatureUsageResult> {
    console.log(`[API] ${userId} için ${feature} kullanım istatistiği getiriliyor.`);
    // Gerçek bir uygulamada, bu veritabanından çekilir.
    // Mock usage'ı 0 olarak ayarlayarak hatalı negatif değerleri önlüyoruz.
    const used_count = 0;
    
    const subscription = await getSubscriptionForUser(userId);
    const planName = subscription?.plan?.name || 'Free';
    const limits = getLimitsForPlan(planName);
    const limit_count = limits[feature];

    return {
        used_count,
        limit_count,
        can_use: limit_count === -1 || used_count < limit_count,
    };
}


/**
 * Kullanıcının tüm özellikler için başlangıç kullanım istatistiklerini oluşturur.
 */
export async function getInitialUsageStats(userId: string): Promise<UsageStats> {
    console.log(`[API] ${userId} için başlangıç kullanım istatistikleri oluşturuluyor.`);
    const subscription = await getSubscriptionForUser(userId);
    const planName = subscription?.plan?.name || 'Free';
    const limits = getLimitsForPlan(planName);

    const stats: Partial<UsageStats> = {};
    for (const key in limits) {
        if (Object.prototype.hasOwnProperty.call(limits, key)) {
            const feature = key as keyof UsageStats;
            stats[feature] = {
                used_count: 0, // Başlangıçta 0
                limit_count: limits[feature],
                can_use: limits[feature] !== 0,
            };
        }
    }
    return stats as UsageStats;
}


// Bu bir test fonksiyonudur, production'da KULLANILMAMALIDIR.
export const upgradeUserPlanForTesting = async (userId: string, newPlanName: 'Free' | '+Plus' | 'Premium') => {
    console.warn(`!!!! [TEST API] Kullanıcı ${userId} planı ${newPlanName} olarak değiştiriliyor. BU BİR TESTTİR. !!!!`);
    
    const newPlan = MOCK_PLANS.find(p => p.name === newPlanName);
    if (!newPlan) throw new Error("Test planı bulunamadı.");

    // Kullanıcının planını hafızada güncelle
    mockUserSubscriptions[userId] = newPlanName;

    await new Promise(resolve => setTimeout(resolve, 1000)); // Gecikme simülasyonu
    
    console.log(`Kullanıcı ${userId}, ${newPlanName} planına geçirildi.`);
    return { success: true, newPlanId: newPlan.id };
};


// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * PDF export özelliğini kontrol eder
 */
export async function canUsePDFExport(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  // Sadece Premium planda PDF export var
  return subscription?.plan?.name === 'Premium';
}

/**
 * Unlimited therapist seçimi kontrol eder
 */
export async function canUseAllTherapists(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  // Sadece Premium planda tüm terapistler seçilebilir
  return subscription?.plan?.name === 'Premium';
}

/**
 * Öncelikli destek özelliğini kontrol eder
 */
export async function hasPrioritySupport(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  // Sadece Premium planda öncelikli destek var
  return subscription?.plan?.name === 'Premium';
}

/**
 * Kullanıcının premium olup olmadığını kontrol eder
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const subscription = await getSubscriptionForUser(userId);
  return subscription?.plan?.name === 'Premium';
} 