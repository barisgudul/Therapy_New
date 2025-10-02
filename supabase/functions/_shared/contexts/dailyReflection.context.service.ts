// supabase/functions/_shared/contexts/dailyReflection.context.service.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as RagService from "../services/rag.service.ts";
import * as AiService from "../services/ai.service.ts";
import { config } from "../config.ts";

// Günlük yansıma için gerekli veri yapıları
export interface DailyReflectionDossier {
  userName: string | null;
  yesterdayMood: string | null;
  yesterdayNote: string | null;
}

// Bu fonksiyon, eskiden orchestration.handlers.ts içindeydi. Artık merkezi ve test edilebilir.
export async function prepareDailyReflectionDossier(
  supabaseClient: SupabaseClient,
  userId: string,
): Promise<DailyReflectionDossier> {
  try {
    // Dünün tarihini hesapla
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    // SADECE dünün daily_reflection'ını bul. Başka hiçbir şeye bakma.
    const yesterdayStart = `${yesterdayISO}T00:00:00.000Z`;
    const yesterdayEnd = `${yesterdayISO}T23:59:59.999Z`;

    const { data: yesterdayEvent, error: yesterdayError } = await supabaseClient
      .from("events")
      .select("mood, data") // Sadece mood ve data'yı çek
      .eq("user_id", userId)
      .eq("type", "daily_reflection")
      .gte("created_at", yesterdayStart)
      .lt("created_at", yesterdayEnd)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (yesterdayError) {
      console.warn("DailyReflection", "Dünün verisi çekilirken hata", {
        error: yesterdayError,
      });
    }

    // Kullanıcı adını vault'tan çek
    const { data: vaultData, error: vaultError } = await supabaseClient
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
  supabaseClient: SupabaseClient,
  ragService: typeof RagService,
  userId: string,
  todayNote: string,
) {
  const [dossier, retrievedMemories] = await Promise.all([
    prepareDailyReflectionDossier(supabaseClient, userId),
    ragService.retrieveContext(
      {
        supabaseClient: supabaseClient,
        aiService: AiService,
      },
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
