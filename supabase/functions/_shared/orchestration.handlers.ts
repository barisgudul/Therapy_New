// supabase/functions/_shared/orchestration.handlers.ts

import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import type { InteractionContext, VaultData } from "./types/context.ts";
import { ApiError, DatabaseError, ValidationError } from "./errors.ts";
import { supabase as adminClient } from "./supabase-admin.ts";
import * as AiService from "./ai.service.ts";

import * as VaultService from "./vault.service.ts";

import { config } from "./config.ts";
import { deepMerge } from "./utils/deepMerge.ts";
import {
  ensureNonParrotReply,
  hasCliches,
  looksParroty,
} from "./utils/antiParrot.ts";
import { safeParseJsonBlock } from "./utils/json.ts";
// CONTEXT SERVİSLERİ
import { buildTextSessionContext } from "./contexts/session.context.service.ts";
import { buildDailyReflectionContext } from "./contexts/dailyReflection.context.service.ts";
import { buildDreamAnalysisContext } from "./contexts/dream.context.service.ts";

// PROMPT SERVİSLERİ
import { generateTextSessionPrompt } from "./prompts/session.prompt.ts";
import { generateDailyReflectionPrompt } from "./prompts/dailyReflection.prompt.ts";
import { generateDreamAnalysisPrompt } from "./prompts/dreamAnalysis.prompt.ts";
import {
  getDiaryConclusionPrompt,
  getDiaryNextQuestionsPrompt,
  getDiaryStartPrompt,
} from "./prompts/diary.prompt.ts";

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

/**
 * RÜYA ANALİZİ HANDLER
 */
export async function handleDreamAnalysis(
  context: InteractionContext,
): Promise<{ eventId: string }> {
  const { logger, userId, transactionId } = context;
  const { dreamText } = context.initialEvent.data as { dreamText?: string };

  if (
    !dreamText || typeof dreamText !== "string" || dreamText.trim().length < 10
  ) {
    throw new ValidationError("Analiz için yetersiz rüya metni.");
  }

  logger.info("DreamAnalysis", "İşlem başlıyor.");

  // 1. BAĞLAMI OLUŞTUR
  const { userDossier, ragContext } = await buildDreamAnalysisContext(
    userId,
    dreamText,
    transactionId,
  );
  logger.info("DreamAnalysis", "Bağlam oluşturuldu.");

  // 2. PROMPT'U OLUŞTUR
  const masterPrompt = generateDreamAnalysisPrompt({
    userDossier,
    ragContext,
    dreamText,
  });

  // 3. AI'YI ÇAĞIR
  const rawResponse = await AiService.invokeGemini(
    masterPrompt,
    config.AI_MODELS.ADVANCED,
    { responseMimeType: "application/json" },
    transactionId,
  );
  logger.info("DreamAnalysis", "AI yanıtı alındı.");

  // 4. SONUCU DOĞRULA VE KAYDET (ARTIK PLACEHOLDER DEĞİL)
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

  if (insertError) {
    throw new DatabaseError(`Event kaydedilemedi: ${insertError.message}`);
  }

  const newEventId = inserted.id;

  // AI KARARINI LOGLA
  try {
    const confidence = calculateConnectionConfidence(
      analysisData,
      JSON.stringify(userDossier), // String'e çevir
    );
    await adminClient.from("ai_decision_log").insert({
      user_id: userId,
      decision_context: `Rüya metni: "${dreamText.substring(0, 200)}..."`,
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
      `AI kararı başarıyla loglandı. Güven: ${(confidence * 100).toFixed(0)}%`,
    );
  } catch (logError) {
    logger.error("DreamAnalysis", "AI karar loglama hatası", logError);
  }

  // HAFIZA KAYDI YAP
  try {
    await adminClient.functions.invoke("process-memory", {
      body: {
        source_event_id: newEventId,
        user_id: userId,
        content: dreamText,
        event_time: new Date().toISOString(),
        mood: null,
        event_type: "dream_analysis",
        transaction_id: transactionId,
      },
    });
  } catch (err) {
    logger.error("DreamAnalysis", "process-memory invoke hatası", err);
  }

  logger.info("DreamAnalysis", `İşlem tamamlandı. Event ID: ${newEventId}`);
  return { eventId: newEventId };
}

/**
 * GÜNLÜK YANSIMA HANDLER
 */
export async function handleDailyReflection(
  context: InteractionContext,
): Promise<
  {
    aiResponse: string;
    conversationTheme: string;
    decisionLogId: string;
    pendingSessionId: string;
  }
> {
  const { logger, userId } = context;
  const { todayNote, todayMood } = context.initialEvent.data as {
    todayNote?: string;
    todayMood?: string;
  };

  if (!todayNote || !todayMood) {
    throw new ValidationError("Yansıma için not ve duygu durumu gereklidir.");
  }

  logger.info("DailyReflection", "İşlem başlıyor.");

  const { dossier, retrievedMemories } = await buildDailyReflectionContext(
    userId,
    todayNote,
  );
  logger.info("DailyReflection", "Bağlam oluşturuldu.");

  const prompt = generateDailyReflectionPrompt({
    userName: dossier.userName,
    todayMood,
    todayNote,
    retrievedMemories,
  });

  const aiJsonResponse = await AiService.invokeGemini(
    prompt,
    config.AI_MODELS.FAST,
    { temperature: 0.7, responseMimeType: "application/json" },
    context.transactionId,
    todayNote, // ← KRİTİK FIX 3: userMessage parametresi
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
    // 1. Ana Olayı (Event) Kaydet
    const { data: insertedEvent, error: eventError } = await adminClient
      .from("events").insert({
        user_id: userId,
        type: "daily_reflection",
        timestamp: new Date().toISOString(),
        data: {
          todayNote,
          reflectionText,
          conversationTheme,
          transactionId: context.transactionId,
          status: "processing",
        },
        mood: todayMood,
      }).select("id, created_at").single();

    if (eventError) {
      throw new DatabaseError(
        `Event kaydı başarısız oldu: ${eventError.message}`,
      );
    }
    sourceEventId = insertedEvent.id;
    logger.info("DailyReflection", `Event ${sourceEventId} oluşturuldu.`);

    // 2. AI Kararını Logla
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
    const currentVault = await VaultService.getUserVault(userId, adminClient) ??
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
    await VaultService.updateUserVault(userId, newVault, adminClient);
    logger.info("DailyReflection", `Vault güncellendi.`);

    // 5. Her şey tamamsa, Event'in durumunu "completed" yap
    await adminClient.from("events").update({
      data: {
        ...context.initialEvent.data,
        status: "completed",
        reflectionText,
        conversationTheme,
      },
    }).eq("id", sourceEventId);

    // 6. SOHBET İÇİN GEÇİCİ HAFIZAYI OLUŞTUR
    const chatContext = {
      originalNote: todayNote,
      aiReflection: reflectionText,
      theme: conversationTheme,
      source: "daily_reflection",
    };

    const { data: pendingSession, error: pendingError } = await adminClient
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

    throw error;
  }
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

// UI'nin beklediği tip
type DiaryResponse = {
  aiResponse: string;
  nextQuestions?: string[];
  isFinal: boolean;
  conversationId: string;
};

// Default sorular - AI başarısız olursa kullanılır
const DEFAULT_DIARY_QUESTIONS = [
  "Şu an içinden geçen baskın duygu ne?",
  "Bu hikâyedeki en zor an hangisiydi, neden?",
  "Şu anda sana iyi gelecek küçük bir adım ne olurdu?",
];

export async function handleDiaryEntry(
  context: InteractionContext,
): Promise<DiaryResponse> {
  const { initialEvent, initialVault } = context;
  const { userInput, conversationId, turn } = (initialEvent.data ?? {}) as {
    userInput?: string;
    conversationId?: string | null;
    turn?: number;
  };

  if (!userInput || typeof userInput !== "string") {
    throw new ValidationError("Günlük için metin gerekli.");
  }

  const userName = initialVault?.profile?.nickname ?? null;
  const vaultContext = vaultToContextString(initialVault as VaultData);

  // 1) İlk tur: duygu + 3 soru üret
  if (!conversationId || !turn || turn === 0) {
    const prompt = getDiaryStartPrompt(userInput, userName, vaultContext);
    const raw = await AiService.invokeGemini(
      prompt,
      config.AI_MODELS.FAST,
      { responseMimeType: "application/json", temperature: 0.7 },
      context.transactionId,
      userInput, // ← KRİTİK FIX 3: userMessage parametresi
    );

    // Güvenli JSON ayrıştırma
    const parsed =
      safeParseJsonBlock<{ mood?: string; questions?: string[] }>(raw) ?? {};

    // Soruları al, yoksa default kullan
    const qs = (Array.isArray(parsed.questions) && parsed.questions.length > 0)
      ? parsed.questions.slice(0, 3)
      : DEFAULT_DIARY_QUESTIONS;

    return {
      aiResponse: "Hazırım. Şunlardan biriyle devam edelim:",
      nextQuestions: qs,
      isFinal: false,
      conversationId: context.transactionId,
    };
  }

  // 2) Sonraki turlar: yeni sorular üret, gerekiyorsa bitir
  const nextPrompt = getDiaryNextQuestionsPrompt(userInput, userName);
  const rawNext = await AiService.invokeGemini(
    nextPrompt,
    config.AI_MODELS.FAST,
    { responseMimeType: "application/json", temperature: 0.7 },
    context.transactionId,
    userInput, // ← KRİTİK FIX 3: userMessage parametresi
  );

  // Önce gerçek sonucu kontrol et
  const parsedObj = safeParseJsonBlock<{ questions?: string[] }>(rawNext);
  const parsedQs = parsedObj?.questions ?? [];
  const aiCouldNotGenerateQuestions = parsedQs.length === 0; // ← gerçek boşluk kontrolü

  // Fallback uygula
  const nextQs = aiCouldNotGenerateQuestions
    ? DEFAULT_DIARY_QUESTIONS
    : parsedQs.slice(0, 3);

  // Bitiş kriteri: 3. turdan sonra YA DA AI soru üretemediyse finalize et
  const shouldFinish = (turn ?? 0) >= 2 || aiCouldNotGenerateQuestions;

  let aiResponse = "Devam edelim; sana iyi gelen bir yerden anlatabilirsin.";
  if (shouldFinish) {
    // Kısa kapanış
    const conclPrompt = getDiaryConclusionPrompt(userInput, userName, "");
    try {
      const rawC = await AiService.invokeGemini(
        conclPrompt,
        config.AI_MODELS.FAST,
        { responseMimeType: "application/json", temperature: 0.6 },
        context.transactionId,
        userInput, // ← KRİTİK FIX 3: userMessage parametresi
      );
      const summary = safeParseJsonBlock<{ summary?: string }>(rawC)?.summary;
      if (summary) aiResponse = summary;
    } catch { /* sessizce geç */ }
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

// BU ESKİ, DAĞINIK handleTextSession'ın YERİNE GELECEK OLAN YENİ VERSİYON
export async function handleTextSession(context: InteractionContext): Promise<{
  aiResponse: string;
  usedMemory: { content: string; source_layer: string } | null;
}> {
  const { logger, userId } = context;
  const { messages, pendingSessionId } = context.initialEvent.data as {
    messages?: { sender: "user" | "ai"; text: string }[];
    pendingSessionId?: string | null;
  };

  // TEŞHİS LOGU: AntiParrot-v2 çalışıyor mu kontrolü
  logger.info(
    "AntiParrot-v2",
    `build: 2025-09-06, rules: lcs5 trig0.42 cliche unicode-fix`,
  );

  // 1. SICA BAŞLANGIÇ KONTROLÜ (WARM START)
  const isWarmStartAttempt = messages && messages.length === 0 &&
    pendingSessionId;

  if (isWarmStartAttempt) {
    // Sıcak başlangıç için bağlamı çek
    const { warmStartContext } = await buildTextSessionContext(
      userId,
      "", // userMessage boş
      pendingSessionId,
    );

    if (!warmStartContext) {
      throw new ValidationError("Geçici oturum bulunamadı veya süresi doldu.");
    }

    logger.info("TextSession", "Sıcak başlangıç bağlamı çekildi.");

    // Sıcak başlangıç için özel prompt oluştur
    const warmStartPrompt = `
      SENİN ROLÜN: Sen, az önce bir kullanıcıya günlük yansıması yapmış bir zihin aynasısın. Şimdi o yansıma üzerinden sohbete devam edeceksin.

      BAĞLAM (KULLANICI BUNU BİLMİYOR, SEN BİLİYORSUN):
      - Kullanıcının Günlüğü: "${warmStartContext.originalNote}"
      - Senin Az Önceki Yansıtman: "${warmStartContext.aiReflection}"
      - Ana Tema: "${warmStartContext.theme}"

      GÖREVİN: Sohbete BAŞLAT. Kullanıcıya "Sohbet Et" butonuna bastığı için bir karşılama mesajı yaz. Mesajın, yukarıdaki bağlamı bildiğini hissettirsin ama "kayıtlara göre" gibi robotik olmasın. Doğal bir geçiş yap.

      ÖRNEK CEVAPLAR:
      - "Az önceki yansımamızda bahsettiğin o proje konusu nasıl gidiyor? Bu dinginlik hissini neye borçlusun sence?"
      - "Yansımanı paylaştığın için teşekkürler. O 'sakinlik' anı üzerine biraz daha konuşmak istersen buradayım. Seni bu noktaya getiren neydi?"

      Şimdi, bu kurallara göre sohbeti başlatan ilk cümleni kur:
    `.trim();

    const rawWarm = await AiService.invokeGemini(
      warmStartPrompt,
      config.AI_MODELS.RESPONSE,
      { temperature: 0.7 },
      context.transactionId,
    );

    // Sıcak başlangıçta da papağanlık kontrolü
    const aiResponse = await ensureNonParrotReply(
      warmStartContext.aiReflection?.slice(0, 80) ?? "",
      rawWarm,
      { forbidPersonal: true },
      context.transactionId,
    );

    // İSTEMCİ DOĞRULAMA: Orchestrator cevabını gösteriyor mu kontrolü
    return { aiResponse: "· " + aiResponse, usedMemory: null }; // Sıcak başlangıçta RAG hafızası yok
  }

  // 2. NORMAL SOHBET AKIŞI
  if (!messages || messages.length === 0) {
    throw new ValidationError("Sohbet için mesaj gerekli.");
  }
  const userMessage = messages[messages.length - 1].text;
  logger.info("TextSession", `Yeni mesaj alındı: "${userMessage}"`);

  // 3. BAĞLAMI OLUŞTUR (Yeni context.service'i çağır)
  // Artık bütün veritabanı ve RAG mantığı burada, tek satırda.
  const { userDossier, retrievedMemories } = await buildTextSessionContext(
    userId,
    userMessage,
    pendingSessionId,
  );
  logger.info("TextSession", "Kullanıcı dosyası ve RAG hafızası çekildi.");

  // 4. PROMPT'U OLUŞTUR (Yeni prompt.service'i çağır)
  // --- küçük yardımcılar ---
  function lexicalOverlap(a: string, b: string) {
    const toSet = (s: string) =>
      new Set(
        s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ")
          .split(/\s+/).filter((w) => w.length > 2),
      );
    const A = toSet(a), B = toSet(b);
    let inter = 0;
    A.forEach((w) => {
      if (B.has(w)) inter++;
    });
    return inter / Math.max(1, A.size);
  }
  const isGreeting = /\b(merhaba|selam|hey|günaydın|iyi akşamlar|naber)\b/i
    .test(userMessage);

  // 1) vektör sonuçları üstünde hafif filtre
  const filteredMemories = retrievedMemories.filter((m) =>
    lexicalOverlap(userMessage, String(m.content)) >= 0.10
  );

  // 2) Kullanım kararı: selam değilse ve mesaj ≥2 kelimeyse
  const canUse = !isGreeting && userMessage.trim().split(/\s+/).length >= 2;

  // 3) Fallback: filtre boşsa top-1'i yine de kullan
  const kept = canUse
    ? (filteredMemories.length > 0
      ? filteredMemories
      : retrievedMemories.slice(0, 1))
    : [];

  const pastContext = kept.length > 0
    ? kept.map((m) => `- ${m.content}`).join("\n")
    : "Yok";

  logger.info(
    "RAG-guard",
    `retrieved=${retrievedMemories.length}, kept=${kept.length}, filtered=${filteredMemories.length}, canUse=${canUse}, reason=${
      filteredMemories.length > 0 ? "lexical" : "fallback_top1"
    }`,
  );

  const shortTermMemory = messages.slice(0, -1).map((m) =>
    `${m.sender === "user" ? "Danışan" : "Sen"}: ${m.text}`
  ).join("\n");

  const lastAiMsg = messages.slice(0, -1).reverse().find((m) =>
    m.sender === "ai"
  );
  const lastAiEndedWithQuestion = !!lastAiMsg &&
    /[?؟]$/.test(lastAiMsg.text.trim());
  const userLooksBored = /\b(sıkıldım|boşver|aman|off+|yeter|ne alaka)\b/i.test(
    userMessage,
  );

  // Stil rotasyonu: transactionId ile deterministik stil modu
  const styleMode =
    (context.transactionId.charCodeAt(0) + (messages?.length || 0)) % 3;

  const masterPrompt = generateTextSessionPrompt({
    userDossier,
    pastContext,
    shortTermMemory,
    userMessage,
    lastAiEndedWithQuestion,
    userLooksBored,
    styleMode,
  });

  // 4. YAPAY ZEKAYI ÇAĞIR
  logger.info("TextSession", "AI'dan cevap bekleniyor...");
  const rawAi = await AiService.invokeGemini(
    masterPrompt,
    config.AI_MODELS.RESPONSE, // Hızlı modeli kullanmaya devam
    { temperature: 0.8 },
    context.transactionId,
    userMessage,
  );

  // Emniyet katmanı: papağanlık varsa yeniden yazdır
  // TEŞHİS: AntiParrot gerçekten çalışıyor mu?
  const parrotCheck = looksParroty(userMessage, rawAi);
  const clicheCheck = hasCliches(rawAi);
  const needRewrite = parrotCheck || clicheCheck;
  logger.info(
    "AntiParrot-check",
    `need: ${needRewrite}, parrot: ${parrotCheck}, cliche: ${clicheCheck}, preview: ${
      rawAi.slice(0, 140)
    }`,
  );

  const aiResponse = await ensureNonParrotReply(
    userMessage,
    rawAi,
    { noQuestionTurn: lastAiEndedWithQuestion, forbidPersonal: true },
    context.transactionId,
  );

  logger.info(
    "AntiParrot-result",
    `rewritten: ${aiResponse !== rawAi}, preview: ${aiResponse.slice(0, 140)}`,
  );

  // 5. SONUCU DÖNDÜR
  const usedMemory = kept.length > 0 ? kept[0] : null;
  logger.info("TextSession", "Cevap başarıyla üretildi.");

  // İSTEMCİ DOĞRULAMA: Orchestrator cevabını gösteriyor mu kontrolü
  return { aiResponse: "· " + aiResponse, usedMemory };
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
  "diary_entry": handleDiaryEntry, // <-- EKLENDİ
  "onboarding_completed": handleDefault,
  "default": handleDefault, // <-- EKLE
};
