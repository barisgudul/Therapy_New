// supabase/functions/_shared/controlled-hybrid-pipeline.service.ts

import { generateSimpleAnalysisReport } from "./orchestration.handlers.ts";
import type { InteractionContext } from "./types/context.ts";

export class ControlledHybridPipeline {
    /**
     * 🧠 KARMAŞIK SORU İŞLEYİCİ
     */
    static async executeComplexQuery(
        context: InteractionContext,
        pipelineType: string
    ): Promise<string> {
        console.log(`[PIPELINE] 🎯 Pipeline başlatılıyor: ${pipelineType}`);

        try {
            // AI analizi için basit pipeline
            if (pipelineType === "deep_analysis") {
                return await generateSimpleAnalysisReport(context);
            }

            // Diğer pipeline tipleri için basit yanıt
            const responses: Record<string, string> = {
                "pattern_discovery": "Örüntü keşfi şu an geliştiriliyor.",
                "insight_synthesis": "İçgörü sentezi şu an geliştiriliyor.",
                "therapy_session": "Terapi seansı şu an geliştiriliyor.",
                "dream_analysis": "Rüya analizi şu an geliştiriliyor.",
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
