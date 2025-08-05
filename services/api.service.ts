// services/api.service.ts
import { getErrorMessage } from "../utils/errors";
import { supabase } from "../utils/supabase";

// Event Service API calls
import { logEvent as _logEvent, AppEvent } from './event.service';

// Vault Service API calls
import { updateUserVault as _updateUserVault, VaultData } from './vault.service';

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

// --- BU BÖLÜM TAMAMEN DEĞİŞECEK ---

// Global eylemleri tutacak bir nesne
let globalLoadingActions: { show: (msg?: string) => void; hide: () => void; } | null = null;

// Eylemleri kaydetmek için yeni fonksiyon
export const setGlobalLoadingActions = (actions: { show: (msg?: string) => void; hide: () => void; }) => {
  globalLoadingActions = actions;
};

// Tüm API çağrılarını saran wrapper'ı GÜNCELLE
export async function apiCall<T>(promise: Promise<T>, loadingMessage?: string): Promise<{ data: T | null; error: string | null }> {
  // Global loading state'i YENİ YÖNTEMLE güncelle
  globalLoadingActions?.show(loadingMessage);
  
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    console.error('API call failed:', getErrorMessage(error));
    return { data: null, error: getErrorMessage(error) };
  } finally {
    // Yüklemeyi YENİ YÖNTEMLE gizle
    globalLoadingActions?.hide();
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
    if (!user) return;

    const { error } = await supabase.rpc('increment_feature_usage', {
        user_uuid: user.id,
        feature_name: feature, // feature_name_base yerine feature_name
        increment_val: 1 // increment_value yerine increment_val
    });
    
    if (error) {
        console.error(`[USAGE] ${feature} kullanımı artırılırken hata:`, error.message);
    }
};

// YENİ: Kullanım hakkını iade etme fonksiyonu
export const revertFeatureUsage = async (feature: keyof UsageStats): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Şimdilik increment_feature_usage'ı -1 ile çağırıyoruz
    // Daha sonra Supabase tarafında ayrı bir RPC fonksiyonu yazılacak
    const { error } = await supabase.rpc('increment_feature_usage', {
        user_uuid: user.id,
        feature_name: feature, // feature_name_base yerine feature_name
        increment_val: -1 // increment_value yerine increment_val, negatif değer ile iade
    });
    
    if (error) {
        console.error(`[USAGE] ${feature} kullanımı iade edilirken hata:`, error.message);
    }
};

export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>) {
    return apiCall(_logEvent(event));
}

export async function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
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
            .maybeSingle(); // .single yerine .maybeSingle

        if (error) throw error;
        
        // Kayıt yoksa default değer döndür
        return data || {
            user_id: userId,
            feature,
            count: 0,
            limit_count: 3,
            used_count: 0
        };
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