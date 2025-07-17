// services/subscription.service.ts
import { ApiError } from '../utils/errors';
import { supabase } from '../utils/supabase';

// Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanFeatures {
  diary_write_daily: number; // günlük diary yazma limiti
  daily_write_daily: number; // günlük daily_write limiti
  dream_analysis_weekly: number; // haftalık rüya analizi limiti
  text_sessions: boolean; // premium only
  voice_sessions: boolean; // premium only
  video_sessions: boolean; // premium only
  ai_reports: boolean; // premium only
  therapist_count: number; // premium only
  session_history_days: number; // premium only
  pdf_export: boolean; // premium only
  priority_support: boolean; // premium only
}

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  starts_at: string;
  ends_at: string;
  auto_renew: boolean;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  user_id: string;
  feature_type: string;
  used_count: number;
  limit_count: number;
  reset_date: string;
  reset_type: 'daily' | 'weekly' | 'monthly';
  created_at: string;
  updated_at: string;
}

export interface FeatureUsageResult {
  can_use: boolean;
  used_count: number;
  limit_count: number;
}

// Feature types - SADECE FREEMIUM FEATURES
export const FEATURE_TYPES = {
  DIARY_WRITE: 'diary_write',
  DAILY_WRITE: 'daily_write',
  DREAM_ANALYSIS: 'dream_analysis'
} as const;

export type FeatureType = typeof FEATURE_TYPES[keyof typeof FEATURE_TYPES];

// Premium feature types - PREMIUM ONLY FEATURES
export const PREMIUM_FEATURES = {
  TEXT_SESSIONS: 'text_sessions',
  VOICE_SESSIONS: 'voice_sessions',
  VIDEO_SESSIONS: 'video_sessions',
  AI_REPORTS: 'ai_reports'
} as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[keyof typeof PREMIUM_FEATURES];

// ===============================
// SUBSCRIPTION PLAN METHODS
// ===============================

/**
 * Tüm aktif planları getirir
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) {
    console.error('📋 Plan listesi getirilemedi:', error);
    throw new ApiError('Plan listesi yüklenemedi');
  }

  return data || [];
}

/**
 * Belirli bir planın detaylarını getirir
 */
export async function getPlanById(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    console.error('📋 Plan detayı getirilemedi:', error);
    return null;
  }

  return data;
}

// ===============================
// USER SUBSCRIPTION METHODS
// ===============================

/**
 * Kullanıcının mevcut aktif aboneliğini getirir
 */
export async function getCurrentSubscription(userId: string): Promise<{
  subscription: UserSubscription;
  plan: SubscriptionPlan;
} | null> {
  const { data, error } = await supabase
    .rpc('get_user_current_subscription', { user_uuid: userId });

  if (error) {
    console.error('📋 Kullanıcı aboneliği getirilemedi:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const subscription = data[0];
  return {
    subscription: {
      id: subscription.subscription_id,
      user_id: userId,
      plan_id: subscription.subscription_id,
      status: subscription.status,
      starts_at: '',
      ends_at: subscription.ends_at,
      auto_renew: true,
      created_at: '',
      updated_at: ''
    },
    plan: {
      id: subscription.subscription_id,
      name: subscription.plan_name,
      features: subscription.features,
      price: 0,
      currency: 'TRY',
      duration_days: 30,
      is_active: true,
      created_at: '',
      updated_at: ''
    }
  };
}

/**
 * Kullanıcının plan durumunu kontrol eder
 */
export async function getUserPlanStatus(userId: string): Promise<{
  isPremium: boolean;
  planName: string;
  features: PlanFeatures;
  expiresAt?: string;
}> {
  const currentSub = await getCurrentSubscription(userId);

  if (!currentSub) {
    // Ücretsiz plan varsayılan
    return {
      isPremium: false,
      planName: 'Free',
      features: {
        diary_write_daily: 1,
        daily_write_daily: 1,
        dream_analysis_weekly: 1,
        text_sessions: false,
        voice_sessions: false,
        video_sessions: false,
        ai_reports: false,
        therapist_count: 0,
        session_history_days: 0,
        pdf_export: false,
        priority_support: false
      }
    };
  }

  return {
    isPremium: currentSub.plan.name !== 'Free',
    planName: currentSub.plan.name,
    features: currentSub.plan.features,
    expiresAt: currentSub.subscription.ends_at
  };
}

/**
 * Kullanıcıya premium plan atar
 */
export async function assignPremiumPlan(userId: string, planId: string, durationDays: number): Promise<boolean> {
  const { error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    });

  if (error) {
    console.error('📋 Premium plan atanamadı:', error);
    return false;
  }

  return true;
}

// ===============================
// PREMIUM ACCESS METHODS
// ===============================

/**
 * Premium özellik erişimi kontrolü
 */
export async function hasPremiumAccess(userId: string, featureName: PremiumFeature): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('has_premium_access', { 
      user_uuid: userId, 
      feature_name: featureName 
    });

  if (error) {
    console.error('📊 Premium erişim kontrol edilemedi:', error);
    return false;
  }

  return data || false;
}

/**
 * Terapi seanslarına erişim kontrolü
 */
export async function canUseTherapySessions(userId: string): Promise<boolean> {
  return await hasPremiumAccess(userId, PREMIUM_FEATURES.TEXT_SESSIONS);
}

/**
 * Ses seanslarına erişim kontrolü
 */
export async function canUseVoiceSessions(userId: string): Promise<boolean> {
  return await hasPremiumAccess(userId, PREMIUM_FEATURES.VOICE_SESSIONS);
}

/**
 * Video seanslarına erişim kontrolü
 */
export async function canUseVideoSessions(userId: string): Promise<boolean> {
  return await hasPremiumAccess(userId, PREMIUM_FEATURES.VIDEO_SESSIONS);
}

/**
 * AI raporlarına erişim kontrolü
 */
export async function canUseAIReports(userId: string): Promise<boolean> {
  return await hasPremiumAccess(userId, PREMIUM_FEATURES.AI_REPORTS);
}

// ===============================
// USAGE TRACKING METHODS (Sadece freemium features için)
// ===============================

/**
 * Kullanıcının belirli bir freemium özelliğini kullanıp kullanamayacağını kontrol eder
 */
export async function checkFeatureUsage(userId: string, featureType: FeatureType): Promise<FeatureUsageResult> {
  const { data, error } = await supabase
    .rpc('check_feature_usage', { 
      user_uuid: userId, 
      feature_name: featureType 
    });

  if (error) {
    console.error('📊 Özellik kullanımı kontrol edilemedi:', error);
    // Hata durumunda güvenli tarafta kal
    return { can_use: false, used_count: 0, limit_count: 0 };
  }

  const result = data?.[0];
  return {
    can_use: result?.can_use || false,
    used_count: result?.used_count || 0,
    limit_count: result?.limit_count || 0
  };
}

/**
 * Kullanıcının freemium özellik kullanımını artırır
 */
export async function incrementFeatureUsage(userId: string, featureType: FeatureType): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('increment_feature_usage', { 
      user_uuid: userId, 
      feature_name: featureType 
    });

  if (error) {
    console.error('📊 Özellik kullanımı artırılamadı:', error);
    return false;
  }

  return data || false;
}

/**
 * Kullanıcının günlük/haftalık kullanım istatistiklerini getirir
 */
export async function getUserUsageStats(userId: string): Promise<{ [key: string]: FeatureUsageResult }> {
  const features = Object.values(FEATURE_TYPES);
  const usage: { [key: string]: FeatureUsageResult } = {};

  for (const feature of features) {
    usage[feature] = await checkFeatureUsage(userId, feature);
  }

  return usage;
}

// ===============================
// FEATURE GATING HELPERS
// ===============================

/**
 * Günlük diary yazma kontrolü
 */
export async function canUseDiaryWrite(userId: string): Promise<FeatureUsageResult> {
  return await checkFeatureUsage(userId, FEATURE_TYPES.DIARY_WRITE);
}

/**
 * Günlük daily_write kontrolü
 */
export async function canUseDailyWrite(userId: string): Promise<FeatureUsageResult> {
  return await checkFeatureUsage(userId, FEATURE_TYPES.DAILY_WRITE);
}

/**
 * Haftalık rüya analizi kontrolü
 */
export async function canUseDreamAnalysis(userId: string): Promise<FeatureUsageResult> {
  return await checkFeatureUsage(userId, FEATURE_TYPES.DREAM_ANALYSIS);
}

// ===============================
// USAGE TRACKING HELPERS
// ===============================

/**
 * Günlük diary yazma kullanımını artırır
 */
export async function trackDiaryWriteUsage(userId: string): Promise<boolean> {
  return await incrementFeatureUsage(userId, FEATURE_TYPES.DIARY_WRITE);
}

/**
 * Günlük daily_write kullanımını artırır
 */
export async function trackDailyWriteUsage(userId: string): Promise<boolean> {
  return await incrementFeatureUsage(userId, FEATURE_TYPES.DAILY_WRITE);
}

/**
 * Haftalık rüya analizi kullanımını artırır
 */
export async function trackDreamAnalysisUsage(userId: string): Promise<boolean> {
  return await incrementFeatureUsage(userId, FEATURE_TYPES.DREAM_ANALYSIS);
}

// ===============================
// PREMIUM FEATURE CHECKS
// ===============================

/**
 * PDF export özelliğini kontrol eder
 */
export async function canUsePDFExport(userId: string): Promise<boolean> {
  const planStatus = await getUserPlanStatus(userId);
  return planStatus.features.pdf_export;
}

/**
 * Unlimited therapist seçimi kontrol eder
 */
export async function canUseAllTherapists(userId: string): Promise<boolean> {
  const planStatus = await getUserPlanStatus(userId);
  return planStatus.features.therapist_count === -1;
}

/**
 * Öncelikli destek özelliğini kontrol eder
 */
export async function hasPrioritySupport(userId: string): Promise<boolean> {
  const planStatus = await getUserPlanStatus(userId);
  return planStatus.features.priority_support;
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Kullanıcının premium olup olmadığını kontrol eder
 */
export async function isPremiumUser(userId: string): Promise<boolean> {
  const planStatus = await getUserPlanStatus(userId);
  return planStatus.isPremium;
}

/**
 * Abonelik durumunu günceller (ödeme başarısızlığı durumunda)
 */
export async function updateSubscriptionStatus(subscriptionId: string, status: UserSubscription['status']): Promise<boolean> {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId);

  if (error) {
    console.error('📋 Abonelik durumu güncellenemedi:', error);
    return false;
  }

  return true;
}

/**
 * Kullanıcının abonelik geçmişini getirir
 */
export async function getUserSubscriptionHistory(userId: string): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('📋 Abonelik geçmişi getirilemedi:', error);
    return [];
  }

  return data || [];
} 