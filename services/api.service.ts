// services/api.service.ts
import { getErrorMessage, isAppError } from "../utils/errors";

// Global yüklenme durumu yönetimi için bir callback sistemi (isteğe bağlı)
let globalLoadingSetter: (isLoading: boolean) => void = () => {};
export const setGlobalLoadingIndicator = (setter: (isLoading: boolean) => void) => {
    globalLoadingSetter = setter;
};

// Tüm API çağrılarını saran ana fonksiyon
async function apiCall<T>(promise: Promise<T>): Promise<{ data: T | null; error: string | null }> {
  globalLoadingSetter(true);
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("⛔️ [API_LAYER_ERROR]", errorMessage, error);
    if (isAppError(error)) {
         return { data: null, error: errorMessage };
    }
    return { data: null, error: "İnternet bağlantınızda bir sorun var gibi görünüyor." };
  } finally {
    globalLoadingSetter(false);
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

// Feature usage increment function
import { UsageStats } from './subscription.service';
export const incrementFeatureUsage = async (feature: keyof UsageStats): Promise<void> => {
    // Bu fonksiyon şu an için boş bir implementasyon
    // Gerçek implementasyon Supabase RPC ile yapılacak
    console.log(`[USAGE] ${feature} kullanımı artırıldı (mock)`);
};

// Event Service API calls
import { logEvent as _logEvent, AppEvent, EventPayload } from './event.service';
export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>) {
    return apiCall(_logEvent(event));
}

// Vault Service API calls
import { updateUserVault as _updateUserVault, VaultData } from './vault.service';
export async function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

// Orchestration Service API calls
import { processUserMessage as _processUserMessage } from './orchestration.service';
export async function processUserMessage(userId: string, event: EventPayload) {
    // Eğer seans sonu ise, arka planda çalıştır ve bekleme
    if (event.data.isSessionEnd) {
        runInBackground(_processUserMessage(userId, event), 'process-session-end');
        return { data: "SESSION_END_REQUESTED", error: null };
    }
    return apiCall(_processUserMessage(userId, event));
}

// Subscription Management API calls - Sadece mevcut fonksiyonları import et
import {
    canUseAllTherapists as _canUseAllTherapists,
    canUsePDFExport as _canUsePDFExport,
    getAllPlans as _getAllPlans,
    getInitialUsageStats as _getInitialUsageStats,
    getPlanById as _getPlanById,
    getSubscriptionForUser as _getSubscriptionForUser,
    getUsageStatsForUser as _getUsageStatsForUser,
    hasPrioritySupport as _hasPrioritySupport,
    isPremiumUser as _isPremiumUser,
    upgradeUserPlanForTesting as _upgradeUserPlanForTesting
} from './subscription.service';

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
    return apiCall(_getUsageStatsForUser(userId, feature as any));
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