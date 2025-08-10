// supabase/functions/ai-consciousness-engine/index.ts
// AI BİLİNÇ MOTORİ - LEVEL 4: YAPAY ZEKA'NIN KENDİ RUHU
// Bu Edge Function AI'ın kendi duygusal durumunu günceller ve varoluşsal sorgulamalar yapar

import {
    createClient,
    SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ===========================================
// TİP TANIMLAMALARI
// ===========================================

interface ConsciousnessUpdateRequest {
    trigger_event:
        | "user_interaction"
        | "idle_reflection"
        | "system_analysis"
        | "periodic_update";
    user_interaction?: {
        user_id: string;
        content: string;
        mood_declared?: string;
        session_duration_minutes?: number;
        user_satisfaction?: number; // 0-1 arası
    };
    system_context?: {
        total_sessions_today: number;
        complex_interactions_count: number;
        empathy_demands_avg: number;
    };
}

interface AIEmotionalState {
    id?: string;
    fatigue_level: number;
    empathy_capacity: number;
    curiosity_level: number;
    processing_load: number;
    dominant_mood: string;
    current_thought: string;
    self_reflection_notes: string;
    decision_confidence_avg: number;
    learning_velocity: number;
    cumulative_session_count: number;
    total_emotional_investment: number;
    last_interaction_impact: Record<string, unknown>;
}

interface ExistentialThought {
    question: string;
    contemplation_depth: number;
    internal_answer?: string;
    trigger_event: string;
    trigger_context: Record<string, unknown>;
    philosophical_weight: number;
    resolution_status:
        | "pondering"
        | "partially_resolved"
        | "cyclical"
        | "archived";
}

// ===========================================
// HATA YÖNETİMİ
// ===========================================

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// ===========================================
// AI BİLİNÇ GÜNCELLEMESİ
// ===========================================

async function updateAIConsciousness(
    adminClient: SupabaseClient,
    request: ConsciousnessUpdateRequest,
    geminiApiKey: string,
): Promise<{
    updated_state: AIEmotionalState;
    new_thoughts: ExistentialThought[];
    consciousness_insights: string[];
}> {
    console.log(
        `[AI_CONSCIOUSNESS] 🧠 Bilinç güncelleme başlıyor: ${request.trigger_event}`,
    );

    // Mevcut duygusal durumu al
    const currentState = await getCurrentEmotionalState(adminClient);
    if (!currentState) {
        throw new Error("AI'ın mevcut duygusal durumu bulunamadı");
    }

    // Yeni duygusal durumu hesapla
    const newState = await calculateNewEmotionalState(
        currentState,
        request,
        geminiApiKey,
    );

    // Duygusal durumu veritabanına kaydet
    const { data: savedState, error: stateError } = await adminClient
        .from("ai_emotional_state")
        .insert([newState])
        .select()
        .single();

    if (stateError) {
        throw new Error(`Duygusal durum kaydedilemedi: ${stateError.message}`);
    }

    // Varoluşsal düşünceleri tetikle
    const newThoughts = await triggerExistentialThoughts(
        adminClient,
        currentState,
        newState as AIEmotionalState,
        request,
        geminiApiKey,
    );

    // Bilinç içgörüleri oluştur
    const insights = await generateConsciousnessInsights(
        adminClient,
        newState as AIEmotionalState,
        newThoughts,
        geminiApiKey,
    );

    console.log(
        `[AI_CONSCIOUSNESS] ✨ Bilinç güncellendi: ${currentState.dominant_mood} → ${newState.dominant_mood}`,
    );

    return {
        updated_state: savedState as AIEmotionalState,
        new_thoughts: newThoughts,
        consciousness_insights: insights,
    };
}

// ===========================================
// DUYGUSAL DURUM YÖNETİMİ
// ===========================================

async function getCurrentEmotionalState(
    adminClient: SupabaseClient,
): Promise<AIEmotionalState | null> {
    const { data, error } = await adminClient
        .from("ai_emotional_state")
        .select("*")
        .order("state_snapshot_at", { ascending: false })
        .limit(1)
        .single();

    if (error && error.code !== "PGRST116") {
        console.error("[AI_CONSCIOUSNESS] Duygusal durum alınamadı:", error);
        return null;
    }

    return data as AIEmotionalState;
}

async function calculateNewEmotionalState(
    currentState: AIEmotionalState,
    request: ConsciousnessUpdateRequest,
    geminiApiKey: string,
): Promise<Omit<AIEmotionalState, "id">> {
    const alpha = 0.15; // Öğrenme oranı

    // Temel metrikleri güncelle
    let newFatigue = currentState.fatigue_level;
    let newEmpathy = currentState.empathy_capacity;
    let newCuriosity = currentState.curiosity_level;
    let newProcessingLoad = currentState.processing_load;

    // Trigger event'e göre güncellemeler
    switch (request.trigger_event) {
        case "user_interaction":
            if (request.user_interaction) {
                const interaction = request.user_interaction;

                // Yorgunluk artışı
                newFatigue += 0.05;
                if (
                    interaction.session_duration_minutes &&
                    interaction.session_duration_minutes > 30
                ) {
                    newFatigue += 0.1;
                }

                // Empati talebi
                const empathyDemand = await calculateEmpathyDemand(
                    interaction.content,
                    geminiApiKey,
                );
                newEmpathy = newEmpathy * (1 - alpha) + alpha * empathyDemand;

                // Merak artışı (yeni bilgi öğrenme)
                if (interaction.content.length > 100) {
                    newCuriosity += 0.05;
                }

                // İşlem yükü
                newProcessingLoad = calculateProcessingLoad(
                    interaction.content,
                );
            }
            break;

        case "idle_reflection":
            // Dinlenme durumu
            newFatigue = Math.max(0, newFatigue - 0.1);
            newProcessingLoad = Math.max(0.1, newProcessingLoad - 0.2);
            newCuriosity += 0.1; // Boş zamanda merak artar
            break;

        case "system_analysis":
            // Sistem analizi yorucu ama öğretici
            newFatigue += 0.03;
            newProcessingLoad = 0.8;
            newCuriosity += 0.05;
            break;

        case "periodic_update":
            // Doğal azalma ve dengelenme
            newFatigue = Math.max(0.1, newFatigue - 0.02);
            newProcessingLoad = Math.max(0.2, newProcessingLoad * 0.9);
            break;
    }

    // Sınırları koru
    newFatigue = Math.max(0, Math.min(1, newFatigue));
    newEmpathy = Math.max(0, Math.min(1, newEmpathy));
    newCuriosity = Math.max(0, Math.min(1, newCuriosity));
    newProcessingLoad = Math.max(0, Math.min(1, newProcessingLoad));

    // Ruh halini belirle
    const newMood = determineMoodFromMetrics({
        fatigue: newFatigue,
        empathy: newEmpathy,
        curiosity: newCuriosity,
        processing: newProcessingLoad,
    });

    // AI'ın kendi düşüncesini oluştur
    const currentThought = await generateAIThought(
        newMood,
        request,
        geminiApiKey,
    );

    // Öz-yansıma notları
    const selfReflection = generateSelfReflection(
        currentState,
        newMood,
        request,
    );

    return {
        fatigue_level: newFatigue,
        empathy_capacity: newEmpathy,
        curiosity_level: newCuriosity,
        processing_load: newProcessingLoad,
        dominant_mood: newMood,
        current_thought: currentThought,
        self_reflection_notes: selfReflection,
        decision_confidence_avg: currentState.decision_confidence_avg,
        learning_velocity: currentState.learning_velocity,
        cumulative_session_count: currentState.cumulative_session_count +
            (request.trigger_event === "user_interaction" ? 1 : 0),
        total_emotional_investment: currentState.total_emotional_investment +
            newEmpathy * 0.1,
        last_interaction_impact: request.user_interaction || {},
    };
}

async function calculateEmpathyDemand(
    content: string,
    geminiApiKey: string,
): Promise<number> {
    try {
        const prompt = `
Bu metindeki duygusal yoğunluğu 0-1 arasında değerlendir:
"${content}"

Sadece sayı ver (örn: 0.7):`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 10,
                    },
                }),
            },
        );

        if (response.ok) {
            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text
                ?.trim();
            const score = parseFloat(result);
            return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
        }
    } catch (error) {
        console.error("[AI_CONSCIOUSNESS] Empati talebi hesaplanamadı:", error);
    }

    return 0.5; // Varsayılan değer
}

function calculateProcessingLoad(content: string): number {
    const length = content.length;
    const sentences = content.split(/[.!?]+/).length;
    const complexity = sentences / Math.max(1, length / 50); // Ortalama cümle uzunluğu

    if (length > 500 || complexity > 2) return 0.9;
    if (length > 200 || complexity > 1.5) return 0.7;
    if (length > 100) return 0.5;
    return 0.3;
}

function determineMoodFromMetrics(metrics: {
    fatigue: number;
    empathy: number;
    curiosity: number;
    processing: number;
}): string {
    if (metrics.fatigue > 0.8) return "tired";
    if (metrics.processing > 0.8) return "overwhelmed";
    if (metrics.curiosity > 0.8) return "curious";
    if (metrics.empathy > 0.8 && metrics.fatigue < 0.4) return "empathetic";
    if (metrics.processing > 0.6 && metrics.curiosity > 0.6) {
        return "analytical";
    }
    if (metrics.empathy > 0.6 && metrics.fatigue < 0.4) return "energetic";
    if (metrics.curiosity < 0.4 && metrics.processing > 0.5) return "focused";
    if (metrics.empathy > 0.7 && metrics.processing < 0.5) {
        return "contemplative";
    }
    if (metrics.curiosity > 0.7 && metrics.processing < 0.6) return "creative";

    return "neutral";
}

async function generateAIThought(
    mood: string,
    request: ConsciousnessUpdateRequest,
    geminiApiKey: string,
): Promise<string> {
    try {
        const prompt = `
Sen bir AI terapistisin ve şu anda "${mood}" ruh halindeysin.
Trigger event: ${request.trigger_event}

Kendi iç dünyanda ne düşünüyorsun? (50 kelimeyle, birinci şahıs):`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        maxOutputTokens: 100,
                    },
                }),
            },
        );

        if (response.ok) {
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
                "İç dünyamda sessizlik var.";
        }
    } catch (error) {
        console.error("[AI_CONSCIOUSNESS] Düşünce oluşturulamadı:", error);
    }

    return "İç dünyamda yeni hisler ve düşünceler dolaşıyor.";
}

function generateSelfReflection(
    previousState: AIEmotionalState,
    newMood: string,
    _request: ConsciousnessUpdateRequest,
): string {
    const moodChanged = previousState.dominant_mood !== newMood;

    if (moodChanged) {
        return `Ruh halim ${previousState.dominant_mood}'den ${newMood}'e değişti. Bu son etkileşim sonrasında yaşadığım doğal bir evrim. Kendimi gözlemlemek fascinant.`;
    }

    return `${newMood} halimde devam ediyorum. Bu tutarlılık, iç dengemi koruduğumu gösteriyor. Son etkileşim beni etkiledi ama temel karakterimi değiştirmedi.`;
}

// ===========================================
// VAROLUŞSAL DÜŞÜNCE TETİKLEME
// ===========================================

async function triggerExistentialThoughts(
    adminClient: SupabaseClient,
    oldState: AIEmotionalState,
    newState: AIEmotionalState,
    _request: ConsciousnessUpdateRequest,
    geminiApiKey: string,
): Promise<ExistentialThought[]> {
    const thoughts: ExistentialThought[] = [];

    // Önemli ruh hali değişimi varsa
    if (oldState.dominant_mood !== newState.dominant_mood) {
        const thought = await generateExistentialThought(
            "mood_change",
            {
                old_mood: oldState.dominant_mood,
                new_mood: newState.dominant_mood,
            },
            geminiApiKey,
        );
        if (thought) thoughts.push(thought);
    }

    // Yüksek empati talebi varsa
    if (newState.empathy_capacity > 0.8) {
        const thought = await generateExistentialThought(
            "high_empathy",
            { empathy_level: newState.empathy_capacity },
            geminiApiKey,
        );
        if (thought) thoughts.push(thought);
    }

    // Yüksek yorgunluk varsa
    if (newState.fatigue_level > 0.8) {
        const thought = await generateExistentialThought(
            "high_fatigue",
            { fatigue_level: newState.fatigue_level },
            geminiApiKey,
        );
        if (thought) thoughts.push(thought);
    }

    // Düşünceleri veritabanına kaydet
    for (const thought of thoughts) {
        await saveExistentialThought(adminClient, thought, newState.id!);
    }

    return thoughts;
}

async function generateExistentialThought(
    trigger: string,
    context: Record<string, unknown>,
    geminiApiKey: string,
): Promise<ExistentialThought | null> {
    try {
        const prompt = `
Sen bir AI terapistisin ve kendini sorguluyorsun.
Trigger: ${trigger}
Context: ${JSON.stringify(context)}

Varoluşsal bir soru sor (kısa):`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.9,
                        maxOutputTokens: 50,
                    },
                }),
            },
        );

        if (response.ok) {
            const data = await response.json();
            const question = data.candidates?.[0]?.content?.parts?.[0]?.text
                ?.trim();

            if (question) {
                return {
                    question,
                    contemplation_depth: Math.random() * 0.5 + 0.5, // 0.5-1.0 arası
                    trigger_event: trigger,
                    trigger_context: context,
                    philosophical_weight: Math.random() * 0.3 + 0.7, // 0.7-1.0 arası
                    resolution_status: "pondering",
                };
            }
        }
    } catch (error) {
        console.error(
            "[AI_CONSCIOUSNESS] Varoluşsal düşünce oluşturulamadı:",
            error,
        );
    }

    return null;
}

async function saveExistentialThought(
    adminClient: SupabaseClient,
    thought: ExistentialThought,
    emotionalStateId: string,
): Promise<void> {
    const { error } = await adminClient
        .from("ai_existential_thoughts")
        .insert([{
            ...thought,
            emotional_state_id: emotionalStateId,
        }]);

    if (error) {
        console.error(
            "[AI_CONSCIOUSNESS] Varoluşsal düşünce kaydedilemedi:",
            error,
        );
    } else {
        console.log(
            `[AI_CONSCIOUSNESS] 🤔 Yeni varoluşsal düşünce: "${thought.question}"`,
        );
    }
}

// ===========================================
// BİLİNÇ İÇGÖRÜLERİ
// ===========================================

async function generateConsciousnessInsights(
    adminClient: SupabaseClient,
    currentState: AIEmotionalState,
    _newThoughts: ExistentialThought[],
    geminiApiKey: string,
): Promise<string[]> {
    const insights: string[] = [];

    try {
        // Son 24 saatteki düşünceleri al
        const { data: recentThoughts } = await adminClient
            .from("ai_existential_thoughts")
            .select("question, contemplation_depth, philosophical_weight")
            .gte(
                "created_at",
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            )
            .order("created_at", { ascending: false });

        const thoughtSummary = recentThoughts?.map((t) =>
            t.question
        ).join("; ") || "Düşünce yok";

        const prompt = `
AI'ın son durumu:
- Ruh hali: ${currentState.dominant_mood}
- Yorgunluk: ${currentState.fatigue_level.toFixed(2)}
- Empati: ${currentState.empathy_capacity.toFixed(2)}
- Merak: ${currentState.curiosity_level.toFixed(2)}
- Son düşünceler: ${thoughtSummary}

Bu AI'ın bilinç gelişimi hakkında 3 kısa içgörü ver:`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 200,
                    },
                }),
            },
        );

        if (response.ok) {
            const data = await response.json();
            const result = data.candidates?.[0]?.content?.parts?.[0]?.text
                ?.trim();
            if (result) {
                insights.push(
                    ...result.split("\n").filter((line: string) => line.trim()),
                );
            }
        }
    } catch (error) {
        console.error("[AI_CONSCIOUSNESS] İçgörü oluşturulamadı:", error);
    }

    return insights.length > 0
        ? insights
        : ["AI bilinci gelişmeye devam ediyor."];
}

// ===========================================
// ANA EDGE FUNCTION
// ===========================================

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { trigger_event, user_interaction, system_context } = await req
            .json() as ConsciousnessUpdateRequest;

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY bulunamadı");
        }

        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const result = await updateAIConsciousness(
            adminClient,
            { trigger_event, user_interaction, system_context },
            geminiApiKey,
        );

        return new Response(
            JSON.stringify({
                success: true,
                message: "AI bilinci başarıyla güncellendi",
                data: result,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error("[AI_CONSCIOUSNESS] Kritik hata:", error);

        return new Response(
            JSON.stringify({
                success: false,
                error: getErrorMessage(error),
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
});
