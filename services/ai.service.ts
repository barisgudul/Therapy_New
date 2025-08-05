// services/ai.service.ts
import { ZodSchema, z } from 'zod';
import { AI_MODELS } from '../constants/AIConfig';
import { getTherapistById } from '../data/therapists';
import { InteractionContext } from '../types/context';
import { ApiError, ValidationError, getErrorMessage, isAppError } from '../utils/errors';
import { parseAndValidateJson } from '../utils/jsonValidator';
import { DiaryStart, DiaryStartSchema, DreamAnalysisResult, DreamAnalysisSchema, NextQuestionsSchema, SessionMemory, SessionMemorySchema, TraitsSchema } from "../utils/schemas";
import { supabase } from '../utils/supabase';
import { fetchMinimumRequiredEvents } from './analysis_pipeline/1_fetcher';
import { processAndCompressEvents } from './analysis_pipeline/2_processor';
import { buildFinalPrompt } from './analysis_pipeline/3_builder';
import { getRecentJourneyLogEntries } from './journey.service';
import type { Traits } from './trait.service';

// Prompt Imports
import { getAdaptiveTherapistReplyPrompt } from './prompts/adaptiveTherapy.prompt';
import { getCumulativeSummaryPrompt, getOnboardingAnalysisPrompt } from './prompts/analysis.prompt';
import { getDailyReflectionPrompt } from './prompts/dailyReflection.prompt';
import { getDiaryNextQuestionsPrompt, getDiaryStartPrompt } from './prompts/diary.prompt';
import { getDreamAnalysisPrompt } from './prompts/dreamAnalysis.prompt';
import { getFinalDreamFeedbackPrompt, getNextDreamQuestionPrompt } from './prompts/dreamDialogue.prompt';
import { getSessionMemoryPrompt } from './prompts/sessionMemory.prompt';


// ------------------- MODEL SABİTLERİ -------------------
const GENIOUS_MODEL = AI_MODELS.POWERFUL;

// YENİ EKLE: Terapist Kişilik Tipleri
type TherapistPersonality = string;

// -------------------------------------------------------------
// === ZOD DOĞRULAMALI FONKSİYONLAR ===
// -------------------------------------------------------------

async function invokeAndValidate<T extends ZodSchema>(
    prompt: string, 
    model: string, 
    schema: T, 
    config?: GenerationConfig
): Promise<z.infer<T>> {
    try {
        const jsonString = await invokeGemini(prompt, model, config);
        const result = parseAndValidateJson(jsonString, schema);
        if (result === null) {
            throw new ValidationError("Yapay zekadan gelen veri beklenen formata uymuyor.");
        }
        return result;
    } catch (error) {
        if (isAppError(error)) throw error;
        throw new ApiError(`Model (${model}) çağrılırken bir hata oluştu.`);
    }
}

// --- GÜNLÜK AKIŞI: Başlangıç ---
export async function generateDiaryStart(context: InteractionContext): Promise<DiaryStart> {
    const { initialEntry } = context.initialEvent.data;
    const prompt = getDiaryStartPrompt(initialEntry);
    try {
        return await invokeAndValidate(prompt, AI_MODELS.FAST, DiaryStartSchema, { responseMimeType: 'application/json', temperature: 0.5 });
    } catch (error) {
        console.error("generateDiaryStart hatası:", getErrorMessage(error));
        return { mood: "belirsiz", questions: ["Bu hissin kaynağı ne olabilir?", "Bu durumla ilgili neyi değiştirmek isterdin?", "Bu konu hakkında başka kimseyle konuştun mu?"] };
    }
}

// --- GÜNLÜK AKIŞI: Sonraki Sorular ---
export async function generateDiaryNextQuestions(context: InteractionContext): Promise<string[]> {
    const { conversationHistory } = context.initialEvent.data;
    const prompt = getDiaryNextQuestionsPrompt(conversationHistory);
    try {
        const result = await invokeAndValidate(prompt, AI_MODELS.FAST, NextQuestionsSchema, { responseMimeType: 'application/json', temperature: 0.6 });
        return result.questions;
    } catch (error) {
        console.error("generateDiaryNextQuestions hatası:", getErrorMessage(error));
        return ["Bu konuda başka ne söylemek istersin?", "Bu durum seni gelecekte nasıl etkileyebilir?", "Hissettiğin bu duyguya bir isim verecek olsan ne olurdu?"];
    }
}

// --- RÜYA ANALİZİ ---
export async function analyzeDreamWithContext(context: InteractionContext): Promise<DreamAnalysisResult> {
    const { dreamText } = context.initialEvent.data;
    const userVault = context.initialVault;
    const recentLogs = await getRecentJourneyLogEntries(3);
    const ctx = `### KULLANICI KASASI (Kişinin Özü) ###\n${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}\n### SON ZAMANLARDAKİ ETKİLEŞİMLER (Seyir Defterinden Fısıltılar) ###\n- ${recentLogs.join('\n- ')}`;
    const prompt = getDreamAnalysisPrompt(ctx, dreamText);
    try {
        return await invokeAndValidate(prompt, AI_MODELS.FAST, DreamAnalysisSchema, { responseMimeType: 'application/json' });
    } catch (error) {
        console.error("analyzeDreamWithContext hatası:", getErrorMessage(error));
        throw new ApiError("Rüya yorumu oluşturulamadı.");
    }
}

// --- SEANS HAFIZA ANALİZİ ---
export async function analyzeSessionForMemory(context: InteractionContext): Promise<SessionMemory> {
    const transcript = context.initialEvent.data.transcript || context.initialEvent.data.userMessage || "";
    const userVault = context.initialVault;
    const prompt = getSessionMemoryPrompt(userVault, transcript);
    try {
        return await invokeAndValidate(prompt, AI_MODELS.POWERFUL, SessionMemorySchema, { responseMimeType: 'application/json' });
    } catch (error) {
        console.error("analyzeSessionForMemory hatası:", getErrorMessage(error));
        throw new ApiError("Seans hafıza analizi oluşturulamadı.");
    }
}

// -------------------------------------------------------------
// === JSON ÜRETMEYEN NORMAL FONKSİYONLAR ===
// -------------------------------------------------------------

export async function generateDailyReflectionResponse(context: InteractionContext): Promise<string> {
  const { todayNote, todayMood } = context.initialEvent.data;
  const userVault = context.initialVault;
  
  try {
    const userName = userVault?.profile?.nickname;
    const prompt = getDailyReflectionPrompt(userName, todayMood, todayNote);
    return await invokeGemini(prompt, AI_MODELS.FAST, { temperature: 0.7, maxOutputTokens: 150 });
  } catch (error) {
    console.error("[generateDailyReflectionResponse] Hata:", getErrorMessage(error));
    throw new ApiError("Günlük yansıma yanıtı oluşturulamadı.");
  }
}

export async function generateCumulativeSummary(context: InteractionContext): Promise<string> {
  const { previousSummary, newConversationChunk } = context.initialEvent.data;
  
  try {
    const prompt = getCumulativeSummaryPrompt(previousSummary, newConversationChunk);
    const config: GenerationConfig = {
      temperature: 0.2,
      maxOutputTokens: 500,
    };
    return await invokeGemini(prompt, AI_MODELS.FAST, config);
  } catch (error) {
    console.error("[generateCumulativeSummary] Hata:", getErrorMessage(error));
    throw new ApiError("Seans özeti oluşturulamadı.");
  }
}

export async function generateStructuredAnalysisReport(context: InteractionContext): Promise<string> {
  const { days } = context.initialEvent.data;
  const userVault = context.initialVault;
  
  try {
    console.log(`[ANALYSIS-PIPELINE] Adım 1: ${days} günlük veri çekiliyor...`);
    const events = await fetchMinimumRequiredEvents(days);
    
    console.log(`[ANALYSIS-PIPELINE] Adım 2: ${events.length} olay işleniyor...`);
    const processedData = await processAndCompressEvents(events, days);
    
    console.log('[ANALYSIS-PIPELINE] Adım 3: Final prompt oluşturuluyor...');
    const prompt = buildFinalPrompt(days, userVault, processedData);
    
    console.log('[ANALYSIS-PIPELINE] Adım 4: Yapay zeka çağrısı yapılıyor...');
    return await invokeGemini(prompt, AI_MODELS.POWERFUL, { 
      temperature: 0.6,
      maxOutputTokens: 8192,
    });
  
  } catch (error) {
    console.error("[generateStructuredAnalysisReport] Orkestrasyon sırasında hata!", getErrorMessage(error));
    if (isAppError(error)) throw error;
    throw new ApiError("Analiz raporu oluşturulamadı.");
  }
}

// Yeni, zeki fonksiyonumuz
export async function generateNextDreamQuestionAI(context: InteractionContext): Promise<string> {
    const { initialEvent } = context;
    const dreamAnalysis = initialEvent.data.dreamAnalysisResult || initialEvent.data.analysis;
    
    // NULL CHECK EKLE
    if (!dreamAnalysis || !dreamAnalysis.themes) {
        console.warn('[generateNextDreamQuestionAI] Eksik veri tespit edildi, varsayılan soru dönülüyor.');
        return "Bu rüya hakkında başka ne hissediyorsun?";
    }

    const conversationHistory = (initialEvent.data.fullDialogue || [])
        .map((m: any) => `${m.role === 'user' ? 'Kullanıcı' : 'Terapist'}: ${m.text}`)
        .join('\n');

    try {
        const prompt = getNextDreamQuestionPrompt(dreamAnalysis, conversationHistory);
        const nextQuestion = await invokeGemini(prompt, AI_MODELS.FAST, { 
            temperature: 0.7, 
            maxOutputTokens: 150 
        });
        return nextQuestion || "Bu yorumlar üzerine başka neler eklemek istersin?";
    } catch (error) {
        console.error('[generateNextDreamQuestionAI] Soru üretilirken hata:', getErrorMessage(error));
        return "Bu konuda aklına başka neler geliyor?";
    }
}

export async function generateFinalDreamFeedback(context: InteractionContext): Promise<string> {
  const { initialEvent, initialVault } = context;
  const dreamAnalysis = initialEvent.data.dreamAnalysisResult || initialEvent.data.analysis;
  const userAnswers = initialEvent.data.fullDialogue.filter((m: any) => m.role === 'user');
  
  try {
    const maxInterpretationLength = 1200;
    const maxAnswerLength = 400;
    const truncatedInterpretation = dreamAnalysis.interpretation.length > maxInterpretationLength
      ? dreamAnalysis.interpretation.slice(0, maxInterpretationLength) + '... (kısaltıldı)'
      : dreamAnalysis.interpretation;
    const formattedAnswers = userAnswers
      .map((ans: any, i: number) => {
        let t = ans.text || '';
        if (t.length > maxAnswerLength) t = t.slice(0, maxAnswerLength) + '... (kısaltıldı)';
        return `Soru ${i + 1}'e Verilen Cevap: "${t}"`;
      })
      .join('\n');
  
    const prompt = getFinalDreamFeedbackPrompt(initialVault, truncatedInterpretation, formattedAnswers);
    const config: GenerationConfig = {
      temperature: 0.5,
      maxOutputTokens: 300,
    };
    const finalFeedback = await invokeGemini(prompt, AI_MODELS.FAST, config);
    return finalFeedback;
  } catch (error) {
    console.error('[generateFinalDreamFeedback] Geri bildirim üretilirken hata:', getErrorMessage(error));
    throw new ApiError("Rüya geri bildirimi oluşturulamadı.");
  }
}

export function mergeVaultData(currentVault: any, vaultUpdate: any): any {
  const newVault = JSON.parse(JSON.stringify(currentVault));
  const mergeArrayUnique = (target: string[], source: string[]) => [...new Set([...(target || []), ...source])];
  if (vaultUpdate.themes) newVault.themes = mergeArrayUnique(newVault.themes, vaultUpdate.themes);
  if (vaultUpdate.coreBeliefs) newVault.coreBeliefs = { ...(newVault.coreBeliefs || {}), ...vaultUpdate.coreBeliefs };
  if (vaultUpdate.keyInsights) newVault.keyInsights = mergeArrayUnique(newVault.keyInsights, vaultUpdate.keyInsights);
  return newVault;
}

// --- ONBOARDING ANALİZİ: Kullanıcı cevaplarından trait çıkarımı ---
export async function analyzeOnboardingAnswers(context: InteractionContext): Promise<Partial<Traits>> {
    const { answers } = context.initialEvent.data;
    const formattedAnswers = Object.values(answers).join('\n - ');
    const prompt = getOnboardingAnalysisPrompt(formattedAnswers);

    try {
        return await invokeAndValidate(prompt, AI_MODELS.POWERFUL, TraitsSchema, {
            responseMimeType: 'application/json'
        });
    } catch(error) { 
        console.error("analyzeOnboardingAnswers hatası:", getErrorMessage(error));
        throw new ApiError("Kişilik analizi oluşturulamadı.");
    }
}

export async function generateAdaptiveTherapistReply(context: InteractionContext, personality: TherapistPersonality): Promise<string> {
  const { userMessage, intraSessionChatHistory, therapistId } = context.initialEvent.data;
  const userVault = context.initialVault;
  const therapist = getTherapistById(therapistId);
  const therapistName = therapist?.name || 'terapist';

  try {
    const isSimpleGreeting = /^(merhaba|selam|hey|hi|hello|nasılsın|iyi misin)$/i.test(userMessage.trim());
    const conversationDepth = intraSessionChatHistory ? intraSessionChatHistory.split('\n').length : 0;
    
    let contextLevel: 'minimal' | 'medium' | 'full';
    if (isSimpleGreeting && conversationDepth <= 2) contextLevel = 'minimal';
    else if (conversationDepth < 5) contextLevel = 'medium';
    else contextLevel = 'full';

    console.log(`[generateAdaptiveTherapistReply] Bağlam seviyesi: ${contextLevel} (mesaj: "${userMessage.slice(0, 30)}...")`);

    const limitedChatHistory = intraSessionChatHistory ? intraSessionChatHistory.split('\n').slice(-8).join('\n') : "";
    const recentLogEntries = contextLevel === 'full' ? await getRecentJourneyLogEntries(1) : [];
    const journeyLogContext = recentLogEntries.length > 0 ? `Önceki görüşmeden aklında kalan not: "${recentLogEntries.join('; ')}".` : "";
      
    const prompt = getAdaptiveTherapistReplyPrompt(
        personality,
        therapistName,
        userMessage,
        contextLevel,
        userVault,
        limitedChatHistory,
        journeyLogContext
    );
    
    const maxTokens = contextLevel === 'full' ? 400 : 300;
    
    return await invokeGemini(prompt, AI_MODELS.FAST, { temperature: 0.8, maxOutputTokens: maxTokens });

  } catch (error) {
    console.error(`[generateAdaptiveTherapistReply] Hata (Kişilik: ${personality}):`, getErrorMessage(error));
    if (error instanceof ApiError) throw error;
    throw new ApiError("Terapist yanıtı oluşturulamadı.");
  }
}

// GenerationConfig, invokeGemini etc.
type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json';
};

export async function invokeGemini(prompt: string, model: string, config?: GenerationConfig): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('api-gateway', {
      body: {
        type: 'gemini',
        payload: { model, prompt, config }
      },
    });
    
    if (error) {
      if (error.context?.status === 400) {
        throw new ApiError("İçerik güvenlik kontrolünden geçemedi. Lütfen farklı bir şekilde ifade etmeyi deneyin.");
      }
      throw error;
    }
    
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("API Gateway'den boş Gemini yanıtı alındı.");
    return reply;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error('[invokeGemini] Hatası:', err.message);
    throw new ApiError("AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
}


