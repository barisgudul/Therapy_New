// services/api.service.ts
import { getErrorMessage } from "../utils/errors";
import { supabase } from "../utils/supabase";
import { AppEvent, logEvent as _logEvent } from "./event.service";
import i18n from "../utils/i18n"; // i18n'i import et

// Vault Service API calls
import {
    updateUserVault as _updateUserVault,
    VaultData,
} from "./vault.service";

// Subscription Management API calls - Tüm import'ları tek satırda birleştir
import {
    canUseAllTherapists as _canUseAllTherapists,
    canUsePDFExport as _canUsePDFExport,
    getAllPlans as _getAllPlans,
    getInitialUsageStats as _getInitialUsageStats,
    getPlanById as _getPlanById, // 'type' keyword'ü ile bunun bir tip olduğunu belirtirsin
    getSubscriptionForUser as _getSubscriptionForUser,
    hasPrioritySupport as _hasPrioritySupport,
    isPremiumUser as _isPremiumUser,
    upgradeUserPlanForTesting as _upgradeUserPlanForTesting,
    type UsageStats,
} from "./subscription.service";
import type { AnalysisReport } from "../types/analysis";

// Tüm API çağrılarını saran wrapper'ı TEMİZLE
export async function apiCall<T>(
    promise: Promise<T>,
): Promise<{ data: T | null; error: string | null }> {
    try {
        const data = await promise;
        return { data, error: null };
    } catch (error) {
        console.error("API call failed:", getErrorMessage(error));
        return { data: null, error: getErrorMessage(error) };
    }
}

// ARKA PLAN GÖREVİ İÇİN YENİ FONKSİYON
function _runInBackground<T>(_promise: Promise<T>, taskName: string): void {
    _promise
        .then(() =>
            console.log(`✅ [BG_TASK] '${taskName}' başarıyla tamamlandı.`)
        )
        .catch((error: unknown) => {
            const errorMessage = getErrorMessage(error);
            console.error(
                `⛔️ [BG_TASK_ERROR] '${taskName}' hatası:`,
                errorMessage,
                error,
            );
        });
}

export const incrementFeatureUsage = async (
    feature: keyof UsageStats,
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc("increment_feature_usage", {
        user_uuid: user.id,
        feature_name: feature, // feature_name_base yerine feature_name
        increment_val: 1, // increment_value yerine increment_val
    });

    if (error) {
        console.error(
            `[USAGE] ${feature} kullanımı artırılırken hata:`,
            error.message,
        );
    }
};

// YENİ: Kullanım hakkını iade etme fonksiyonu
export const revertFeatureUsage = async (
    feature: keyof UsageStats,
): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Şimdilik increment_feature_usage'ı -1 ile çağırıyoruz
    // Daha sonra Supabase tarafında ayrı bir RPC fonksiyonu yazılacak
    const { error } = await supabase.rpc("increment_feature_usage", {
        user_uuid: user.id,
        feature_name: feature, // feature_name_base yerine feature_name
        increment_val: -1, // increment_value yerine increment_val, negatif değer ile iade
    });

    if (error) {
        console.error(
            `[USAGE] ${feature} kullanımı iade edilirken hata:`,
            error.message,
        );
    }
};

export function logEvent(
    event: Omit<AppEvent, "id" | "user_id" | "timestamp" | "created_at">,
) {
    return apiCall(_logEvent(event));
}

export function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

// Subscription Management API Functions - Sarmalanmış versiyonlar
export function getAllPlans() {
    return apiCall(_getAllPlans());
}

export function getPlanById(planId: string) {
    return apiCall(_getPlanById(planId));
}

export function getSubscriptionForUser(userId: string) {
    return apiCall(_getSubscriptionForUser(userId));
}

export function getUsageStatsForUser(userId: string, feature: string) {
    const promise = (async () => {
        const { data, error } = await supabase
            .from("usage_stats")
            .select("*")
            .eq("user_id", userId)
            .eq("feature", feature)
            .maybeSingle(); // .single yerine .maybeSingle

        if (error) throw error;

        // Kayıt yoksa default değer döndür
        return data || {
            user_id: userId,
            feature,
            count: 0,
            limit_count: 3,
            used_count: 0,
        };
    })();

    return apiCall(promise);
}

export function getInitialUsageStats(userId: string) {
    return apiCall(_getInitialUsageStats(userId));
}

export function canUsePDFExport(userId: string) {
    return apiCall(_canUsePDFExport(userId));
}

export function canUseAllTherapists(userId: string) {
    return apiCall(_canUseAllTherapists(userId));
}

export function hasPrioritySupport(userId: string) {
    return apiCall(_hasPrioritySupport(userId));
}

export function isPremiumUser(userId: string) {
    return apiCall(_isPremiumUser(userId));
}

// Test-only functions
export function upgradeUserPlanForTesting(
    userId: string,
    planName: "Free" | "+Plus" | "Premium",
) {
    return apiCall(_upgradeUserPlanForTesting(userId, planName));
}

// YENİ: En son kişisel raporu getirir
export function getLatestAnalysisReport() {
    const promise = (async (): Promise<AnalysisReport | null> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from("analysis_reports")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return (data as AnalysisReport) ?? null;
    })();

    return apiCall(promise);
}

// YENİ: Behavioral pattern analizi tetikleme
export function triggerBehavioralAnalysis(periodDays: number) {
    const promise = (async () => {
        const { data, error } = await supabase.functions.invoke(
            "analyze-behavioral-patterns",
            {
                body: { periodDays },
            },
        );

        if (error) {
            throw new Error(error.message);
        }

        return data;
    })();

    return apiCall(promise);
}

// YENİ: Onboarding insight üretme
export function generateOnboardingInsight(
    answer1: string,
    answer2: string,
    answer3: string,
) {
    const promise = (async (): Promise<{ insight: string }> => {
        const { data, error } = await supabase.functions.invoke(
            "generate-onboarding-insight",
            {
                body: {
                    answer1,
                    answer2,
                    answer3,
                    language: i18n.language, // AKTİF DİLİ DE GÖNDER
                },
            },
        );

        if (error) {
            throw new Error(error.message);
        }

        return data as { insight: string };
    })();

    // Artık loading mesajı vermiyoruz, bu HomeIllustration'da yönetiliyor
    return apiCall(promise);
}
