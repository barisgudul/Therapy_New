// supabase/functions/_shared/services/orchestration.handlers.ts

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { InteractionContext, VaultData } from "../types/context.ts";
import { ApiError, DatabaseError, ValidationError } from "../errors.ts";
import * as AiService from "./ai.service.ts";
import * as VaultService from "./vault.service.ts";
import { config, LLM_LIMITS } from "../config.ts";
import { deepMerge } from "../utils/deepMerge.ts";
import { safeParseJsonBlock } from "../utils/json.ts";
import * as Context from "../contexts/session.context.builder.ts";
import * as DailyReflectionContext from "../contexts/dailyReflection.context.service.ts";
import * as DreamContext from "../contexts/dream.context.service.ts";
import { executeDeepAnalysis } from "./controlled-hybrid-pipeline.service.ts";
import * as Prompts from "../prompts/session.prompt.ts";
import * as DailyReflectionPrompts from "../prompts/dailyReflection.prompt.ts";
import * as DreamPrompts from "../prompts/dreamAnalysis.prompt.ts";
import * as DiaryPrompts from "../prompts/diary.prompt.ts";
import * as RagService from "./rag.service.ts";
import { logRagInvocation } from "../utils/logging.service.ts";
import * as DreamService from "./dream.service.ts";
import { getSatisfactionSignal } from "./feedback.service.ts";

// --- BAĞIMLILIK PAKETİ TİPİ ---
// Tüm handler'ların ihtiyaç duyduğu her şeyi burada topluyoruz.
export interface HandlerDependencies {
  supabaseClient: SupabaseClient;
  aiService: typeof AiService;
  vaultService: typeof VaultService;
  ragService: typeof RagService;
  logRagInvocation: typeof logRagInvocation;
  contextBuilder: {
    buildTextSessionContext: typeof Context.buildTextSessionContext;
    buildDailyReflectionContext:
      typeof DailyReflectionContext.buildDailyReflectionContext;
    buildDreamAnalysisContext: typeof DreamContext.buildDreamAnalysisContext;
  };
}

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

// yardımcı: vault'ı kısa bağlama çevir
function vaultToContextString(v: VaultData): string {
  const name = v?.profile?.nickname ? `İsim: ${v.profile.nickname}` : "";
  const goals = v?.profile?.therapyGoals
    ? `Hedef: ${v.profile.therapyGoals}`
    : "";
  const themes = (v?.themes && v.themes.length)
    ? `Temalar: ${v.themes.slice(0, 5).join(", ")}`
    : "";
  const notes = v?.keyInsights && v.keyInsights.length
    ? `Önemli Notlar: ${v.keyInsights.slice(0, 3).join(" • ")}`
    : "";
  return [name, goals, themes, notes].filter(Boolean).join("\n") ||
    "Kayıt sınırlı.";
}

// Default sorular - AI başarısız olursa kullanılır (dil duyarlı)
const DEFAULT_DIARY_QUESTIONS_BY_LANG: Record<string, string[]> = {
  tr: [
    "Şu an içinden geçen baskın duygu ne?",
    "Bu hikâyedeki en zor an hangisiydi, neden?",
    "Şu anda sana iyi gelecek küçük bir adım ne olurdu?",
  ],
  en: [
    "What is the dominant feeling you're having right now?",
    "What was the toughest moment in this story, and why?",
    "What is one small step that would feel good right now?",
  ],
  de: [
    "Was ist das vorherrschende Gefühl, das du jetzt erlebst?",
    "Was war der schwierigste Moment in dieser Geschichte und warum?",
    "Welcher kleine Schritt würde sich jetzt gut anfühlen?",
  ],
};

function getDefaultDiaryQuestions(lang: string): string[] {
  return DEFAULT_DIARY_QUESTIONS_BY_LANG[lang] ||
    DEFAULT_DIARY_QUESTIONS_BY_LANG.en;
}

// UI'nin beklediği tip
type DiaryResponse = {
  aiResponse: string;
  nextQuestions?: string[];
  isFinal: boolean;
  conversationId: string;
};

/**
 * RÜYA ANALİZİ HANDLER
 * Artık merkezi DreamService'i kullanıyor.
 */
export async function handleDreamAnalysis(
  dependencies: HandlerDependencies,
  context: InteractionContext,
): Promise<{ eventId: string }> {
  const { supabaseClient } = dependencies;
  const { logger, userId, transactionId } = context;

  // Idempotency kontrolü - transactionId olmadan upsert faydasız
  if (!context.transactionId) {
    logger.warn(
      "Idempotency",
      "Missing transactionId; upsert will not dedupe.",
    );
  }

  const { dreamText, language } = context.initialEvent.data as {
    dreamText?: string;
    language?: string;
  };

  // Merkezi servisi kullan
  const result = await DreamService.analyzeDream({
    supabaseClient,
    userId,
    dreamText: dreamText || "",
    transactionId,
    language: language ?? "en",
    logger,
  });

  return { eventId: result.eventId };
}

/**
 * GÜNLÜK YANSIMA HANDLER
 */
export async function handleDailyReflection(
  dependencies: HandlerDependencies,
  context: InteractionContext,
): Promise<
  {
    aiResponse: string;
    conversationTheme: string;
    decisionLogId: string;
    pendingSessionId: string;
  }
> {
  const {
    supabaseClient,
    aiService,
    vaultService,
    ragService,
    contextBuilder,
  } = dependencies;
  const { logger, userId } = context;

  // Idempotency kontrolü - transactionId olmadan upsert faydasız
  if (!context.transactionId) {
    logger.warn(
      "Idempotency",
      "Missing transactionId; upsert will not dedupe.",
    );
  }
  const { todayNote, todayMood, language } = context.initialEvent.data as {
    todayNote?: string;
    todayMood?: string;
    language?: string;
  };

  if (!todayNote || !todayMood) {
    throw new ValidationError("Yansıma için not ve duygu durumu gereklidir.");
  }

  logger.info("DailyReflection", "İşlem başlıyor.");

  const { dossier, retrievedMemories } = await contextBuilder
    .buildDailyReflectionContext(
      supabaseClient,
      ragService,
      userId,
      todayNote,
      todayMood, // hibrit RAG için duygu sinyali
    );
  logger.info("DailyReflection", "Bağlam oluşturuldu.");

  const prompt = DailyReflectionPrompts.generateDailyReflectionPrompt({
    userName: dossier.userName,
    todayMood,
    todayNote,
    retrievedMemories,
  }, language ?? "en");

  const aiJsonResponse = await aiService.invokeGemini(
    supabaseClient,
    prompt,
    config.AI_MODELS.FAST,
    {
      temperature: 0.7,
      responseMimeType: "application/json",
      maxOutputTokens: LLM_LIMITS.DAILY_REFLECTION,
    },
    context.transactionId,
    todayNote,
  );

  // Güvenli JSON ayrıştırma - fazladan metin varsa bile çalışır
  const parsedResponse = safeParseJsonBlock<{
    reflectionText: string;
    conversationTheme: string;
  }>(aiJsonResponse);

  if (!parsedResponse) {
    logger.error("DailyReflection", "Invalid AI JSON", {
      preview: aiJsonResponse?.slice?.(0, 200),
    });
    throw new ValidationError("AI cevabı geçersiz formatta.");
  }

  logger.info("DailyReflection", "AI yanıtı alındı.");
  const { reflectionText, conversationTheme } = parsedResponse;

  // =================================================================
  // VERİTABANI YAZMA BLOĞU
  // =================================================================

  let sourceEventId: string | null = null;
  let decisionLogIdFromDb: string | null = null;
  let pendingSessionId: string | null = null;

  try {
    // 1. Ana Olayı (Event) Kaydet - Idempotent upsert
    const { data: insertedEvent, error: eventError } = await supabaseClient
      .from("events")
      .upsert({
        user_id: userId,
        transaction_id: context.transactionId, // 🔒 idempotent anahtar
        type: "daily_reflection",
        timestamp: new Date().toISOString(),
        data: {
          todayNote,
          reflectionText,
          conversationTheme,
          transactionId: context.transactionId,
          status: "processing",
          language: language ?? "en",
        },
        mood: todayMood,
      }, { onConflict: "user_id,transaction_id" })
      .select("id, created_at")
      .single();

    if (eventError) {
      throw new DatabaseError(
        `Event kaydı başarısız oldu: ${eventError.message}`,
      );
    }
    sourceEventId = insertedEvent.id;
    logger.info("DailyReflection", `Event ${sourceEventId} oluşturuldu.`);

    // 2. AI Kararını Logla
    const { data: logEntry, error: logError } = await supabaseClient
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
        }),
        execution_result: { success: true, eventId: sourceEventId },
        confidence_level: 0.8,
        decision_category: "daily_reflection",
        complexity_level: "medium",
        user_satisfaction_score: null,
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

    // 3. process-memory'i GÜVENLİ bir şekilde tetikle
    const { error: processMemoryError } = await supabaseClient.functions.invoke(
      "process-memory",
      {
        body: {
          source_event_id: sourceEventId,
          user_id: userId,
          content: todayNote,
          event_time: insertedEvent.created_at,
          mood: todayMood,
          event_type: "daily_reflection",
          transaction_id: context.transactionId,
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

    // 4. Vault'u güncelle
    const currentVault =
      await vaultService.getUserVault(userId, supabaseClient) ??
        {};
    const todayString = new Date().toISOString().split("T")[0];
    const newVault = deepMerge(currentVault as Record<string, unknown>, {
      currentMood: todayMood,
      metadata: {
        lastDailyReflectionDate: todayString,
        dailyMessageContent: reflectionText,
        dailyMessageTheme: conversationTheme,
        dailyMessageDecisionLogId: decisionLogIdFromDb,
      },
      moodHistory: [
        ...(currentVault.moodHistory ?? []),
        {
          mood: todayMood,
          timestamp: new Date().toISOString(),
          source: "daily_reflection",
        },
      ].slice(-30),
    });
    await vaultService.updateUserVault(userId, newVault, supabaseClient);
    logger.info("DailyReflection", `Vault güncellendi.`);

    // 5. Her şey tamamsa, Event'in durumunu "completed" yap
    const { error: completeErr } = await supabaseClient
      .from("events")
      .update({
        data: {
          ...context.initialEvent.data,
          status: "completed",
          reflectionText,
          conversationTheme,
        },
      })
      .eq("id", sourceEventId);

    if (completeErr) {
      logger.error(
        "DailyReflection",
        "Event completion update failed",
        completeErr,
      );
      // Prod'da akışı bozmasın diye sadece loglamak yeterli
    }

    // 6. SOHBET İÇİN GEÇİCİ HAFIZAYI OLUŞTUR
    const chatContext = {
      originalNote: todayNote,
      aiReflection: reflectionText,
      theme: conversationTheme,
      source: "daily_reflection",
    };

    const { data: pendingSession, error: pendingError } = await supabaseClient
      .from("pending_text_sessions")
      .upsert({
        user_id: userId,
        context_data: chatContext,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }, {
        onConflict: "user_id",
      })
      .select("id")
      .single();

    if (pendingError) {
      throw new DatabaseError("Sohbet için geçici hafıza oluşturulamadı.");
    }

    pendingSessionId = pendingSession.id;
    logger.info(
      "DailyReflection",
      `Geçici sohbet hafızası ${pendingSessionId} oluşturuldu.`,
    );

    logger.info("DailyReflection", `İşlem başarıyla tamamlandı.`);
    return {
      aiResponse: reflectionText,
      conversationTheme,
      decisionLogId: decisionLogIdFromDb!,
      pendingSessionId: pendingSessionId!,
    };
  } catch (error) {
    // KRİTİK HATA TELAFİ (COMPENSATION) BLOĞU
    logger.error("DailyReflection", "İşlem zincirinde kritik hata", error, {
      transactionId: context.transactionId,
    });

    if (sourceEventId) {
      await supabaseClient
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

    throw error;
  }
}

export async function handleDiaryEntry(
  dependencies: HandlerDependencies,
  context: InteractionContext,
): Promise<DiaryResponse> {
  const { supabaseClient, aiService, ragService } = dependencies;
  const { initialEvent, initialVault } = context;
  const { userInput, conversationId, turn, language } =
    (initialEvent.data ?? {}) as {
      userInput?: string;
      conversationId?: string | null;
      turn?: number;
      language?: string;
    };

  if (!userInput || typeof userInput !== "string") {
    throw new ValidationError("Günlük için metin gerekli.");
  }

  const userName = initialVault?.profile?.nickname ?? null;
  const vaultContext = vaultToContextString(initialVault as VaultData);

  // RAG: cognitive_memories üzerinden bağlam al
  const retrievedMemories = await ragService.retrieveContext(
    { supabaseClient, aiService },
    context.userId,
    userInput,
    {
      threshold: config.RAG_PARAMS.DEFAULT.threshold,
      count: config.RAG_PARAMS.DEFAULT.count,
    },
  );
  const ragForPrompt = (retrievedMemories || [])
    .map((c) => `- ${c.content}`)
    .slice(0, 5)
    .join("\n");

  // 1) İlk tur: duygu + 3 soru üret
  const lang = ["tr", "en", "de"].includes(language as string)
    ? (language as string)
    : "en";

  if (!conversationId || !turn || turn === 0) {
    // Vault + RAG birleşik bağlam
    const combinedContext = `${vaultContext}\n\n- Alakalı notlar:\n${
      ragForPrompt || "(bulunamadı)"
    }`;
    const prompt = DiaryPrompts.getDiaryStartPrompt(
      userInput,
      userName,
      combinedContext,
      lang,
    );
    const raw = await aiService.invokeGemini(
      supabaseClient,
      prompt,
      config.AI_MODELS.FAST,
      {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: LLM_LIMITS.DIARY_START,
      },
      context.transactionId,
      userInput,
    );

    // Güvenli JSON ayrıştırma
    const parsed =
      safeParseJsonBlock<{ mood?: string; questions?: string[] }>(raw) ?? {};

    // Soruları al, yoksa default kullan
    const qs = (Array.isArray(parsed.questions) && parsed.questions.length > 0)
      ? parsed.questions.slice(0, 3)
      : getDefaultDiaryQuestions(lang);

    const startMsgByLang: Record<string, string> = {
      tr: "Hazırım. Şunlardan biriyle devam edelim:",
      en: "I'm ready. Let's continue with one of these:",
      de: "Ich bin bereit. Lass uns mit einem davon weitermachen:",
    };

    return {
      aiResponse: startMsgByLang[lang] || startMsgByLang.en,
      nextQuestions: qs,
      isFinal: false,
      conversationId: context.transactionId,
    };
  }

  // 2) Sonraki turlar: yeni sorular üret, gerekiyorsa bitir
  const nextPrompt = DiaryPrompts.getDiaryNextQuestionsPrompt(
    userInput,
    userName,
    lang,
  );
  const rawNext = await aiService.invokeGemini(
    supabaseClient,
    nextPrompt,
    config.AI_MODELS.FAST,
    {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: LLM_LIMITS.DIARY_NEXT,
    },
    context.transactionId,
    userInput,
  );

  // Önce gerçek sonucu kontrol et
  const parsedObj = safeParseJsonBlock<{ questions?: string[] }>(rawNext);
  const parsedQs = parsedObj?.questions ?? [];
  const aiCouldNotGenerateQuestions = parsedQs.length === 0; // ← gerçek boşluk kontrolü

  // Fallback uygula
  const nextQs = aiCouldNotGenerateQuestions
    ? getDefaultDiaryQuestions(lang)
    : parsedQs.slice(0, 3);

  // Bitiş kriteri: 3. turdan sonra YA DA AI soru üretemediyse finalize et
  const shouldFinish = (turn ?? 0) >= 2 || aiCouldNotGenerateQuestions;

  const continueMsgByLang: Record<string, string> = {
    tr: "Devam edelim; sana iyi gelen bir yerden anlatabilirsin.",
    en: "Let's continue; share from wherever feels right to you.",
    de: "Lass uns fortfahren; erzähle von dem Punkt, der sich richtig anfühlt.",
  };

  let aiResponse = continueMsgByLang[lang] || continueMsgByLang.en;
  let diaryMemoryContent = userInput;
  if (shouldFinish) {
    // Kısa kapanış
    const conclPrompt = DiaryPrompts.getDiaryConclusionPrompt(
      userInput,
      userName,
      ragForPrompt,
      lang,
    );
    try {
      const rawC = await aiService.invokeGemini(
        supabaseClient,
        conclPrompt,
        config.AI_MODELS.FAST,
        {
          responseMimeType: "application/json",
          temperature: 0.6,
          maxOutputTokens: LLM_LIMITS.DIARY_CONCLUSION,
        },
        context.transactionId,
        userInput,
      );
      const summary = safeParseJsonBlock<{ summary?: string }>(rawC)?.summary;
      if (summary) {
        aiResponse = summary;
        diaryMemoryContent = summary;
      }
    } catch { /* sessizce geç */ }

    // KALICI HAFIZA: Günlük tamamlandığında bir event + cognitive_memory yaz.
    // Böylece günlük girişleri RAG'a girer (eskiden hiç yazılmıyordu).
    try {
      const { data: diaryEvent, error: diaryEventError } = await supabaseClient
        .from("events")
        .upsert({
          user_id: context.userId,
          transaction_id: context.transactionId,
          type: "diary_entry",
          timestamp: new Date().toISOString(),
          data: {
            userInput,
            summary: diaryMemoryContent,
            conversationId: conversationId || context.transactionId,
            language: lang,
          },
        }, { onConflict: "user_id,transaction_id" })
        .select("id, created_at")
        .single();

      if (diaryEventError) {
        throw new Error(diaryEventError.message);
      }

      const { error: diaryMemoryError } = await supabaseClient.functions.invoke(
        "process-memory",
        {
          body: {
            source_event_id: diaryEvent.id,
            user_id: context.userId,
            content: diaryMemoryContent,
            event_time: diaryEvent.created_at,
            event_type: "diary_entry",
            transaction_id: context.transactionId,
          },
        },
      );
      if (diaryMemoryError) throw new Error(diaryMemoryError.message);
    } catch (memErr) {
      // Hafıza yazımı başarısız olsa bile kullanıcıya yanıt dönmeye devam et.
      context.logger.error(
        "DiaryEntry",
        "Günlük hafıza yazımı başarısız",
        memErr,
      );
    }
  }

  return {
    aiResponse,
    nextQuestions: shouldFinish ? [] : nextQs,
    isFinal: shouldFinish,
    conversationId: conversationId || context.transactionId,
  };
}

// DİĞER HANDLER'LAR (şimdilik basit)
export function handleDefault(
  _dependencies: HandlerDependencies,
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
// TEXT SESSION HANDLER'I - TEMİZLENMİŞ VE MODÜLER
// =============================

export async function handleTextSession(
  dependencies: HandlerDependencies,
  context: InteractionContext,
): Promise<{
  aiResponse: string;
  usedMemory: { content: string; source_layer: string } | null;
}> {
  const { supabaseClient, aiService, ragService, contextBuilder } =
    dependencies;
  const { logger, userId } = context;
  const { messages, pendingSessionId, language } = context.initialEvent
    .data as {
      messages?: { sender: "user" | "ai"; text: string }[];
      pendingSessionId?: string | null;
      language?: string;
    };

  // Enhanced logging for context tracking
  logger.info(
    "TextSession",
    `Session starting - Warm start: ${!!pendingSessionId}, Messages: ${
      messages?.length || 0
    }`,
  );

  // 1. WARM START CHECK
  const isWarmStartAttempt = messages && messages.length === 0 &&
    pendingSessionId;

  if (isWarmStartAttempt) {
    // Get warm start context with activity history
    const { warmStartContext, activityContext, userDossier } =
      await contextBuilder.buildTextSessionContext(
        { supabaseClient, ragService },
        userId,
        "",
        pendingSessionId,
      );

    if (!warmStartContext) {
      throw new ValidationError("Geçici oturum bulunamadı veya süresi doldu.");
    }

    logger.info(
      "TextSession",
      "Warm start context loaded with activity history.",
    );

    // Enhanced warm start prompt with context awareness
    const warmStartPrompt = `
ROLE: Sen, kullanıcıyla derin bağ kuran ve onun hikayesini hatırlayan bir yol arkadaşısın.

BAĞLAM:
- Kullanıcının az önceki notu: "${warmStartContext.originalNote}"
- Senin yansıtman: "${warmStartContext.aiReflection}"
- Ana tema: "${warmStartContext.theme}"
${userDossier.recentMood ? `- Son ruh hali: ${userDossier.recentMood}` : ""}
${
      userDossier.recentTopics?.length
        ? `- Son konuları: ${userDossier.recentTopics.join(", ")}`
        : ""
    }
${activityContext ? `\nSon aktiviteler:\n${activityContext}` : ""}

GÖREV: Kullanıcı "Sohbet Et" butonuna bastı. Ona doğal, samimi ve bağlamsal bir karşılama yaz.
- Az önceki yansımadan organik olarak devam et
- Geçmiş aktivitelerinden bir detayı hatırlat
- "Kayıtlara göre" gibi robotik ifadeler KULLANMA
- Spesifik ve kişisel ol

ÖRNEKLER:
✓ "Az önce bahsettiğin ${warmStartContext.theme} konusu... Geçen hafta da benzer bir şey yaşamıştın sanırım?"
✓ "${userDossier.recentMood || "sakin"} görünüyorsun bugün, ${
      warmStartContext.originalNote.slice(0, 30)
    }... dediğin yer nereden geliyor sence?"
✗ "Merhaba, kayıtlarıma göre az önce yansıma yaptınız."
✗ "Sohbete hazırım, ne konuşmak istersiniz?"

Şimdi doğal karşılamanı yaz:
`.trim();

    const rawWarm = await aiService.invokeGemini(
      supabaseClient,
      warmStartPrompt,
      config.AI_MODELS.RESPONSE,
      { temperature: 0.75, maxOutputTokens: LLM_LIMITS.TEXT_SESSION_RESPONSE },
      context.transactionId,
    );

    // Use raw response directly
    const aiResponse = rawWarm || "Hazırım. Az önceki konudan devam edelim mi?";

    return { aiResponse, usedMemory: null };
  }

  // 2. NORMAL CONVERSATION FLOW
  if (!messages || messages.length === 0) {
    throw new ValidationError("Sohbet için mesaj gerekli.");
  }

  const userMessage = messages[messages.length - 1].text;

  // PII koruması için mesajı maskeleyelim
  const maskMessage = (s: string) => s.replace(/\S/g, "•").slice(0, 80);
  logger.info("TextSession", `Processing message in context of user history`);

  // 3. BUILD ENHANCED CONTEXT
  const {
    userDossier,
    retrievedMemories = [],
    ragForPrompt = "",
    activityContext = "",
    recentActivities = [],
  } = await contextBuilder.buildTextSessionContext(
    { supabaseClient, ragService },
    userId,
    userMessage,
    pendingSessionId,
  );

  logger.info(
    "TextSession",
    `Context built - Activities: ${recentActivities.length}, Memories: ${retrievedMemories.length}`,
  );

  // 4. BUILD CONVERSATION CONTEXT
  const shortTermMemory = messages.slice(-6).map((m) =>
    `${m.sender === "user" ? "Kullanıcı" : "Sen"}: ${m.text}`
  ).join("\n");

  // Detect conversation patterns
  const lastAiMsg = messages.slice(0, -1).reverse().find((m) =>
    m.sender === "ai"
  );
  const lastAiEndedWithQuestion = !!lastAiMsg &&
    /[?؟]$/.test(lastAiMsg.text.trim());

  // Enhanced boredom detection with context and stuck pattern detection
  // Detect if user is stuck: 2+ consecutive messages with ≤2 words
  const isStuck = messages.length > 3 &&
    messages.slice(-2).every((m) =>
      m.sender === "user" && m.text.trim().split(/\s+/).length <= 2
    );

  const userLooksBored =
    /\b(sıkıldım|boşver|neyse|önemsiz|bilmiyorum|hmm+|ımm)\b/i.test(
      userMessage,
    ) || isStuck; // Also trigger RE_ENGAGE if user seems stuck

  // Build the prompt with enhanced context
  const styleMode = (messages?.length || 0) % 3;

  // RAG filtering for better relevance
  const isGreeting = /\b(merhaba|selam|hey|günaydın|iyi akşamlar|naber)\b/i
    .test(userMessage);
  const canUseRag = !isGreeting && userMessage.trim().split(/\s+/).length >= 2;
  const filteredMemories = canUseRag
    ? retrievedMemories.filter((m) => {
      const sim = m?.similarity ?? 0;
      return sim > 0.7; // Use higher threshold for quality
    })
    : [];
  const kept = canUseRag
    ? (filteredMemories.length > 0
      ? filteredMemories
      : retrievedMemories.slice(0, 1))
    : [];

  const lang = ["tr", "en", "de"].includes(String(language))
    ? String(language)
    : "en";

  // GERİ BESLEME: Son AI kararları düşük memnuniyet aldıysa yaklaşımı değiştir.
  const satisfaction = await getSatisfactionSignal(supabaseClient, userId);

  const masterPrompt = Prompts.generateTextSessionPrompt({
    userDossier,
    pastContext: ragForPrompt,
    shortTermMemory,
    userMessage,
    lastAiEndedWithQuestion,
    userLooksBored,
    styleMode,
    activityContext,
    selfCorrect: satisfaction.lowSatisfaction,
  }, lang);

  // 5. YAPAY ZEKAYI ÇAĞIR (GÜVENLİ FALLBACK İLE)
  logger.info("TextSession", "AI'dan cevap bekleniyor...");
  let rawAi: string | null = null;
  try {
    rawAi = await aiService.invokeGemini(
      supabaseClient,
      masterPrompt,
      config.AI_MODELS.RESPONSE,
      { temperature: 0.8, maxOutputTokens: LLM_LIMITS.TEXT_SESSION_RESPONSE },
      context.transactionId,
      userMessage,
    );
  } catch (e) {
    logger.error("TextSession", "AI invoke failed, using fallback", e);
  }

  const fallbackByLang: Record<string, string> = {
    tr: lastAiEndedWithQuestion
      ? "Düşünceni merak ediyorum; oradan devam edelim mi?"
      : "Seni duydum. Biraz daha açar mısın?",
    en: lastAiEndedWithQuestion
      ? "I'd love to hear your view; shall we continue from there?"
      : "I hear you. Could you share a bit more?",
    de: lastAiEndedWithQuestion
      ? "Ich würde gern deine Sicht hören; machen wir dort weiter?"
      : "Ich verstehe. Magst du etwas genauer erzählen?",
  };

  // Use raw response directly, else fallback
  const aiResponse = (rawAi && rawAi.trim().length > 0)
    ? rawAi
    : (fallbackByLang[lang] || "Not aldım. Buradan devam edelim mi?");
  logger.info(
    "TextSession",
    `Response generated, preview: ${maskMessage(aiResponse)}`,
  );

  // 5. SONUCU DÖNDÜR
  const used = kept.length > 0 ? kept[0] : null;
  const usedMemory = used
    ? {
      content: String(used.content ?? ""),
      source_layer: "cognitive_memories", // Default source layer
    }
    : null;
  logger.info("TextSession", "Cevap başarıyla üretildi.");

  // İSTEMCİ DOĞRULAMA: Orchestrator cevabını gösteriyor mu kontrolü
  return { aiResponse, usedMemory };
}

// ===============================================
// STRATEJİ HARİTASI
// ===============================================

export const eventHandlers: Record<
  string,
  (
    dependencies: HandlerDependencies,
    context: InteractionContext,
  ) => Promise<unknown>
> = {
  // "dream_analysis": handleDreamAnalysis, // Artık unified-ai-gateway üzerinden dream-analysis-handler'a yönlendiriliyor
  "daily_reflection": handleDailyReflection,
  // Diğer tüm event'ler için varsayılan bir handler
  "text_session": handleTextSession, // YENİ: Özel text_session handler'ı
  "session_end": handleDefault, // YENİ: session_end handler'ı
  "voice_session": handleDefault,
  "video_session": handleDefault,
  // 🔽 ai_analysis artık doğrudan executeDeepAnalysis'a yönleniyor
  "ai_analysis": executeDeepAnalysis,
  "diary_entry": handleDiaryEntry, // <-- EKLENDİ
  "onboarding_completed": handleDefault,
  "default": handleDefault, // <-- EKLE
};
