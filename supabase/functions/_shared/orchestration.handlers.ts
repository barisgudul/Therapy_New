// supabase/functions/_shared/orchestration.handlers.ts

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { InteractionContext } from "./types/context.ts";
import { ValidationError } from "./errors.ts";
import { supabase as adminClient } from "./supabase-admin.ts";
import * as AiService from "./ai.service.ts";
import * as RagService from "./rag.service.ts";
import { getDreamAnalysisV2Prompt } from "./prompts/dreamAnalysisV2.prompt.ts";
import * as VaultService from "./vault.service.ts";
import { getDailyReflectionPrompt } from "./prompts/dailyReflection.prompt.ts";
import type { VaultData } from "./types/context.ts";

// ===============================================
// ZOD ŞEMALARI VE DOĞRULAMA
// ===============================================

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

function parseAndValidateJson(
  raw: string,
): z.infer<typeof DreamAnalysisResultSchema> | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("Doğrulama Hatası: Metinde JSON bloğu bulunamadı.");
      return null;
    }
    const parsed = JSON.parse(match[0]);
    const result = DreamAnalysisResultSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Zod Doğrulama Hatası:", result.error.flatten());
      return null;
    }
    return result.data;
  } catch (e) {
    console.error("JSON Ayrıştırma Hatası:", e);
    return null;
  }
}

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

// ===============================================
// RÜYA ANALİZİ İÇİN YARDIMCI BEYİN FONKSİYONLARI
// ===============================================

async function prepareDreamContext(userId: string) {
  const [vaultResult, eventsResult, predictionsResult, journeyLogsResult] =
    await Promise.all([
      adminClient.from("user_vaults").select("vault_data").eq("user_id", userId)
        .single(),
      adminClient.from("events").select("type, created_at, data").eq(
        "user_id",
        userId,
      ).order("created_at", { ascending: false }).limit(5),
      adminClient.from("predicted_outcomes").select("title, description").eq(
        "user_id",
        userId,
      ).gt("expires_at", new Date().toISOString()),
      adminClient.from("journey_logs").select("log_text").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(3),
    ]);

  const vaultData: VaultData =
    (vaultResult.data?.vault_data ?? {}) as VaultData;
  const context = `
        ### KULLANICI DOSYASI ###
        **Kişilik Özellikleri:** ${JSON.stringify(vaultData.traits || {})}
        **Temel Hedefleri:** ${
    vaultData.profile?.therapyGoals || "Belirtilmemiş"
  }
        **Son Olaylar (48 Saat):** ${
    (() => {
      const rows = (eventsResult.data ?? []) as {
        type: string;
        data: Record<string, unknown>;
      }[];
      return rows.length > 0
        ? rows.map((e) =>
          `- ${e.type}: ${JSON.stringify(e.data).substring(0, 50)}...`
        ).join("\n")
        : "Kayıt yok.";
    })()
  }
        **Aktif Öngörüler/Kaygılar:** ${
    (() => {
      const rows = (predictionsResult.data ?? []) as {
        title: string;
        description: string;
      }[];
      return rows.length > 0
        ? rows.map((p) => `- ${p.title}: ${p.description}`).join("\n")
        : "Aktif öngörü yok.";
    })()
  }
        **Kendi Seyir Defterinden Notlar:** ${
    (() => {
      const rows = (journeyLogsResult.data ?? []) as { log_text: string }[];
      return rows.length > 0
        ? rows.map((j) => `- "${j.log_text}"`).join("\n")
        : "Kayıt yok.";
    })()
  }
    `;
  return context;
}

async function getEnhancedRagContext(userId: string, dreamText: string) {
  try {
    const themePrompt =
      `Şu rüyanın 1-3 anahtar kelimelik temasını çıkar: "${dreamText}". Sadece temaları virgülle ayırarak yaz.`;
    const themes = await AiService.invokeGemini(
      themePrompt,
      "gemini-1.5-flash",
    );
    const enrichedQuery = `${dreamText} ${themes}`;
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      enrichedQuery,
    );
    return retrievedMemories.map((c) =>
      `- (Kaynak: ${c.source_layer}) ${c.content}`
    ).join("\n");
  } catch (e) {
    console.error(
      "RAG Context zenginleştirme hatası, basit RAG'e dönülüyor.",
      e,
    );
    // Fallback: Sadece rüya metni ile arama yap
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      dreamText,
    );
    return retrievedMemories.map((c) => `- ${c.content}`).join("\n");
  }
}

// ===============================================
// ANA BEYİN LOBLARI (HANDLER'LAR)
// ===============================================

/**
 * Rüya Analizi Beyin Lobu - AMELİYAT EDİLMİŞ VERSİYON
 */
export async function handleDreamAnalysis(
  context: InteractionContext,
): Promise<string> {
  console.log(
    `[ORCHESTRATOR] Gelişmiş rüya analizi başlatılıyor: ${context.transactionId}`,
  );
  const { dreamText } = context.initialEvent.data as { dreamText?: string };
  const userId = context.userId;

  if (
    !dreamText || typeof dreamText !== "string" || dreamText.trim().length < 10
  ) {
    throw new ValidationError("Analiz için yetersiz rüya metni.");
  }

  try {
    // ADIM 1 & 2: Tüm bağlamı paralel olarak topla
    const [userDossier, ragContextString] = await Promise.all([
      prepareDreamContext(userId),
      getEnhancedRagContext(userId, dreamText),
    ]);

    // ADIM 3: Master Prompt'u oluştur ve AI'ı çağır
    const masterPrompt = getDreamAnalysisV2Prompt(
      userDossier,
      ragContextString,
      dreamText,
    );
    const rawResponse = await AiService.invokeGemini(
      masterPrompt,
      "gemini-1.5-pro",
      {
        responseMimeType: "application/json",
      },
    );

    // ADIM 4: Sonucu doğrula, kaydet ve geri döndür
    const analysisData = parseAndValidateJson(rawResponse);
    if (analysisData === null) {
      throw new ValidationError("Yapay zeka tutarsız bir analiz üretti.");
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("events")
      .insert({
        user_id: userId,
        type: "dream_analysis",
        timestamp: Date.now(),
        data: {
          dreamText,
          analysis: analysisData,
          dialogue: [],
        },
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    const newEventId = String(inserted?.id ?? "");

    if (!newEventId) {
      throw new Error("Analiz üretildi ama veritabanına kaydedilemedi.");
    }

    // 🔥 YENİ LOGLAMA ADIMI 🔥
    try {
      const confidence = calculateConnectionConfidence(
        analysisData,
        userDossier,
      );
      await adminClient.from("ai_decision_log").insert({
        user_id: userId,
        decision_context: `Rüya metni: "${
          dreamText.substring(0, 200)
        }..." | Dossier: ${userDossier.substring(0, 500)}...`,
        decision_made:
          `Başlık: ${analysisData.title}. Özet: ${analysisData.summary}`,
        reasoning: JSON.stringify(analysisData.crossConnections),
        execution_result: { success: true, eventId: newEventId },
        confidence_level: confidence,
        decision_category: "dream_analysis",
        complexity_level: "complex",
      });
      console.log(
        `[ORCHESTRATOR] AI kararı başarıyla loglandı. Güven: %${
          (confidence * 100).toFixed(0)
        }`,
      );
    } catch (logError) {
      console.error("AI karar loglama hatası:", logError);
    }

    console.log(
      `[ORCHESTRATOR] Beyin ameliyatı başarılı. Yeni event ID: ${newEventId}`,
    );
    return newEventId;
  } catch (error) {
    console.error(`[ORCHESTRATOR] Rüya analizi sırasında kritik hata:`, error);
    throw error;
  }
}

/**
 * Günlük Yansıma Beyin Lobu
 */
export async function handleDailyReflection(
  context: InteractionContext,
): Promise<string> {
  console.log(
    `[ORCHESTRATOR] Günlük yansıma işleniyor: ${context.transactionId}`,
  );
  const { todayNote, todayMood } = context.initialEvent.data as {
    todayNote?: string;
    todayMood?: string;
  };
  const { userId, initialVault } = context;

  if (!todayNote || !todayMood) {
    throw new ValidationError("Yansıma için not ve duygu durumu gereklidir.");
  }

  try {
    const userName = initialVault.profile?.nickname ?? null;
    const prompt = getDailyReflectionPrompt(userName, todayMood, todayNote);
    const aiResponse = await AiService.invokeGemini(prompt, "gemini-1.5-flash");

    // Olayı kaydet
    const { error: eventInsertError } = await adminClient.from("events").insert(
      {
        user_id: userId,
        type: "daily_reflection",
        timestamp: Date.now(),
        data: { text: todayNote, aiResponse },
        mood: todayMood,
      },
    );
    if (eventInsertError) {
      console.error("[EventInsert] Hata:", eventInsertError);
    }

    // Vault güncelle (beklemeden başlat)
    const todayString = new Date().toISOString().split("T")[0];
    const newVault: VaultData & {
      currentMood?: string;
      moodHistory?: { mood: string; timestamp: string; source?: string }[];
    } = {
      ...(initialVault || {}),
      currentMood: todayMood,
      metadata: {
        ...(initialVault?.metadata || {}),
        lastDailyReflectionDate: todayString,
        dailyMessageContent: aiResponse,
      },
      moodHistory: [
        ...(initialVault?.moodHistory || []),
        {
          mood: todayMood,
          timestamp: new Date().toISOString(),
          source: "daily_reflection",
        },
      ].slice(-30),
    };
    try {
      await VaultService.updateUserVault(userId, newVault, adminClient);
    } catch (e) {
      console.error("[VaultUpdate] Hata:", e);
    }

    // Journey log (opsiyonel; mevcut olmayabilir) - try/catch ile güvenli
    // Journey log tablosuna kısa not (opsiyonel tablo yoksa sessizce geç)
    try {
      const { error: journeyError } = await adminClient.from("journey_logs")
        .insert({
          user_id: userId,
          log_text:
            `Günlük yansıma tamamlandı: ${todayMood} ruh hali kaydedildi.`,
        });
      if (journeyError) {
        // tablo olmayabilir; sessizce geç
      }
    } catch (_e) {
      // tablo olmayabilir; sessizce geç
    }

    console.log(`[ORCHESTRATOR] Günlük yansıma yanıtı üretildi.`);
    return aiResponse;
  } catch (error) {
    console.error(
      "[ORCHESTRATOR] Günlük yansıma sırasında kritik hata:",
      error,
    );
    throw error;
  }
}
// DİĞER HANDLER'LAR (şimdilik basit)
export function handleDefault(
  context: InteractionContext,
): Promise<string> {
  console.log(
    `[ORCHESTRATOR] Varsayılan handler çalıştı: ${context.initialEvent.type}`,
  );
  return Promise.resolve(
    `"${context.initialEvent.type}" tipi için işlem başarıyla alındı ancak henüz özel bir beyin lobu atanmadı.`,
  );
}

// ===============================================
// STRATEJİ HARİTASI
// ===============================================

export const eventHandlers: Record<
  string,
  (context: InteractionContext) => Promise<string>
> = {
  "dream_analysis": handleDreamAnalysis,
  "daily_reflection": handleDailyReflection,
  // Diğer tüm event'ler için varsayılan bir handler
  "text_session": handleDefault,
  "voice_session": handleDefault,
  "video_session": handleDefault,
  "ai_analysis": handleDefault,
  "diary_entry": handleDefault,
  "onboarding_completed": handleDefault,
};
