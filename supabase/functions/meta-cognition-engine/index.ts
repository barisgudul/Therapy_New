// supabase/functions/meta-cognition-engine/index.ts
// SEVİYE 3: META-COGNITION ENGINE - "Kendini Düşünen" AI
// Bu sistem, AI'ın kendi kararlarını analiz etmesi ve öğrenmesi için

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// === TIP TANIMLAMALARI ===
interface MetaCognitionRequest {
  trigger_type:
    | "decision_review"
    | "pattern_analysis"
    | "strategy_refinement"
    | "performance_audit";
  analysis_scope?: "user_specific" | "system_wide" | "category_specific";
  target_user_id?: string;
  target_category?: string;
  lookback_hours?: number;
}

interface DecisionAnalysis {
  decision_id: string;
  performance_score: number; // 0-1 arası
  improvement_suggestions: string[];
  pattern_matches: string[];
  confidence_calibration: number; // AI'ın özgüveninin doğruluğu
}

interface PatternInsight {
  pattern_name: string;
  current_effectiveness: number;
  suggested_modifications: Record<string, unknown>;
  evidence_strength: number;
}

interface StrategyRefinement {
  category: string;
  old_approach: Record<string, unknown>;
  new_approach: Record<string, unknown>;
  expected_improvement: number;
  risk_assessment: string;
}

interface DecisionRecord {
  id: string;
  user_id: string;
  decision_context: string;
  decision_made: string;
  reasoning?: string;
  execution_result?: Record<string, unknown>;
  user_satisfaction_score?: number;
  confidence_level?: number;
  alternative_decisions?: string[];
  decision_speed_ms?: number;
  decision_category: string;
  complexity_level?: string;
  created_at: string;
}

interface PatternRecord {
  pattern_name: string;
  pattern_condition: Record<string, unknown>;
  success_rate: number;
  total_applications: number;
  updated_at?: string;
}

// === HATA AYIKLAMA ===
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// === KARAR ANALİZİ: AI'ın geçmiş kararlarını değerlendirme ===
async function analyzeRecentDecisions(
  adminClient: SupabaseClient,
  userId?: string,
  lookbackHours: number = 24,
): Promise<DecisionAnalysis[]> {
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - lookbackHours);

  let query = adminClient
    .from("ai_decision_log")
    .select("*")
    .gte("created_at", cutoffTime.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data: decisions, error } = await query;

  if (error) {
    console.error("[META-COGNITION] Karar geçmişi alınamadı:", error);
    return [];
  }

  if (!decisions || decisions.length === 0) {
    return [];
  }

  const analyses: DecisionAnalysis[] = [];

  for (const decision of decisions) {
    // Her karar için performans analizi
    const performanceScore = calculateDecisionPerformance(
      decision as DecisionRecord,
    );
    const suggestions = generateImprovementSuggestions(
      decision as DecisionRecord,
    );
    const patternMatches = await findMatchingPatterns(
      adminClient,
      decision as DecisionRecord,
    );
    const confidenceCalibration = calculateConfidenceCalibration(
      decision as DecisionRecord,
    );

    analyses.push({
      decision_id: decision.id,
      performance_score: performanceScore,
      improvement_suggestions: suggestions,
      pattern_matches: patternMatches,
      confidence_calibration: confidenceCalibration,
    });
  }

  return analyses;
}

// === KARAR PERFORMANSI HESAPLAMA ===
function calculateDecisionPerformance(decision: DecisionRecord): number {
  let score = 0.5; // Başlangıç skoru

  // Kullanıcı memnuniyeti varsa onu kullan
  if (decision.user_satisfaction_score) {
    score = decision.user_satisfaction_score / 5.0; // 1-5 skalasını 0-1'e çevir
  }

  // Execution result başarılıysa bonus
  if (decision.execution_result?.success === true) {
    score += 0.2;
  }

  // Hız faktörü (çok hızlı veya çok yavaş kötü)
  if (decision.decision_speed_ms) {
    const speedMs = decision.decision_speed_ms;
    if (speedMs > 100 && speedMs < 5000) { // İdeal aralık
      score += 0.1;
    } else if (speedMs > 10000) { // Çok yavaş
      score -= 0.1;
    }
  }

  // Güven seviyesi kalibrasyonu
  if (decision.confidence_level && decision.user_satisfaction_score) {
    const confidenceDiff = Math.abs(
      decision.confidence_level -
        (decision.user_satisfaction_score / 5.0),
    );
    if (confidenceDiff < 0.2) { // İyi kalibre edilmiş
      score += 0.1;
    }
  }

  return Math.max(0, Math.min(1, score)); // 0-1 aralığında tut
}

// === İYİLEŞTİRME ÖNERİLERİ ÜRETME ===
function generateImprovementSuggestions(decision: DecisionRecord): string[] {
  const suggestions: string[] = [];

  // Düşük memnuniyet skoru
  if (
    decision.user_satisfaction_score && decision.user_satisfaction_score < 3
  ) {
    suggestions.push(
      "Kullanıcı memnuniyetsiz - daha empatik yaklaşım dene",
    );
    suggestions.push("Cevap formatını gözden geçir, daha açık ol");
  }

  // Yavaş karar verme
  if (decision.decision_speed_ms && decision.decision_speed_ms > 8000) {
    suggestions.push(
      "Karar verme süreci çok yavaş - öncelik sırasını gözden geçir",
    );
    suggestions.push("Daha basit heuristikler kullanmayı dene");
  }

  // Düşük güven seviyesi
  if (decision.confidence_level && decision.confidence_level < 0.5) {
    suggestions.push(
      "Güven seviyesi düşük - daha fazla veri toplamayı dene",
    );
    suggestions.push("Belirsizlik durumunda kullanıcıya açık söyle");
  }

  // Execution hatası
  if (decision.execution_result?.success === false) {
    suggestions.push("Execution başarısız - hata yönetimini iyileştir");
    suggestions.push("Fallback stratejileri geliştir");
  }

  // Karmaşıklık seviyesi vs performans
  if (
    decision.complexity_level === "complex" &&
    decision.user_satisfaction_score && decision.user_satisfaction_score < 4
  ) {
    suggestions.push("Karmaşık durumları daha basit parçalara böl");
    suggestions.push("Adım adım açıklama yap");
  }

  return suggestions;
}

// === KALIP EŞLEŞTİRME ===
async function findMatchingPatterns(
  adminClient: SupabaseClient,
  decision: DecisionRecord,
): Promise<string[]> {
  const { data: patterns, error } = await adminClient
    .from("ai_learning_patterns")
    .select("pattern_name, pattern_condition, success_rate")
    .eq("category", decision.decision_category)
    .eq("is_active", true)
    .order("success_rate", { ascending: false });

  if (error || !patterns) {
    return [];
  }

  const matchingPatterns: string[] = [];

  for (const pattern of patterns) {
    // Basit pattern matching (gerçek implementasyonda daha sofistike olabilir)
    if (pattern.success_rate > 70) { // Başarılı kalıplar
      matchingPatterns.push(pattern.pattern_name);
    }
  }

  return matchingPatterns.slice(0, 3); // En fazla 3 kalıp
}

// === GÜVENİLİRLİK KALİBRASYONU ===
function calculateConfidenceCalibration(decision: DecisionRecord): number {
  if (!decision.confidence_level || !decision.user_satisfaction_score) {
    return 0.5; // Belirsiz
  }

  const aiConfidence = decision.confidence_level;
  const actualSuccess = decision.user_satisfaction_score / 5.0;

  // AI ne kadar iyi kalibre edilmiş? (1 = mükemmel, 0 = berbat)
  const calibration = 1 - Math.abs(aiConfidence - actualSuccess);
  return Math.max(0, calibration);
}

// === KALIP ANALİZİ: Mevcut kalıpların etkinliğini değerlendirme ===
async function analyzePatternEffectiveness(
  adminClient: SupabaseClient,
  category?: string,
): Promise<PatternInsight[]> {
  let query = adminClient
    .from("ai_learning_patterns")
    .select("*")
    .eq("is_active", true);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: patterns, error } = await query;

  if (error || !patterns) {
    console.error("[META-COGNITION] Kalıplar alınamadı:", error);
    return [];
  }

  const insights: PatternInsight[] = [];

  for (const pattern of patterns) {
    const effectiveness = pattern.success_rate / 100.0;
    const suggestions = generatePatternImprovements(
      pattern as PatternRecord,
    );
    const evidence = calculateEvidenceStrength(pattern as PatternRecord);

    insights.push({
      pattern_name: pattern.pattern_name,
      current_effectiveness: effectiveness,
      suggested_modifications: suggestions,
      evidence_strength: evidence,
    });
  }

  // Etkinliğe göre sırala
  insights.sort((a, b) => b.current_effectiveness - a.current_effectiveness);

  return insights;
}

// === KALIP İYİLEŞTİRME ÖNERİLERİ ===
function generatePatternImprovements(
  pattern: PatternRecord,
): Record<string, unknown> {
  const improvements: Record<string, unknown> = {};

  // Düşük başarı oranı
  if (pattern.success_rate < 60) {
    improvements.priority = "high";
    improvements.suggestions = [
      "Kalıp koşullarını gözden geçir",
      "Daha spesifik tetikleyiciler ekle",
      "Başarısız durumları analiz et",
    ];
  }

  // Çok az uygulanmış
  if (pattern.total_applications < 5) {
    improvements.data_quality = "insufficient";
    improvements.recommendations = [
      "Daha fazla veri topla",
      "Kalıp koşullarını genişlet",
    ];
  }

  // Uzun süredir güncellenmeyen
  if (pattern.updated_at) {
    const daysSinceUpdate =
      (Date.now() - new Date(pattern.updated_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 30) {
      improvements.freshness = "stale";
      improvements.action = "Kalıbı güncel verilerle yeniden değerlendir";
    }
  }

  return improvements;
}

// === KANIT GÜCÜ HESAPLAMA ===
function calculateEvidenceStrength(pattern: PatternRecord): number {
  let strength = 0;

  // Uygulama sayısı
  const applications = pattern.total_applications || 0;
  if (applications > 20) strength += 0.4;
  else if (applications > 10) strength += 0.3;
  else if (applications > 5) strength += 0.2;
  else strength += 0.1;

  // Başarı oranı tutarlılığı
  if (pattern.success_rate > 80) strength += 0.3;
  else if (pattern.success_rate > 60) strength += 0.2;
  else strength += 0.1;

  // Güncellik
  if (pattern.updated_at) {
    const daysSinceUpdate =
      (Date.now() - new Date(pattern.updated_at).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) strength += 0.3;
    else if (daysSinceUpdate < 30) strength += 0.2;
    else strength += 0.1;
  }

  return Math.min(1, strength);
}

// === STRATEJİ İYİLEŞTİRME ÖNERİLERİ ===
async function generateStrategyRefinements(
  _adminClient: SupabaseClient,
  geminiApiKey: string,
  analysisResults: {
    decisions: DecisionAnalysis[];
    patterns: PatternInsight[];
  },
): Promise<StrategyRefinement[]> {
  // Düşük performanslı alanları tespit et
  const problemAreas = identifyProblemAreas(analysisResults);

  const refinements: StrategyRefinement[] = [];

  for (const area of problemAreas) {
    // AI'dan iyileştirme önerisi al
    const refinementPrompt = createRefinementPrompt(area, analysisResults);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: refinementPrompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.4,
              maxOutputTokens: 1000,
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const refinement = JSON.parse(
          data.candidates[0].content.parts[0].text,
        );
        refinements.push(refinement);
      }
    } catch (error) {
      console.error(
        `[META-COGNITION] Strateji iyileştirme hatası:`,
        error,
      );
    }
  }

  return refinements;
}

// === PROBLEM ALANLARI TESPİTİ ===
function identifyProblemAreas(analysisResults: {
  decisions: DecisionAnalysis[];
  patterns: PatternInsight[];
}): string[] {
  const problems: string[] = [];

  // Düşük performanslı karar kategorileri
  const categoryPerformance = new Map<string, number[]>();

  for (const decision of analysisResults.decisions) {
    // Bu kısımda decision nesnesinden category bilgisini almalıyız
    // Şimdilik genel kategoriler kullanıyoruz
    const category = "general";
    if (!categoryPerformance.has(category)) {
      categoryPerformance.set(category, []);
    }
    categoryPerformance.get(category)!.push(decision.performance_score);
  }

  // Ortalama performansı düşük kategorileri tespit et
  for (const [category, scores] of categoryPerformance) {
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avgScore < 0.6) {
      problems.push(category);
    }
  }

  // Düşük etkinlikli kalıplar
  for (const pattern of analysisResults.patterns) {
    if (pattern.current_effectiveness < 0.5) {
      problems.push(`pattern_${pattern.pattern_name}`);
    }
  }

  return problems;
}

// === İYİLEŞTİRME PROMPT'U OLUŞTURMA ===
function createRefinementPrompt(
  problemArea: string,
  _analysisResults: {
    decisions: DecisionAnalysis[];
    patterns: PatternInsight[];
  },
): string {
  return `
### GÖREV: AI STRATEJİ İYİLEŞTİRME ###

Problematik alan: "${problemArea}"

### MEVCUT PERFORMANS VERİLERİ ###
${JSON.stringify(_analysisResults, null, 2)}

### İSTENEN ÇIKTI ###
Aşağıdaki JSON formatında bir iyileştirme önerisi ver:

{
    "category": "${problemArea}",
    "old_approach": "Mevcut yaklaşımın özeti",
    "new_approach": "Önerilen yeni yaklaşım",
    "expected_improvement": 0.15,
    "risk_assessment": "Bu değişikliğin potansiyel riskleri"
}

### KURALLAR ###
1. Somut, uygulanabilir öneriler ver
2. Expected improvement gerçekçi olsun (0.05-0.30 arası)
3. Risk assessment dürüst ve detaylı olsun
4. Kullanıcı deneyimini öncelik olarak gör
`.trim();
}

// === ANA SUPABASE FONKSİYONU ===
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody: MetaCognitionRequest = await req.json();
    const {
      trigger_type,
      analysis_scope = "system_wide",
      target_user_id,
      target_category,
      lookback_hours = 24,
    } = requestBody;

    // Admin client ve API key
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY bulunamadı");
    }

    const analysisResult: Record<string, unknown> = {};

    switch (trigger_type) {
      case "decision_review": {
        analysisResult.decisions = await analyzeRecentDecisions(
          adminClient,
          target_user_id,
          lookback_hours,
        );
        break;
      }

      case "pattern_analysis": {
        analysisResult.patterns = await analyzePatternEffectiveness(
          adminClient,
          target_category,
        );
        break;
      }

      case "strategy_refinement": {
        const decisions = await analyzeRecentDecisions(
          adminClient,
          target_user_id,
          lookback_hours,
        );
        const patterns = await analyzePatternEffectiveness(
          adminClient,
          target_category,
        );
        analysisResult.refinements = await generateStrategyRefinements(
          adminClient,
          geminiApiKey,
          { decisions, patterns },
        );
        break;
      }

      case "performance_audit": {
        analysisResult.decisions = await analyzeRecentDecisions(
          adminClient,
          target_user_id,
          lookback_hours,
        );
        analysisResult.patterns = await analyzePatternEffectiveness(
          adminClient,
          target_category,
        );
        break;
      }

      default:
        throw new Error(`Desteklenmeyen analiz türü: ${trigger_type}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        trigger_type,
        analysis_scope,
        timestamp: new Date().toISOString(),
        results: analysisResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("[META-COGNITION] Kritik hata:", error);
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
