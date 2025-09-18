// services/vault.service.ts
import { isDev } from "../utils/dev";
import { supabase } from "../utils/supabase";

export interface VaultData {
  traits?: Partial<Record<string, number | string>>;
  memories?: { [key: string]: import("../types/json.ts").JsonValue }[];
  themes?: string[];
  keyInsights?: string[];
  coreBeliefs?: Record<string, string>;
  onboarding?: Record<string, string>;
  onboardingInsight?: Record<string, string>; // YENİ ALAN
  profile?: {
    nickname?: string;
    birthDate?: string;
    expectation?: string;
    therapyGoals?: string;
    previousTherapy?: string;
    relationshipStatus?:
      | "single"
      | "in_relationship"
      | "married"
      | "complicated"
      | "";
    gender?: "male" | "female" | "other" | "";
  };
  metadata?: {
    onboardingCompleted?: boolean;
    [key: string]: import("../types/json.ts").JsonValue;
  };
  moodHistory?: { mood: string; timestamp: string }[];
  [key: string]: import("../types/json.ts").JsonValue;
}

interface VaultUpdateData {
  user_id: string;
  vault_data: VaultData;
  updated_at: string;
  nickname?: string;
  therapy_goals?: string;
  current_mood?: string;
  last_daily_reflection_at?: string;
}

export async function getUserVault(): Promise<VaultData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Yeni sütunları da çek
    const { data, error } = await supabase.from("user_vaults").select(`
      vault_data,
      nickname,
      therapy_goals,
      current_mood,
      last_daily_reflection_at
    `).eq("user_id", user.id).single();

    if (error && error.code !== "PGRST116") throw error;

    // Vault data yoksa null dön
    if (!data) return null;

    // vault_data ile yeni sütunları birleştir
    const vaultData: VaultData = data.vault_data || {};

    // Yeni sütunlardan gelen verileri vault_data'ya ekle (eğer varsa)
    if (data.nickname) {
      vaultData.profile = vaultData.profile || {};
      vaultData.profile.nickname = data.nickname;
    }

    if (data.therapy_goals) {
      vaultData.profile = vaultData.profile || {};
      vaultData.profile.therapyGoals = data.therapy_goals;
    }

    if (data.current_mood) {
      vaultData.metadata = vaultData.metadata || {};
      vaultData.metadata.currentMood = data.current_mood;
    }

    if (data.last_daily_reflection_at) {
      vaultData.metadata = vaultData.metadata || {};
      vaultData.metadata.lastDailyReflectionAt = data.last_daily_reflection_at;
    }

    return vaultData;
  } catch (error) {
    console.error("⛔️ Vault getirme hatası:", (error as Error).message);
    throw error;
  }
}

export async function updateUserVault(newVaultData: VaultData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Yeni sütunlar için verileri hazırla
    const updateData: VaultUpdateData = {
      user_id: user.id,
      vault_data: newVaultData,
      updated_at: new Date().toISOString(),
    };

    // Profile bilgilerini yeni sütunlara kopyala
    if (newVaultData.profile?.nickname) {
      updateData.nickname = newVaultData.profile.nickname;
    }

    if (newVaultData.profile?.therapyGoals) {
      updateData.therapy_goals = newVaultData.profile.therapyGoals;
    }

    // Metadata bilgilerini yeni sütunlara kopyala
    if (newVaultData.metadata?.currentMood) {
      updateData.current_mood = String(newVaultData.metadata.currentMood);
    }

    if (newVaultData.metadata?.lastDailyReflectionAt) {
      updateData.last_daily_reflection_at = String(
        newVaultData.metadata.lastDailyReflectionAt,
      );
    }

    const { error } = await supabase
      .from("user_vaults")
      .upsert(updateData, { onConflict: "user_id" });

    if (error) throw error;
    if (isDev()) console.log("✅ [Vault] Güncellendi - Yeni sütunlar dahil.");
  } catch (error) {
    console.error("⛔️ Vault update hatası:", (error as Error).message);
    throw error;
  }
}
