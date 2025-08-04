// services/api.service.ts
import { getErrorMessage } from "../utils/errors";
import { supabase } from "../utils/supabase";

// Event Service API calls
import { logEvent as _logEvent, AppEvent, EventPayload } from './event.service';

// Vault Service API calls
import { updateUserVault as _updateUserVault, VaultData } from './vault.service';

// Orchestration Service API calls
import { processUserMessage as _processUserMessage } from './orchestration.service';

// Subscription Management API calls - Tüm import'ları tek satırda birleştir
import {
    type UsageStats,
    canUseAllTherapists as _canUseAllTherapists,
    canUsePDFExport as _canUsePDFExport,
    getAllPlans as _getAllPlans,
    getInitialUsageStats as _getInitialUsageStats,
    getPlanById as _getPlanById, // 'type' keyword'ü ile bunun bir tip olduğunu belirtirsin
    getSubscriptionForUser as _getSubscriptionForUser,
    hasPrioritySupport as _hasPrioritySupport,
    isPremiumUser as _isPremiumUser,
    upgradeUserPlanForTesting as _upgradeUserPlanForTesting
} from './subscription.service';

// Global loading state
let globalLoadingSetter: ((loading: boolean) => void) | null = null;
let globalLoadingMessageSetter: ((message: string) => void) | null = null;

export const setGlobalLoadingIndicator = (setter: (loading: boolean) => void) => {
  globalLoadingSetter = setter;
};

export const setGlobalLoadingMessage = (setter: (message: string) => void) => {
  globalLoadingMessageSetter = setter;
};

// Tüm API çağrılarını saran wrapper
export async function apiCall<T>(promise: Promise<T>, loadingMessage?: string): Promise<{ data: T | null; error: string | null }> {
  // Global loading state güncelle
  if (globalLoadingSetter) globalLoadingSetter(true);
  if (globalLoadingMessageSetter && loadingMessage) globalLoadingMessageSetter(loadingMessage);
  
  try {
    const MAX_RETRIES = 2;
    let retryCount = 0;

    while (retryCount <= MAX_RETRIES) {
      try {
        const data = await promise;
        return { data, error: null };
      } catch (error) {
        if (retryCount === MAX_RETRIES) {
          console.error('API call failed after retries:', error);
          return { data: null, error: (error as Error).message };
        }
        retryCount++;
        if (globalLoadingMessageSetter) {
          globalLoadingMessageSetter(`${loadingMessage || 'Yükleniyor'} (${retryCount}/${MAX_RETRIES})`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    return { data: null, error: 'Unknown error' };
  } finally {
    if (globalLoadingSetter) globalLoadingSetter(false);
    if (globalLoadingMessageSetter) globalLoadingMessageSetter('');
  }
}

// ARKA PLAN GÖREVİ İÇİN YENİ FONKSİYON
function runInBackground(promise: Promise<any>, taskName: string) {
    promise
        .then(() => console.log(`✅ [BG_TASK] '${taskName}' başarıyla tamamlandı.`))
        .catch(error => {
            const errorMessage = getErrorMessage(error);
            console.error(`⛔️ [BG_TASK_ERROR] '${taskName}' hatası:`, errorMessage, error);
        });
}

export const incrementFeatureUsage = async (feature: keyof UsageStats): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('[USAGE] Kullanıcı olmadan kullanım artırılamaz.');
        return;
    }

    const { error } = await supabase.rpc('increment_feature_usage', {
        user_uuid: user.id,
        feature_name_base: feature
    });
    
    if (error) {
        console.error(`[USAGE] ${feature} kullanımı artırılırken hata:`, error.message);
    } else {
        console.log(`[USAGE] ${feature} kullanımı başarıyla artırıldı (gerçek).`);
    }
};

// YENİ: Kullanım hakkını iade etme fonksiyonu
export const revertFeatureUsage = async (feature: keyof UsageStats): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error('[USAGE] Kullanıcı olmadan kullanım iadesi yapılamaz.');
        return;
    }

    // Şimdilik increment_feature_usage'ı -1 ile çağırıyoruz
    // Daha sonra Supabase tarafında ayrı bir RPC fonksiyonu yazılacak
    const { error } = await supabase.rpc('increment_feature_usage', {
        user_uuid: user.id,
        feature_name_base: feature,
        increment_value: -1 // Negatif değer ile iade
    });
    
    if (error) {
        console.error(`[USAGE] ${feature} kullanımı iade edilirken hata:`, error.message);
    } else {
        console.log(`[USAGE] ${feature} kullanımı başarıyla iade edildi.`);
    }
};

export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>) {
    return apiCall(_logEvent(event));
}

export async function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

// Yeni: Rüya Analizi Başlatma Fonksiyonu
export async function analyzeDream(dreamText: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı, rüya analizi başlatılamadı.");

    return apiCall(_processUserMessage(user.id, {
        type: 'dream_analysis',
        data: { dreamText }
    }));
}

// Yeni: Rüya Diyaloğuna Cevap Verme Fonksiyonu
export async function postDreamDialogueResponse(event: AppEvent, updatedDialogue: any[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı, diyalog devam ettirilemedi.");

    return apiCall(_processUserMessage(user.id, {
        type: 'dream_analysis',
        data: {
            isFollowUp: true,
            event_id: event.id,
            fullDialogue: updatedDialogue,
            dreamAnalysisResult: event.data.analysis,
        }
    }));
}

// Yeni: Terapi Seansı Mesajı Gönderme Fonksiyonu
export async function sendTherapyMessage(
    trimmedInput: string,
    fullConversationHistory: string,
    therapistId: string,
    selectedPersona: string,
    initialMood: string
) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı, mesaj gönderilemedi.");

    return apiCall(_processUserMessage(user.id, {
        type: 'text_session', // Veya 'voice_session' vs.
        data: {
            userMessage: trimmedInput,
            intraSessionChatHistory: fullConversationHistory,
            therapistId: therapistId,
            therapistPersona: selectedPersona,
            initialMood: initialMood,
        }
    }));
}

export async function processUserMessage(userId: string, event: EventPayload) {
    // Eğer seans sonu ise, arka planda çalıştır ve bekleme
    if (event.data.isSessionEnd) {
        runInBackground(_processUserMessage(userId, event), 'process-session-end');
        return { data: "SESSION_END_REQUESTED", error: null };
    }
    return apiCall(_processUserMessage(userId, event));
}

// Subscription Management API Functions - Sarmalanmış versiyonlar
export async function getAllPlans() {
    return apiCall(_getAllPlans());
}

export async function getPlanById(planId: string) {
    return apiCall(_getPlanById(planId));
}

export async function getSubscriptionForUser(userId: string) {
    return apiCall(_getSubscriptionForUser(userId));
}

export async function getUsageStatsForUser(userId: string, feature: string) {
    const promise = (async () => {
        const { data, error } = await supabase
            .from('usage_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('feature', feature)
            .single();

        if (error) throw error;
        return data;
    })();
    
    return apiCall(promise);
}

export async function getInitialUsageStats(userId: string) {
    return apiCall(_getInitialUsageStats(userId));
}

export async function canUsePDFExport(userId: string) {
    return apiCall(_canUsePDFExport(userId));
}

export async function canUseAllTherapists(userId: string) {
    return apiCall(_canUseAllTherapists(userId));
}

export async function hasPrioritySupport(userId: string) {
    return apiCall(_hasPrioritySupport(userId));
}

export async function isPremiumUser(userId: string) {
    return apiCall(_isPremiumUser(userId));
}

// Test-only functions
export async function upgradeUserPlanForTesting(userId: string, planName: 'Free' | '+Plus' | 'Premium') {
    return apiCall(_upgradeUserPlanForTesting(userId, planName));
} 