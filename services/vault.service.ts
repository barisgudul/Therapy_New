// services/vault.service.ts
import { supabase } from '../utils/supabase';

export interface VaultData {
  traits?: Record<string, any>;
  memories?: any[];
  onboarding?: Record<string, string>;
  profile?: {
    nickname?: string;
    birthDate?: string;
    expectation?: string;
    therapyGoals?: string;
    previousTherapy?: string;
    relationshipStatus?: 'single' | 'in_relationship' | 'married' | 'complicated' | '';
    gender?: 'male' | 'female' | 'other' | '';
  };
  metadata?: {
    onboardingCompleted?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function getUserVault(): Promise<VaultData | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase.from('user_vaults').select('vault_data').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data?.vault_data || null;
  } catch (error) {
    console.error('⛔️ Vault getirme hatası:', (error as Error).message);
    throw error;
  }
}

export async function updateUserVault(newVaultData: VaultData): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('user_vaults').upsert({ user_id: user.id, vault_data: newVaultData, updated_at: new Date().toISOString() });
    if (error) throw error;
    __DEV__ && console.log('✅ [Vault] Güncellendi.');
  } catch (error) {
    console.error('⛔️ Vault update hatası:', (error as Error).message);
    throw error;
  }
}
