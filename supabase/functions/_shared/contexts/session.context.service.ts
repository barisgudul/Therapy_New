// supabase/functions/_shared/contexts/session.context.service.ts
import { supabase as adminClient } from "../supabase-admin.ts";
import * as RagService from "../rag.service.ts";
import { config } from "../config.ts";

export interface UserDossier {
  nickname: string | null;
  dnaSummary: string | null;
}

export interface WarmStartContext {
  originalNote: string;
  aiReflection: string;
  theme: string;
  source: string;
}

function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// RAG sonuçlarını tek satırlık, tekrar etmeyen bullet'lara indirger
function compactRag(memories: { content: unknown }[], maxItems = 5): string {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const m of memories) {
    const raw = String(m?.content ?? "");
    const n = norm(raw);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    // tek satır – 180 char sınırı
    const oneLine = raw.replace(/\s+/g, " ").slice(0, 180);
    lines.push(`- ${oneLine}`);
    if (lines.length >= maxItems) break;
  }
  return lines.join("\n");
}

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

async function prepareWarmStartContext(
  userId: string,
  pendingSessionId: string,
): Promise<WarmStartContext | null> {
  try {
    const { data: pendingData, error: fetchError } = await adminClient
      .from("pending_text_sessions")
      .delete()
      .match({ id: pendingSessionId, user_id: userId })
      .select("context_data")
      .single();

    if (fetchError || !pendingData) return null;
    return pendingData.context_data as WarmStartContext;
  } catch (error) {
    console.warn(
      `[WarmStart] Geçici hafıza çekilemedi: ${(error as Error).message}`,
    );
    return null;
  }
}

export async function buildTextSessionContext(
  userId: string,
  userMessage: string,
  pendingSessionId?: string | null,
) {
  const warmStartContext = pendingSessionId
    ? await prepareWarmStartContext(userId, pendingSessionId)
    : null;

  const [userDossier, retrievedMemories] = await Promise.all([
    prepareUserDossier(userId),
    warmStartContext
      ? Promise.resolve([]) // Sıcak başlangıçta RAG yok
      : RagService.retrieveContext(userId, userMessage, {
        threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
        count: config.RAG_PARAMS.DEFAULT.COUNT,
      }),
  ]);

  // Flash'a uygun RAG string'i (kısa ve dedup)
  const ragForPrompt = compactRag(
    retrievedMemories as { content: unknown }[],
    5,
  );

  return { userDossier, retrievedMemories, warmStartContext, ragForPrompt };
}
