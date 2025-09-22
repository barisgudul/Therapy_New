// supabase/functions/_shared/controlled-hybrid-pipeline.service.ts

import type { InteractionContext } from "./types/context.ts";
import { config, LLM_LIMITS } from "./config.ts";
import * as AiService from "./ai.service.ts";
import * as _VaultService from "./vault.service.ts";
import { supabase as _adminClient } from "./supabase-admin.ts";
import { deepMerge as _deepMerge } from "./utils/deepMerge.ts";

// AI analizi için basit LLM çağrısı
export async function executeDeepAnalysis(context: InteractionContext) {
  const prompt =
    `Kullanıcının son dönemdeki etkileşimleri için kısa bir analiz özeti üret.
Sadece JSON döndür: { "insight": "1-2 cümlelik içgörü" }`;

  const reply = await AiService.invokeGemini(
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

export class ControlledHybridPipeline {
  /**
   * 🧠 KARMAŞIK SORU İŞLEYİCİ
   */
  static executeComplexQuery(
    _context: InteractionContext,
    pipelineType: string,
  ): unknown {
    console.log(`[PIPELINE] 🎯 Pipeline başlatılıyor: ${pipelineType}`);

    try {
      // Diğer pipeline tipleri için yönlendirme / basit yanıt
      const responses: Record<string, string> = {
        "pattern_discovery": "Örüntü keşfi şu an geliştiriliyor.",
        "insight_synthesis": "İçgörü sentezi şu an geliştiriliyor.",
        "diary_management": "Günlük yönetimi şu an geliştiriliyor.",
        "daily_reflection": "Günlük yansıma şu an geliştiriliyor.",
      };

      return responses[pipelineType] || "Bu özellik şu an geliştiriliyor.";
    } catch (error) {
      console.error(`[PIPELINE] ❌ Pipeline hatası:`, error);
      throw new Error("Pipeline işlemi sırasında bir hata oluştu.");
    }
  }
}
