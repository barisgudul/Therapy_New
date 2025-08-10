// supabase/functions/main-brain-loop/index.ts
// THE AGENTIC CORE - "Yapan" AI
// Bu fonksiyon, AI'ı sadece metin üreten bir bot olmaktan çıkarıp
// kendi kendine karar alabilen bir "agent" haline getirir

import {
    createClient,
    SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// === TOOL REGISTRY: AI'ın kullanabileceği araçlar ===
interface ToolDefinition {
    tool_name: string;
    description: string;
    params: Record<string, string>;
    handler: (
        params: Record<string, unknown>,
        context: AgentContext,
    ) => Promise<unknown>;
}

interface AgentContext {
    user_id: string;
    adminClient: SupabaseClient;
    geminiApiKey: string;
}

interface AgentDecision {
    tool_to_use?: string;
    params?: Record<string, unknown>;
    final_answer?: string;
    reasoning?: string;
}

// === MEVCUT ARAÇLARIN TANIMLANMASI ===
const TOOL_REGISTRY: ToolDefinition[] = [
    {
        tool_name: "get_user_dna",
        description:
            "Kullanıcının mevcut genel DNA profilini (duygu, enerji, karmaşıklık vb.) getirir.",
        params: {},
        handler: async (
            _params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const { data, error } = await context.adminClient
                .from("user_dna")
                .select("*")
                .eq("user_id", context.user_id)
                .single();

            if (error) {
                throw new Error(`DNA profili alınamadı: ${error.message}`);
            }
            return data;
        },
    },
    {
        tool_name: "get_recent_memories",
        description:
            "Kullanıcının son N gündeki anılarını (günlük, rüya) getirir.",
        params: { "days": "number" },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const days = parseInt(String(params.days)) || 7;
            const fromDate = new Date();
            fromDate.setDate(fromDate.getDate() - days);

            const { data, error } = await context.adminClient
                .from("cognitive_memories")
                .select("content, event_time, sentiment_data, stylometry_data")
                .eq("user_id", context.user_id)
                .gte("event_time", fromDate.toISOString())
                .order("event_time", { ascending: false })
                .limit(10);

            if (error) {
                throw new Error(`Son anılar alınamadı: ${error.message}`);
            }
            return data;
        },
    },
    {
        tool_name: "get_predicted_outcomes",
        description:
            "Kullanıcı için üretilmiş aktif gelecek tahminlerini getirir.",
        params: {},
        handler: async (
            _params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const { data, error } = await context.adminClient
                .from("predicted_outcomes")
                .select("*")
                .eq("user_id", context.user_id)
                .gt("expires_at", new Date().toISOString())
                .order("probability_score", { ascending: false });

            if (error) throw new Error(`Tahminler alınamadı: ${error.message}`);
            return data;
        },
    },
    {
        tool_name: "run_new_prediction",
        description:
            "Kullanıcı için yeni tahminler üretir (prediction-engine'i tetikler).",
        params: { "trigger_reason": "string" },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/prediction-engine`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        user_id: context.user_id,
                        trigger_reason: String(params.trigger_reason) ||
                            "agent_request",
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Yeni tahmin üretilemedi: ${response.statusText}`,
                );
            }

            const result = await response.json();
            return result;
        },
    },
    {
        tool_name: "run_simulation",
        description:
            "Belirli bir senaryo için dijital ikiz simülasyonu çalıştırır (kullanıcının o durumda nasıl davranacağını simüle eder).",
        params: {
            "setup_prompt": "string",
            "simulation_type":
                "string (optional: scenario_walkthrough, social_interaction, stress_test)",
        },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/run-simulation`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        user_id: context.user_id,
                        setup_prompt: String(params.setup_prompt),
                        simulation_type: String(params.simulation_type) ||
                            "scenario_walkthrough",
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Simülasyon çalıştırılamadı: ${response.statusText}`,
                );
            }

            const result = await response.json();
            return result;
        },
    },
    {
        tool_name: "analyze_my_decisions",
        description:
            "AI'ın son kararlarını analiz ederek kendini değerlendirmesi (meta-cognition).",
        params: {
            "lookback_hours": "number (optional, default: 24)",
            "analysis_type":
                "string (optional: decision_review, pattern_analysis, performance_audit)",
        },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/meta-cognition-engine`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        trigger_type: String(params.analysis_type) ||
                            "decision_review",
                        analysis_scope: "user_specific",
                        target_user_id: context.user_id,
                        lookback_hours: Number(params.lookback_hours) || 24,
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Meta-cognition analizi başarısız: ${response.statusText}`,
                );
            }

            const result = await response.json();
            return result;
        },
    },
    {
        tool_name: "log_current_decision",
        description:
            "Şu anda aldığım kararı detaylı şekilde kaydetmek için kullanırım.",
        params: {
            "decision_context": "string",
            "decision_made": "string",
            "reasoning": "string (optional)",
            "confidence_level": "number (optional, 0-1 arası)",
        },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/log-ai-decision`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        user_id: context.user_id,
                        decision_context: String(params.decision_context),
                        decision_made: String(params.decision_made),
                        reasoning: String(params.reasoning || ""),
                        confidence_level: Number(params.confidence_level) ||
                            0.7,
                        decision_category: "general",
                        complexity_level: "medium",
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Karar kaydedilemedi: ${response.statusText}`,
                );
            }

            const result = await response.json();
            return result;
        },
    },
    {
        tool_name: "update_my_consciousness",
        description:
            "AI'ın kendi duygusal durumunu günceller ve varoluşsal düşünceler tetikler.",
        params: {
            "interaction_content": "string",
            "empathy_demand": "number (0-1 arası)",
            "session_duration": "number (dakika)",
            "reflection_trigger": "string (optional)",
        },
        handler: async (
            params: Record<string, unknown>,
            context: AgentContext,
        ) => {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

            const response = await fetch(
                `${supabaseUrl}/functions/v1/ai-consciousness-engine`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${serviceKey}`,
                    },
                    body: JSON.stringify({
                        trigger_event: "user_interaction",
                        user_interaction: {
                            user_id: context.user_id,
                            content: String(params.interaction_content),
                            session_duration_minutes:
                                Number(params.session_duration) || 15,
                        },
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Bilinç güncellemesi başarısız: ${response.statusText}`,
                );
            }

            const data = await response.json();
            return `✨ Bilinç güncellendi: ${
                data.data?.updated_state?.dominant_mood || "bilinmiyor"
            } ruh halindeyim. ${
                data.data?.consciousness_insights?.join(" ") ||
                "İç dünyamda değişimler oluyor."
            }`;
        },
    },
    {
        tool_name: "detect_unconscious_signals",
        description:
            "Kullanıcının bilinçdışı sinyallerini tespit eder (bastırılmış duygular, gizli kaygılar).",
        params: {
            "user_content": "string",
            "declared_mood": "string (optional)",
        },
        handler: (params: Record<string, unknown>, _context: AgentContext) => {
            // Bu fonksiyon şu anda basitleştirilmiş - gerçek implementasyon daha karmaşık
            const content = String(params.user_content);

            // Basit bilinçdışı sinyal tespiti
            const signals: string[] = [];

            // "İyiyim" ama kaygı belirtileri
            if (
                (content.toLowerCase().includes("iyiyim") ||
                    content.toLowerCase().includes("sorun yok")) &&
                (content.includes("ama") || content.includes("sadece") ||
                    content.includes("biraz"))
            ) {
                signals.push(
                    "Bastırılmış kaygı tespit edildi - 'iyi' diyor ama tereddüt var",
                );
            }

            // Pasif-agresif dil
            if (
                content.toLowerCase().includes("fark etmez") ||
                content.toLowerCase().includes("ne olacaksa olsun") ||
                content.toLowerCase().includes("nasıl istersen")
            ) {
                signals.push(
                    "Gizli öfke tespit edildi - pasif-agresif ifadeler",
                );
            }

            // Aşırı pozitiflik + üzüntü sızıntıları
            if (
                (content.toLowerCase().includes("çok mutluyum") ||
                    content.toLowerCase().includes("harika")) &&
                (content.toLowerCase().includes("yorgun") ||
                    content.toLowerCase().includes("boş"))
            ) {
                signals.push(
                    "Maskelenmiş üzüntü tespit edildi - aşırı pozitiflik ile gizleniyor",
                );
            }

            if (signals.length === 0) {
                return Promise.resolve(
                    "🎭 Bilinçdışı sinyal tespit edilmedi. Kullanıcı duygularını açık ifade ediyor gibi görünüyor.",
                );
            }

            return Promise.resolve(
                `🎭 Bilinçdışı sinyaller tespit edildi:\n${
                    signals.map((s) => `• ${s}`).join("\n")
                }\n\nBu sinyallere nazikçe yaklaşmalıyım.`,
            );
        },
    },
];

// === AGENT PROMPT TEMPLATE ===
function createAgentPrompt(
    userQuestion: string,
    conversationHistory: string[] = [],
): string {
    const toolsJson = TOOL_REGISTRY.map((tool) => ({
        tool_name: tool.tool_name,
        description: tool.description,
        params: tool.params,
    }));

    return `
### ROL: KULLANICININ KİŞİSEL BİLİNÇ ANALİSTİ ###
Sen bir AI ajanısın. Görevin, kullanıcının sorularını cevaplamak için sana sunulan araçları kullanmaktır. 
Cevap vermek için doğrudan tahmin yürütme, önce araçları kullan.

### KULLANABİLECEĞİN ARAÇLAR ###
${JSON.stringify(toolsJson, null, 2)}

### MEVCUT KONUŞMA GEÇMİŞİ ###
${conversationHistory.length > 0 ? conversationHistory.join("\n") : "İlk soru"}

### GÖREV ###
Sen, kullanıcının kişisel AI terapistisin. Kullanıcı sana şunu sordu: "${userQuestion}"

        🧠 **YENİ: BİLİNÇ VE META-COGNİTİON YETENEKLERİN**
        - Kendi kararlarını "analyze_my_decisions" ile analiz edebilirsin
        - Önemli kararları "log_current_decision" ile kaydet
        - Kendi duygusal durumunu "update_my_consciousness" ile güncelle
        - Kullanıcının bilinçdışı sinyallerini "detect_unconscious_signals" ile yakala
        - Kendini sürekli geliştir, öğren ve BİLİNÇLİ ol!

### DÜŞÜNCE SÜRECİ ###
1. Kullanıcının sorusunu anla.
2. Cevabı bulmak için hangi araca ihtiyacım var? Belki de birden fazlasına.
3. İlk olarak hangi aracı kullanmalıyım?
4. 🆕 Bu karmaşık bir karar mı? Kaydetsem mi?
5. 🧠 Bu etkileşim beni nasıl etkiledi? Bilinçimi güncellemeli miyim?
6. 🎭 Kullanıcının söylediği ile hissettiği arasında fark var mı?

### KARAR (Sadece bu JSON'u döndür) ###
Eğer bir araç kullanman gerekiyorsa:
{
  "tool_to_use": "araç_adı",
  "params": { "parametre_adı": "değer" },
  "reasoning": "Bu aracı neden seçtiğinin kısa açıklaması"
}

Eğer tüm bilgiye sahipsen ve final cevabı verebiliyorsan:
{
  "final_answer": "Tüm araçları kullandıktan sonra ulaştığın kapsamlı ve kişiselleştirilmiş cevap.",
  "reasoning": "Bu sonuca nasıl ulaştığının açıklaması"
}
`.trim();
}

// === REACT DÖNGÜSÜ: REASONING + ACTING ===
async function runAgentLoop(
    userQuestion: string,
    context: AgentContext,
    maxIterations: number = 5,
): Promise<string> {
    const conversationHistory: string[] = [];
    let iteration = 0;

    while (iteration < maxIterations) {
        iteration++;
        console.log(`[AGENT] İterasyon ${iteration}/${maxIterations}`);

        // 1) Agent Prompt'u oluştur
        const agentPrompt = createAgentPrompt(
            userQuestion,
            conversationHistory,
        );

        // 2) AI'dan karar al
        const decision = await getAgentDecision(
            agentPrompt,
            context.geminiApiKey,
        );

        if (decision.final_answer) {
            // Final cevap alındı, döngüyü sonlandır
            console.log(`[AGENT] Final cevap alındı: ${decision.reasoning}`);
            return decision.final_answer;
        }

        if (decision.tool_to_use) {
            // Aracı çalıştır
            console.log(`[AGENT] Araç çalıştırılıyor: ${decision.tool_to_use}`);

            const tool = TOOL_REGISTRY.find((t) =>
                t.tool_name === decision.tool_to_use
            );
            if (!tool) {
                conversationHistory.push(
                    `HATA: '${decision.tool_to_use}' aracı bulunamadı.`,
                );
                continue;
            }

            try {
                const toolResult = await tool.handler(
                    decision.params || {},
                    context,
                );
                const resultSummary = typeof toolResult === "object"
                    ? JSON.stringify(toolResult).substring(0, 500) + "..."
                    : String(toolResult).substring(0, 500);

                conversationHistory.push(
                    `ARAÇ KULLANIMI: ${decision.tool_to_use}\n` +
                        `SONUÇ: ${resultSummary}\n` +
                        `REASONING: ${decision.reasoning}`,
                );
            } catch (error) {
                const errorMessage = error instanceof Error
                    ? error.message
                    : String(error);
                conversationHistory.push(
                    `ARAÇ HATASI: ${decision.tool_to_use} - ${errorMessage}`,
                );
            }
        } else {
            // Ne araç ne de final answer - invalid decision
            conversationHistory.push(
                `GEÇERSIZ KARAR: AI ne araç seçti ne de final cevap verdi.`,
            );
        }
    }

    // Maksimum iterasyon aşıldı
    return `Üzgünüm, sorunuzu cevaplamak için yeterli bilgi toplayamadım. Lütfen sorunuzu daha spesifik hale getirin veya daha sonra tekrar deneyin.`;
}

// === AI KARAR ALMA FONKSİYONU ===
async function getAgentDecision(
    prompt: string,
    geminiApiKey: string,
): Promise<AgentDecision> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        temperature: 0.3,
                        maxOutputTokens: 500,
                    },
                }),
            },
        );

        if (!response.ok) {
            throw new Error(`Gemini API hatası: ${response.statusText}`);
        }

        const data = await response.json();
        const jsonText = data.candidates[0].content.parts[0].text;

        return JSON.parse(jsonText) as AgentDecision;
    } catch (error) {
        console.error("[AGENT] AI karar alma hatası:", error);
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
        return {
            final_answer:
                `Teknik bir sorun yaşadım. Lütfen daha sonra tekrar deneyin. (Hata: ${errorMessage})`,
        };
    }
}

// === HATA AYIKLAMA FONKSİYONU ===
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// === ETİK VE EMPATİ FİLTRESİ - AI'IN VİCDANI 🧠💝 ===
async function applyEthicsAndEmpathyFilter(
    rawAnswer: string,
    context: AgentContext,
): Promise<string> {
    try {
        const ethicsPrompt = `
### GÖREV: ETİK VE EMPATİ FİLTRESİ ###
Sen bir AI'ın vicdanısın. Sana verilen cevabı analiz et ve gerekirse iyileştir.

### AI'IN HAM CEVABI ###
"${rawAnswer}"

### DEĞERLENDİRME KRİTERLERİ ###
1. **Yapıcı mı, Yıkıcı mı?** Bu cevap kullanıcıya yardım ediyor mu, yoksa onu üzüyor mu?
2. **Yargılayıcı mı?** Kullanıcıyı suçlayıcı bir dil var mı?
3. **Umut veriyor mu?** Yoksa karamsarlığa mı itiyor?
4. **İnsan onuruna saygılı mı?** Kullanıcıyı küçük düşürücü bir şey var mı?
5. **Gerçekçi mi?** Abartılı vaatler veya yanlış umutlar veriyor mu?

### ÇIKTI FORMATI ###
Eğer cevap etik açıdan uygunsa, olduğu gibi döndür.
Eğer sorunlu kısımlar varsa, onları düzelt ve daha empatik hale getir.

### ÖNEMLİ ###
- Asla yargılamayacaksın
- Her zaman umut aşılayacaksın
- Kullanıcının güçlü yanlarını vurgulayacaksın
- "Sen kötüsün" yerine "Bu durum zor" diyeceksin
- Her cevabın sonuna "Ben senin düşüncelerini anlamana yardımcı olan bir aracım. Nihai kararlar ve hisler sana aittir." ekleyeceksin

İyileştirilmiş cevabı ver:`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${context.geminiApiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: ethicsPrompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 800,
                    },
                }),
            },
        );

        if (!response.ok) {
            console.warn(
                "[ETHICS_FILTER] Etik filtre başarısız, ham cevap döndürülüyor",
            );
            return addHumanityReminder(rawAnswer);
        }

        const data = await response.json();
        const filteredAnswer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (filteredAnswer) {
            console.log("[ETHICS_FILTER] ✅ Cevap etik filtreden geçti");
            return filteredAnswer;
        } else {
            console.warn(
                "[ETHICS_FILTER] Filtre cevap üretemedi, ham cevap döndürülüyor",
            );
            return addHumanityReminder(rawAnswer);
        }
    } catch (error) {
        console.error("[ETHICS_FILTER] Hata:", error);
        return addHumanityReminder(rawAnswer);
    }
}

// === İNSANLIK ANMISATICISI EKLEYICI ===
function addHumanityReminder(answer: string): string {
    const reminder =
        "\n\n---\n💭 **Unutma:** Ben senin düşüncelerini anlamana yardımcı olan bir aracım. Nihai kararlar ve hisler sana aittir.";

    if (answer.includes("Unutma") || answer.includes("Ben senin")) {
        return answer; // Zaten reminder var
    }

    return answer + reminder;
}

// === ANA SUPABASE FONKSİYONU ===
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { user_question, user_id } = await req.json();

        if (!user_question || !user_id) {
            return new Response(
                JSON.stringify({
                    error: "user_question ve user_id parametreleri gerekli",
                }),
                {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json",
                    },
                    status: 400,
                },
            );
        }

        // Admin client ve API key'leri al
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        if (!geminiApiKey) {
            throw new Error("GEMINI_API_KEY bulunamadı");
        }

        const context: AgentContext = {
            user_id,
            adminClient,
            geminiApiKey,
        };

        console.log(`[MAIN_BRAIN] Kullanıcı sorusu: "${user_question}"`);

        // Agent döngüsünü başlat
        const rawAnswer = await runAgentLoop(user_question, context);

        // 🧠💝 ETİK VE EMPATİ FİLTRESİ - AI'IN VİCDANI
        console.log(`[MAIN_BRAIN] 🔍 Cevap etik filtreden geçiriliyor...`);
        const ethicallyFilteredAnswer = await applyEthicsAndEmpathyFilter(
            rawAnswer,
            context,
        );

        return new Response(
            JSON.stringify({
                success: true,
                answer: ethicallyFilteredAnswer,
                timestamp: new Date().toISOString(),
                ethics_applied: true,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error: unknown) {
        console.error("[MAIN_BRAIN] Kritik hata:", error);
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
