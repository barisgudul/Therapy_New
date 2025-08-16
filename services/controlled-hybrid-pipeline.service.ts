// services/controlled-hybrid-pipeline.service.ts

import { AI_MODELS } from "../constants/AIConfig";
import { InteractionContext } from "../types/context";
import { DiaryStart } from "../utils/schemas";
import * as AiService from "./ai.service";
import { invokeGemini } from "./ai.service";
import { BehavioralPatternAnalyzer } from "./behavioral-pattern-analyzer.service";
import * as EventService from "./event.service";
import * as JourneyService from "./journey.service";
import { StrategicQueryRouter } from "./strategic-query-router.service";
import {
    SystemHealthMonitor,
    SystemHealthStatus,
} from "./system-health-monitor.service";
import * as VaultService from "./vault.service";

// Sonuç tipleri (adım bazlı)
type GatherUserDataResult = {
    vault: unknown;
    event_type: string;
    event_data: unknown;
    timestamp: string;
};
type AnalyzePatternsResult = {
    patterns_found: number;
    confidence: number;
    key_patterns: unknown[];
    trends: unknown;
};
type GenerateInsightsResult = { generated_insights: string };
type ValidateFindingsResult = {
    validation_score: number;
    data_completeness: boolean;
    recommended_confidence: number;
};
type SelectTherapistPersonaResult = {
    selected_persona: string;
    method: string;
};
type TherapyResponseResult = {
    therapy_response: string;
    persona_used: string;
    timestamp: string;
    error?: boolean;
};
type UpdateJourneyLogResult = {
    journey_updated: boolean;
    log_entry?: string;
    timestamp?: string;
    error?: boolean;
};
type ExtractDreamContentResult = {
    dream_content: string;
    content_length: number;
    has_content: boolean;
    timestamp: string;
};
type AnalyzeDreamPatternsResult = {
    status: string;
    dream_analysis?: string;
    themes_extracted?: boolean;
    patterns_found?: boolean;
    message?: string;
};
type DreamInsightsResult = {
    insights: string;
    status: string;
    timestamp?: string;
};
type AnalyzeDiaryContextResult = {
    diary_content: string;
    content_length: number;
    has_content: boolean;
    timestamp: string;
};
type DiaryStartResult = {
    status: string;
    diary_response?: string;
    message?: string;
    timestamp?: string;
};
type MoodDataResult = {
    current_mood: string;
    has_mood: boolean;
    timestamp: string;
};
type ReflectionResponseResult = {
    status: string;
    reflection_response?: string;
    mood_used?: string;
    timestamp?: string;
    message?: string;
};
type UpdateMoodHistoryResult = {
    mood_updated: boolean;
    new_mood?: string;
    history_length?: number;
    timestamp?: string;
    error?: boolean;
    reason?: string;
};
type CollectBehavioralDataResult = unknown;
type RunPatternAnalysisResult = {
    status: string;
    dominant_patterns?: unknown[];
    trend_analysis?: unknown;
    confidence?: number;
    message?: string;
};
type SynthesizePatternsResult = { synthesis: string };
type GatherContextResult = {
    user_query: string;
    user_vault: unknown;
    event_context: unknown;
    timestamp: string;
};
type SynthesizeInsightsResult = { synthesized_insights: string };

type PipelineResults = Partial<{
    gather_user_data: GatherUserDataResult;
    analyze_patterns: AnalyzePatternsResult;
    generate_insights: GenerateInsightsResult;
    validate_findings: ValidateFindingsResult;
    select_therapist_persona: SelectTherapistPersonaResult;
    generate_therapy_response: TherapyResponseResult;
    update_journey_log: UpdateJourneyLogResult;
    extract_dream_content: ExtractDreamContentResult;
    analyze_dream_patterns: AnalyzeDreamPatternsResult;
    generate_dream_insights: DreamInsightsResult;
    analyze_diary_context: AnalyzeDiaryContextResult;
    generate_diary_start: DiaryStartResult;
    gather_mood_data: MoodDataResult;
    generate_reflection_response: ReflectionResponseResult;
    update_mood_history: UpdateMoodHistoryResult;
    collect_behavioral_data: CollectBehavioralDataResult;
    run_pattern_analysis: RunPatternAnalysisResult;
    synthesize_patterns: SynthesizePatternsResult;
    gather_context: GatherContextResult;
    synthesize_insights: SynthesizeInsightsResult;
}>;

export interface PipelineStep {
    step_id: string;
    step_name: string;
    step_type:
        | "data_gather"
        | "analysis"
        | "synthesis"
        | "validation"
        | "therapy"
        | "dream_analysis"
        | "diary"
        | "reflection";
    max_duration_ms: number;
    max_cost_estimate: number;
    required_health_score: number;
    fallback_strategy: "skip" | "simplify" | "abort";
}

export interface PipelineExecution {
    pipeline_id: string;
    execution_id: string;
    user_id: string;
    query: string;
    steps_completed: string[];
    steps_failed: string[];
    total_duration_ms: number;
    total_cost_estimate: number;
    final_result: string;
    confidence_score: number;
    execution_status: "success" | "partial_success" | "failed";
    started_at: string;
    completed_at: string;
}

export class ControlledHybridPipeline {
    /**
     * 🎯 TEK BEYİN - KARMAŞIK SORGULAR İÇİN KONTROLLÜ PİPELİNE
     *
     * Bu fonksiyon, karmaşık sorguları güvenli, kontrollü adımlarla işler.
     * Her adım önceden tanımlanmış, sınırları belli, hata toleransı yüksek.
     * Eski eventHandlers mantığı burada pipeline adımları olarak çalışır.
     */
    static async executeComplexQuery(
        context: InteractionContext,
        pipelineType:
            | "deep_analysis"
            | "pattern_discovery"
            | "insight_synthesis"
            | "therapy_session"
            | "dream_analysis"
            | "diary_management"
            | "daily_reflection",
    ): Promise<string | DiaryStart | { success: boolean; message: string }> {
        const executionId = this.generateExecutionId();

        console.log(
            `[TEK_BEYİN] 🚀 Pipeline başlıyor: ${pipelineType}`,
        );
        console.log(`[TEK_BEYİN] 🆔 Execution ID: ${executionId}`);

        const startTime = Date.now();
        let totalCost = 0;
        const maxCostLimit = 2.0; // $2 limit

        try {
            // 1. SİSTEM SAĞLIK KONTROLÜ
            const systemHealth = await SystemHealthMonitor
                .evaluateSystemHealth();

            if (systemHealth.health_score < 60) {
                console.log(
                    `[TEK_BEYİN] ⚠️ Sistem sağlığı düşük (${systemHealth.health_score}), basit pipeline'a geçiliyor`,
                );
                return await StrategicQueryRouter.handleSimpleQuery(context);
            }

            // 2. PİPELİNE PLANI BELİRLE
            const pipeline = this.createPipeline(pipelineType, systemHealth);

            console.log(
                `[TEK_BEYİN] 📋 Pipeline planı: ${pipeline.length} adım`,
            );

            // 3. KONTROLLÜ ADIM ADIM İŞLEME
            const results: PipelineResults = {};
            const completedSteps: string[] = [];
            const failedSteps: string[] = [];

            for (const step of pipeline) {
                console.log(
                    `[TEK_BEYİN] 🔄 Adım başlıyor: ${step.step_name}`,
                );

                // Maliyet kontrolü
                if (totalCost > maxCostLimit) {
                    console.log(
                        `[TEK_BEYİN] 💰 Maliyet limiti aşıldı ($${totalCost}), pipeline durduruluyor`,
                    );
                    break;
                }

                // Sistem sağlık kontrolü (her adımda)
                const currentHealth = await SystemHealthMonitor
                    .evaluateSystemHealth();
                if (currentHealth.health_score < step.required_health_score) {
                    console.log(
                        `[TEK_BEYİN] ⚠️ Adım için yetersiz sistem sağlığı, ${step.fallback_strategy} stratejisi uygulanıyor`,
                    );

                    if (step.fallback_strategy === "abort") {
                        break;
                    } else if (step.fallback_strategy === "skip") {
                        continue;
                    }
                    // "simplify" durumunda adımı basitleştirerek devam ederiz
                }

                try {
                    const stepStartTime = Date.now();
                    const stepResult = await this.executeStep(
                        step,
                        context,
                        results,
                    );
                    const stepDuration = Date.now() - stepStartTime;

                    // Süre kontrolü
                    if (stepDuration > step.max_duration_ms) {
                        console.log(
                            `[TEK_BEYİN] ⏰ Adım süre limiti aşıldı (${stepDuration}ms > ${step.max_duration_ms}ms)`,
                        );
                    }

                    results[step.step_id] = stepResult;
                    completedSteps.push(step.step_id);
                    totalCost += step.max_cost_estimate;

                    console.log(
                        `[TEK_BEYİN] ✅ Adım tamamlandı: ${step.step_name} (${stepDuration}ms)`,
                    );
                } catch (stepError) {
                    console.error(
                        `[TEK_BEYİN] ❌ Adım hatası: ${step.step_name}`,
                        stepError,
                    );
                    failedSteps.push(step.step_id);

                    // Hata durumunda fallback stratejisi
                    if (step.fallback_strategy === "abort") {
                        console.log(
                            `[TEK_BEYİN] 🛑 Kritik adım başarısız, pipeline durduruluyor`,
                        );
                        break;
                    }
                    // "skip" veya "simplify" durumunda devam ederiz
                }
            }

            // 4. SONUÇLARI SENTEZLEŞTİR
            const finalResult = await this.synthesizeResults(
                results,
                context,
                pipelineType,
            );
            const totalDuration = Date.now() - startTime;

            // 5. EXECUTION LOG KAYDET
            const execution: PipelineExecution = {
                pipeline_id: pipelineType,
                execution_id: executionId,
                user_id: context.userId,
                query: this.extractQueryFromContext(context),
                steps_completed: completedSteps,
                steps_failed: failedSteps,
                total_duration_ms: totalDuration,
                total_cost_estimate: totalCost,
                final_result: typeof finalResult === "string"
                    ? finalResult
                    : JSON.stringify(finalResult),
                confidence_score: this.calculateConfidence(
                    completedSteps,
                    failedSteps,
                ),
                execution_status: failedSteps.length === 0
                    ? "success"
                    : completedSteps.length > 0
                    ? "partial_success"
                    : "failed",
                started_at: new Date(startTime).toISOString(),
                completed_at: new Date().toISOString(),
            };

            console.log(
                `[TEK_BEYİN] 🎯 Pipeline tamamlandı: ${execution.execution_status}`,
            );
            console.log(
                `[TEK_BEYİN] 📊 ${completedSteps.length} başarılı, ${failedSteps.length} başarısız adım`,
            );
            console.log(
                `[TEK_BEYİN] 💰 Toplam maliyet: $${totalCost.toFixed(2)}`,
            );
            console.log(`[TEK_BEYİN] ⏱️ Toplam süre: ${totalDuration}ms`);

            return finalResult;
        } catch (error) {
            console.error(
                `[TEK_BEYİN] ❌ Pipeline kritik hatası:`,
                error,
            );

            // Kritik hata durumunda güvenli fallback
            console.log(`[TEK_BEYİN] 🛡️ Güvenli fallback'e geçiliyor`);
            return await StrategicQueryRouter.handleSimpleQuery(context);
        }
    }

    /**
     * 🏗️ PİPELİNE PLANI OLUŞTUR - ESKİ EVENTHANDLERS MANTIĞI ENTEGRE EDİLDİ
     */
    private static createPipeline(
        type:
            | "deep_analysis"
            | "pattern_discovery"
            | "insight_synthesis"
            | "therapy_session"
            | "dream_analysis"
            | "diary_management"
            | "daily_reflection",
        systemHealth: SystemHealthStatus,
    ): PipelineStep[] {
        const baseHealthRequirement = Math.max(
            60,
            systemHealth.health_score - 10,
        );

        switch (type) {
            case "deep_analysis":
                return [
                    {
                        step_id: "gather_user_data",
                        step_name: "Kullanıcı Verilerini Topla",
                        step_type: "data_gather",
                        max_duration_ms: 5000,
                        max_cost_estimate: 0.10,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "analyze_patterns",
                        step_name: "Davranış Kalıplarını Analiz Et",
                        step_type: "analysis",
                        max_duration_ms: 10000,
                        max_cost_estimate: 0.30,
                        required_health_score: baseHealthRequirement + 5,
                        fallback_strategy: "skip",
                    },
                    {
                        step_id: "generate_insights",
                        step_name: "İçgörüler Üret",
                        step_type: "synthesis",
                        max_duration_ms: 8000,
                        max_cost_estimate: 0.25,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "validate_findings",
                        step_name: "Bulguları Doğrula",
                        step_type: "validation",
                        max_duration_ms: 3000,
                        max_cost_estimate: 0.15,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "skip",
                    },
                ];

            case "therapy_session":
                return [
                    {
                        step_id: "select_therapist_persona",
                        step_name: "Terapist Kişiliği Seç",
                        step_type: "therapy",
                        max_duration_ms: 3000,
                        max_cost_estimate: 0.05,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "generate_therapy_response",
                        step_name: "Terapi Yanıtı Üret",
                        step_type: "therapy",
                        max_duration_ms: 15000,
                        max_cost_estimate: 0.50,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "abort",
                    },
                    {
                        step_id: "update_journey_log",
                        step_name: "Seyir Defterini Güncelle",
                        step_type: "data_gather",
                        max_duration_ms: 2000,
                        max_cost_estimate: 0.05,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "skip",
                    },
                ];

            case "dream_analysis":
                return [
                    {
                        step_id: "extract_dream_content",
                        step_name: "Rüya İçeriğini Çıkar",
                        step_type: "dream_analysis",
                        max_duration_ms: 5000,
                        max_cost_estimate: 0.15,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "analyze_dream_patterns",
                        step_name: "Rüya Kalıplarını Analiz Et",
                        step_type: "dream_analysis",
                        max_duration_ms: 12000,
                        max_cost_estimate: 0.40,
                        required_health_score: baseHealthRequirement + 10,
                        fallback_strategy: "abort",
                    },
                    {
                        step_id: "generate_dream_insights",
                        step_name: "Rüya İçgörüleri Üret",
                        step_type: "synthesis",
                        max_duration_ms: 8000,
                        max_cost_estimate: 0.25,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                ];

            case "diary_management":
                return [
                    {
                        step_id: "analyze_diary_context",
                        step_name: "Günlük Bağlamını Analiz Et",
                        step_type: "diary",
                        max_duration_ms: 6000,
                        max_cost_estimate: 0.20,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "generate_diary_start",
                        step_name: "Günlük Başlangıcı Üret",
                        step_type: "diary",
                        max_duration_ms: 10000,
                        max_cost_estimate: 0.30,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "abort",
                    },
                ];

            case "daily_reflection":
                return [
                    {
                        step_id: "gather_mood_data",
                        step_name: "Mood Verilerini Topla",
                        step_type: "reflection",
                        max_duration_ms: 3000,
                        max_cost_estimate: 0.08,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "generate_reflection_response",
                        step_name: "Yansıma Yanıtı Üret",
                        step_type: "reflection",
                        max_duration_ms: 12000,
                        max_cost_estimate: 0.35,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "abort",
                    },
                    {
                        step_id: "update_mood_history",
                        step_name: "Mood Geçmişini Güncelle",
                        step_type: "data_gather",
                        max_duration_ms: 2000,
                        max_cost_estimate: 0.05,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "skip",
                    },
                ];

            case "pattern_discovery":
                return [
                    {
                        step_id: "collect_behavioral_data",
                        step_name: "Davranışsal Veri Topla",
                        step_type: "data_gather",
                        max_duration_ms: 7000,
                        max_cost_estimate: 0.15,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "run_pattern_analysis",
                        step_name: "Kalıp Analizi Çalıştır",
                        step_type: "analysis",
                        max_duration_ms: 12000,
                        max_cost_estimate: 0.40,
                        required_health_score: baseHealthRequirement + 10,
                        fallback_strategy: "abort",
                    },
                    {
                        step_id: "synthesize_patterns",
                        step_name: "Kalıpları Sentezle",
                        step_type: "synthesis",
                        max_duration_ms: 6000,
                        max_cost_estimate: 0.20,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                ];

            case "insight_synthesis":
                return [
                    {
                        step_id: "gather_context",
                        step_name: "Bağlam Topla",
                        step_type: "data_gather",
                        max_duration_ms: 4000,
                        max_cost_estimate: 0.08,
                        required_health_score: baseHealthRequirement,
                        fallback_strategy: "simplify",
                    },
                    {
                        step_id: "synthesize_insights",
                        step_name: "İçgörüleri Sentezle",
                        step_type: "synthesis",
                        max_duration_ms: 10000,
                        max_cost_estimate: 0.35,
                        required_health_score: baseHealthRequirement + 5,
                        fallback_strategy: "simplify",
                    },
                ];

            default:
                return [];
        }
    }

    /**
     * 🔧 TEK ADIM İŞLEME - ESKİ EVENTHANDLERS MANTIĞI ENTEGRE EDİLDİ
     */
    private static async executeStep(
        step: PipelineStep,
        context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<unknown> {
        switch (step.step_id) {
            // Genel analiz adımları
            case "gather_user_data":
                return await this.gatherUserData(context);

            case "analyze_patterns":
                return await this.analyzePatterns(context, previousResults);

            case "generate_insights":
                return await this.generateInsights(context, previousResults);

            case "validate_findings":
                return await this.validateFindings(previousResults);

            // Terapi seansı adımları
            case "select_therapist_persona":
                return await this.selectTherapistPersona(context);

            case "generate_therapy_response":
                return await this.generateTherapyResponse(
                    context,
                    previousResults,
                );

            case "update_journey_log":
                return await this.updateJourneyLog(context);

            // Rüya analizi adımları
            case "extract_dream_content":
                return await this.extractDreamContent(context);

            case "analyze_dream_patterns":
                return await this.analyzeDreamPatterns(
                    context,
                    previousResults,
                );

            case "generate_dream_insights":
                return await this.generateDreamInsights(
                    context,
                    previousResults,
                );

            // Günlük yönetimi adımları
            case "analyze_diary_context":
                return await this.analyzeDiaryContext(context);

            case "generate_diary_start":
                return await this.generateDiaryStart(context, previousResults);

            // Günlük yansıma adımları
            case "gather_mood_data":
                return await this.gatherMoodData(context);

            case "generate_reflection_response":
                return await this.generateReflectionResponse(
                    context,
                    previousResults,
                );

            case "update_mood_history":
                return await this.updateMoodHistory(context, previousResults);

            // Kalıp keşfi adımları
            case "collect_behavioral_data":
                return await this.collectBehavioralData(context);

            case "run_pattern_analysis":
                return await this.runPatternAnalysis(context, previousResults);

            case "synthesize_patterns":
                return await this.synthesizePatterns(previousResults);

            // İçgörü sentezi adımları
            case "gather_context":
                return await this.gatherContext(context);

            case "synthesize_insights":
                return await this.synthesizeInsights(context, previousResults);

            default:
                throw new Error(`Bilinmeyen adım: ${step.step_id}`);
        }
    }

    /**
     * 📊 KULLANICI VERİSİ TOPLAMA
     */
    private static gatherUserData(
        context: InteractionContext,
    ): Promise<GatherUserDataResult> {
        return Promise.resolve({
            vault: context.initialVault,
            event_type: context.initialEvent.type,
            event_data: context.initialEvent.data,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 🔍 KALIP ANALİZİ
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static analyzePatterns(
        context: InteractionContext,
        _previousResults: PipelineResults,
    ): Promise<AnalyzePatternsResult> {
        return BehavioralPatternAnalyzer.analyzePatterns(
            context.userId,
            30,
        ).then((analysis) => ({
            patterns_found: analysis.total_patterns_found,
            confidence: analysis.analysis_confidence,
            key_patterns: analysis.patterns.slice(0, 3), // Top 3 pattern
            trends: analysis.overall_trends,
        }));
    }

    /**
     * 💡 İÇGÖRÜ ÜRETİMİ
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static generateInsights(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<GenerateInsightsResult> {
        const _prompt = `
Kullanıcı verilerini analiz et ve içgörüler üret:

### KULLANICI VERİSİ ###
${JSON.stringify(previousResults.gather_user_data || {}, null, 2)}

### KALIP ANALİZİ ###
${JSON.stringify(previousResults.analyze_patterns || {}, null, 2)}

### GÖREV ###
Bu verilerden 3 ana içgörü çıkar. Her içgörü:
1. Gözlemlenen veri
2. Olası anlam
3. Yapıcı öneri

Maksimum 200 kelime, destekleyici ton.
    `.trim();

        // TODO: invokeGemini çağrısı eklenecek
        return Promise.resolve({
            generated_insights: "İçgörü üretimi için AI çağrısı gerekli",
        });
    }

    /**
     * ✅ BULGULARI DOĞRULAMA
     */
    /**
     * ✅ BULGULARI DOĞRULAMA
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static validateFindings(
        previousResults: PipelineResults,
    ): Promise<ValidateFindingsResult> {
        // Basit doğrulama mantığı
        const hasUserData = !!previousResults.gather_user_data;
        const hasPatterns =
            (previousResults.analyze_patterns?.patterns_found ?? 0) > 0;
        const hasInsights = Boolean(
            previousResults.generate_insights
                ?.generated_insights,
        );

        return Promise.resolve({
            validation_score: (hasUserData ? 0.3 : 0) +
                (hasPatterns ? 0.4 : 0) + (hasInsights ? 0.3 : 0),
            data_completeness: hasUserData && hasPatterns && hasInsights,
            recommended_confidence: hasUserData && hasPatterns && hasInsights
                ? 0.8
                : 0.5,
        });
    }

    // === TERAPİ SEANSI ADIMLARI ===

    /**
     * 🧠 TERAPİST KİŞİLİĞİ SEÇİMİ
     */
    private static selectTherapistPersona(
        context: InteractionContext,
    ): Promise<SelectTherapistPersonaResult> {
        const { initialEvent, initialVault } = context;
        const eventData = initialEvent
            .data as EventService.TextSessionEventData;

        // ÖNCELİK 1: Eğer event ile doğrudan bir kişilik gönderildiyse, onu kullan!
        if (eventData.therapistPersona) {
            console.log(
                `[TEK_BEYİN] Doğrudan kişilik kullanılıyor: ${eventData.therapistPersona}`,
            );
            return Promise.resolve({
                selected_persona: eventData.therapistPersona,
                method: "direct",
            });
        }

        // --- Fallback (Eğer persona gönderilmediyse, özelliklere göre adaptif seçim yap) ---
        const { traits } = initialVault;

        // Kaygı seviyesi yüksekse 'sakinleştirici' yaklaşım
        const anxiety = Number(traits?.anxiety_level);
        if (!Number.isNaN(anxiety) && anxiety > 0.7) {
            console.log(
                `[TEK_BEYİN] Yüksek kaygı tespit edildi (${
                    (anxiety * 100).toFixed(0)
                }%). 'calm' kişiliği seçiliyor.`,
            );
            return Promise.resolve({
                selected_persona: "calm",
                method: "anxiety_based",
            });
        }

        // Motivasyon düşükse 'motivasyonel' yaklaşım
        const motivation = Number(traits?.motivation);
        if (!Number.isNaN(motivation) && motivation < 0.4) {
            console.log(
                `[TEK_BEYİN] Düşük motivasyon tespit edildi (${
                    (motivation * 100).toFixed(0)
                }%). 'motivational' kişiliği seçiliyor.`,
            );
            return Promise.resolve({
                selected_persona: "motivational",
                method: "motivation_based",
            });
        }

        // Açıklık yüksekse 'analitik' yaklaşım
        const openness = Number(traits?.openness);
        if (!Number.isNaN(openness) && openness > 0.7) {
            console.log(
                `[TEK_BEYİN] Yüksek açıklık tespit edildi (${
                    (openness * 100).toFixed(0)
                }%). 'analytical' kişiliği seçiliyor.`,
            );
            return Promise.resolve({
                selected_persona: "analytical",
                method: "openness_based",
            });
        }

        // Hiçbir koşul karşılanmazsa 'varsayılan' yaklaşım
        console.log(
            `[TEK_BEYİN] Standart ('default') terapist kişiliği seçiliyor.`,
        );
        return Promise.resolve({
            selected_persona: "default",
            method: "fallback",
        });
    }

    /**
     * 💬 TERAPİ YANITI ÜRETİMİ
     */
    private static generateTherapyResponse(
        context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<TherapyResponseResult> {
        const selectedPersona =
            previousResults.select_therapist_persona?.selected_persona ||
            "default";

        return AiService.generateAdaptiveTherapistReply(
            context,
            selectedPersona,
        ).then((response) => ({
            therapy_response: response,
            persona_used: selectedPersona,
            timestamp: new Date().toISOString(),
        })).catch((error) => {
            console.error("[TEK_BEYİN] Terapi yanıtı üretiminde hata:", error);
            return {
                therapy_response:
                    "Şu anda size yardımcı olamıyorum. Lütfen daha sonra tekrar deneyin.",
                persona_used: selectedPersona,
                timestamp: new Date().toISOString(),
                error: true,
            };
        });
    }

    /**
     * 📝 SEYİR DEFTERİ GÜNCELLEME
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static updateJourneyLog(
        context: InteractionContext,
    ): Promise<UpdateJourneyLogResult> {
        const logEntry =
            `Terapi seansı tamamlandı: ${context.initialEvent.type}`;

        return JourneyService.addJourneyLogEntry(logEntry).then(() => ({
            journey_updated: true,
            log_entry: logEntry,
            timestamp: new Date().toISOString(),
        })).catch((error) => {
            console.error(
                "[TEK_BEYİN] Seyir defteri güncellemesinde hata:",
                error,
            );
            return {
                journey_updated: false,
                error: true,
            };
        });
    }

    // === RÜYA ANALİZİ ADIMLARI ===

    /**
     * 🌙 RÜYA İÇERİĞİNİ ÇIKARMA
     */
    private static extractDreamContent(
        context: InteractionContext,
    ): Promise<ExtractDreamContentResult> {
        const eventData = context.initialEvent.data as {
            dreamText?: string;
            content?: string;
        };
        const dreamText = eventData.dreamText || eventData.content || "";

        return Promise.resolve({
            dream_content: dreamText,
            content_length: dreamText.length,
            has_content: dreamText.length > 0,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 🔍 RÜYA KALIPLARINI ANALİZ ETME
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static analyzeDreamPatterns(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<AnalyzeDreamPatternsResult> {
        const dreamContent = previousResults.extract_dream_content
            ?.dream_content;

        if (!dreamContent || dreamContent.length === 0) {
            return Promise.resolve({
                status: "no_content",
                message: "Rüya içeriği bulunamadı",
            });
        }

        // TODO: invokeGemini çağrısı eklenecek
        return Promise.resolve({
            status: "success",
            dream_analysis: "Rüya analizi için AI çağrısı gerekli",
            themes_extracted: true,
            patterns_found: true,
        });
    }

    /**
     * 💡 RÜYA İÇGÖRÜLERİ ÜRETİMİ
     */
    private static async generateDreamInsights(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<DreamInsightsResult> {
        const dreamAnalysis = previousResults.analyze_dream_patterns;

        if (dreamAnalysis.status !== "success") {
            return {
                insights: "Rüya analizi için yeterli veri bulunamadı.",
                status: "insufficient_data",
            };
        }

        try {
            const prompt = `
Rüya analizinden içgörüler üret:

### RÜYA ANALİZİ ###
${dreamAnalysis.dream_analysis}

### GÖREV ###
Bu analizden 3 ana içgörü çıkar:
1. Ana tema ve anlam
2. Duygusal durum
3. Yapıcı öneriler

Destekleyici, umut verici ton. Maksimum 250 kelime.
            `.trim();

            const insights = await invokeGemini(prompt, AI_MODELS.FAST, {
                temperature: 0.8,
                maxOutputTokens: 300,
            });

            return {
                insights: insights,
                status: "success",
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                "[TEK_BEYİN] Rüya içgörüleri üretiminde hata:",
                error,
            );
            return {
                insights: "Rüya içgörüleri üretilemedi.",
                status: "error",
            };
        }
    }

    // === GÜNLÜK YÖNETİMİ ADIMLARI ===

    /**
     * 📖 GÜNLÜK BAĞLAMINI ANALİZ ETME
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static analyzeDiaryContext(
        context: InteractionContext,
    ): Promise<AnalyzeDiaryContextResult> {
        const eventData = context.initialEvent.data as {
            todayNote?: string;
            content?: string;
        };
        const todayNote = eventData.todayNote || eventData.content || "";

        return Promise.resolve({
            diary_content: todayNote,
            content_length: todayNote.length,
            has_content: todayNote.length > 0,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * ✍️ GÜNLÜK BAŞLANGICI ÜRETİMİ
     */
    private static async generateDiaryStart(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<DiaryStartResult> {
        const diaryContext = previousResults.analyze_diary_context;

        if (!diaryContext.has_content) {
            return {
                status: "no_content",
                message: "Günlük içeriği bulunamadı",
            };
        }

        try {
            const prompt = `
Günlük başlangıcı için yanıt üret:

### GÜNLÜK İÇERİĞİ ###
${diaryContext.diary_content}

### GÖREV ###
Bu içerikten yola çıkarak günlük yazımına devam etmek için
destekleyici, yapıcı ve umut verici bir yanıt oluştur.

Maksimum 200 kelime.
            `.trim();

            const response = await invokeGemini(prompt, AI_MODELS.FAST, {
                temperature: 0.7,
                maxOutputTokens: 250,
            });

            return {
                status: "success",
                diary_response: response,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                "[TEK_BEYİN] Günlük başlangıcı üretiminde hata:",
                error,
            );
            return {
                status: "error",
                message: "Günlük başlangıcı üretilemedi",
            };
        }
    }

    // === GÜNLÜK YANSIMA ADIMLARI ===

    /**
     * 😊 MOOD VERİLERİNİ TOPLAMA
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static gatherMoodData(
        context: InteractionContext,
    ): Promise<MoodDataResult> {
        const eventData = context.initialEvent.data as { todayMood?: string };
        const todayMood = eventData.todayMood || "belirsiz";

        return Promise.resolve({
            current_mood: todayMood,
            has_mood: todayMood !== "belirsiz",
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 💭 YANSIMA YANITI ÜRETİMİ
     */
    private static async generateReflectionResponse(
        context: InteractionContext,
        _previousResults: PipelineResults,
    ): Promise<ReflectionResponseResult> {
        const moodData = _previousResults.gather_mood_data;

        try {
            const response = await AiService.generateDailyReflectionResponse(
                context,
            );

            return {
                status: "success",
                reflection_response: response,
                mood_used: moodData.current_mood,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error("[TEK_BEYİN] Yansıma yanıtı üretiminde hata:", error);
            return {
                status: "error",
                message: "Yansıma yanıtı üretilemedi",
            };
        }
    }

    /**
     * 📊 MOOD GEÇMİŞİNİ GÜNCELLEME
     */
    private static async updateMoodHistory(
        context: InteractionContext,
        _previousResults: PipelineResults,
    ): Promise<UpdateMoodHistoryResult> {
        const moodData = _previousResults.gather_mood_data;

        if (!moodData.has_mood) {
            return {
                mood_updated: false,
                reason: "Mood verisi bulunamadı",
            };
        }

        try {
            const currentVault = context.initialVault;
            const moodHistory = (currentVault.moodHistory ?? []) as {
                mood: string;
                timestamp: string;
            }[];

            // Yeni mood entry'si
            const moodEntry = {
                mood: moodData.current_mood,
                timestamp: new Date().toISOString(),
            };

            const updatedVault = {
                ...currentVault,
                moodHistory: [...moodHistory, moodEntry],
            };

            await VaultService.updateUserVault(updatedVault);

            return {
                mood_updated: true,
                new_mood: moodData.current_mood,
                history_length: moodHistory.length + 1,
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error(
                "[TEK_BEYİN] Mood geçmişi güncellemesinde hata:",
                error,
            );
            return {
                mood_updated: false,
                error: true,
            };
        }
    }

    // === KALIP KEŞFİ ADIMLARI ===

    /**
     * 📊 DAVRANIŞSAL VERİ TOPLAMA
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static collectBehavioralData(
        context: InteractionContext,
    ): Promise<CollectBehavioralDataResult> {
        return BehavioralPatternAnalyzer.analyzePatterns(
            context.userId,
            14,
        ); // 2 haftalık
    }

    /**
     * 🔍 KALIP ANALİZİ ÇALIŞTIRMA
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static runPatternAnalysis(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<RunPatternAnalysisResult> {
        const behavioralData = previousResults.collect_behavioral_data as {
            total_patterns_found?: number;
            patterns?: unknown[];
            overall_trends?: unknown;
            analysis_confidence?: number;
        } | undefined;

        if (!behavioralData || behavioralData.total_patterns_found === 0) {
            return Promise.resolve({
                status: "insufficient_data",
                message: "Yeterli veri bulunamadı",
            });
        }

        return Promise.resolve({
            status: "success",
            dominant_patterns: behavioralData.patterns.slice(0, 5),
            trend_analysis: behavioralData.overall_trends,
            confidence: behavioralData.analysis_confidence,
        });
    }

    /**
     * 🎯 KALIPLARI SENTEZLEME
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static synthesizePatterns(
        previousResults: PipelineResults,
    ): Promise<SynthesizePatternsResult> {
        const patternAnalysis = previousResults.run_pattern_analysis as {
            status?: string;
        } & Record<string, unknown>;

        if (patternAnalysis.status !== "success") {
            return Promise.resolve({
                synthesis: "Kalıp sentezi için yeterli veri bulunamadı.",
            });
        }

        // TODO: invokeGemini çağrısı eklenecek
        return Promise.resolve({
            synthesis: "Kalıp sentezi için AI çağrısı gerekli",
        });
    }

    // === İÇGÖRÜ SENTEZİ ADIMLARI ===

    /**
     * 📋 BAĞLAM TOPLAMA
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static gatherContext(
        context: InteractionContext,
    ): Promise<GatherContextResult> {
        return Promise.resolve({
            user_query: this.extractQueryFromContext(context),
            user_vault: context.initialVault,
            event_context: context.initialEvent,
            timestamp: new Date().toISOString(),
        });
    }

    /**
     * 🎯 İÇGÖRÜLERİ SENTEZLEME
     * DÜZELTME: await yok, async DEĞİL.
     */
    private static synthesizeInsights(
        _context: InteractionContext,
        previousResults: PipelineResults,
    ): Promise<SynthesizeInsightsResult> {
        const contextData = previousResults.gather_context as unknown;

        const _prompt = `
Kullanıcı bağlamını analiz et ve içgörüler üret:

### BAĞLAM ###
${JSON.stringify(contextData, null, 2)}

### GÖREV ###
Bu bağlamdan kişiselleştirilmiş, değerli içgörüler çıkar.
Destekleyici, yapıcı, umut verici ol. Maksimum 250 kelime.
    `.trim();

        // TODO: invokeGemini çağrısı eklenecek
        return Promise.resolve({
            synthesized_insights: "İçgörü sentezi için AI çağrısı gerekli",
        });
    }

    /**
     * 🎯 SONUÇLARI SENTEZLEŞTİRME
     */
    private static async synthesizeResults(
        results: PipelineResults,
        context: InteractionContext,
        pipelineType: string,
    ): Promise<string | DiaryStart | { success: boolean; message: string }> {
        let prompt = `
Pipeline sonuçlarını kullanıcıya anlamlı bir cevap haline getir:

### PIPELINE SONUÇLARI ###
${JSON.stringify(results, null, 2)}

### KULLANICI SORGUSU ###
${this.extractQueryFromContext(context)}

### GÖREV ###
Bu sonuçları kullanarak kullanıcıya değerli, kişiselleştirilmiş bir yanıt oluştur.
Destekleyici, empatik, umut verici ol. Maksimum 400 kelime.
    `.trim();

        if (pipelineType === "therapy_session") {
            prompt = `
Terapi yanıtını kullanıcıya anlamlı bir cevap haline getir:

### TERAPI YANITI ###
${JSON.stringify(results.generate_therapy_response || {}, null, 2)}

### GÖREV ###
Bu yanıtı kullanarak kullanıcıya empatik, yapıcı ve umut verici bir cevap oluştur.
Maksimum 300 kelime.
    `.trim();
        } else if (pipelineType === "dream_analysis") {
            prompt = `
Rüya analizi sonucunu kullanıcıya anlamlı bir cevap haline getir:

### RÜYA ANALİZİ ###
${JSON.stringify(results.generate_dream_insights || {}, null, 2)}

### GÖREV ###
Bu analizi kullanarak kullanıcıya empatik, yapıcı ve umut verici bir cevap oluştur.
Maksimum 350 kelime.
    `.trim();
        } else if (pipelineType === "diary_management") {
            prompt = `
Günlük başlangıcı kullanıcıya anlamlı bir cevap haline getir:

### GÜNLÜK BAŞLANGIÇ ###
${JSON.stringify(results.generate_diary_start || {}, null, 2)}

### GÖREV ###
Bu başlangıcı kullanarak kullanıcıya empatik, yapıcı ve umut verici bir cevap oluştur.
Maksimum 200 kelime.
    `.trim();
        } else if (pipelineType === "daily_reflection") {
            prompt = `
Yansıma yanıtını kullanıcıya anlamlı bir cevap haline getir:

### YANSIMA YANITI ###
${JSON.stringify(results.generate_reflection_response || {}, null, 2)}

### GÖREV ###
Bu yanıtı kullanarak kullanıcıya empatik, yapıcı ve umut verici bir cevap oluştur.
Maksimum 300 kelime.
    `.trim();
        }

        try {
            return await invokeGemini(prompt, AI_MODELS.FAST, {
                temperature: 0.7,
                maxOutputTokens: 500,
            });
        } catch (error) {
            console.error("Result synthesis failed:", error);
            return "Analiziniz tamamlandı. Detaylar için sistem yöneticisine başvurun.";
        }
    }

    /**
     * 🎯 GÜVEN SKORU HESAPLAMA
     */
    private static calculateConfidence(
        completedSteps: string[],
        failedSteps: string[],
    ): number {
        const totalSteps = completedSteps.length + failedSteps.length;
        if (totalSteps === 0) return 0;

        return completedSteps.length / totalSteps;
    }

    /**
     * 🔍 CONTEXT'TEN SORGU ÇIKARMA
     */
    private static extractQueryFromContext(
        context: InteractionContext,
    ): string {
        const { type, data } = context.initialEvent;

        switch (type) {
            case "text_session":
                return String(data.userMessage ?? "Terapi seansı");
            case "dream_analysis":
                return String(data.dreamText ?? "Rüya analizi");
            case "ai_analysis":
                return `${String(data.days ?? "")} günlük AI analizi`;
            case "daily_reflection":
                return String(data.todayNote ?? "Günlük yansıma");
            default:
                return `${type} işlemi`;
        }
    }

    /**
     * 🆔 EXECUTION ID ÜRETİMİ
     */
    private static generateExecutionId(): string {
        return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 📊 PİPELİNE PERFORMANS METRİKLERİ
     */
    static getPerformanceMetrics(): {
        total_executions: number;
        success_rate: number;
        avg_duration_ms: number;
        avg_cost: number;
    } {
        // TODO: Gerçek metrikler için veritabanı entegrasyonu
        return {
            total_executions: 0,
            success_rate: 0,
            avg_duration_ms: 0,
            avg_cost: 0,
        };
    }
}
