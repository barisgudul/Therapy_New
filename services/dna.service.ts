// services/dna.service.ts
import { supabase } from "../utils/supabase";
import { isDev } from "../utils/dev";

export const traitKeys = [
  "confidence",
  "anxiety_level",
  "extraversion",
  "openness",
  "neuroticism",
  "writing_style",
  "preferred_tone",
  "attachment_style",
  "conflict_response",
] as const;

export type TraitKey = (typeof traitKeys)[number];
export type TraitValue = number | string;
export type Traits = Partial<Record<TraitKey, TraitValue>>;

export interface UpdateTraitOptions {
  mode: "overwrite" | "average";
  alpha?: number;
}

export interface UserTrait {
  id?: string;
  user_id: string;
  trait_key: TraitKey;
  trait_value: TraitValue;
  confidence_score: number;
  last_updated: string;
  source: string;
}

/**
 * Kullanıcının tüm traits'ini getir
 */
export async function getTraitsForUser(userId: string): Promise<Traits | null> {
  try {
    const { data, error } = await supabase
      .from("user_traits")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Traits çekilirken hata:", error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // user_traits tablosundan Traits objesine dönüştür
    const traits: Traits = {};
    data.forEach((trait: UserTrait) => {
      traits[trait.trait_key] = trait.trait_value;
    });

    return traits;
  } catch (error) {
    console.error("Traits çekilirken beklenmeyen hata:", error);
    return null;
  }
}

/**
 * Tek bir trait'i güncelle veya ekle
 */
export async function updateTrait<K extends TraitKey>(
  key: K,
  value: Traits[K],
  options: UpdateTraitOptions = { mode: "average", alpha: 0.1 },
): Promise<void> {
  const alpha = options.alpha ?? 0.1;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error(
        "YETKİLENDİRME BAŞARISIZ: Trait güncellemesi için kullanıcı oturumu şarttır.",
      );
    }

    // Mevcut trait'i kontrol et
    const { data: existingTrait, error: selectError } = await supabase
      .from("user_traits")
      .select("*")
      .eq("user_id", user.id)
      .eq("trait_key", key)
      .single();

    if (selectError && selectError.code !== "PGRST116") { // PGRST116 = no rows returned
      throw new Error(
        `Mevcut trait kontrol edilirken hata: ${selectError.message}`,
      );
    }

    let finalValue = value;
    let confidenceScore = 0.8; // Varsayılan güven skoru

    if (
      existingTrait && options.mode === "average" && typeof value === "number"
    ) {
      // Mevcut değerle ağırlıklı ortalama hesapla
      const currentValue = existingTrait.trait_value;
      if (typeof currentValue === "number") {
        const weightedAverage = (alpha * value) + ((1 - alpha) * currentValue);
        finalValue = Math.max(0, Math.min(1, weightedAverage));
        confidenceScore = Math.min(0.95, existingTrait.confidence_score + 0.05); // Güven skorunu artır

        if (isDev()) {
        }
      } else {
        finalValue = Math.max(0, Math.min(1, value));
        if (isDev()) {
        }
      }
    } else {
      if (isDev()) {
      }
    }

    const traitData: Omit<UserTrait, "id"> = {
      user_id: user.id,
      trait_key: key,
      trait_value: finalValue,
      confidence_score: confidenceScore,
      last_updated: new Date().toISOString(),
      source: "user_interaction",
    };

    if (existingTrait) {
      // Mevcut trait'i güncelle
      const { error: updateError } = await supabase
        .from("user_traits")
        .update(traitData)
        .eq("id", existingTrait.id);

      if (updateError) {
        throw new Error(`Trait güncellenirken hata: ${updateError.message}`);
      }
    } else {
      // Yeni trait ekle
      const { error: insertError } = await supabase
        .from("user_traits")
        .insert([traitData]);

      if (insertError) {
        throw new Error(`Trait eklenirken hata: ${insertError.message}`);
      }
    }

    if (isDev()) {
    }
  } catch (error) {
    console.error(
      `⛔️ [TRAIT-CRITICAL] '${key}' özelliği güncellenirken sistem hatası oluştu.`,
      error,
    );
    throw error;
  }
}

/**
 * Kullanıcının tüm traits'ini sil (reset için)
 */
export async function clearAllTraits(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("user_traits")
      .delete()
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Traits silinirken hata: ${error.message}`);
    }

    if (isDev()) {
    }
  } catch (error) {
    console.error("Traits silinirken hata:", error);
    throw error;
  }
}
