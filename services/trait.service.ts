// services/trait.service.ts
import { supabase } from '../utils/supabase';
import { getUserVault, updateUserVault } from './vault.service';

export const traitKeys = [
  'confidence', 'anxiety_level', 'extraversion', 'openness', 'neuroticism',
  'writing_style', 'preferred_tone', 'attachment_style', 'conflict_response',
] as const;

export type TraitKey = (typeof traitKeys)[number];
export type TraitValue = number | string;
export type Traits = Partial<Record<TraitKey, TraitValue>>;

export interface UpdateTraitOptions {
  mode: 'overwrite' | 'average';
  alpha?: number;
}

export async function updateTrait<K extends TraitKey>(
  key: K,
  value: Traits[K],
  options: UpdateTraitOptions = { mode: 'average', alpha: 0.1 }
): Promise<void> {
  const alpha = options.alpha ?? 0.1;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('YETKİLENDİRME BAŞARISIZ: Trait güncellemesi için kullanıcı oturumu şarttır.');
    const currentVault = await getUserVault();
    const newVault = currentVault ? JSON.parse(JSON.stringify(currentVault)) : { traits: {} };
    if (!newVault.traits) {
      newVault.traits = {};
    }
    const currentValue = newVault.traits[key];
    let finalValue = value;
    if (options.mode === 'average' && typeof value === 'number') {
      if (typeof currentValue === 'number') {
        const weightedAverage = (alpha * value) + ((1 - alpha) * currentValue);
        finalValue = Math.max(0, Math.min(1, weightedAverage));
        __DEV__ && console.log(`[TRAIT-EMA] '${key}' güncellendi. Eski: ${currentValue.toFixed(3)}, Gelen: ${value.toFixed(3)}, Yeni: ${finalValue.toFixed(3)}, α=${alpha}`);
      } else {
        finalValue = Math.max(0, Math.min(1, value));
        __DEV__ && console.log(`[TRAIT-INIT] '${key}' ilk kez set edildi: ${finalValue.toFixed(3)}`);
      }
    } else {
      __DEV__ && console.log(`[TRAIT-OVR] '${key}' üzerine yazıldı: ${value}`);
    }
    newVault.traits[key] = finalValue;
    await updateUserVault(newVault);
  } catch (error) {
    console.error(`⛔️ [TRAIT-CRITICAL] '${key}' özelliği güncellenirken sistem hatası oluştu.`, error);
    throw error;
  }
} 