// supabase/functions/_shared/services/rag.service.ts

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type * as AiService from "./ai.service.ts";
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
    dependencies: {
        supabaseClient: SupabaseClient;
        aiService: { embedContent: typeof AiService.embedContent };
    },
    userId: string,
    query: string,
    options: {
        threshold: number;
        count: number;
        // Opsiyonel HİBRİT skorlama: verilirse sorgunun duygu profili embed edilip
        // match_memories'e geçilir (content + sentiment harmanı). Verilmezse davranış
        // content + recency olarak kalır (tam geriye uyumlu).
        sentimentQuery?: string;
        sentimentWeight?: number;
    },
): Promise<
    { content: string; source_layer: SourceLayer; similarity: number }[]
> {
    console.log(
        `[RAG] Hafıza taraması başlatıldı. Threshold: ${options.threshold}, Count: ${options.count}`,
    );

    const embeddingResponse: EmbedContentResponse = await dependencies.aiService
        .embedContent(
            dependencies.supabaseClient,
            query,
        );
    const queryEmbedding = embeddingResponse.embedding;

    if (!Array.isArray(queryEmbedding)) {
        // Nazik düşüş: bağlam olmadan devam (AI bağlamsız yanıt verir).
        console.error(
            "[RAG] Sorgu embedding'i alınamadı; bağlamsız devam ediliyor (boş anı listesi).",
        );
        return [];
    }

    // Opsiyonel: sorgu duygu embedding'i (hibrit skorlama)
    let sentimentEmbedding: number[] | null = null;
    if (options.sentimentQuery) {
        try {
            const sentRes = await dependencies.aiService.embedContent(
                dependencies.supabaseClient,
                options.sentimentQuery,
            );
            if (Array.isArray(sentRes.embedding)) {
                sentimentEmbedding = sentRes.embedding;
            }
        } catch (e) {
            // Hibrit sinyal başarısızsa sessizce content + recency'ye düş
            console.warn("[RAG] Duygu embedding alınamadı, content+recency'ye düşülüyor.", e);
        }
    }

    const rpcParams: Record<string, unknown> = {
        query_embedding: queryEmbedding,
        match_threshold: options.threshold,
        match_count: options.count,
        p_user_id: userId,
        // Tüm geçmiş aranır; güncellik (recency) ağırlığı artık match_memories
        // içinde SQL tarafında uygulanıyor (bkz. migration 20260617000000/...0001).
        start_date: new Date("1970-01-01").toISOString(),
    };
    if (sentimentEmbedding) {
        rpcParams.query_sentiment_embedding = sentimentEmbedding;
        if (typeof options.sentimentWeight === "number") {
            rpcParams.sentiment_weight = options.sentimentWeight;
        }
    }

    const { data: matches, error } = await dependencies.supabaseClient.rpc(
        "match_memories",
        rpcParams,
    );

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
