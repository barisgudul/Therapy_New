// supabase/functions/_shared/rag.service.ts

import { supabase as adminClient } from "./supabase-admin.ts";
import * as AiService from "./ai.service.ts";
import { EmbedContentResponse } from "./ai.service.ts";

export type SourceLayer = "content" | "sentiment" | "stylometry";

// YENİ: RPC'den dönen verinin tipini tanımlıyoruz. 'any' yok.
type MatchRow = {
  id: string; // veya number, SQL fonksiyonuna bağlı
  content: string;
  event_time: string;
  similarity: number;
};

export async function retrieveContext(
  userId: string,
  query: string,
  options: { threshold: number; count: number },
): Promise<
  { content: string; source_layer: SourceLayer; similarity: number }[]
> {
  console.log(
    `[RAG] Hafıza taraması başlatıldı. Threshold: ${options.threshold}, Count: ${options.count}`,
  );

  const embeddingResponse: EmbedContentResponse = await AiService.embedContent(
    query,
  );
  const queryEmbedding = embeddingResponse.embedding;

  if (!Array.isArray(queryEmbedding)) {
    console.error("Embedding vektörü alınamadı.");
    return [];
  }

  const { data: matches, error } = await adminClient.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_threshold: options.threshold,
    match_count: options.count,
    p_user_id: userId,
    start_date: new Date("1970-01-01").toISOString(),
  });

  if (error) {
    console.error("[RAG] match_memories RPC hatası:", error);
    return [];
  }

  console.log(
    `[RAG] ${matches ? matches.length : 0} adet alakalı anı bulundu.`,
  );

  // Artık 'any' yok. Gelen verinin 'MatchRow[]' tipinde olduğunu varsayıyoruz.
  return (matches as MatchRow[] || []).map((m) => ({
    content: m.content,
    source_layer: "content",
    similarity: m.similarity,
  }));
}
