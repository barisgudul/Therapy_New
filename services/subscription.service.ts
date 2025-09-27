// services/subscription.service.ts

import { supabase } from "../utils/supabase";
import { PlanName } from "../store/subscriptionStore";

// =================================================================
// TİPLER
// =================================================================

export interface SubscriptionPlan {
    id: string;
    name: "Free" | "+Plus" | "Premium";
    price: number;
    // features objesini burada tutmamıza gerek yok, o limit tablosunda.
}

export interface UserSubscription {
    plan_id: string;
    name: "Free" | "+Plus" | "Premium";
}

export interface FeatureUsageResult {
    used_count: number;
    limit_count: number; // -1 for unlimited
    can_use: boolean;
    period: "day" | "month";
}

// Bütün özelliklerin bir listesi
export const ALL_FEATURES = [
    "text_sessions",
    "voice_minutes", // Veritabanındaki ismin bu!
    "dream_analysis",
    "ai_reports",
    "diary_write",
    "daily_reflection",
] as const;

export type FeatureKey = typeof ALL_FEATURES[number];
export type UsageStats = Record<FeatureKey, FeatureUsageResult>;

// =================================================================
// API FONKSİYONLARI - ARTIK %100 GERÇEK
// =================================================================

/**
 * Mevcut tüm abonelik planlarını veritabanından getirir.
 */
export async function getAllPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase.from("subscription_plans").select(
        "id, name, price_usd",
    );
    if (error) {
        console.error("Abonelik planları getirilemedi:", error.message);
        throw error;
    }
    // Gelen veriyi beklenen tipe dönüştür (price_usd -> price)
    return data.map((plan) => ({
        id: plan.id,
        name: plan.name,
        price: plan.price_usd,
    })) as SubscriptionPlan[];
}

/**
 * Kullanıcının mevcut abonelik durumunu getirir.
 */
export async function getCurrentSubscription(): Promise<
    UserSubscription | null
> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Bu RPC, aktif planı veya yoksa 'Free' plan bilgilerini döner.
    const { data, error } = await supabase.rpc(
        "get_user_current_subscription",
        {
            user_uuid: user.id,
        },
    );

    if (error) {
        console.error("Kullanıcı aboneliği alınamadı:", error.message);
        return null; // Hata durumunda null dön, UI çökmesin.
    }

    return data?.[0] as UserSubscription | null;
}

/**
 * Kullanıcının TÜM özellikler için kullanım istatistiklerini getirir.
 * Tek tek sormak yerine, tek seferde hepsini alacağız.
 */
export async function getUsageStats(): Promise<UsageStats | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const stats: Partial<UsageStats> = {};
    const promises = ALL_FEATURES.map((feature) =>
        supabase.rpc("check_feature_usage", {
            user_uuid: user.id,
            feature_name: feature,
        })
    );

    const results = await Promise.all(promises);

    for (let i = 0; i < ALL_FEATURES.length; i++) {
        const feature = ALL_FEATURES[i];
        const result = results[i];
        if (result.error || !result.data?.[0]) {
            console.error(
                `${feature} için kullanım istatistiği hatası:`,
                result.error?.message,
            );
            // Hata durumunda varsayılan olarak "kullanamaz" yap.
            stats[feature] = {
                used_count: 0,
                limit_count: 0,
                can_use: false,
                period: "month",
            };
        } else {
            stats[feature] = result.data[0];
        }
    }

    return stats as UsageStats;
}

/**
 * Kullanıcının planını DEĞİŞTİRİR. Ödeme olmadığı için direkt RPC çağıracağız.
 * Bunun için yeni bir RPC fonksiyonu yazmamız gerekiyor!
 */
export async function updateUserPlan(
    newPlanName: PlanName,
): Promise<{ success: boolean }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const { error } = await supabase.rpc("assign_plan_to_user", {
        p_user_id: user.id,
        p_plan_name: newPlanName,
    });

    if (error) {
        console.error(`Plan değiştirme hatası: ${error.message}`);
        throw error;
    }

    return { success: true };
}
