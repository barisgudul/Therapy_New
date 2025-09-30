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

// Subscription Management API calls - Sadece kullanılan fonksiyonları import et
import {
    getAllPlans as _getAllPlans,
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

export function logEvent(
    event: Omit<AppEvent, "id" | "user_id" | "timestamp" | "created_at">,
) {
    return apiCall(_logEvent(event));
}

export function updateUserVault(vaultData: VaultData) {
    return apiCall(_updateUserVault(vaultData));
}

// Subscription Management API Functions - Sadece kullanılan fonksiyonları export et
export function getAllPlans() {
    return apiCall(_getAllPlans());
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
    const promise = (async (): Promise<Record<string, string>> => {
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

        if (error) throw new Error(error.message);

        // Fonksiyon artık güvenli içgörü objesini döner
        return (typeof data === "string" ? JSON.parse(data) : data) as Record<
            string,
            string
        >;
    })();

    // Artık loading mesajı vermiyoruz, bu HomeIllustration'da yönetiliyor
    return apiCall(promise);
}
