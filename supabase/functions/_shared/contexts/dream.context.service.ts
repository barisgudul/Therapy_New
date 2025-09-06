// supabase/functions/_shared/contexts/dream.context.service.ts

import { supabase as adminClient } from "../supabase-admin.ts";
import * as RagService from "../rag.service.ts";
import * as AiService from "../ai.service.ts";
import { config } from "../config.ts";
import { logRagInvocation } from "../utils/logging.service.ts";

// Rüya analizi için gerekli veri yapıları
export interface DreamAnalysisDossier {
  traits: Record<string, string>;
  therapyGoals: string;
  recentEvents: string;
  predictions: string;
  journeyLogs: string;
}

// Bu fonksiyon, eskiden orchestration.handlers.ts içindeydi. Artık merkezi ve test edilebilir.
async function prepareDreamAnalysisDossier(
  userId: string,
): Promise<DreamAnalysisDossier> {
  const results = await Promise.allSettled([
    adminClient.from("user_vaults").select("vault_data").eq("user_id", userId)
      .single(),
    adminClient
      .from("user_traits")
      .select("confidence, anxiety_level, motivation, openness, neuroticism")
      .eq("user_id", userId)
      .maybeSingle(),
    adminClient.from("events").select("type, created_at, data").eq(
      "user_id",
      userId,
    )
      .order("created_at", { ascending: false }).limit(5),
    adminClient.from("predicted_outcomes").select("title, description").eq(
      "user_id",
      userId,
    )
      .gt("expires_at", new Date().toISOString()),
    adminClient.from("journey_logs").select("log_text").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(3),
  ]);

  // Her bir sonucun başarılı olup olmadığını kontrol et
  const vaultResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: null, error: results[0].reason };
  const traitsResult = results[1].status === "fulfilled"
    ? results[1].value
    : { data: null, error: results[1].reason };
  const eventsResult = results[2].status === "fulfilled"
    ? results[2].value
    : { data: [], error: results[2].reason };
  const predictionsResult = results[3].status === "fulfilled"
    ? results[3].value
    : { data: [], error: results[3].reason };
  const journeyLogsResult = results[4].status === "fulfilled"
    ? results[4].value
    : { data: [], error: results[4].reason };

  // Hataları logla ama sistemi durdurma
  if (vaultResult.error) console.error("Vault çekilemedi:", vaultResult.error);
  if (traitsResult.error) {
    console.error("Traits çekilemedi:", traitsResult.error);
  }
  if (eventsResult.error) {
    console.error("Events çekilemedi:", eventsResult.error);
  }
  if (predictionsResult.error) {
    console.error("Predictions çekilemedi:", predictionsResult.error);
  }
  if (journeyLogsResult.error) {
    console.error("Journey logs çekilemedi:", journeyLogsResult.error);
  }

  const vaultData = vaultResult.data?.vault_data as {
    profile?: { therapyGoals?: string };
  } || {};

  // Traits'i user_traits tablosundan al
  const traits = traitsResult.data
    ? Object.fromEntries(
      Object.entries(traitsResult.data).map(([k, v]) => [k, String(v)]),
    )
    : {};

  return {
    traits,
    therapyGoals: vaultData.profile?.therapyGoals || "Belirtilmemiş",
    recentEvents: (() => {
      const rows = (eventsResult.data ?? []) as {
        type: string;
        data: Record<string, unknown>;
      }[];
      return rows.length > 0
        ? rows.map((e) =>
          `- ${e.type}: ${JSON.stringify(e.data).substring(0, 50)}...`
        ).join("\n")
        : "Kayıt yok.";
    })(),
    predictions: (() => {
      const rows = (predictionsResult.data ?? []) as {
        title: string;
        description: string;
      }[];
      return rows.length > 0
        ? rows.map((p) => `- ${p.title}: ${p.description}`).join("\n")
        : "Aktif öngörü yok.";
    })(),
    journeyLogs: (() => {
      const rows = (journeyLogsResult.data ?? []) as { log_text: string }[];
      return rows.length > 0
        ? rows.map((j) => `- "${j.log_text}"`).join("\n")
        : "Kayıt yok.";
    })(),
  };
}

// RAG bağlamını zenginleştirme fonksiyonu
async function getEnhancedDreamRagContext(
  userId: string,
  dreamText: string,
  transactionId?: string,
): Promise<string> {
  try {
    const themePrompt =
      `Şu rüyanın 1-3 anahtar kelimelik temasını çıkar: "${dreamText}". Sadece temaları virgülle ayırarak yaz.`;
    const themes = await AiService.invokeGemini(
      themePrompt,
      config.AI_MODELS.FAST,
    );
    const enrichedQuery = `${dreamText} ${themes}`;
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      enrichedQuery,
      {
        threshold: config.RAG_PARAMS.DREAM_ANALYSIS.threshold,
        count: config.RAG_PARAMS.DREAM_ANALYSIS.count,
      },
    );

    // MİKROSKOP BURADA - loglama yap
    if (transactionId) {
      await logRagInvocation(adminClient, {
        transaction_id: transactionId,
        user_id: userId,
        source_function: "dream_analysis",
        search_query: enrichedQuery,
        retrieved_memories: retrievedMemories,
      });
    }

    return retrievedMemories.map((c) =>
      `- (Kaynak: ${c.source_layer}) ${c.content}`
    ).join("\n");
  } catch (e) {
    console.error(
      "RAG Context zenginleştirme hatası, basit RAG'e dönülüyor.",
      e,
    );
    // Fallback: Sadece rüya metni ile arama yap
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      dreamText,
      {
        threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
        count: config.RAG_PARAMS.DEFAULT.COUNT,
      },
    );
    return retrievedMemories.map((c) => `- ${c.content}`).join("\n");
  }
}

export async function buildDreamAnalysisContext(
  userId: string,
  dreamText: string,
  transactionId: string,
) {
  const [userDossier, ragContextString] = await Promise.all([
    prepareDreamAnalysisDossier(userId),
    getEnhancedDreamRagContext(userId, dreamText, transactionId),
  ]);

  // ARTIK STRING'E ÇEVİRMEK YOK. HAM OBJEYİ DÖNDÜRÜYORUZ.
  return { userDossier, ragContext: ragContextString };
}
