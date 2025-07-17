// hooks/useSubscription.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../context/Auth';
import * as API from '../services/api.service';
import { FeatureUsageResult, PlanFeatures, SubscriptionPlan } from '../services/subscription.service';

export interface SubscriptionStatus {
  isPremium: boolean;
  planName: string;
  features: PlanFeatures | null;
  expiresAt?: string;
  loading: boolean;
  error: string | null;
}

export interface UsageStats {
  diary_write: FeatureUsageResult;
  daily_write: FeatureUsageResult;
  dream_analysis: FeatureUsageResult;
  ai_reports: FeatureUsageResult;
  loading: boolean;
  error: string | null;
}

// Hook: Subscription durumunu takip et
export function useSubscription() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: false,
    planName: 'Free',
    features: null,
    loading: true,
    error: null
  });

  const refreshSubscriptionStatus = async () => {
    if (!user) {
        setSubscriptionStatus({
            isPremium: false,
            planName: 'Free',
            features: null, // Burada null olabilir, çünkü plan özellikleri daha sonra yüklenir
            loading: false,
            error: "Kullanıcı bulunamadı"
        });
        return;
    }

    try {
      setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await API.getUserPlanStatus(user.id);
      
      if (error) {
        throw new Error(error);
      }
      
      if (data) {
          setSubscriptionStatus({
            isPremium: data.isPremium,
            planName: data.planName,
            features: data.features,
            expiresAt: data.expiresAt,
            loading: false,
            error: null
          });
      } else {
        throw new Error("Kullanıcı plan durumu alınamadı.");
      }

    } catch (err: any) {
      console.warn('⚠️ Subscription hook hatası:', err.message);
      setSubscriptionStatus(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  useEffect(() => {
    // Auth hook'u hazır olduğunda ve kullanıcı değiştiğinde çalıştır
    if (user) {
        refreshSubscriptionStatus();
    }
  }, [user]);

  return {
    ...subscriptionStatus,
    refresh: refreshSubscriptionStatus
  };
}

// Hook: Günlük/haftalık kullanım istatistiklerini takip et
export function useUsageStats() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats>({
    diary_write: { can_use: false, used_count: 0, limit_count: 0 },
    daily_write: { can_use: false, used_count: 0, limit_count: 0 },
    dream_analysis: { can_use: false, used_count: 0, limit_count: 0 },
    ai_reports: { can_use: false, used_count: 0, limit_count: 0 },
    loading: true,
    error: null
  });

  const refreshUsageStats = async () => {
    if (!user) return;

    try {
      setUsageStats(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await API.getUserUsageStats(user.id);
      
      if (error) {
        throw new Error(error);
      }
      
      if (data) {
          setUsageStats({
            diary_write: data.diary_write,
            daily_write: data.daily_write,
            dream_analysis: data.dream_analysis,
            ai_reports: data.ai_reports,
            loading: false,
            error: null
          });
      } else {
        throw new Error("Kullanım istatistikleri alınamadı.");
      }

    } catch (err: any) {
      console.warn('⚠️ Usage stats hook hatası:', err.message);
      setUsageStats(prev => ({ 
        ...prev, 
        loading: false,
        error: err.message
      }));
    }
  };

  useEffect(() => {
    if (user) {
        refreshUsageStats();
    }
  }, [user]);

  return {
    ...usageStats,
    refresh: refreshUsageStats
  };
}

// Hook: Belirli bir özellik için kullanım kontrolü
export function useFeatureAccess(featureType: 'diary_write' | 'daily_write' | 'dream_analysis' | 'text_sessions' | 'voice_sessions' | 'video_sessions' | 'ai_reports' | 'pdf_export' | 'all_therapists') {
  const { user } = useAuth();
  const [featureAccess, setFeatureAccess] = useState<FeatureUsageResult & { loading: boolean; error: string | null }>({
    can_use: false,
    used_count: 0,
    limit_count: 0,
    loading: true,
    error: null
  });

  const checkFeatureAccess = async () => {
    if (!user) return;

    try {
      setFeatureAccess(prev => ({ ...prev, loading: true, error: null }));
      
      let result;
      
      // API çağrılarını `subscription.service`'deki base isimlerle eşleştir
      switch (featureType) {
        case 'diary_write':
          result = await API.canUseDiaryWrite(user.id);
          break;
        case 'daily_write':
          result = await API.canUseDailyWrite(user.id);
          break;
        case 'dream_analysis':
          result = await API.canUseDreamAnalysis(user.id);
          break;
        case 'text_sessions':
          result = await API.canUseTherapySessions(user.id);
          break;
        case 'voice_sessions':
          result = await API.canUseVoiceSessions(user.id);
          break;
        case 'video_sessions':
          result = await API.canUseVideoSessions(user.id);
          break;
        case 'ai_reports':
          result = await API.canUseAIReports(user.id);
          break;
        case 'pdf_export':
            result = await API.canUsePDFExport(user.id);
            break;
        case 'all_therapists':
            result = await API.canUseAllTherapists(user.id);
            break;
        default:
          throw new Error('Geçersiz özellik tipi');
      }

      if (result.error) {
        throw new Error(result.error);
      }

      if (typeof result.data === 'boolean') {
          // Bu, premium özellik kontrolünden (canUseTherapySessions vb.) gelen bir sonuçtur
          setFeatureAccess({
              can_use: result.data,
              used_count: 0,
              limit_count: result.data ? -1 : 0, // Premium ise sınırsız, değilse 0
              loading: false,
              error: null
          });
      } else if (result.data && typeof result.data.can_use !== 'undefined') {
          // Bu, freemium özellik kontrolünden (canUseDiaryWrite vb.) gelen bir sonuçtur
          setFeatureAccess({
              ...result.data,
              loading: false,
              error: null
          });
      } else {
          throw new Error("Özellik erişim verisi alınamadı.");
      }

    } catch (err: any) {
      console.warn(`⚠️ ${featureType} özellik kontrolü hook hatası:`, err.message);
      setFeatureAccess(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  // Özellik kullanımını artır
  const trackUsage = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      let result;
      
      // Sadece sayılabilir özellikleri takip et
      switch (featureType) {
        case 'diary_write':
          result = await API.trackDiaryWriteUsage(user.id);
          break;
        case 'daily_write':
          result = await API.trackDailyWriteUsage(user.id);
          break;
        case 'dream_analysis':
          result = await API.trackDreamAnalysisUsage(user.id);
          break;
        case 'ai_reports':
            result = await API.trackAIReportUsage(user.id);
            break;
        default:
          // Premium özelliklerin (text, voice, video) kullanımı burada takip edilmez.
          // Onlar seans bazlı olaylarla (events) loglanabilir.
          return true; // Kullanıma izin ver ama sayacı artırma
      }

      if (result.error) {
          throw new Error(result.error);
      }

      if (result.data) {
        // Kullanım artırıldıysa durumu yenile
        await checkFeatureAccess();
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('Kullanım takibi yapılamadı:', err.message);
      return false;
    }
  };

  useEffect(() => {
    if(user) {
        checkFeatureAccess();
    }
  }, [user, featureType]);

  return {
    ...featureAccess,
    refresh: checkFeatureAccess,
    trackUsage
  };
}

// Hook: Premium özellikler için kontrol (DEPRECATED - Yerine useFeatureAccess kullanılacak)
// Bu hook artık gereksiz çünkü useFeatureAccess hem freemium hem premium özellikleri kontrol edebilir.
// Geriye dönük uyumluluk için bırakılabilir veya kaldırılabilir. Şimdilik bırakıyorum.
export function usePremiumFeatures() {
  const { user } = useAuth();
  const [premiumFeatures, setPremiumFeatures] = useState({
    canUseTherapySessions: false,
    canUseVoiceSessions: false,
    canUseVideoSessions: false,
    canUseAIReports: false,
    canUsePDFExport: false,
    canUseAllTherapists: false,
    hasPrioritySupport: false, // Bu özellik `features` objesinden direkt okunabilir
    loading: true,
    error: null as string | null
  });

  const checkPremiumFeatures = async () => {
    if (!user) return;

    try {
      setPremiumFeatures(prev => ({ ...prev, loading: true, error: null }));
      
      // Tek bir API çağrısı ile tüm planı ve özellikleri alalım
      const { data, error } = await API.getUserPlanStatus(user.id);

      if (error) {
        throw new Error(error);
      }

      if (data && data.features) {
        setPremiumFeatures({
            canUseTherapySessions: data.features.text_sessions,
            canUseVoiceSessions: data.features.voice_sessions,
            canUseVideoSessions: data.features.video_sessions,
            canUseAIReports: data.features.ai_reports,
            canUsePDFExport: data.features.pdf_export,
            canUseAllTherapists: data.features.therapist_count === -1,
            hasPrioritySupport: data.features.priority_support,
            loading: false,
            error: null
        });
      } else {
        throw new Error("Premium özellikler alınamadı.");
      }
      
    } catch (err: any) {
      console.warn('⚠️ Premium özellikler hook hatası:', err.message);
      setPremiumFeatures(prev => ({
        ...prev,
        loading: false,
        error: err.message
      }));
    }
  };

  useEffect(() => {
    if (user) {
        checkPremiumFeatures();
    }
  }, [user]);

  return {
    ...premiumFeatures,
    refresh: checkPremiumFeatures
  };
}

// Hook: Tüm planları getir
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<{
    plans: SubscriptionPlan[];
    loading: boolean;
    error: string | null;
  }>({
    plans: [],
    loading: true,
    error: null
  });

  const fetchPlans = async () => {
    try {
      setPlans(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await API.getAllPlans();
      
      if (error) {
        throw new Error(error);
      }

      if (data) {
          setPlans({
            plans: data,
            loading: false,
            error: null
          });
      } else {
        throw new Error("Planlar alınamadı.");
      }
    } catch (err: any) {
      console.warn('⚠️ Planlar hook hatası:', err.message);
      
      setPlans({
        plans: [],
        loading: false,
        error: err.message
      });
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    ...plans,
    refresh: fetchPlans
  };
}

// Yardımcı fonksiyonlar
export function getUsagePercentage(used: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return 100; // No access
  return Math.round((used / limit) * 100);
}

export function getRemainingUsage(used: number, limit: number): number {
  if (limit === -1) return Infinity; // Unlimited
  return Math.max(0, limit - used);
}

export function getUsageColor(percentage: number): string {
  if (percentage >= 90) return '#FF4444'; // Red
  if (percentage >= 70) return '#FF8800'; // Orange
  if (percentage >= 50) return '#FFBB00'; // Yellow
  return '#00AA44'; // Green
}

export function formatUsageText(used: number, limit: number): string {
  if (limit === -1) return '∞'; // Unlimited
  return `${used}/${limit}`;
} 