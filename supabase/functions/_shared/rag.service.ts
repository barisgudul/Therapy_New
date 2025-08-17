// supabase/functions/_shared/rag.service.ts

import { supabase as adminClient } from "./supabase-admin.ts";
import * as AiService from "./ai.service.ts";

export type SourceLayer = "content" | "sentiment" | "stylometry";
type QueryIntent =
  | "emotion_expression"
  | "event_recall"
  | "pattern_inquiry"
  | "unknown";
type MatchRow = { id: number; content: string; score: number };

async function analyzeQueryIntent(query: string): Promise<QueryIntent> {
  const prompt =
    `Bir kullanıcının sorgusunu analiz et ve niyetini SADECE şu kategorilerden biriyle etiketle: 'emotion_expression' (bir duygu ifade ediyor), 'event_recall' (geçmiş bir olayı hatırlamaya çalışıyor), 'pattern_inquiry' (bir davranış kalıbı hakkında soru soruyor). Sorgu: "${query}"`;
  try {
    const classification = await AiService.invokeGemini(
      prompt,
      "gemini-1.5-flash",
      { maxOutputTokens: 20 },
    );
    const normalized = classification.toLowerCase();
    if (normalized.includes("emotion_expression")) return "emotion_expression";
    if (normalized.includes("event_recall")) return "event_recall";
    if (normalized.includes("pattern_inquiry")) return "pattern_inquiry";
    return "unknown";
  } catch (e) {
    console.error("Sorgu niyeti analizi başarısız:", e);
    return "unknown";
  }
}

export async function retrieveContext(
  userId: string,
  query: string,
): Promise<{ content: string; source_layer: SourceLayer }[]> {
  console.log(`[RAG] Kullanıcı ${userId} için hafıza taraması başlatıldı.`);

  const intent = await analyzeQueryIntent(query);
  let weights = { content: 0.6, sentiment: 0.3, stylometry: 0.1 };
  if (intent === "emotion_expression") {
    weights = { content: 0.2, sentiment: 0.7, stylometry: 0.1 };
  }
  if (intent === "event_recall") {
    weights = { content: 0.8, sentiment: 0.2, stylometry: 0.0 };
  }
  console.log(`[RAG] Niyet: ${intent}, Ağırlıklar:`, weights);

  const embeddingResponse = await AiService.embedContent(query);
  const queryEmbedding = embeddingResponse.embedding?.values;
  if (!Array.isArray(queryEmbedding)) {
    console.error("Embedding vektörü alınamadı.");
    return [];
  }

  const MATCH_COUNT = 12;
  const [contentRes, sentimentRes, stylometryRes] = await Promise.all([
    adminClient.rpc("match_memories_by_content", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
    }),
    adminClient.rpc("match_memories_by_sentiment", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
    }),
    adminClient.rpc("match_memories_by_stylometry", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
    }),
  ]);

  const fused = new Map<
    number,
    {
      content: string;
      score: number;
      dominant_layer: SourceLayer;
      dominant_score: number;
    }
  >();
  const processMatches = (
    matches: MatchRow[] | null,
    weight: number,
    layer: SourceLayer,
  ) => {
    if (!matches || weight <= 0) return;
    for (const m of matches) {
      const weightedScore = (m.score ?? 0) * weight;
      const prev = fused.get(m.id);
      if (prev) {
        if (weightedScore > prev.dominant_score) {
          prev.dominant_layer = layer;
          prev.dominant_score = weightedScore;
        }
        prev.score += weightedScore;
      } else {
        fused.set(m.id, {
          content: m.content,
          score: weightedScore,
          dominant_layer: layer,
          dominant_score: weightedScore,
        });
      }
    }
  };

  processMatches(
    contentRes.data as MatchRow[] | null,
    weights.content,
    "content",
  );
  processMatches(
    sentimentRes.data as MatchRow[] | null,
    weights.sentiment,
    "sentiment",
  );
  processMatches(
    stylometryRes.data as MatchRow[] | null,
    weights.stylometry,
    "stylometry",
  );

  const sorted = Array.from(fused.values()).sort((a, b) => b.score - a.score)
    .slice(0, 7);
  console.log(`[RAG] ${sorted.length} adet alakalı anı bulundu.`);

  return sorted.map((item) => ({
    content: item.content,
    source_layer: item.dominant_layer,
  }));
}
