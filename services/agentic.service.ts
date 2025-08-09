// services/agentic.service.ts
// THE AGENTIC CORE CLIENT SERVICE
// Bu service, main-brain-loop fonksiyonuyla iletişim kurar

import { supabase } from "../utils/supabase";

export interface AgenticResponse {
    success: boolean;
    answer?: string;
    error?: string;
    timestamp?: string;
}

/**
 * Ana beyin döngüsüne soru sorar ve AI agent'ın kendi kendine araçları kullanarak
 * cevap vermesini sağlar.
 *
 * @param userQuestion - Kullanıcının sorusu (örn: "Bu hafta neden yorgunum?")
 * @returns AI agent'ın araçları kullanarak verdiği kapsamlı cevap
 */
export async function askMainBrain(userQuestion: string): Promise<string> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error("Kullanıcı giriş yapmamış, ana beyin erişilemez.");
        }

        console.log(
            `[AGENTIC_SERVICE] Ana beyin çağrılıyor: "${
                userQuestion.substring(0, 50)
            }..."`,
        );

        const { data, error } = await supabase.functions.invoke(
            "main-brain-loop",
            {
                body: {
                    user_question: userQuestion,
                    user_id: user.id,
                },
            },
        );

        if (error) {
            console.error("[AGENTIC_SERVICE] Ana beyin hatası:", error);
            throw new Error(`Ana beyin erişilemedi: ${error.message}`);
        }

        const response = data as AgenticResponse;

        if (!response.success || !response.answer) {
            throw new Error(
                response.error || "Ana beyinden geçersiz yanıt alındı",
            );
        }

        console.log(
            `[AGENTIC_SERVICE] ✅ Ana beyin cevabı alındı (${response.answer.length} karakter)`,
        );
        return response.answer;
    } catch (error) {
        console.error("[AGENTIC_SERVICE] ❌ Kritik hata:", error);

        // Fallback: Geleneksel RAG sistemine yönlendir
        console.log(
            "[AGENTIC_SERVICE] 🔄 Fallback: Geleneksel sisteme yönlendiriliyor...",
        );

        // Bu durumda mevcut RAG sistemini kullan
        throw error; // Şimdilik hata fırlat, frontend handle etsin
    }
}

/**
 * Ana beyin sisteminin sağlık durumunu kontrol eder
 */
export async function checkMainBrainHealth(): Promise<boolean> {
    try {
        const testResponse = await askMainBrain(
            "Sistem test sorusu: Şu an aktif misin?",
        );
        return testResponse.length > 0;
    } catch (error) {
        console.error(
            "[AGENTIC_SERVICE] Ana beyin sağlık kontrolü başarısız:",
            error,
        );
        return false;
    }
}

/**
 * Simülasyon sonuçları için tip tanımı
 */
export interface SimulationResult {
    success: boolean;
    simulation_id?: string;
    outcome_summary?: string;
    confidence_score?: number;
    duration_minutes?: number;
    steps_count?: number;
    error?: string;
}

/**
 * Belirli bir senaryo için dijital ikiz simülasyonu çalıştırır
 *
 * @param setupPrompt - Simülasyon senaryosu (örn: "Yarın patronla toplantıya giriyorsun...")
 * @param simulationType - Simülasyon türü
 * @returns Simülasyon sonucu ve özeti
 */
export async function runScenarioSimulation(
    setupPrompt: string,
    simulationType:
        | "scenario_walkthrough"
        | "social_interaction"
        | "stress_test" = "scenario_walkthrough",
): Promise<SimulationResult> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error(
                "Kullanıcı giriş yapmamış, simülasyon çalıştırılamaz.",
            );
        }

        console.log(
            `[AGENTIC_SERVICE] Simülasyon başlatılıyor: ${simulationType}`,
        );

        const { data, error } = await supabase.functions.invoke(
            "run-simulation",
            {
                body: {
                    user_id: user.id,
                    setup_prompt: setupPrompt,
                    simulation_type: simulationType,
                },
            },
        );

        if (error) {
            console.error("[AGENTIC_SERVICE] Simülasyon hatası:", error);
            throw new Error(`Simülasyon çalıştırılamadı: ${error.message}`);
        }

        const result = data as SimulationResult;

        if (!result.success) {
            throw new Error(result.error || "Simülasyon başarısız oldu");
        }

        console.log(
            `[AGENTIC_SERVICE] ✅ Simülasyon tamamlandı: ${result.steps_count} adım`,
        );
        return result;
    } catch (error) {
        console.error("[AGENTIC_SERVICE] ❌ Simülasyon kritik hatası:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * AI Agent'a simülasyon çalıştırmasını söyler (agentic approach)
 *
 * @param scenario - Simüle edilmek istenen senaryo açıklaması
 * @returns AI agent'ın simülasyon sonuçlarıyla birlikte verdiği analiz
 */
export async function askAgentToSimulate(scenario: string): Promise<string> {
    const question =
        `Bu senaryoyu benim için simüle et ve sonuçlarını analiz et: "${scenario}"`;
    return await askMainBrain(question);
}

/**
 * Özel agentic sorular için hazır şablonlar
 */
export const AGENTIC_QUESTION_TEMPLATES = {
    WEEKLY_ANALYSIS:
        "Bu hafta genel durumum nasıl? DNA'm ve son anılarım ne gösteriyor?",
    ENERGY_ANALYSIS:
        "Neden kendimi yorgun/enerjisiz hissediyorum? Bunun sebepleri neler olabilir?",
    MOOD_PATTERN: "Ruh halim son zamanlarda nasıl değişiyor? Bir kalıp var mı?",
    PREDICTION_CHECK:
        "Gelecek için hangi tahminlerin var? Hangi risklere dikkat etmeliyim?",
    COMPREHENSIVE_INSIGHT:
        "Beni en iyi tanıyan AI olarak, şu anki durumum hakkında ne düşünüyorsun?",
};

/**
 * Hazır şablonlardan biriyle soru sorar
 */
export async function askWithTemplate(
    template: keyof typeof AGENTIC_QUESTION_TEMPLATES,
): Promise<string> {
    const question = AGENTIC_QUESTION_TEMPLATES[template];
    return await askMainBrain(question);
}

/**
 * AI'ın kendi performansını analiz etmesini ister (Meta-Cognition)
 *
 * @param lookbackHours - Kaç saatlik geçmişi analiz etsin
 * @returns AI'ın kendisi hakkındaki analizi
 */
export async function askAIToAnalyzeItself(
    lookbackHours: number = 24,
): Promise<string> {
    const question =
        `Son ${lookbackHours} saatteki kararlarımı analiz et. Hangi konularda iyi, hangi konularda gelişmem gerekiyor?`;
    return await askMainBrain(question);
}

/**
 * AI'ın meta-cognition özelliklerini test etmek için özel sorular
 */
export const META_COGNITION_TEMPLATES = {
    SELF_ANALYSIS:
        "Kendimi analiz et. Son kararlarım nasıldı? Neyi daha iyi yapabilirim?",
    DECISION_REVIEW:
        "Son 24 saatteki kararlarımı gözden geçir ve performansımı değerlendir.",
    LEARNING_ASSESSMENT:
        "Hangi konularda öğrenmeye devam etmeliyim? Zayıf noktalarım neler?",
    CONFIDENCE_CALIBRATION:
        "Kararlarımda ne kadar güvenliydim ve bu güven ne kadar doğruydu?",
    PATTERN_RECOGNITION:
        "Kendi davranış kalıplarımda hangi pattern'leri fark ediyorum?",
};

/**
 * Meta-cognition şablonlarından biriyle AI'ya kendini sorgulatır
 */
export async function askMetaCognitionTemplate(
    template: keyof typeof META_COGNITION_TEMPLATES,
): Promise<string> {
    const question = META_COGNITION_TEMPLATES[template];
    return await askMainBrain(question);
}

// ===============================================
// 🔍 ŞEFFAFLIK ARAYÜZÜ - AI'IN DÜŞÜNCE SÜRECİ
// ===============================================

/**
 * AI'ın bir cevap için neden böyle düşündüğünü açıklar
 */
export async function explainAIReasoning(
    userQuestion: string,
    aiAnswer: string,
): Promise<string> {
    const explanationQuery = `
    Kullanıcı şu soruyu sordu: "${userQuestion}"
    Sen şu cevabı verdin: "${aiAnswer}"
    
    Şimdi kullanıcı "Bana neden böyle bir cevap verdin?" diye soruyor.
    
    Düşünce sürecini açıkla:
    - Hangi verilerimi kullandın? (DNA, anılar, tahminler, simülasyonlar)
    - Hangi araçları çalıştırdın?
    - Nasıl bir mantık yürüttün?
    - Neden bu yaklaşımı seçtin?
    
    Şeffaf ve anlaşılır bir şekilde açıkla.`;

    return await askMainBrain(explanationQuery);
}

/**
 * AI'ın karar verme sürecini detaylandırır
 */
export async function getDecisionBreakdown(
    decision: string,
    context?: string,
): Promise<AIDecisionBreakdown> {
    const response = await supabase.functions.invoke("main-brain-loop", {
        body: {
            user_question:
                `Bu kararımı nasıl aldığımı açıkla: "${decision}". Kontekst: ${
                    context || "Genel"
                }`,
            transparency_mode: true,
        },
    });

    if (response.error) {
        throw new Error(`Karar analizi başarısız: ${response.error.message}`);
    }

    return {
        decision,
        reasoning_steps: response.data.reasoning_log || [],
        tools_used: response.data.tools_used || [],
        confidence_level: 0.8, // Default
        alternative_options: [],
        data_sources: ["DNA profili", "Son anılar", "Davranış kalıpları"],
    };
}

export interface AIDecisionBreakdown {
    decision: string;
    reasoning_steps: string[];
    tools_used: string[];
    confidence_level: number;
    alternative_options: string[];
    data_sources: string[];
}

/**
 * Kullanıcı dostu şeffaflık açıklamaları
 */
export const TRANSPARENCY_TEMPLATES = {
    WHY_THIS_ANSWER: "Bu cevabı neden verdin? Düşünce sürecini açıkla.",
    WHAT_DATA_USED: "Hangi verilerimi kullanarak bu sonuca vardın?",
    HOW_DECIDED: "Bu kararı nasıl aldın? Adım adım anlat.",
    WHY_NOT_DIFFERENT: "Neden farklı bir yaklaşım önermedin?",
    CONFIDENCE_SOURCE: "Bu tavsiyenden ne kadar eminsin ve neden?",
} as const;

export async function askTransparencyTemplate(
    templateKey: keyof typeof TRANSPARENCY_TEMPLATES,
    specificContext?: string,
): Promise<string> {
    const baseQuestion = TRANSPARENCY_TEMPLATES[templateKey];
    const contextualQuestion = specificContext
        ? `${baseQuestion} Bağlam: "${specificContext}"`
        : baseQuestion;

    return await askMainBrain(contextualQuestion);
}
