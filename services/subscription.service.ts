// services/subscription.service.ts

// Types
import { supabase } from '../utils/supabase'; // Dosyanın en üstüne ekle

export interface SubscriptionPlan {
  id: string;
  name: 'Free' | '+Plus' | 'Premium';
  price: number;
  currency: string;
  description?: string; // Planlar için açıklama alanı
  features: Record<string, any>;
}

export interface UserSubscription {
    id: string;
    plan_id: string;
    name: 'Free' | '+Plus' | 'Premium';
    status: 'active' | 'inactive' | 'cancelled';
    current_period_end: string;
    created_at: string;
    price: number;
    currency: string;
    features: Record<string, any>;
    user_id: string;
}

export interface FeatureUsageResult {
    used_count: number;
    limit_count: number; // -1 for unlimited
    can_use: boolean;
}

// Mock Data (Normalde bu veritabanından gelir) - SİLİNDİ

/**
 * Mevcut tüm abonelik planlarını getirir.
 * @returns {Promise<SubscriptionPlan[]>} Planların bir listesi.
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
    console.log('[API] Gerçek planlar Supabase\'den getiriliyor...');
    const { data, error } = await supabase.from('subscription_plans').select('*');
    if (error) throw new Error('Abonelik planları getirilemedi: ' + error.message);
    return data as SubscriptionPlan[];
}

/**
 * Belirli bir planın detaylarını getirir
 */
export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    console.log(`[API] Gerçek plan getiriliyor: ${planId}`);
    const { data, error } = await supabase.from('subscription_plans').select('*').eq('id', planId).single();
    if (error) {
        console.error('Plan getirme hatası:', error.message);
        return null;
    }
    return data as SubscriptionPlan | null;
}

export interface UsageStats {
    diary_write: FeatureUsageResult;
    daily_write: FeatureUsageResult;
    dream_analysis: FeatureUsageResult;
    dream_dialogue: FeatureUsageResult;
    ai_reports: FeatureUsageResult;
    text_sessions: FeatureUsageResult;
    voice_sessions: FeatureUsageResult;
    pdf_export: FeatureUsageResult;
}

// ARTIK GEREKLİ DEĞİL - getLimitsForPlan fonksiyonu silindi


/**
 * Kullanıcının mevcut abonelik durumunu getirir.
 */
export async function getSubscriptionForUser(userId: string): Promise<UserSubscription | null> {
    console.log(`[API] Kullanıcı aboneliği getiriliyor: ${userId}`);
    const { data, error } = await supabase.rpc('get_user_current_subscription', { user_uuid: userId });

    if (error) {
        console.error('Kullanıcı aboneliği alınamadı:', error.message);
        return null;
    }
    
    if (!data || data.length === 0) {
        return null;
    }

    // Gelen veriye sadece userId ekle ve doğrudan tipiyle döndür.
    const subscriptionData = data[0];
    return {
        ...subscriptionData,
        user_id: userId
    } as UserSubscription;
}


/**
 * Belirli bir özellik için kullanıcının kullanım istatistiklerini getirir.
 */
export async function getUsageStatsForUser(userId: string, feature: keyof UsageStats): Promise<FeatureUsageResult> {
    console.log(`[API] ${userId} için ${feature} kullanım istatistiği getiriliyor.`);
    const { data, error } = await supabase.rpc('check_feature_usage', {
        user_uuid: userId,
        feature_name_base: feature
    });

    if (error) {
        console.error(`${feature} için kullanım istatistiği hatası:`, error.message);
        return { used_count: 0, limit_count: 0, can_use: false };
    }
    
    // RPC'den gelen sonuç [ { can_use: true, used_count: 0, limit_count: -1 } ] formatındadır.
    const result = data[0];
    return {
        used_count: result.used_count,
        limit_count: result.limit_count,
        can_use: result.can_use,
    };
}


/**
 * Kullanıcının tüm özellikler için başlangıç kullanım istatistiklerini oluşturur.
 */
export async function getInitialUsageStats(userId: string): Promise<UsageStats> {
    console.log(`[API] ${userId} için başlangıç kullanım istatistikleri oluşturuluyor.`);

    const features: (keyof UsageStats)[] = ['diary_write', 'daily_write', 'dream_analysis', 'dream_dialogue', 'ai_reports', 'text_sessions', 'voice_sessions', 'pdf_export'];
    const stats: Partial<UsageStats> = {};

    for (const feature of features) {
        stats[feature] = await getUsageStatsForUser(userId, feature);
        }

    return stats as UsageStats;
}

/**
 * Kullanıcının PDF export özelliğini kullanıp kullanamayacağını kontrol eder.
 */
export async function canUsePDFExport(userId: string): Promise<boolean> {
    const usage = await getUsageStatsForUser(userId, 'pdf_export');
    return usage.can_use;
}

/**
 * Kullanıcının tüm terapistleri kullanıp kullanamayacağını kontrol eder.
 */
export async function canUseAllTherapists(userId: string): Promise<boolean> {
    const subscription = await getSubscriptionForUser(userId);
    if (!subscription) return false;
    
    // Premium kullanıcılar tüm terapistleri kullanabilir
    return subscription.name === 'Premium';
}

/**
 * Kullanıcının öncelikli destek hakkı olup olmadığını kontrol eder.
 */
export async function hasPrioritySupport(userId: string): Promise<boolean> {
    const subscription = await getSubscriptionForUser(userId);
    if (!subscription) return false;
    
    // Premium kullanıcılar öncelikli destek alır
    return subscription.name === 'Premium';
}

/**
 * Kullanıcının Premium üye olup olmadığını kontrol eder.
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
    const subscription = await getSubscriptionForUser(userId);
    if (!subscription) return false;
    
    return subscription.name === 'Premium';
}

// Bu bir test fonksiyonudur, production'da KULLANILMAMALIDIR.
export const upgradeUserPlanForTesting = async (userId: string, newPlanName: 'Free' | '+Plus' | 'Premium') => {
    console.warn(`!!!! [TEST API] Kullanıcı ${userId} planı ${newPlanName} olarak değiştiriliyor. BU BİR TESTTİR. !!!!`);
    const { data, error } = await supabase.rpc('assign_plan_for_user', {
        user_id_to_update: userId,
        plan_name_to_assign: newPlanName
    });

    if (error) throw new Error(`Test planı atama hatası: ${error.message}`);
    
    console.log(`Kullanıcı ${userId}, ${newPlanName} planına geçirildi.`);
    return { success: true, response: data };
};
