// supabase/functions/_shared/contexts/session.context.service.ts

import { supabase as adminClient } from "../supabase-admin.ts";
import * as RagService from "../rag.service.ts";
import { config } from "../config.ts";

// Bu veri yapısını, birden fazla yerde kullanacağımız için tanımlıyoruz.
export interface UserDossier {
  nickname: string | null;
  dnaSummary: string | null;
}

// Sıcak başlangıç için gereken bağlam verisi
export interface WarmStartContext {
  originalNote: string;
  aiReflection: string;
  theme: string;
  source: string;
}

// Bu fonksiyon, eskiden text-session içindeydi. Artık merkezi ve test edilebilir.
async function prepareUserDossier(userId: string): Promise<UserDossier> {
  try {
    const { data, error } = await adminClient
      .from("user_vaults")
      .select("vault_data")
      .eq("user_id", userId)
      .single();

    if (error || !data || !data.vault_data) {
      return { nickname: null, dnaSummary: null };
    }

    const vault = data.vault_data as {
      profile?: { nickname?: string };
      dna_summary?: string;
    };

    return {
      nickname: vault.profile?.nickname || null,
      dnaSummary: vault.dna_summary || null,
    };
  } catch (error) {
    console.warn(
      `[Dossier] Kullanıcı dosyası hazırlanamadı: ${(error as Error).message}`,
    );
    return { nickname: null, dnaSummary: null };
  }
}

// Sıcak başlangıç bağlamını çekmek için fonksiyon
async function prepareWarmStartContext(
  userId: string,
  pendingSessionId: string,
): Promise<WarmStartContext | null> {
  try {
    const { data: pendingData, error: fetchError } = await adminClient
      .from("pending_text_sessions")
      .delete() // Çektiğimiz anda siliyoruz ki tekrar kullanılmasın
      .match({ id: pendingSessionId, user_id: userId })
      .select("context_data")
      .single();

    if (fetchError || !pendingData) {
      return null;
    }

    const context = pendingData.context_data as WarmStartContext;
    return context;
  } catch (error) {
    console.warn(
      `[WarmStart] Geçici hafıza çekilemedi: ${(error as Error).message}`,
    );
    return null;
  }
}

// BU FONKSİYON, BİR SOHBET TURU İÇİN GEREKLİ TÜM BİLGİYİ TOPLAYAN BEYİNDİR.
export async function buildTextSessionContext(
  userId: string,
  userMessage: string,
  pendingSessionId?: string | null,
) {
  // Sıcak başlangıç kontrolü
  const warmStartContext = pendingSessionId
    ? await prepareWarmStartContext(userId, pendingSessionId)
    : null;

  // Eğer sıcak başlangıç varsa, RAG'e gitmeye gerek yok
  const [userDossier, retrievedMemories] = await Promise.all([
    prepareUserDossier(userId),
    warmStartContext
      ? Promise.resolve([]) // Sıcak başlangıçta RAG yok
      : RagService.retrieveContext(userId, userMessage, {
        threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
        count: config.RAG_PARAMS.DEFAULT.COUNT,
      }),
  ]);

  return { userDossier, retrievedMemories, warmStartContext };
}
