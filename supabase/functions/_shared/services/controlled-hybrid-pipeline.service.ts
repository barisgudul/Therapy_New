// supabase/functions/_shared/services/controlled-hybrid-pipeline.service.ts

import type { InteractionContext } from "../types/context.ts";
import { config, LLM_LIMITS } from "../config.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { invokeGemini } from "./ai.service.ts";

// AI analizi için basit LLM çağrısı
export async function executeDeepAnalysis(
    dependencies: {
        supabaseClient: SupabaseClient;
        aiService: { invokeGemini: typeof invokeGemini };
    },
    context: InteractionContext,
) {
    const prompt =
        `Kullanıcının son dönemdeki etkileşimleri için kısa bir analiz özeti üret.
Sadece JSON döndür: { "insight": "1-2 cümlelik içgörü" }`;

    const reply = await dependencies.aiService.invokeGemini(
        dependencies.supabaseClient,
        prompt,
        config.AI_MODELS.ADVANCED,
        {
            responseMimeType: "application/json",
            temperature: 0.5,
            maxOutputTokens: LLM_LIMITS.AI_ANALYSIS, // 🔒 1024 tavan
        },
        context.transactionId,
    );

    // Not: Kullanıcının talebiyle vault'a yedek yazım kaldırıldı.

    return reply;
}

// Not: Eski `ControlledHybridPipeline` sınıfı (kullanıcıya "şu an geliştiriliyor"
// placeholder'ı döndüren ölü kod) kaldırıldı. Production yolu orchestrator/index.ts
// içindeki eventHandlers'tır. ai_analysis intent'i doğrudan executeDeepAnalysis'a gider.
