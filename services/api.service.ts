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

// Fonksiyonları buraya taşı. Örnek:
import { logEvent as _logEvent, AppEvent, EventPayload } from './event.service';
export async function logEvent(event: Omit<AppEvent, 'id' | 'user_id' | 'timestamp' | 'created_at'>) {
    return apiCall(_logEvent(event));
}

import { updateUserVault as _updateUserVault, VaultData } from './vault.service';
export async function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

import { processUserMessage as _processUserMessage } from './orchestration.service';
export async function processUserMessage(userId: string, event: EventPayload) {
    // Eğer seans sonu ise, arka planda çalıştır ve bekleme
    if (event.data.isSessionEnd) {
        runInBackground(_processUserMessage(userId, event), 'process-session-end');
        return { data: "SESSION_END_REQUESTED", error: null };
    }
    return apiCall(_processUserMessage(userId, event));
}

// Subscription Management API calls - YENİ FREEMIUM/PREMIUM SİSTEMİ
import {
    canUseAIReports as _canUseAIReports,
    canUseAllTherapists as _canUseAllTherapists,
    canUseDailyWrite as _canUseDailyWrite,
    // Freemium feature controls
    canUseDiaryWrite as _canUseDiaryWrite,
    canUseDreamAnalysis as _canUseDreamAnalysis,
    // Premium features
    canUsePDFExport as _canUsePDFExport,
    // Premium feature controls
    canUseTherapySessions as _canUseTherapySessions,
    canUseVideoSessions as _canUseVideoSessions,
    canUseVoiceSessions as _canUseVoiceSessions,
    getAllPlans as _getAllPlans,
    getCurrentSubscription as _getCurrentSubscription,
    getUserPlanStatus as _getUserPlanStatus,
    getUserUsageStats as _getUserUsageStats,
    isPremiumUser as _isPremiumUser,
    trackDailyWriteUsage as _trackDailyWriteUsage,
    // Usage tracking
    trackDiaryWriteUsage as _trackDiaryWriteUsage,
    trackDreamAnalysisUsage as _trackDreamAnalysisUsage
} from './subscription.service';

export async function getAllPlans() {
    return apiCall(_getAllPlans());
}

export async function getCurrentSubscription(userId: string) {
    return apiCall(_getCurrentSubscription(userId));
}

export async function getUserPlanStatus(userId: string) {
    return apiCall(_getUserPlanStatus(userId));
}

export async function getUserUsageStats(userId: string) {
    return apiCall(_getUserUsageStats(userId));
}

// Freemium feature controls
export async function canUseDiaryWrite(userId: string) {
    return apiCall(_canUseDiaryWrite(userId));
}

export async function canUseDailyWrite(userId: string) {
    return apiCall(_canUseDailyWrite(userId));
}

export async function canUseDreamAnalysis(userId: string) {
    return apiCall(_canUseDreamAnalysis(userId));
}

// Premium feature controls
export async function canUseTherapySessions(userId: string) {
    return apiCall(_canUseTherapySessions(userId));
}

export async function canUseVoiceSessions(userId: string) {
    return apiCall(_canUseVoiceSessions(userId));
}

export async function canUseVideoSessions(userId: string) {
    return apiCall(_canUseVideoSessions(userId));
}

export async function canUseAIReports(userId: string) {
    return apiCall(_canUseAIReports(userId));
}

// Usage tracking
export async function trackDiaryWriteUsage(userId: string) {
    return apiCall(_trackDiaryWriteUsage(userId));
}

export async function trackDailyWriteUsage(userId: string) {
    return apiCall(_trackDailyWriteUsage(userId));
}

export async function trackDreamAnalysisUsage(userId: string) {
    return apiCall(_trackDreamAnalysisUsage(userId));
}

// Premium features
export async function canUsePDFExport(userId: string) {
    return apiCall(_canUsePDFExport(userId));
}

export async function canUseAllTherapists(userId: string) {
    return apiCall(_canUseAllTherapists(userId));
}

export async function isPremiumUser(userId: string) {
    return apiCall(_isPremiumUser(userId));
}

// ... Diğer asenkron servis fonksiyonları da buraya eklenebilir ... 