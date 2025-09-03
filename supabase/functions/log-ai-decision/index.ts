// supabase/functions/log-ai-decision/index.ts
// SEVİYE 3: AI DECISION LOGGER - Her AI kararını otomatik kaydetme
// Bu sistem, AI'ın aldığı her kararı detaylı şekilde loglar

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// === TIP TANIMLAMALARI ===
interface DecisionLogRequest {
  user_id: string;
  decision_context: string;
  decision_made: string;
  reasoning?: string;
  execution_result?: {
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    execution_time_ms?: number;
  };
  confidence_level?: number; // 0-1 arası
  alternative_decisions?: string[];
  decision_category:
    | "therapy_session"
    | "dream_analysis"
    | "prediction"
    | "simulation"
    | "general";
  complexity_level?: "simple" | "medium" | "complex";
  decision_start_time?: string; // ISO string
}

interface DecisionMetrics {
  decision_speed_ms: number;
  confidence_calibration_score?: number;
  context_complexity_score: number;
}

// === HATA AYIKLAMA ===
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// === KARAR METRİKLERİNİ HESAPLAMA ===
function calculateDecisionMetrics(
  request: DecisionLogRequest,
): DecisionMetrics {
  // Karar verme süresi
  let decisionSpeedMs = 0;
  if (request.decision_start_time) {
    const startTime = new Date(request.decision_start_time).getTime();
    const endTime = Date.now();
    decisionSpeedMs = endTime - startTime;
  } else if (request.execution_result?.execution_time_ms) {
    decisionSpeedMs = request.execution_result.execution_time_ms;
  }

  // Bağlam karmaşıklığı skoru
  const contextComplexityScore = calculateContextComplexity(request);

  return {
    decision_speed_ms: decisionSpeedMs,
    context_complexity_score: contextComplexityScore,
  };
}

// === BAĞLAM KARMAŞIKLIK SKORU ===
function calculateContextComplexity(request: DecisionLogRequest): number {
  let complexity = 0;

  // Karar kategorisine göre temel karmaşıklık
  const categoryComplexity = {
    "simple": 0.2,
    "medium": 0.5,
    "complex": 0.8,
  };
  complexity += categoryComplexity[request.complexity_level || "medium"];

  // Alternatif karar sayısı
  if (request.alternative_decisions) {
    complexity += Math.min(0.3, request.alternative_decisions.length * 0.1);
  }

  // Bağlam metninin uzunluğu
  const contextLength = request.decision_context.length;
  if (contextLength > 500) complexity += 0.2;
  else if (contextLength > 200) complexity += 0.1;

  // Reasoning varsa karmaşıklık artar
  if (request.reasoning && request.reasoning.length > 100) {
    complexity += 0.1;
  }

  return Math.min(1, complexity);
}

// === GÜVEN SEVİYESİ VALİDASYONU ===
function validateConfidenceLevel(confidence?: number): number | null {
  if (confidence === undefined || confidence === null) return null;
  if (confidence < 0 || confidence > 1) return null;
  return Math.round(confidence * 100) / 100; // 2 ondalık basamağa yuvarla
}

// === KARAR KATEGORİSİ VALİDASYONU ===
function validateDecisionCategory(category: string): boolean {
  const validCategories = [
    "therapy_session",
    "dream_analysis",
    "prediction",
    "simulation",
    "general",
  ];
  return validCategories.includes(category);
}

// === OTOMATİK PATTERN MATCHING ===
async function findMatchingPatterns(
  adminClient: SupabaseClient,
  request: DecisionLogRequest,
): Promise<string[]> {
  try {
    // Aynı kategorideki başarılı kalıpları bul
    const { data: patterns, error } = await adminClient
      .from("ai_learning_patterns")
      .select("pattern_name, pattern_condition, success_rate")
      .eq("category", request.decision_category)
      .eq("is_active", true)
      .gte("success_rate", 70) // Başarılı kalıplar
      .order("success_rate", { ascending: false })
      .limit(5);

    if (error || !patterns) return [];

    const matchingPatterns: string[] = [];

    // Basit pattern matching (gelecekte ML ile iyileştirilebilir)
    for (const pattern of patterns) {
      // Karar bağlamında pattern koşullarıyla eşleşme var mı?
      if (
        doesContextMatchPattern(
          request.decision_context,
          pattern.pattern_condition,
        )
      ) {
        matchingPatterns.push(pattern.pattern_name);
      }
    }

    return matchingPatterns;
  } catch (error) {
    console.error("[DECISION_LOGGER] Pattern matching hatası:", error);
    return [];
  }
}

// === BAĞLAM-KALIP EŞLEŞTİRMESİ ===
function doesContextMatchPattern(
  context: string,
  patternCondition: unknown,
): boolean {
  // Basit keyword matching (gelecekte daha sofistike olabilir)
  const contextLower = context.toLowerCase();

  try {
    // Pattern condition'ı parse et
    if (typeof patternCondition === "string") {
      return contextLower.includes(patternCondition.toLowerCase());
    }

    if (typeof patternCondition === "object") {
      // JSON pattern condition için basit kontrol
      const conditionStr = JSON.stringify(patternCondition).toLowerCase();
      return contextLower.includes("dream") &&
          conditionStr.includes("dream") ||
        contextLower.includes("therapy") &&
          conditionStr.includes("therapy") ||
        contextLower.includes("prediction") &&
          conditionStr.includes("prediction");
    }

    return false;
  } catch (_error) {
    return false;
  }
}

// === PERFORMANS METRİKLERİNİ GÜNCELLEME ===
async function updateSystemMetrics(
  adminClient: SupabaseClient,
  decisionCategory: string,
  metrics: DecisionMetrics,
  success: boolean,
): Promise<void> {
  try {
    const now = new Date();
    const metricTimestamp = now.toISOString();

    // Kategori bazında ortalama karar süresi
    await adminClient.from("system_performance_metrics").upsert({
      metric_name: `avg_decision_time_${decisionCategory}`,
      metric_value: metrics.decision_speed_ms,
      metric_unit: "milliseconds",
      measurement_context: { category: decisionCategory },
      measured_at: metricTimestamp,
    });

    // Başarı oranı
    await adminClient.from("system_performance_metrics").upsert({
      metric_name: `success_rate_${decisionCategory}`,
      metric_value: success ? 1 : 0,
      metric_unit: "boolean",
      measurement_context: { category: decisionCategory },
      measured_at: metricTimestamp,
    });

    // Karmaşıklık skoru
    await adminClient.from("system_performance_metrics").upsert({
      metric_name: `avg_complexity_${decisionCategory}`,
      metric_value: metrics.context_complexity_score,
      metric_unit: "score",
      measurement_context: { category: decisionCategory },
      measured_at: metricTimestamp,
    });
  } catch (error) {
    console.error(
      "[DECISION_LOGGER] Sistem metrikleri güncellenemedi:",
      error,
    );
    // Hata olsa da ana işlemi durdurma
  }
}

// === ANA SUPABASE FONKSİYONU ===
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody: DecisionLogRequest = await req.json();
    const {
      user_id,
      decision_context,
      decision_made,
      reasoning,
      execution_result,
      confidence_level,
      alternative_decisions = [],
      decision_category,
      complexity_level = "medium",
      decision_start_time: _decision_start_time,
    } = requestBody;

    // Temel validasyonlar
    if (
      !user_id || !decision_context || !decision_made ||
      !decision_category
    ) {
      return new Response(
        JSON.stringify({
          error:
            "user_id, decision_context, decision_made ve decision_category gerekli",
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

    if (!validateDecisionCategory(decision_category)) {
      return new Response(
        JSON.stringify({
          error: "Geçersiz decision_category",
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

    // Admin client
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Metrikleri hesapla
    const metrics = calculateDecisionMetrics(requestBody);
    const validatedConfidence = validateConfidenceLevel(confidence_level);

    // Matching patterns bul
    const matchingPatterns = await findMatchingPatterns(
      adminClient,
      requestBody,
    );

    // Kararı veritabanına kaydet
    const { data: savedDecision, error: insertError } = await adminClient
      .from("ai_decision_log")
      .insert({
        user_id,
        decision_context: decision_context.substring(0, 2000), // Uzunluk sınırı
        decision_made: decision_made.substring(0, 1000),
        reasoning: reasoning?.substring(0, 1000),
        execution_result,
        confidence_level: validatedConfidence,
        alternative_decisions,
        decision_speed_ms: metrics.decision_speed_ms,
        decision_category,
        complexity_level,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(
        "[DECISION_LOGGER] Karar kaydedilemedi:",
        insertError,
      );
      throw new Error(`Karar kaydedilemedi: ${insertError.message}`);
    }

    // Sistem metriklerini güncelle (arka planda)
    const isSuccess = execution_result?.success !== false;
    updateSystemMetrics(adminClient, decision_category, metrics, isSuccess)
      .catch((error) =>
        console.error(
          "[DECISION_LOGGER] Metrik güncellemesi başarısız:",
          error,
        )
      );

    // Eğer çok fazla karar varsa, eski kayıtları temizle (arka planda)
    cleanupOldDecisions(adminClient, user_id)
      .catch((error) =>
        console.error(
          "[DECISION_LOGGER] Eski kayıt temizliği başarısız:",
          error,
        )
      );

    return new Response(
      JSON.stringify({
        success: true,
        decision_id: savedDecision.id,
        metrics: {
          decision_speed_ms: metrics.decision_speed_ms,
          complexity_score: metrics.context_complexity_score,
          matching_patterns: matchingPatterns,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("[DECISION_LOGGER] Kritik hata:", error);
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

// === ESKİ KAYITLARI TEMİZLEME (Arka plan işlemi) ===
async function cleanupOldDecisions(
  adminClient: SupabaseClient,
  userId: string,
): Promise<void> {
  try {
    // Kullanıcı başına son 1000 kaydı tut, eskilerini sil
    const { data: oldDecisions, error } = await adminClient
      .from("ai_decision_log")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(1000, 2000); // 1000'den sonrakiler

    if (error || !oldDecisions || oldDecisions.length === 0) return;

    const oldIds = oldDecisions.map((d: { id: string }) => d.id);
    await adminClient
      .from("ai_decision_log")
      .delete()
      .in("id", oldIds);
  } catch (error) {
    console.error("[DECISION_LOGGER] Temizlik hatası:", error);
  }
}
