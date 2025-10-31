// supabase/functions/_shared/services/dream.service.ts
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { DatabaseError, ValidationError } from "../errors.ts";
import * as AiService from "./ai.service.ts";
import * as DreamContext from "../contexts/dream.context.service.ts";
import * as DreamPrompts from "../prompts/dreamAnalysis.prompt.ts";
import * as RagService from "./rag.service.ts";
import { logRagInvocation } from "../utils/logging.service.ts";
import { safeParseJsonBlock } from "../utils/json.ts";
import { config, LLM_LIMITS } from "../config.ts";
import type { LoggingService } from "../types/context.ts";

// Zod şemaları
const DreamConnectionSchema = z.object({
    connection: z.string(),
    evidence: z.string(),
});

const DreamAnalysisResultSchema = z.object({
    title: z.string(),
    summary: z.string(),
    themes: z.array(z.string()),
    interpretation: z.string(),
    crossConnections: z.array(DreamConnectionSchema),
    questions: z.array(z.string()),
});

function calculateConnectionConfidence(
    analysis: z.infer<typeof DreamAnalysisResultSchema>,
    dossier: string,
): number {
    let score = 0.5;
    const connectionCount = analysis.crossConnections?.length || 0;
    score += connectionCount * 0.1;
    const keywordRegex = /\b(kaygı|hedef|başarı|ilişki|stres)\b/gi;
    const dossierKeywords = (dossier.match(keywordRegex) || []).length;
    const firstKeywordMatch = dossier.match(keywordRegex)?.[0] || null;
    if (
        dossierKeywords > 0 &&
        firstKeywordMatch &&
        analysis.interpretation.toLowerCase().includes(
            firstKeywordMatch.toLowerCase(),
        )
    ) {
        score += 0.15;
    }
    if (!analysis.themes.some((t) => t.toLowerCase().includes("belirsiz"))) {
        score += 0.1;
    }
    return Math.min(0.95, score);
}

export interface AnalyzeDreamParams {
    supabaseClient: SupabaseClient;
    userId: string;
    dreamText: string;
    transactionId: string;
    language?: string;
    logger?: LoggingService;
}

export interface AnalyzeDreamResult {
    eventId: string;
}

/**
 * Rüya analizi iş mantığını merkezileştirir.
 * Bu servis, hem dream-analysis-handler hem de orchestration.handlers.ts tarafından kullanılır.
 */
export async function analyzeDream(
    params: AnalyzeDreamParams,
): Promise<AnalyzeDreamResult> {
    const {
        supabaseClient,
        userId,
        dreamText,
        transactionId,
        language = "en",
        logger,
    } = params;

    // Validasyon
    if (
        !dreamText || typeof dreamText !== "string" ||
        dreamText.trim().length < 10
    ) {
        throw new ValidationError("Analiz için yetersiz rüya metni.");
    }

    logger?.info("DreamService", "İşlem başlıyor.");

    // 1. BAĞLAMI OLUŞTUR
    const { userDossier, ragContext } = await DreamContext
        .buildDreamAnalysisContext(
            {
                supabaseClient,
                aiService: AiService,
                ragService: RagService,
                logRagInvocation,
            },
            userId,
            dreamText,
            transactionId,
        );
    logger?.info("DreamService", "Bağlam oluşturuldu.");

    // 2. PROMPT'U OLUŞTUR
    const masterPrompt = DreamPrompts.generateDreamAnalysisPrompt({
        userDossier,
        ragContext,
        dreamText,
    }, language);

    // 3. AI'YI ÇAĞIR
    const rawResponse = await AiService.invokeGemini(
        supabaseClient,
        masterPrompt,
        config.AI_MODELS.ADVANCED,
        {
            responseMimeType: "application/json",
            maxOutputTokens: LLM_LIMITS.DREAM_ANALYSIS,
        },
        transactionId,
    );
    logger?.info("DreamService", "AI yanıtı alındı.");

    // 4. SONUCU DOĞRULA VE KAYDET
    const analysisData = safeParseJsonBlock<
        z.infer<typeof DreamAnalysisResultSchema>
    >(rawResponse);
    if (
        !analysisData ||
        !DreamAnalysisResultSchema.safeParse(analysisData).success
    ) {
        throw new ValidationError("Yapay zeka tutarsız bir analiz üretti.");
    }

    const { data: inserted, error: insertError } = await supabaseClient
        .from("events")
        .upsert({
            user_id: userId,
            transaction_id: transactionId, // Idempotent anahtar
            type: "dream_analysis",
            timestamp: new Date().toISOString(),
            data: {
                dreamText,
                analysis: analysisData,
                dialogue: [],
                language,
            },
        }, { onConflict: "user_id,transaction_id" })
        .select("id")
        .single();

    if (insertError) {
        throw new DatabaseError(
            `Event kaydedilemedi: ${insertError.message}`,
        );
    }

    const newEventId = inserted.id;

    // AI KARARINI LOGLA
    try {
        const confidence = calculateConnectionConfidence(
            analysisData,
            JSON.stringify(userDossier),
        );
        await supabaseClient.from("ai_decision_log").insert({
            user_id: userId,
            decision_context: `Rüya metni: "${dreamText.substring(0, 200)}..."`,
            decision_made:
                `Başlık: ${analysisData.title}. Özet: ${analysisData.summary}`,
            reasoning: JSON.stringify(analysisData.crossConnections),
            execution_result: { success: true, eventId: newEventId },
            confidence_level: confidence,
            decision_category: "dream_analysis",
            complexity_level: "complex",
        });
        logger?.info(
            "DreamService",
            `AI kararı başarıyla loglandı. Güven: ${
                (confidence * 100).toFixed(0)
            }%`,
        );
    } catch (logError) {
        logger?.error("DreamService", "AI karar loglama hatası", logError);
    }

    // HAFIZA KAYDI YAP
    const { error: pmError } = await supabaseClient.functions.invoke(
        "process-memory",
        {
            body: {
                source_event_id: newEventId,
                user_id: userId,
                content: dreamText,
                event_time: new Date().toISOString(),
                mood: null,
                event_type: "dream_analysis",
                transaction_id: transactionId,
            },
        },
    );

    if (pmError) {
        logger?.error("DreamService", "process-memory invoke hatası", pmError);
        // Akışı bozma; logla ve devam et.
    }

    logger?.info(
        "DreamService",
        `İşlem tamamlandı. Event ID: ${newEventId}`,
    );

    return { eventId: newEventId };
}
