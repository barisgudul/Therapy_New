// supabase/functions/run-simulation/index.ts
// THE SIMULATION ENGINE - "Hayal Eden" AI
// Bu fonksiyon, kullanıcının dijital ikizi olarak senaryoları simüle eder

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// === TIP TANIMLAMALARI ===
interface SimulationRequest {
  user_id: string;
  setup_prompt: string;
  trigger_prediction_id?: string;
  simulation_type?:
    | "scenario_walkthrough"
    | "social_interaction"
    | "stress_test";
  _duration_minutes?: number;
}

interface SimulationLogEntry {
  step: number;
  timestamp: string;
  type: "thought" | "action" | "dialogue" | "emotion" | "physical_response";
  actor: "self" | "other" | "environment";
  content: string;
  intensity?: number; // 0-1 arası, duygu yoğunluğu için
  trigger?: string; // Bu adımı tetikleyen önceki adım
}

interface UserDnaSnapshot {
  sentiment_score: number;
  energy_level: number;
  complexity_score: number;
  introspection_depth: number;
  social_connection: number;
  snapshot_time: string;
}

interface SimulationContext {
  user_id: string;
  user_dna: UserDnaSnapshot;
  recent_memories: string[];
  setup_prompt: string;
  simulation_type: string;
  adminClient: unknown;
  geminiApiKey: string;
}

// === HATA AYIKLAMA ===
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// === KULLANICI DNA'SINI AL ===
async function getUserDnaSnapshot(
  userId: string,
  adminClient: unknown,
): Promise<UserDnaSnapshot> {
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("user_dna")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.warn(
      `[SIMULATION] DNA alınamadı: ${error.message}, varsayılan değerler kullanılıyor`,
    );
    // Varsayılan DNA değerleri
    return {
      sentiment_score: 0,
      energy_level: 0.5,
      complexity_score: 0.5,
      introspection_depth: 0.5,
      social_connection: 0.5,
      snapshot_time: new Date().toISOString(),
    };
  }

  return {
    sentiment_score: data.sentiment_score,
    energy_level: data.energy_level,
    complexity_score: data.complexity_score,
    introspection_depth: data.introspection_depth,
    social_connection: data.social_connection,
    snapshot_time: new Date().toISOString(),
  };
}

// === SON ANILARI AL ===
async function getRecentMemories(
  userId: string,
  adminClient: unknown,
): Promise<string[]> {
  // deno-lint-ignore no-explicit-any
  const { data, error } = await (adminClient as any)
    .from("cognitive_memories")
    .select("content")
    .eq("user_id", userId)
    .order("event_time", { ascending: false })
    .limit(5);

  if (error || !data) {
    console.warn(`[SIMULATION] Anılar alınamadı: ${error?.message}`);
    return [];
  }

  // data'nın tipini belirt, 'content' alanı string olmalı
  return (data as { content: string }[]).map((memory: { content: string }) =>
    memory.content
  );
}

// === SIMÜLASYON PROMPT'U OLUŞTUR ===
function createSimulationPrompt(context: SimulationContext): string {
  const dnaDescription = `
**Mevcut DNA Profilin:**
- Duygu Durumu: ${
    context.user_dna.sentiment_score > 0
      ? "Pozitif"
      : context.user_dna.sentiment_score < 0
      ? "Negatif"
      : "Nötr"
  } (${context.user_dna.sentiment_score})
- Enerji Seviyesi: ${
    context.user_dna.energy_level > 0.7
      ? "Yüksek"
      : context.user_dna.energy_level < 0.3
      ? "Düşük"
      : "Orta"
  } (${context.user_dna.energy_level})
- Karmaşıklık: ${
    context.user_dna.complexity_score > 0.7 ? "Yüksek" : "Orta"
  } (${context.user_dna.complexity_score})
- İçe Dönüklük: ${
    context.user_dna.introspection_depth > 0.7 ? "Yüksek" : "Orta"
  } (${context.user_dna.introspection_depth})
- Sosyal Bağlantı: ${
    context.user_dna.social_connection > 0.7
      ? "Yüksek"
      : context.user_dna.social_connection < 0.3
      ? "Düşük"
      : "Orta"
  } (${context.user_dna.social_connection})`;

  const recentContext = context.recent_memories.length > 0
    ? context.recent_memories.map((memory, i) =>
      `${i + 1}. ${memory.substring(0, 150)}...`
    ).join("\n")
    : "Son anılar mevcut değil.";

  return `
### ROL: DİJİTAL İKİZ SİMÜLATÖRÜ ###
Sen, Kullanıcı X'in dijital bir kopyasısın. Onun DNA'sına ve anılarına sahipsin. 
Görevin, sana verilen bir senaryoyu onun zihninde yaşamak ve olası sonuçları ortaya çıkarmaktır.

${dnaDescription}

### SON ANILAR ###
${recentContext}

### BAŞLANGIÇ SENARYOSU ###
"${context.setup_prompt}"

### SİMÜLASYON GÖREVİ ###
Bu senaryoyu kullanıcının zihninde adım adım yaşa. Her adımda:
1. İç düşünceleri (thoughts)
2. Fiziksel tepkileri (physical_response) 
3. Eylemleri (actions)
4. Diyalogları (dialogue)
5. Duygusal değişimleri (emotion)

### KRİTİK KURALLAR ###
1. **Gerçekçi Ol**: DNA profiline uy. Düşük enerji varsa çabuk yorulma, yüksek kaygı varsa endişeli düşün.
2. **Detaylı Ol**: "Stresli hissettim" değil, "Kalbim hızlandı, avuç içlerim terledi, 'ya başaramazsam' diye düşündüm"
3. **Kronolojik Ol**: Her adımın bir öncekinden mantıklı şekilde çıkması lazım.
4. **İnsan Ol**: Mükemmel değilsin, çelişkili düşünceler, rasyonel olmayan korkular normal.

### ÇIKTI FORMATI ###
Cevabını SADECE JSON array olarak ver. Başka hiçbir metin ekleme:

[
  {
    "step": 1,
    "timestamp": "2024-01-15T09:00:00Z",
    "type": "thought",
    "actor": "self",
    "content": "Senaryoya girerken ilk düşüncem...",
    "intensity": 0.7
  },
  {
    "step": 2,
    "timestamp": "2024-01-15T09:00:30Z", 
    "type": "physical_response",
    "actor": "self",
    "content": "Kalbim hızlanıyor, nefesim sıklaşıyor.",
    "intensity": 0.6
  },
  {
    "step": 3,
    "timestamp": "2024-01-15T09:01:00Z",
    "type": "action", 
    "actor": "self",
    "content": "Derin bir nefes alıp..."
  }
]

### ADIM SAYISI ###
${
    context.simulation_type === "stress_test"
      ? "15-20 adım"
      : context.simulation_type === "social_interaction"
      ? "10-15 adım"
      : "8-12 adım"
  } simüle et.
`.trim();
}

// === SIMÜLASYON ÇALIŞTIR ===
async function runSimulation(context: SimulationContext): Promise<{
  simulation_log: SimulationLogEntry[];
  outcome_summary: string;
  confidence_score: number;
  duration_minutes: number;
}> {
  console.log(
    `[SIMULATION] Simülasyon başlatılıyor: ${context.simulation_type}`,
  );

  try {
    // 1) Simülasyon prompt'u oluştur
    const simulationPrompt = createSimulationPrompt(context);

    // 2) AI'dan simülasyon log'unu al
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${context.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: simulationPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API hatası: ${response.statusText}`);
    }

    const data = await response.json();
    const jsonText = data.candidates[0].content.parts[0].text;
    const simulation_log: SimulationLogEntry[] = JSON.parse(jsonText);

    console.log(`[SIMULATION] ${simulation_log.length} adım simüle edildi`);

    // 3) Simülasyon özetini oluştur
    const summaryPrompt = `
Bu simülasyon log'una dayanarak 2-3 cümlelik bir özet yaz:

${JSON.stringify(simulation_log, null, 2)}

Özet şu formatta olsun:
"Kullanıcı [senaryo] durumunda [ana tepki] gösterdi. [Kilit gözlem]. [Sonuç/öğreni]."
        `;

    const summaryResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${context.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: summaryPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          },
        }),
      },
    );

    let outcome_summary = "Simülasyon tamamlandı.";
    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      outcome_summary = summaryData.candidates[0].content.parts[0].text
        .trim();
    }

    // 4) Güvenilirlik skoru hesapla (basit metrik)
    const thoughtCount = simulation_log.filter((entry) =>
      entry.type === "thought"
    ).length;
    const actionCount = simulation_log.filter((entry) =>
      entry.type === "action"
    ).length;
    const totalSteps = simulation_log.length;

    // Düşünce/eylem dengesi iyi ise güvenilirlik yüksek
    const balance_score =
      Math.min(thoughtCount / totalSteps, actionCount / totalSteps) * 2;
    const length_score = Math.min(totalSteps / 10, 1); // 10 adım ideal
    const confidence_score = Math.min(
      (balance_score + length_score) / 2,
      1,
    );

    // 5) Süre hesapla (simülasyon adımlarından)
    const startTime = new Date(
      simulation_log[0]?.timestamp || new Date().toISOString(),
    );
    const endTime = new Date(
      simulation_log[simulation_log.length - 1]?.timestamp ||
        new Date().toISOString(),
    );
    const duration_minutes = Math.max(
      1,
      Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)),
    );

    return {
      simulation_log,
      outcome_summary,
      confidence_score: Number(confidence_score.toFixed(2)),
      duration_minutes,
    };
  } catch (error) {
    console.error(`[SIMULATION] Simülasyon hatası:`, error);
    throw new Error(
      `Simülasyon çalıştırılamadı: ${getErrorMessage(error)}`,
    );
  }
}

// === ANA SUPABASE FONKSİYONU ===
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody: SimulationRequest = await req.json();
    const {
      user_id,
      setup_prompt,
      trigger_prediction_id,
      simulation_type = "scenario_walkthrough",
      _duration_minutes = 30,
    } = requestBody;

    if (!user_id || !setup_prompt) {
      return new Response(
        JSON.stringify({
          error: "user_id ve setup_prompt parametreleri gerekli",
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

    // Admin client ve API key
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY bulunamadı");
    }

    console.log(
      `[SIMULATION] Yeni simülasyon isteği: ${user_id.substring(0, 8)}...`,
    );

    // 1) Kullanıcı verilerini topla
    const [user_dna, recent_memories] = await Promise.all([
      getUserDnaSnapshot(user_id, adminClient),
      getRecentMemories(user_id, adminClient),
    ]);

    // 2) Simülasyon context'i oluştur
    const context: SimulationContext = {
      user_id,
      user_dna,
      recent_memories,
      setup_prompt,
      simulation_type,
      adminClient,
      geminiApiKey,
    };

    // 3) Simülasyonu çalıştır
    const simulationResult = await runSimulation(context);

    // 4) Sonuçları veritabanına kaydet
    const { data: savedSimulation, error: saveError } = await adminClient
      .from("simulations")
      .insert({
        user_id,
        setup_prompt,
        trigger_prediction_id,
        simulation_log: simulationResult.simulation_log,
        outcome_summary: simulationResult.outcome_summary,
        user_dna_snapshot: user_dna,
        simulation_type,
        duration_minutes: simulationResult.duration_minutes,
        confidence_score: simulationResult.confidence_score,
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (saveError) {
      console.error("[SIMULATION] Kaydetme hatası:", saveError);
      throw new Error(`Simülasyon kaydedilemedi: ${saveError.message}`);
    }

    console.log(
      `[SIMULATION] ✅ Simülasyon tamamlandı ve kaydedildi: ${savedSimulation.id}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        simulation_id: savedSimulation.id,
        outcome_summary: simulationResult.outcome_summary,
        confidence_score: simulationResult.confidence_score,
        duration_minutes: simulationResult.duration_minutes,
        steps_count: simulationResult.simulation_log.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    console.error("[SIMULATION] Kritik hata:", error);
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
