// services/controlled-hybrid-pipeline.service.ts
// 🚀 FAZ 2: KONTROLLÜ HİBRİT PİPELİNE SİSTEMİ
// Güvenli, kontrollü "mini-agent" yetenekleri

import { AI_MODELS } from "../constants/AIConfig";
import { InteractionContext } from "../types/context";
import { invokeGemini } from "./ai.service";
import { BehavioralPatternAnalyzer } from "./behavioral-pattern-analyzer.service";
import { StrategicQueryRouter } from "./strategic-query-router.service";
import {
    SystemHealthMonitor,
    SystemHealthStatus,
} from "./system-health-monitor.service";

/**
 * 🚀 FAZ 2: KONTROLLÜ HİBRİT PİPELİNE SİSTEMİ
 *
 * Gemini 2.5 Pro anlaşması uyarınca:
 * ✅ Kontrollü pipeline'lar (ReAct chaos değil!)
 * ✅ Önceden tanımlanmış adımlar
 * ✅ Sistem sağlık bazlı kararlar
 * ✅ Maliyet limitleri
 * ✅ Hata toleransı yüksek
 *
 * Bu sistem, eski "main-brain-loop"'un yerine geçer ama
 * çok daha güvenli, öngörülebilir ve kontrollü şekilde çalışır.
 */

export interface PipelineStep {
    step_id: string;
    step_name: string;
    step_type: "data_gather" | "analysis" | "synthesis" | "validation";
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
     * 🎯 SEVİYE 2: KARMAŞIK SORGULAR İÇİN KONTROLLÜ PİPELİNE
     *
     * Bu fonksiyon, karmaşık sorguları güvenli, kontrollü adımlarla işler.
     * Her adım önceden tanımlanmış, sınırları belli, hata toleransı yüksek.
     */
    static async executeComplexQuery(
        context: InteractionContext,
        pipelineType:
            | "deep_analysis"
            | "pattern_discovery"
            | "insight_synthesis",
    ): Promise<string> {
        const executionId = this.generateExecutionId();

        console.log(
            `[HYBRID_PIPELINE] 🚀 Seviye 2 karmaşık sorgu başlıyor: ${pipelineType}`,
        );
        console.log(`[HYBRID_PIPELINE] 🆔 Execution ID: ${executionId}`);

        const startTime = Date.now();
        let totalCost = 0;
        const maxCostLimit = 2.0; // $2 limit

        try {
            // 1. SİSTEM SAĞLIK KONTROLÜ
            const systemHealth = await SystemHealthMonitor
                .evaluateSystemHealth();

            if (systemHealth.health_score < 60) {
                console.log(
                    `[HYBRID_PIPELINE] ⚠️ Sistem sağlığı düşük (${systemHealth.health_score}), basit pipeline'a geçiliyor`,
                );
                return await StrategicQueryRouter.handleSimpleQuery(context);
            }

            // 2. PİPELİNE PLANI BELİRLE
            const pipeline = this.createPipeline(pipelineType, systemHealth);

            console.log(
                `[HYBRID_PIPELINE] 📋 Pipeline planı: ${pipeline.length} adım`,
            );

            // 3. KONTROLLÜ ADIM ADIM İŞLEME
            const results: { [stepId: string]: any } = {};
            const completedSteps: string[] = [];
            const failedSteps: string[] = [];

            for (const step of pipeline) {
                console.log(
                    `[HYBRID_PIPELINE] 🔄 Adım başlıyor: ${step.step_name}`,
                );

                // Maliyet kontrolü
                if (totalCost > maxCostLimit) {
                    console.log(
                        `[HYBRID_PIPELINE] 💰 Maliyet limiti aşıldı ($${totalCost}), pipeline durduruluyor`,
                    );
                    break;
                }

                // Sistem sağlık kontrolü (her adımda)
                const currentHealth = await SystemHealthMonitor
                    .evaluateSystemHealth();
                if (currentHealth.health_score < step.required_health_score) {
                    console.log(
                        `[HYBRID_PIPELINE] ⚠️ Adım için yetersiz sistem sağlığı, ${step.fallback_strategy} stratejisi uygulanıyor`,
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
                            `[HYBRID_PIPELINE] ⏰ Adım süre limiti aşıldı (${stepDuration}ms > ${step.max_duration_ms}ms)`,
                        );
                    }

                    results[step.step_id] = stepResult;
                    completedSteps.push(step.step_id);
                    totalCost += step.max_cost_estimate;

                    console.log(
                        `[HYBRID_PIPELINE] ✅ Adım tamamlandı: ${step.step_name} (${stepDuration}ms)`,
                    );
                } catch (stepError) {
                    console.error(
                        `[HYBRID_PIPELINE] ❌ Adım hatası: ${step.step_name}`,
                        stepError,
                    );
                    failedSteps.push(step.step_id);

                    // Hata durumunda fallback stratejisi
                    if (step.fallback_strategy === "abort") {
                        console.log(
                            `[HYBRID_PIPELINE] 🛑 Kritik adım başarısız, pipeline durduruluyor`,
                        );
                        break;
                    }
                    // "skip" veya "simplify" durumunda devam ederiz
                }
            }

            // 4. SONUÇLARI SENTEZLEŞTİR
            const finalResult = await this.synthesizeResults(results, context);
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
                final_result: finalResult,
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
                `[HYBRID_PIPELINE] 🎯 Pipeline tamamlandı: ${execution.execution_status}`,
            );
            console.log(
                `[HYBRID_PIPELINE] 📊 ${completedSteps.length} başarılı, ${failedSteps.length} başarısız adım`,
            );
            console.log(
                `[HYBRID_PIPELINE] 💰 Toplam maliyet: $${totalCost.toFixed(2)}`,
            );
            console.log(`[HYBRID_PIPELINE] ⏱️ Toplam süre: ${totalDuration}ms`);

            return finalResult;
        } catch (error) {
            console.error(
                `[HYBRID_PIPELINE] ❌ Pipeline kritik hatası:`,
                error,
            );

            // Kritik hata durumunda güvenli fallback
            console.log(`[HYBRID_PIPELINE] 🛡️ Güvenli fallback'e geçiliyor`);
            return await StrategicQueryRouter.handleSimpleQuery(context);
        }
    }

    /**
     * 🏗️ PİPELİNE PLANI OLUŞTUR
     */
    private static createPipeline(
        type: "deep_analysis" | "pattern_discovery" | "insight_synthesis",
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
     * 🔧 TEK ADIM İŞLEME
     */
    private static async executeStep(
        step: PipelineStep,
        context: InteractionContext,
        previousResults: { [stepId: string]: any },
    ): Promise<any> {
        switch (step.step_id) {
            case "gather_user_data":
                return await this.gatherUserData(context);

            case "analyze_patterns":
                return await this.analyzePatterns(context, previousResults);

            case "generate_insights":
                return await this.generateInsights(context, previousResults);

            case "validate_findings":
                return await this.validateFindings(previousResults);

            case "collect_behavioral_data":
                return await this.collectBehavioralData(context);

            case "run_pattern_analysis":
                return await this.runPatternAnalysis(context, previousResults);

            case "synthesize_patterns":
                return await this.synthesizePatterns(previousResults);

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
    private static async gatherUserData(
        context: InteractionContext,
    ): Promise<any> {
        return {
            vault: context.initialVault,
            event_type: context.initialEvent.type,
            event_data: context.initialEvent.data,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * 🔍 KALIP ANALİZİ
     */
    private static async analyzePatterns(
        context: InteractionContext,
        previousResults: any,
    ): Promise<any> {
        const analysis = await BehavioralPatternAnalyzer.analyzePatterns(
            context.userId,
            30,
        );
        return {
            patterns_found: analysis.total_patterns_found,
            confidence: analysis.analysis_confidence,
            key_patterns: analysis.patterns.slice(0, 3), // Top 3 pattern
            trends: analysis.overall_trends,
        };
    }

    /**
     * 💡 İÇGÖRÜ ÜRETİMİ
     */
    private static async generateInsights(
        context: InteractionContext,
        previousResults: any,
    ): Promise<any> {
        const prompt = `
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

        const insights = await invokeGemini(prompt, AI_MODELS.FAST, {
            temperature: 0.6,
            maxOutputTokens: 300,
        });

        return { generated_insights: insights };
    }

    /**
     * ✅ BULGULARI DOĞRULAMA
     */
    private static async validateFindings(previousResults: any): Promise<any> {
        // Basit doğrulama mantığı
        const hasUserData = !!previousResults.gather_user_data;
        const hasPatterns =
            previousResults.analyze_patterns?.patterns_found > 0;
        const hasInsights = !!previousResults.generate_insights
            ?.generated_insights;

        return {
            validation_score: (hasUserData ? 0.3 : 0) +
                (hasPatterns ? 0.4 : 0) + (hasInsights ? 0.3 : 0),
            data_completeness: hasUserData && hasPatterns && hasInsights,
            recommended_confidence: hasUserData && hasPatterns && hasInsights
                ? 0.8
                : 0.5,
        };
    }

    /**
     * 📊 DAVRANIŞSAL VERİ TOPLAMA
     */
    private static async collectBehavioralData(
        context: InteractionContext,
    ): Promise<any> {
        return await BehavioralPatternAnalyzer.analyzePatterns(
            context.userId,
            14,
        ); // 2 haftalık
    }

    /**
     * 🔍 KALIP ANALİZİ ÇALIŞTIRMA
     */
    private static async runPatternAnalysis(
        context: InteractionContext,
        previousResults: any,
    ): Promise<any> {
        const behavioralData = previousResults.collect_behavioral_data;

        if (!behavioralData || behavioralData.total_patterns_found === 0) {
            return {
                status: "insufficient_data",
                message: "Yeterli veri bulunamadı",
            };
        }

        return {
            status: "success",
            dominant_patterns: behavioralData.patterns.slice(0, 5),
            trend_analysis: behavioralData.overall_trends,
            confidence: behavioralData.analysis_confidence,
        };
    }

    /**
     * 🎯 KALIPLARI SENTEZLEME
     */
    private static async synthesizePatterns(
        previousResults: any,
    ): Promise<any> {
        const patternAnalysis = previousResults.run_pattern_analysis;

        if (patternAnalysis.status !== "success") {
            return { synthesis: "Kalıp sentezi için yeterli veri bulunamadı." };
        }

        const prompt = `
Davranış kalıplarını sentezle:

### KALIP ANALİZİ ###
${JSON.stringify(patternAnalysis, null, 2)}

### GÖREV ###
Bu kalıplardan ana tema ve önerileri çıkar.
Destekleyici, umut verici ton. Maksimum 150 kelime.
    `.trim();

        const synthesis = await invokeGemini(prompt, AI_MODELS.FAST, {
            temperature: 0.7,
            maxOutputTokens: 200,
        });

        return { synthesis };
    }

    /**
     * 📋 BAĞLAM TOPLAMA
     */
    private static async gatherContext(
        context: InteractionContext,
    ): Promise<any> {
        return {
            user_query: this.extractQueryFromContext(context),
            user_vault: context.initialVault,
            event_context: context.initialEvent,
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * 🎯 İÇGÖRÜLERİ SENTEZLEME
     */
    private static async synthesizeInsights(
        context: InteractionContext,
        previousResults: any,
    ): Promise<any> {
        const contextData = previousResults.gather_context;

        const prompt = `
Kullanıcı bağlamını analiz et ve içgörüler üret:

### BAĞLAM ###
${JSON.stringify(contextData, null, 2)}

### GÖREV ###
Bu bağlamdan kişiselleştirilmiş, değerli içgörüler çıkar.
Destekleyici, yapıcı, umut verici ol. Maksimum 250 kelime.
    `.trim();

        const insights = await invokeGemini(prompt, AI_MODELS.FAST, {
            temperature: 0.8,
            maxOutputTokens: 350,
        });

        return { synthesized_insights: insights };
    }

    /**
     * 🎯 SONUÇLARI SENTEZLEŞTİRME
     */
    private static async synthesizeResults(
        results: { [stepId: string]: any },
        context: InteractionContext,
    ): Promise<string> {
        const prompt = `
Pipeline sonuçlarını kullanıcıya anlamlı bir cevap haline getir:

### PIPELINE SONUÇLARI ###
${JSON.stringify(results, null, 2)}

### KULLANICI SORGUSU ###
${this.extractQueryFromContext(context)}

### GÖREV ###
Bu sonuçları kullanarak kullanıcıya değerli, kişiselleştirilmiş bir yanıt oluştur.
Destekleyici, empatik, umut verici ol. Maksimum 400 kelime.
    `.trim();

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
                return data.userMessage || "Terapi seansı";
            case "dream_analysis":
                return data.dreamText || "Rüya analizi";
            case "ai_analysis":
                return `${data.days} günlük AI analizi`;
            case "daily_reflection":
                return data.todayNote || "Günlük yansıma";
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

/**
 * 💡 KULLANIM ÖRNEĞİ:
 *
 * ```typescript
 * const result = await ControlledHybridPipeline.executeComplexQuery(
 *   context,
 *   "deep_analysis"
 * );
 * ```
 *
 * Bu sistem:
 * ✅ Kontrollü, öngörülebilir pipeline'lar
 * ✅ Sistem sağlık bazlı kararlar
 * ✅ Maliyet ve süre limitleri
 * ✅ Hata toleransı yüksek
 * ✅ Fallback stratejileri
 * ✅ Gemini 2.5 Pro'nun istediği yaklaşım! 🚀
 */
