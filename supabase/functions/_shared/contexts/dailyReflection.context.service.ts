// supabase/functions/_shared/contexts/dailyReflection.context.service.ts

import { supabase as adminClient } from "../supabase-admin.ts";
import * as RagService from "../rag.service.ts";
import { config } from "../config.ts";

// Günlük yansıma için gerekli veri yapıları
export interface DailyReflectionDossier {
  userName: string | null;
  yesterdayMood: string | null;
  yesterdayNote: string | null;
}

// Bu fonksiyon, eskiden orchestration.handlers.ts içindeydi. Artık merkezi ve test edilebilir.
async function prepareDailyReflectionDossier(
  userId: string,
): Promise<DailyReflectionDossier> {
  try {
    // Dünün tarihini hesapla
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    // SADECE dünün daily_reflection'ını bul. Başka hiçbir şeye bakma.
    const { data: yesterdayEvent, error: yesterdayError } = await adminClient
      .from("events")
      .select("mood, data") // Sadece mood ve data'yı çek
      .eq("user_id", userId)
      .eq("type", "daily_reflection")
      .like("created_at", `${yesterdayISO}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (yesterdayError) {
      console.warn("DailyReflection", "Dünün verisi çekilirken hata", {
        error: yesterdayError,
      });
    }

    // Kullanıcı adını vault'tan çek
    const { data: vaultData, error: vaultError } = await adminClient
      .from("user_vaults")
      .select("vault_data")
      .eq("user_id", userId)
      .single();

    let userName: string | null = null;
    if (!vaultError && vaultData?.vault_data) {
      const vault = vaultData.vault_data as { profile?: { nickname?: string } };
      userName = vault.profile?.nickname || null;
    }

    return {
      userName,
      yesterdayMood: yesterdayEvent?.mood || null,
      yesterdayNote: yesterdayEvent?.data?.todayNote || null,
    };
  } catch (error) {
    console.warn(
      `[DailyReflection] Dosya hazırlanamadı: ${(error as Error).message}`,
    );
    return { userName: null, yesterdayMood: null, yesterdayNote: null };
  }
}

// BU FONKSİYON, GÜNLÜK YANSIŞMA İÇİN GEREKLİ TÜM BİLGİYİ TOPLAYAN BEYİNDİR.
export async function buildDailyReflectionContext(
  userId: string,
  todayNote: string,
) {
  const [dossier, retrievedMemories] = await Promise.all([
    prepareDailyReflectionDossier(userId),
    RagService.retrieveContext(
      userId,
      todayNote, // Bugünün notuyla ilgili anıları ara
      {
        threshold: config.RAG_PARAMS.DAILY_REFLECTION.threshold,
        count: config.RAG_PARAMS.DAILY_REFLECTION.count,
      },
    ),
  ]);

  return { dossier, retrievedMemories };
}
