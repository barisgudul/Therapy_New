// supabase/functions/_shared/orchestration.handlers.ts

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { InteractionContext, VaultData } from "./types/context.ts";
import { ApiError, DatabaseError, ValidationError } from "./errors.ts";
import { supabase as adminClient } from "./supabase-admin.ts";
import * as AiService from "./ai.service.ts";
import * as RagService from "./rag.service.ts";
import { logRagInvocation } from "./utils/logging.service.ts";
import { getDreamAnalysisV2Prompt } from "./prompts/dreamAnalysisV2.prompt.ts";
import * as VaultService from "./vault.service.ts";
import { getTemporalReflectionPrompt } from "./prompts/dailyReflection.prompt.ts";
import {
  getDiaryConclusionPrompt,
  getDiaryNextQuestionsPrompt,
  getDiaryStartPrompt,
} from "./prompts/diary.prompt.ts";
import { LoggingService as _LoggingService } from "./utils/LoggingService.ts";
import { config } from "./config.ts";

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
  const results = await Promise.allSettled([
    adminClient.from("user_vaults").select("vault_data").eq("user_id", userId)
      .single(),
    adminClient.from("user_traits").select("trait_key, trait_value").eq(
      "user_id",
      userId,
    ),
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

  // Her bir sonucun başarılı olup olmadığını kontrol et
  const vaultResult = results[0].status === "fulfilled"
    ? results[0].value
    : { data: null, error: results[0].reason };
  const traitsResult = results[1].status === "fulfilled"
    ? results[1].value
    : { data: [], error: results[1].reason };
  const eventsResult = results[2].status === "fulfilled"
    ? results[2].value
    : { data: [], error: results[2].reason };
  const predictionsResult = results[3].status === "fulfilled"
    ? results[3].value
    : { data: [], error: results[3].reason };
  const journeyLogsResult = results[4].status === "fulfilled"
    ? results[4].value
    : { data: [], error: results[4].reason };

  // Hataları logla ama sistemi durdurma
  if (vaultResult.error) console.error("Vault çekilemedi:", vaultResult.error);
  if (traitsResult.error) {
    console.error("Traits çekilemedi:", traitsResult.error);
  }
  if (eventsResult.error) {
    console.error("Events çekilemedi:", eventsResult.error);
  }
  if (predictionsResult.error) {
    console.error("Predictions çekilemedi:", predictionsResult.error);
  }
  if (journeyLogsResult.error) {
    console.error("Journey logs çekilemedi:", journeyLogsResult.error);
  }

  const vaultData: VaultData =
    (vaultResult.data?.vault_data ?? {}) as VaultData;

  // Traits'i user_traits tablosundan al
  const traits = (traitsResult.data ?? []).reduce(
    (
      acc: Record<string, string>,
      trait: { trait_key: string; trait_value: string },
    ) => {
      acc[trait.trait_key] = trait.trait_value;
      return acc;
    },
    {} as Record<string, string>,
  );

  const context = `
        ### KULLANICI DOSYASI ###
        **Kişilik Özellikleri:** ${JSON.stringify(traits)}
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

async function getEnhancedRagContext(
  userId: string,
  dreamText: string,
  transactionId?: string,
) {
  try {
    const themePrompt =
      `Şu rüyanın 1-3 anahtar kelimelik temasını çıkar: "${dreamText}". Sadece temaları virgülle ayırarak yaz.`;
    const themes = await AiService.invokeGemini(
      themePrompt,
      config.AI_MODELS.FAST,
    );
    const enrichedQuery = `${dreamText} ${themes}`;
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      enrichedQuery,
      {
        threshold: config.RAG_PARAMS.DREAM_ANALYSIS.threshold,
        count: config.RAG_PARAMS.DREAM_ANALYSIS.count,
      }, // Rüya analizi için config'den değerler
    );
    // --- MİKROSKOP BURADA ---
    await logRagInvocation(adminClient, {
      transaction_id: transactionId,
      user_id: userId,
      source_function: "dream_analysis",
      search_query: enrichedQuery,
      retrieved_memories: retrievedMemories,
    });
    // --- KANIT KAYDEDİLDİ ---
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
      {
        threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
        count: config.RAG_PARAMS.DEFAULT.COUNT,
      }, // Fallback için config'den değerler
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
  const { logger } = context;
  logger.info("DreamAnalysis", "Gelişmiş rüya analizi başlatılıyor");
  const { dreamText } = context.initialEvent.data as { dreamText?: string };
  const userId = context.userId;

  if (
    !dreamText || typeof dreamText !== "string" || dreamText.trim().length < 10
  ) {
    throw new ValidationError("Analiz için yetersiz rüya metni.");
  }

  try {
    // ADIM 1 & 2: Tüm bağlamı paralel olarak topla
    const results = await Promise.allSettled([
      prepareDreamContext(userId),
      getEnhancedRagContext(userId, dreamText, context.transactionId),
    ]);

    // Her bir sonucun başarılı olup olmadığını kontrol et
    const userDossier = results[0].status === "fulfilled"
      ? results[0].value
      : "Kullanıcı dosyası yüklenemedi.";
    const ragContextString = results[1].status === "fulfilled"
      ? results[1].value
      : "Hafıza bağlamı yüklenemedi.";

    // Hataları logla ama sistemi durdurma
    if (results[0].status === "rejected") {
      console.error("Dream context hazırlama hatası:", results[0].reason);
    }
    if (results[1].status === "rejected") {
      console.error("RAG context hatası:", results[1].reason);
    }

    // ADIM 3: Master Prompt'u oluştur ve AI'ı çağır
    const masterPrompt = getDreamAnalysisV2Prompt(
      userDossier,
      ragContextString,
      dreamText,
    );
    const rawResponse = await AiService.invokeGemini(
      masterPrompt,
      config.AI_MODELS.ADVANCED,
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
        timestamp: new Date().toISOString(),
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
      logger.info(
        "DreamAnalysis",
        `AI kararı başarıyla loglandı. Güven: ${
          (confidence * 100).toFixed(0)
        }%`,
      );
    } catch (logError) {
      logger.error("DreamAnalysis", "AI karar loglama hatası", logError);
    }

    logger.info(
      "DreamAnalysis",
      `Beyin ameliyatı başarılı. Yeni event ID: ${newEventId}`,
    );

    // --- HAFIZA KAYDI: process-memory (artık await kullanıyoruz) ---
    try {
      await adminClient.functions.invoke("process-memory", {
        body: {
          source_event_id: newEventId,
          user_id: userId,
          content: dreamText,
          event_time: new Date().toISOString(),
          mood: null,
          event_type: "dream_analysis",
          transaction_id: context.transactionId,
        },
      });
    } catch (err) {
      logger.error("DreamAnalysis", "process-memory invoke hatası", err);
    }
    return newEventId;
  } catch (error) {
    logger.error("DreamAnalysis", "Rüya analizi sırasında kritik hata", error);
    throw error;
  }
}

/**
 * Günlük Yansıma Beyin Lobu - ATOMİK VE GÜVENLİ SÜRÜM
 */
export async function handleDailyReflection(
  context: InteractionContext,
): Promise<
  { aiResponse: string; conversationTheme: string; decisionLogId: string; pendingSessionId: string }
> {
  const { logger, userId, initialVault, transactionId } = context;
  logger.info("DailyReflection", `İşlem ${transactionId} başlıyor`);

  // Bütün işlemi tek bir transaction gibi sarmalamak için değişkenleri en üste tanımla.
  // Bu, hata durumunda hangi adımların tamamlandığını bilmemizi sağlar.
  let sourceEventId: string | null = null;
  let decisionLogIdFromDb: string | null = null;
  let pendingSessionId: string | null = null;

  try {
    const { todayNote, todayMood } = context.initialEvent.data as {
      todayNote?: string;
      todayMood?: string;
    };
    if (!todayNote || !todayMood) {
      throw new ValidationError("Yansıma için not ve duygu durumu gereklidir.");
    }

    // =================================================================
    // ADIM 1: VERİ TOPLAMA VE AI İŞLEMİ (HENÜZ VERİTABANI YAZMASI YOK)
    // =================================================================
    const retrievedMemories = await RagService.retrieveContext(
      userId,
      todayNote, // Bugünün notuyla ilgili anıları ara
      {
        threshold: config.RAG_PARAMS.DAILY_REFLECTION.threshold,
        count: config.RAG_PARAMS.DAILY_REFLECTION.count,
      }, // Günlük yansıma için config'den değerler
    );

    // Dünün tarihini hesapla
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    // SADECE dünün daily_reflection'ını bul. Başka hiçbir şeye bakma.
    const { data: yesterdayEvent, error: yesterdayError } = await adminClient
      .from("events")
      .select("mood, data") // Sadece mood ve data'yı çek
      .eq("user_id", userId)
      .eq("type", "daily_reflection")
      .like("created_at", `${yesterdayISO}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (yesterdayError) {
      logger.warn("DailyReflection", "Dünün verisi çekilirken hata", {
        error: yesterdayError,
      });
    }

    const userName = initialVault.profile?.nickname ?? null;

    // PROMPT'A YENİ BİLGİLERİ GÖNDER
    const prompt = getTemporalReflectionPrompt(
      userName,
      { mood: todayMood, note: todayNote },
      retrievedMemories,
    );

    // AI'dan yanıtı al. Eğer bu patlarsa, zaten veritabanına bir şey yazmadığımız için sorun yok.
    const aiJsonResponse = await AiService.invokeGemini(
      prompt,
      config.AI_MODELS.FAST,
      { temperature: 0.7, responseMimeType: "application/json" },
    );

    // GELEN JSON'I AYRIŞTIR
    let parsedResponse: { reflectionText: string; conversationTheme: string };
    try {
      parsedResponse = JSON.parse(aiJsonResponse);
    } catch (_e) {
      throw new ApiError("AI'dan geçersiz formatta yanıt alındı.");
    }

    const { reflectionText, conversationTheme } = parsedResponse;

    // =================================================================
    // ADIM 2: ATOMİK VERİTABANI YAZMA BLOĞU
    // Bütün kritik yazma işlemleri şimdi başlıyor.
    // =================================================================

    // ADIM 2.1: Ana Olayı (Event) Kaydet.
    const { data: insertedEvent, error: eventError } = await adminClient
      .from("events").insert({
        user_id: userId,
        type: "daily_reflection",
        timestamp: new Date().toISOString(), // Bu alanı ekle, 'created_at' trigger ile dolsa bile explicit olmak iyidir.
        data: {
          todayNote,
          reflectionText,
          conversationTheme,
          transactionId,
          status: "processing",
        }, // Hata takibi için transactionId ve status ekle!
        mood: todayMood,
      }).select("id, created_at").single();

    if (eventError) {
      throw new DatabaseError(
        `Event kaydı başarısız oldu: ${eventError.message}`,
      );
    }
    sourceEventId = insertedEvent.id; // Hata durumunda referans için ID'yi al.
    logger.info("DailyReflection", `Event ${sourceEventId} oluşturuldu.`);

    // ADIM 2.2: AI Kararını Logla.
    const { data: logEntry, error: logError } = await adminClient
      .from("ai_decision_log")
      .insert({
        user_id: userId,
        decision_context: `Duygu: ${todayMood}. Not: "${
          todayNote.substring(0, 200)
        }..."`,
        decision_made: `AI yanıtı üretildi: "${
          reflectionText.substring(0, 300)
        }..."`,
        reasoning: JSON.stringify({
          retrievedMemoriesCount: retrievedMemories.length,
          mood: todayMood,
          yesterdayEvent: yesterdayEvent ? "found" : "not_found",
        }),
        execution_result: { success: true, eventId: sourceEventId },
        confidence_level: 0.8,
        decision_category: "daily_reflection",
        complexity_level: "medium",
        user_satisfaction_score: null, // Henüz skorlanmadı
      })
      .select("id")
      .single();

    if (logError) {
      throw new DatabaseError(
        `AI Karar logu başarısız oldu: ${logError.message}`,
      );
    }
    decisionLogIdFromDb = logEntry.id;
    logger.info(
      "DailyReflection",
      `Decision Log ${decisionLogIdFromDb} oluşturuldu.`,
    );

    // ADIM 2.3: process-memory'i GÜVENLİ bir şekilde tetikle.
    const { error: processMemoryError } = await adminClient.functions.invoke(
      "process-memory",
      {
        body: {
          source_event_id: sourceEventId,
          user_id: userId,
          content: todayNote,
          event_time: insertedEvent.created_at,
          mood: todayMood,
          event_type: "daily_reflection",
          transaction_id: transactionId,
        },
      },
    );
    if (processMemoryError) {
      throw new ApiError(
        `'process-memory' invoke hatası: ${processMemoryError.message}`,
      );
    }
    logger.info(
      "DailyReflection",
      `process-memory ${sourceEventId} için tetiklendi.`,
    );

    // ADIM 2.4: Vault'u güncelle.
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
        dailyMessageContent: reflectionText,
        dailyMessageTheme: conversationTheme, // <-- YENİ
        dailyMessageDecisionLogId: decisionLogIdFromDb, // <-- YENİ
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
    await VaultService.updateUserVault(userId, newVault, adminClient);
    logger.info("DailyReflection", `Vault güncellendi.`);

    // ADIM 2.5: Her şey tamamsa, Event'in durumunu "completed" yap. (Bu, en iyi pratiktir)
    await adminClient.from("events").update({
      data: {
        ...context.initialEvent.data,
        status: "completed",
        reflectionText,
        conversationTheme,
      },
    }).eq("id", sourceEventId);

    // ADIM 2.6: SOHBET İÇİN GEÇİCİ HAFIZAYI OLUŞTUR
    const chatContext = {
      originalNote: todayNote,
      aiReflection: reflectionText,
      theme: conversationTheme,
      source: 'daily_reflection'
    };

    const { data: pendingSession, error: pendingError } = await adminClient
      .from('pending_text_sessions')
      .insert({
        user_id: userId,
        context_data: chatContext,
      })
      .select('id')
      .single();

    if (pendingError) {
      throw new DatabaseError("Sohbet için geçici hafıza oluşturulamadı.");
    }

    pendingSessionId = pendingSession.id;
    logger.info("DailyReflection", `Geçici sohbet hafızası ${pendingSessionId} oluşturuldu.`);

    logger.info(
      "DailyReflection",
      `İşlem ${transactionId} başarıyla tamamlandı.`,
    );
    return {
      aiResponse: reflectionText,
      conversationTheme,
      decisionLogId: decisionLogIdFromDb!,
      pendingSessionId: pendingSessionId!,
    };
  } catch (error) {
    // =================================================================
    // KRİTİK HATA TELAFİ (COMPENSATION) BLOĞU
    // =================================================================
    logger.error("DailyReflection", "İşlem zincirinde kritik hata", error, {
      transactionId,
    });

    if (sourceEventId) {
      // Eğer işlem yarıda kesildiyse, ilgili event kaydını "failed" olarak işaretle.
      // Bu, production'da neyin neden patladığını anlaman için hayat kurtarır.
      await adminClient
        .from("events")
        .update({
          data: {
            ...context.initialEvent.data,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          },
        })
        .eq("id", sourceEventId);
      logger.warn(
        "DailyReflection",
        `Event ${sourceEventId} 'failed' olarak işaretlendi.`,
      );
    }

    // Hatayı yukarı fırlat ki orchestrator yakalasın ve client'a standart bir hata dönsün.
    throw error;
  }
}
// DİĞER HANDLER'LAR (şimdilik basit)
export function handleDefault(
  context: InteractionContext,
): Promise<string> {
  const { logger } = context;
  logger.info(
    "DefaultHandler",
    `Varsayılan handler çalıştı: ${context.initialEvent.type}`,
  );
  return Promise.resolve(
    `"${context.initialEvent.type}" tipi için işlem başarıyla alındı ancak henüz özel bir beyin lobu atanmadı.`,
  );
}

// =============================
// TEXT SESSION HANDLER'I - RAG ile Kişiselleştirilmiş AI
// =============================

export async function handleTextSession(context: InteractionContext): Promise<{
  aiResponse: string;
  usedMemory: { content: string; source_layer: string } | null;
}> {
  const { logger } = context;
  const { userMessage, messages } = context.initialEvent.data as {
    userMessage?: string;
    messages?: { sender: "user" | "ai"; text: string }[];
  };

  if (!userMessage) {
    throw new ValidationError("Kullanıcı mesajı eksik.");
  }

  // === YENİ AKILLI KONTROL BLOKU BAŞLANGICI ===
  const STOP_WORDS = new Set([
    "merhaba",
    "selam",
    "selamun aleyküm",
    "naber",
    "nasılsın",
    "iyi akşamlar",
    "günaydın",
    "ok",
    "tamam",
    "evet",
    "hayır",
  ]);
  const normalizedMessage = userMessage.trim().toLowerCase();

  let retrievedMemories: { content: string; source_layer: string }[] = [];
  // EĞER MESAJ ANLAMSIZ BİR KELİME DEĞİLSE RAG'İ ÇAĞIR
  if (!STOP_WORDS.has(normalizedMessage)) {
    retrievedMemories = await RagService.retrieveContext(
      context.userId,
      userMessage,
      {
        threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
        count: config.RAG_PARAMS.DEFAULT.COUNT,
      },
    );
  } else {
    logger.info(
      "TextSession",
      "Anlamsız kelime algılandı, RAG sorgusu atlanıyor",
    );
  }
  // === YENİ AKILLI KONTROL BLOKU SONU ===
  const pastContext = retrievedMemories.length > 0
    ? retrievedMemories.map((m) => `- ${m.content}`).join("\n")
    : "Yok";

  const shortTermMemory = (messages || []).slice(0, -1).map((m) =>
    `${m.sender === "user" ? "Danışan" : "Sen"}: ${m.text}`
  ).join("\n");

  // --- BEĞENDİĞİN PROMPT'UN GÜNCELLENMİŞ HALİ ---
  const masterPrompt = `
    SENİN KARAKTERİN: Sen doğal, akıcı ve hafızası olan bir sohbet arkadaşısın. Amacın terapi yapmak veya analiz sunmak DEĞİL, sadece iyi bir sohbet etmek. Bazen derin, bazen yüzeysel, tamamen sohbetin akışına göre...

    ELİNDEKİ GİZLİ BİLGİLER (BUNLARI KULLANICIYA ASLA 'İŞTE BİLGİLER' DİYE SUNMA):
    1.  GEÇMİŞTEN NOTLAR: ${pastContext}
    2.  SON KONUŞULANLAR: ${shortTermMemory || "Bu sohbetin başlangıcı."}
    3.  KULLANICININ SON SÖZÜ: "${userMessage}"

    GÖREVİN:
    1.  Kullanıcının son sözüne DOĞRUDAN ve DOĞAL bir cevap ver.
    2.  Cevabını oluştururken, elindeki GİZLİ BİLGİLERİ bir ilham kaynağı olarak kullan.
        -   **ÖNEMLİ KURAL:** Eğer GEÇMİŞTEN NOTLAR anlamsızsa (sadece bir selamlama gibi) veya kullanıcının son sözüyle tamamen alakasızsa, O NOTLARI **TAMAMEN GÖRMEZDEN GEL** ve sadece sohbete odaklan.
        -   Eğer kullanıcı "projemle uğraşıyorum" derse ve GEÇMİŞ NOTLARDA "iş stresi" varsa, cevabın "Umarım projen iyi gidiyordur, stresli bir şeye benzemiyor" gibi, o bilgiyi hissettiren ama söylemeyen bir cevap olabilir.
        -   Eğer kullanıcı "canım sıkkın" derse ve SON KONUŞULANLARDA "gözlükçü olayı" varsa, cevabın "Hala o gözlükçü olayına mı canın sıkkın yoksa başka bir şey mi var?" olabilir.
    3.  ASLA YAPMA: "Geçmiş kayıtlarına baktığımda...", "Hatırlanan Anı:", "Analizime göre..." gibi robotik ifadeler kullanma. Bildiklerini, normal bir insanın arkadaşını hatırlaması gibi, sohbetin içine doğal bir şekilde doku.
    4.  Sohbeti her zaman canlı tut. Soru sor, merak et, konuyu değiştir ama asla "Kendine iyi bak" gibi sohbeti bitiren cümleler kurma.
    5.  SOHBETİN RİTMİNİ KORU: Cevapların kullanıcıyı bunaltmamalı. Bir yorum yap, sonra sohbeti devam ettirmek için genellikle tek ve açık uçlu bir soru sor. Bazen, sadece bir gözlemde bulunup kullanıcının tepki vermesini beklemek de güçlü bir yöntemdir. Her mesajın bir sorgulama olmak zorunda değil. Kullanıcıya düşünmesi ve nefes alması için alan bırak.
    Şimdi, bu kurallara göre, sanki her şeyi doğal olarak hatırlıyormuş gibi cevap ver:
  `;

  const aiResponse = await AiService.invokeGemini(
    masterPrompt,
    "gemini-1.5-flash",
    { temperature: 0.8 },
    undefined,
    userMessage,
  );

  const usedMemory = retrievedMemories.length > 0 ? retrievedMemories[0] : null;
  return { aiResponse, usedMemory };
}

// ===============================================
// STRATEJİ HARİTASI
// ===============================================

export const eventHandlers: Record<
  string,
  (context: InteractionContext) => Promise<unknown>
> = {
  "dream_analysis": handleDreamAnalysis,
  "daily_reflection": handleDailyReflection,
  // Diğer tüm event'ler için varsayılan bir handler
  "text_session": handleTextSession, // YENİ: Özel text_session handler'ı
  "session_end": handleDefault, // YENİ: session_end handler'ı
  "voice_session": handleDefault,
  "video_session": handleDefault,
  "ai_analysis": handleDefault,
  "diary_entry": handleDiaryEntry,
  "onboarding_completed": handleDefault,
};

// =============================
// GÜNLÜK (DIARY) HANDLER'I
// =============================
const DiaryStartSchema = z.object({
  mood: z.string(),
  questions: z.array(z.string()).min(3),
});

const NextQuestionsSchema = z.object({
  questions: z.array(z.string()).min(1),
});

export async function handleDiaryEntry(
  context: InteractionContext,
): Promise<
  {
    aiResponse: string;
    nextQuestions: string[];
    isFinal: boolean;
    conversationId: string;
  }
> {
  const { logger } = context;
  logger.info("DiaryHandler", "İşlem başladı");

  const { userInput, conversationId } = context.initialEvent.data as {
    userInput?: string;
    conversationId?: string | null;
  };
  const userName = context.initialVault.profile?.nickname ?? null;
  const vaultContext = `
    - Terapi Hedefleri: ${
    context.initialVault.profile?.therapyGoals || "Belirtilmemiş"
  }
    - Temel İnançları: ${
    JSON.stringify(context.initialVault.coreBeliefs || {}) || "Belirtilmemiş"
  }
  `;

  if (!userInput) {
    throw new ValidationError("Giriş metni ('userInput') eksik.");
  }

  const responsePayload: {
    aiResponse: string;
    nextQuestions: string[];
    isFinal: boolean;
    conversationId: string;
  } = {
    aiResponse: "",
    nextQuestions: [],
    isFinal: false,
    conversationId: conversationId || context.transactionId,
  };

  if (!conversationId) {
    // Yeni konuşma başlangıcı
    logger.info("DiaryHandler", "Yeni bir günlük konuşması başlatılıyor");
    const prompt = getDiaryStartPrompt(userInput, userName, vaultContext);
    const rawAiResponse = await AiService.invokeGemini(
      prompt,
      config.AI_MODELS.FAST,
      {
        responseMimeType: "application/json",
      },
    );
    const validation = DiaryStartSchema.safeParse(JSON.parse(rawAiResponse));
    if (!validation.success) {
      throw new ValidationError("AI'dan dönen başlangıç verisi geçersiz.");
    }
    responsePayload.aiResponse = userName
      ? `Anlıyorum seni ${userName}. Daha derine inmek için şu konulardan biriyle devam edelim mi?`
      : "Anlattıklarını anlıyorum. Daha derine inmek için şu konulardan biriyle devam edelim mi?";
    responsePayload.nextQuestions = validation.data.questions;
  } else {
    // Devam eden konuşma
    logger.info("DiaryHandler", `Konuşma devam ediyor: ${conversationId}`);
    const prompt = getDiaryNextQuestionsPrompt(userInput, userName);
    const rawAiResponse = await AiService.invokeGemini(
      prompt,
      config.AI_MODELS.FAST,
      {
        responseMimeType: "application/json",
      },
    );
    const validation = NextQuestionsSchema.safeParse(JSON.parse(rawAiResponse));
    if (!validation.success) {
      throw new ValidationError("AI'dan dönen devam verisi geçersiz.");
    }

    const shouldEndConversation = Math.random() > 0.6;
    if (shouldEndConversation) {
      logger.info(
        "DiaryHandler",
        "Konuşma bitiriliyor. Kapanış analizi üretiliyor...",
      );

      // --- HAFIZA ENJEKSİYONU: Günün temasını çıkar ve RAG ile geçmişten bağlam getir ---
      const themeExtractionPrompt =
        `Bu konuşmanın ana temasını 3-5 kelimeyle özetle: "${userInput}"`;
      const theme = await AiService.invokeGemini(
        themeExtractionPrompt,
        config.AI_MODELS.FAST,
      );
      const searchQuery =
        `Bugünkü konuşmanın ana teması: ${theme}. Bu temayla ilgili geçmişteki en alakalı anılar, rüyalar veya farkındalık anları.`;
      const retrievedMemories = await RagService.retrieveContext(
        context.userId,
        searchQuery,
        {
          threshold: config.RAG_PARAMS.DEFAULT.THRESHOLD,
          count: config.RAG_PARAMS.DEFAULT.COUNT,
        }, // Günlük kapanış için config'den değerler
      );

      // --- MİKROSKOP BURADA ---
      await logRagInvocation(adminClient, {
        transaction_id: context.transactionId,
        user_id: context.userId,
        source_function: "diary_conclusion",
        search_query: searchQuery,
        retrieved_memories: retrievedMemories,
      });
      // --- KANIT KAYDEDİLDİ ---
      const pastContext = (retrievedMemories || [])
        .map((mem) => {
          const text = typeof mem.content === "string"
            ? mem.content
            : String(mem.content ?? "");
          const source_type = (mem as { source_layer?: string }).source_layer ||
            "anı";
          return `- Geçmişten bir ${source_type}: "${
            text.substring(0, 150)
          }..."`;
        })
        .join("\n");

      // Zenginleştirilmiş bağlam ile kapanış prompt'u
      const conclusionPrompt = getDiaryConclusionPrompt(
        userInput,
        userName,
        pastContext,
      );
      const rawConclusion = await AiService.invokeGemini(
        conclusionPrompt,
        config.AI_MODELS.FAST,
        { responseMimeType: "application/json" },
      );
      let summary = "";
      try {
        const parsed = JSON.parse(rawConclusion) as { summary?: string };
        summary = parsed.summary ||
          "Bugünkü konuşmanın ana fikrini güzelce toparladın.";
      } catch (_e) {
        summary = "Bugünkü konuşmanın ana fikrini güzelce toparladın.";
      }
      responsePayload.aiResponse =
        `${summary}\n\nHarika gidiyorsun! Günlüğü kaydetmeye ne dersin?`;
      responsePayload.isFinal = true;
      responsePayload.nextQuestions = [];
    } else {
      responsePayload.aiResponse = userName
        ? `Bu önemli bir nokta, ${userName}. Peki, bu düşünceni biraz daha açalım mı?`
        : "Bu önemli bir nokta. Peki, bu düşünceni biraz daha açalım mı?";
      responsePayload.nextQuestions = validation.data.questions;
    }
  }

  return responsePayload;
}
