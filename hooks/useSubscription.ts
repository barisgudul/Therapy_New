// hooks/useSubscription.ts

// 🔥 TEST MODU: OTOMATIK PREMIUM
// ==============================
// Şu anda tüm kullanıcılar otomatik olarak Premium olarak ayarlanmış.
// Free plan'a dönmek için hook'lardaki test yorumlarını arayın ve değiştirin.
// Aranacak: "🔥 OTOMATIK PREMIUM - TEST AMAÇLI"
// ==============================

import { useEffect, useState } from 'react';
import { useAuth } from '../context/Auth';
import * as API from '../services/api.service';
import { FeatureUsageResult, PlanFeatures, SubscriptionPlan } from '../services/subscription.service';

export interface SubscriptionStatus {
  isPremium: boolean;
  planName: string;
  features: PlanFeatures;
  expiresAt?: string;
  loading: boolean;
  error: string | null;
}

export interface UsageStats {
  diaryWrite: FeatureUsageResult;
  dailyWrite: FeatureUsageResult;
  dreamAnalysis: FeatureUsageResult;
  loading: boolean;
  error: string | null;
}

// Hook: Subscription durumunu takip et
export function useSubscription() {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isPremium: true, // 🔥 OTOMATIK PREMIUM - TEST AMAÇLI
    planName: 'Premium',
    features: {
      diary_write_daily: -1, // Sınırsız
      daily_write_daily: -1, // Sınırsız
      dream_analysis_weekly: -1, // Sınırsız
      text_sessions: true,
      voice_sessions: true,
      video_sessions: true,
      ai_reports: true,
      therapist_count: -1,
      session_history_days: -1,
      pdf_export: true,
      priority_support: true
    },
    loading: true,
    error: null
  });

  const refreshSubscriptionStatus = async () => {
    if (!user) return;

    try {
      setSubscriptionStatus(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await API.getUserPlanStatus(user.id);
      
      if (error) {
        console.warn('⚠️ Subscription backend hatası, premium plan kullanılıyor (test):', error);
        // Backend hatası varsa premium plan kullan (TEST AMAÇLI)
        setSubscriptionStatus(prev => ({
          ...prev,
          isPremium: true,
          planName: 'Premium',
          loading: false,
          error: null
        }));
        return;
      }

      // Backend çalışsa bile premium kullan (TEST AMAÇLI)
      setSubscriptionStatus({
        isPremium: true,
        planName: 'Premium',
        features: {
          diary_write_daily: -1,
          daily_write_daily: -1,
          dream_analysis_weekly: -1,
          text_sessions: true,
          voice_sessions: true,
          video_sessions: true,
          ai_reports: true,
          therapist_count: -1,
          session_history_days: -1,
          pdf_export: true,
          priority_support: true
        },
        loading: false,
        error: null
      });
    } catch (err) {
      console.warn('⚠️ Subscription hata yakalama, premium plan kullanılıyor (test):', err);
      setSubscriptionStatus(prev => ({
        ...prev,
        isPremium: true,
        planName: 'Premium',
        loading: false,
        error: null
      }));
    }
  };

  useEffect(() => {
    refreshSubscriptionStatus();
  }, [user]);

  return {
    ...subscriptionStatus,
    refresh: refreshSubscriptionStatus
  };
}

// Hook: Günlük/haftalık kullanım istatistiklerini takip et (sadece freemium features)
export function useUsageStats() {
  const { user } = useAuth();
  const [usageStats, setUsageStats] = useState<UsageStats>({
    diaryWrite: { can_use: true, used_count: 0, limit_count: -1 }, // 🔥 OTOMATIK PREMIUM - TEST AMAÇLI
    dailyWrite: { can_use: true, used_count: 0, limit_count: -1 }, // Sınırsız
    dreamAnalysis: { can_use: true, used_count: 0, limit_count: -1 }, // Sınırsız
    loading: true,
    error: null
  });

  const refreshUsageStats = async () => {
    if (!user) return;

    try {
      setUsageStats(prev => ({ ...prev, loading: true, error: null }));
      
      const { data, error } = await API.getUserUsageStats(user.id);
      
      if (error) {
        console.warn('⚠️ Usage stats backend hatası, premium değerler kullanılıyor (test):', error);
        setUsageStats(prev => ({
          ...prev,
          loading: false,
          error: null
        }));
        return;
      }

      // Backend çalışsa bile premium kullan (TEST AMAÇLI)
      setUsageStats({
        diaryWrite: { can_use: true, used_count: 0, limit_count: -1 },
        dailyWrite: { can_use: true, used_count: 0, limit_count: -1 },
        dreamAnalysis: { can_use: true, used_count: 0, limit_count: -1 },
        loading: false,
        error: null
      });
    } catch (err) {
      console.warn('⚠️ Usage stats hata yakalama, premium değerler kullanılıyor (test):', err);
      setUsageStats(prev => ({ 
        ...prev, 
        loading: false,
        error: null
      }));
    }
  };

  useEffect(() => {
    refreshUsageStats();
  }, [user]);

  // Premium özellikler için sınırsız data
  const premiumFeatures = {
    textSessions: { can_use: true, used_count: 0, limit_count: -1 },
    voiceSessions: { can_use: true, used_count: 0, limit_count: -1 },
    videoSessions: { can_use: true, used_count: 0, limit_count: -1 },
    aiReports: { can_use: true, used_count: 0, limit_count: -1 }
  };

  return {
    ...usageStats,
    ...premiumFeatures,
    refresh: refreshUsageStats
  };
}

// Hook: Belirli bir freemium özellik için kullanım kontrolü
export function useFeatureAccess(featureType: 'diary_write' | 'daily_write' | 'dream_analysis' | 'text' | 'voice' | 'video' | 'dream' | 'ai_report') {
  const { user } = useAuth();
  const [featureAccess, setFeatureAccess] = useState<FeatureUsageResult & { loading: boolean; error: string | null }>({
    can_use: true, // 🔥 OTOMATIK PREMIUM - TEST AMAÇLI
    used_count: 0,
    limit_count: -1, // Sınırsız
    loading: true,
    error: null
  });

  const checkFeatureAccess = async () => {
    if (!user) return;

    try {
      setFeatureAccess(prev => ({ ...prev, loading: true, error: null }));
      
      let result;
      
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
        case 'text':
          result = await API.canUseTherapySessions(user.id);
          break;
        case 'voice':
          result = await API.canUseVoiceSessions(user.id);
          break;
        case 'video':
          result = await API.canUseVideoSessions(user.id);
          break;
        case 'dream':
          result = await API.canUseDreamAnalysis(user.id);
          break;
        case 'ai_report':
          result = await API.canUseAIReports(user.id);
          break;
        default:
          throw new Error('Geçersiz özellik tipi');
      }

      if (result.error) {
        console.warn(`⚠️ ${featureType} özellik kontrolü hatası, premium değerler kullanılıyor (test):`, result.error);
        
        // Premium değerleri (TEST AMAÇLI)
        setFeatureAccess(prev => ({
          ...prev,
          can_use: true,
          used_count: 0,
          limit_count: -1, // Sınırsız
          loading: false,
          error: null
        }));
        return;
      }

      // Backend çalışsa bile premium kullan (TEST AMAÇLI)
      setFeatureAccess(prev => ({
        ...prev,
        can_use: true,
        used_count: 0,
        limit_count: -1, // Sınırsız
        loading: false,
        error: null
      }));
    } catch (err) {
      console.warn(`⚠️ ${featureType} özellik kontrolü hata yakalama, premium değerler kullanılıyor (test):`, err);
      
      // Premium değerleri (TEST AMAÇLI)
      setFeatureAccess(prev => ({
        ...prev,
        can_use: true,
        used_count: 0,
        limit_count: -1, // Sınırsız
        loading: false,
        error: null
      }));
    }
  };

  // Özellik kullanımını artır
  const trackUsage = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      let result;
      
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
        default:
          return false;
      }

      if (result.data) {
        // Kullanım artırıldıysa durumu güncelle
        await checkFeatureAccess();
        return true;
      }

      return false;
    } catch (err) {
      console.error('Kullanım takibi yapılamadı:', err);
      return false;
    }
  };

  useEffect(() => {
    checkFeatureAccess();
  }, [user, featureType]);

  return {
    ...featureAccess,
    refresh: checkFeatureAccess,
    trackUsage
  };
}

// Hook: Premium özellikler için kontrol
export function usePremiumFeatures() {
  const { user } = useAuth();
  const [premiumFeatures, setPremiumFeatures] = useState({
    canUseTherapySessions: true, // 🔥 OTOMATIK PREMIUM - TEST AMAÇLI
    canUseVoiceSessions: true,
    canUseVideoSessions: true,
    canUseAIReports: true,
    canUsePDFExport: true,
    canUseAllTherapists: true,
    hasPrioritySupport: true,
    loading: true,
    error: null as string | null
  });

  const checkPremiumFeatures = async () => {
    if (!user) return;

    try {
      setPremiumFeatures(prev => ({ ...prev, loading: true, error: null }));
      
      const [
        therapyResult,
        voiceResult,
        videoResult,
        aiReportResult,
        pdfResult,
        therapistResult
      ] = await Promise.all([
        API.canUseTherapySessions(user.id),
        API.canUseVoiceSessions(user.id),
        API.canUseVideoSessions(user.id),
        API.canUseAIReports(user.id),
        API.canUsePDFExport(user.id),
        API.canUseAllTherapists(user.id)
      ]);

      if (therapyResult.error || voiceResult.error || videoResult.error || 
          aiReportResult.error || pdfResult.error || therapistResult.error) {
        console.warn('⚠️ Premium özellikler backend hatası, premium plan kullanılıyor (test):', {
          therapyResult: therapyResult.error,
          voiceResult: voiceResult.error,
          videoResult: videoResult.error,
          aiReportResult: aiReportResult.error,
          pdfResult: pdfResult.error,
          therapistResult: therapistResult.error
        });
        
        // Premium değerleri (TEST AMAÇLI)
        setPremiumFeatures({
          canUseTherapySessions: true,
          canUseVoiceSessions: true,
          canUseVideoSessions: true,
          canUseAIReports: true,
          canUsePDFExport: true,
          canUseAllTherapists: true,
          hasPrioritySupport: true,
          loading: false,
          error: null
        });
        return;
      }

      // Backend çalışsa bile premium kullan (TEST AMAÇLI)
      setPremiumFeatures({
        canUseTherapySessions: true,
        canUseVoiceSessions: true,
        canUseVideoSessions: true,
        canUseAIReports: true,
        canUsePDFExport: true,
        canUseAllTherapists: true,
        hasPrioritySupport: true,
        loading: false,
        error: null
      });
    } catch (err) {
      console.warn('⚠️ Premium özellikler hata yakalama, premium plan kullanılıyor (test):', err);
      
      // Premium değerleri (TEST AMAÇLI)
      setPremiumFeatures({
        canUseTherapySessions: true,
        canUseVoiceSessions: true,
        canUseVideoSessions: true,
        canUseAIReports: true,
        canUsePDFExport: true,
        canUseAllTherapists: true,
        hasPrioritySupport: true,
        loading: false,
        error: null
      });
    }
  };

  useEffect(() => {
    checkPremiumFeatures();
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
        console.warn('⚠️ Planlar backend hatası, varsayılan planlar kullanılıyor:', error);
        
        // Varsayılan planlar
        const defaultPlans = [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            currency: 'TRY',
            duration_days: 30,
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
            },
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'premium',
            name: 'Premium',
            price: 39.99,
            currency: 'TRY',
            duration_days: 30,
            features: {
              diary_write_daily: -1,
              daily_write_daily: -1,
              dream_analysis_weekly: -1,
              text_sessions: true,
              voice_sessions: true,
              video_sessions: true,
              ai_reports: true,
              therapist_count: -1,
              session_history_days: -1,
              pdf_export: true,
              priority_support: true
            },
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];

        setPlans({
          plans: defaultPlans,
          loading: false,
          error: null
        });
        return;
      }

      setPlans({
        plans: data,
        loading: false,
        error: null
      });
    } catch (err) {
      console.warn('⚠️ Planlar hata yakalama, varsayılan planlar kullanılıyor:', err);
      
      // Varsayılan planlar
      const defaultPlans = [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'TRY',
          duration_days: 30,
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
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'premium',
          name: 'Premium',
          price: 39.99,
          currency: 'TRY',
          duration_days: 30,
          features: {
            diary_write_daily: -1,
            daily_write_daily: -1,
            dream_analysis_weekly: -1,
            text_sessions: true,
            voice_sessions: true,
            video_sessions: true,
            ai_reports: true,
            therapist_count: -1,
            session_history_days: -1,
            pdf_export: true,
            priority_support: true
          },
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setPlans({
        plans: defaultPlans,
        loading: false,
        error: null
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