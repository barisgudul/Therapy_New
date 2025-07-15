// services/orchestration.service.ts

import { InteractionContext } from '../types/context';
import * as AiService from './ai.service';
import * as EventService from './event.service';
import { EventPayload } from './event.service';
import * as JourneyService from './journey.service';
import * as VaultService from './vault.service';

// React Native uyumlu UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Kullanıcıdan gelen yeni bir terapi mesajını işler.
 * Bu fonksiyon, dinamik ve öğrenen bir AI beyni gibi davranır.
 */
export async function processUserMessage(userId: string, eventPayload: EventPayload): Promise<string> {
  
  // 1. İŞLEM BAŞLIYOR: Bağlamı oluştur.
  console.log(`[ORCHESTRATOR] Yeni işlem başlıyor: ${eventPayload.type}`);
  const initialVault = await VaultService.getUserVault() ?? {};
  
  const context: InteractionContext = {
    transactionId: generateId(),
    userId,
    initialVault,
    initialEvent: {
      ...eventPayload,
      id: generateId(),
      user_id: userId,
      timestamp: Date.now(),
      created_at: new Date().toISOString()
    },
    derivedData: {},
  };
  
  // 2. AKILLI ORKESTRA ŞEFİ: Kullanıcının durumuna göre karar ver.
  try {
    switch (eventPayload.type) {
      case 'text_session':
      case 'voice_session':
      case 'video_session':
        return await handleTherapySession(context);
      
      case 'dream_analysis':
        return await handleDreamAnalysis(context);
      
      case 'ai_analysis':
        return await handleStructuredAnalysis(context);
      
      case 'diary_entry':
        return await handleDiaryStart(context);
      
      case 'daily_reflection':
        return await handleDailyReflection(context);
      
      case 'onboarding_completed':
        return await handleOnboardingCompletion(context);
      
      default:
        throw new Error(`Bilinmeyen event tipi: ${eventPayload.type}`);
    }
    
  } catch (error) {
    console.error(`[ORCHESTRATOR] İşlem sırasında kritik hata: ${context.transactionId}`, error);
    throw error;
  }
}

// === AKILLI KARAR VERME FONKSİYONLARI ===

/**
 * Kullanıcının durumuna göre en uygun terapist KİŞİLİĞİNİ seçer ve
 * bu kişilikle adaptif yanıt fonksiyonunu çağırır.
 */
function selectTherapistFunction(context: InteractionContext): Promise<string> {
  const { traits } = context.initialVault;
  
  // Kaygı seviyesi yüksekse 'sakinleştirici' yaklaşım
  if (traits?.anxiety_level && traits.anxiety_level > 0.7) {
    console.log(`[ORCHESTRATOR] Yüksek kaygı tespit edildi (${(traits.anxiety_level * 100).toFixed(0)}%). 'calm' kişiliği seçiliyor.`);
    return AiService.generateAdaptiveTherapistReply(context, 'calm'); // <-- YENİ VE ADAPTİF
  }
  
  // Motivasyon düşükse 'motivasyonel' yaklaşım
  if (traits?.motivation && traits.motivation < 0.4) {
    console.log(`[ORCHESTRATOR] Düşük motivasyon tespit edildi (${(traits.motivation * 100).toFixed(0)}%). 'motivational' kişiliği seçiliyor.`);
    return AiService.generateAdaptiveTherapistReply(context, 'motivational'); // <-- YENİ VE ADAPTİF
  }
  
  // Açıklık yüksekse 'analitik' yaklaşım
  if (traits?.openness && traits.openness > 0.7) {
    console.log(`[ORCHESTRATOR] Yüksek açıklık tespit edildi (${(traits.openness * 100).toFixed(0)}%). 'analytical' kişiliği seçiliyor.`);
    return AiService.generateAdaptiveTherapistReply(context, 'analytical'); // <-- YENİ VE ADAPTİF
  }
  
  // Hiçbir koşul karşılanmazsa 'varsayılan' yaklaşım
  console.log(`[ORCHESTRATOR] Standart ('default') terapist kişiliği seçiliyor.`);
  return AiService.generateAdaptiveTherapistReply(context, 'default'); // <-- YENİ VE ADAPTİF
}

/**
 * Mood'u vault'a kaydet ve mood history'yi güncelle
 */
async function updateMoodInVault(context: InteractionContext, mood: string): Promise<void> {
  if (!mood || mood === "belirsiz") return;
  
  const currentVault = context.initialVault;
  const moodHistory = currentVault.moodHistory || [];
  
  // Yeni mood entry'si
  const moodEntry = {
    mood: mood,
    timestamp: new Date().toISOString(),
    source: context.initialEvent.type
  };
  
  // Mood history'ye ekle (son 30 günlük)
  const updatedMoodHistory = [...moodHistory, moodEntry].slice(-30);
  
  // Vault'u güncelle
  const updatedVault = {
    ...currentVault,
    currentMood: mood,
    lastMoodUpdate: new Date().toISOString(),
    moodHistory: updatedMoodHistory
  };
  
  await VaultService.updateUserVault(updatedVault);
  console.log(`[ORCHESTRATOR] Mood güncellendi: ${mood} (${context.initialEvent.type})`);
}

/**
 * Mood trend'ini analiz et
 */
function analyzeMoodTrend(context: InteractionContext): string | null {
  const { moodHistory } = context.initialVault;
  if (!moodHistory || moodHistory.length < 3) return null;
  
  const recentMoods = moodHistory.slice(-5).map(entry => entry.mood);
  const positiveMoods = ['mutlu', 'neşeli', 'enerjik', 'huzurlu', 'güvenli'];
  const negativeMoods = ['üzgün', 'kaygılı', 'stresli', 'yorgun', 'kızgın'];
  
  const positiveCount = recentMoods.filter(mood => positiveMoods.includes(mood)).length;
  const negativeCount = recentMoods.filter(mood => negativeMoods.includes(mood)).length;
  
  if (positiveCount > negativeCount) return 'pozitif_trend';
  if (negativeCount > positiveCount) return 'negatif_trend';
  return 'kararsız_trend';
}

// === SENARYO YÖNETİCİLERİ ===

/**
 * Akıllı terapi seansı akışı
 */
async function handleTherapySession(context: InteractionContext): Promise<string> {
  const isSessionEnd = context.initialEvent.data.isSessionEnd === true;

  if (isSessionEnd) {
    console.log(`[ORCHESTRATOR] Seans sonu hafıza işlemi başlatılıyor: ${context.transactionId}`);
    await EventService.logEvent({
      type: context.initialEvent.type,
      mood: context.initialEvent.data.finalMood,
      data: {
        therapistId: context.initialEvent.data.therapistId,
        messages: context.initialEvent.data.messages,
        // Diğer önemli meta-veriler...
      }
    });
    const memory = await AiService.analyzeSessionForMemory(context);
    if (memory) {
      if (memory.vaultUpdate) {
        const updatedVault = AiService.mergeVaultData(context.initialVault, memory.vaultUpdate);
        await VaultService.updateUserVault(updatedVault);
      }
      if (memory.log) {
        await JourneyService.addJourneyLogEntry(memory.log);
      }
    }
    console.log(`[ORCHESTRATOR] Seans sonu işlemi tamamlandı.`);
    return "SESSION_ENDED_OK";
  } else {
    console.log(`[ORCHESTRATOR] Seans içi yanıt üretiliyor: ${context.transactionId}`);
    const reply = await selectTherapistFunction(context);
    context.derivedData.generatedReply = reply;
    const moodTrend = analyzeMoodTrend(context);
    if (moodTrend) {
      context.derivedData.moodTrend = moodTrend;
    }
    return reply;
  }
}

/**
 * Rüya analizi akışı
 */
async function handleDreamAnalysis(context: InteractionContext): Promise<string> {
    const { initialEvent, initialVault } = context;
    const isFollowUp = initialEvent.data.isFollowUp === true;

    // --- BU BİR DEVAM DİYALOĞU MU?
    if (isFollowUp) {
        console.log(`[ORCHESTRATOR] Rüya diyaloğu devam ediyor: ${context.transactionId}`);
        
        const userAnswers = initialEvent.data.fullDialogue.filter((m: any) => m.role === 'user');
        const MAX_INTERACTIONS = 3;

        // --- DİYALOG BİTTİ Mİ? SON GERİ BİLDİRİMİ ÜRET
        if (userAnswers.length >= MAX_INTERACTIONS) {
            return await AiService.generateFinalDreamFeedback(context); // Artık context yolluyoruz
        } 
        // --- HAYIR, DİYALOĞA DEVAM ET. YENİ SORU ÜRET
        else {
            return await AiService.generateNextDreamQuestion(context); // Artık context yolluyoruz
        }
    } 
    // --- BU İLK ANALİZ İSTEĞİ
    else {
        console.log(`[ORCHESTRATOR] Yeni rüya analizi başlatılıyor: ${context.transactionId}`);
      
        // İlk analiz adımları...
        const dreamAnalysis = await AiService.analyzeDreamWithContext(context);
      
        // Hafıza güncelleme ve loglama
        if (dreamAnalysis?.themes) {
            const updatedVault = AiService.mergeVaultData(context.initialVault, { themes: dreamAnalysis.themes });
            await VaultService.updateUserVault(updatedVault);
            await JourneyService.addJourneyLogEntry(`Rüya analizi: Temalar - ${dreamAnalysis.themes.join(', ')}`);
        }
        
        // Ücretsiz kullanım hakkını kaydetmek için vault'u güncelle
        const vault = context.initialVault;
        const newFreeUsage = {
            ...(vault.freeUsage || {}),
            lastFreeDreamAnalysis: new Date().toISOString()
        };
        const updatedVault = {
            ...AiService.mergeVaultData(vault, { themes: dreamAnalysis?.themes || [] }),
            freeUsage: newFreeUsage // Yeni kullanım bilgisini ekle
        };
        await VaultService.updateUserVault(updatedVault);

        // Analizle birlikte İLK SORUYU DA DÖNDÜR
        const firstQuestionContext: InteractionContext = { ...context, derivedData: { dreamAnalysis } };
        const firstQuestion = await AiService.generateNextDreamQuestion(firstQuestionContext);
      
        const resultForClient = {
            analysis: dreamAnalysis,
            // İlk soru null gelebilir, bu yüzden bir fallback ekle
            nextQuestion: firstQuestion || "Bu yorumlar sana ne hissettirdi?"
        };

        // Bu ilk analiz olayını, sonucuyla birlikte veritabanına logla
        await EventService.logEvent({
            type: 'dream_analysis',
            data: { dreamText: initialEvent.data.dreamText, analysis: dreamAnalysis, dialogue: [] },
        });

        console.log('[ORCHESTRATOR] Ücretsiz rüya analizi kullanım tarihi Vault\'a kaydedildi.');
        console.log(`[ORCHESTRATOR] Yeni rüya analizi tamamlandı ve loglandı.`);
        return JSON.stringify(resultForClient);
    }
}

/**
 * Yapılandırılmış analiz akışı
 */
async function handleStructuredAnalysis(context: InteractionContext): Promise<string> {
  console.log(`[ORCHESTRATOR] Yapılandırılmış analiz başlatılıyor: ${context.transactionId}`);
  
  // Adım 1: Analiz raporu üret
  const report = await AiService.generateStructuredAnalysisReport(context);
  context.derivedData.analysisReport = report;
  
  console.log(`[ORCHESTRATOR] Yapılandırılmış analiz tamamlandı: ${context.transactionId}`);
  return report;
}

/**
 * Gelişmiş günlük başlangıç akışı
 */
async function handleDiaryStart(context: InteractionContext): Promise<string> {
  console.log(`[ORCHESTRATOR] Gelişmiş günlük başlangıç başlatılıyor: ${context.transactionId}`);
  // Adım 1: Günlük başlangıç analizi
  const diaryStart = await AiService.generateDiaryStart(context);
  context.derivedData.dominantMood = diaryStart.mood;
  context.derivedData.questions = diaryStart.questions;
  // Adım 2: Mood'u vault'a kaydet ve history'yi güncelle
  await updateMoodInVault(context, diaryStart.mood);
  // Adım 3: Mood trend'ini analiz et
  const moodTrend = analyzeMoodTrend(context);
  if (moodTrend) {
    context.derivedData.moodTrend = moodTrend;
    console.log(`[ORCHESTRATOR] Mood trend tespit edildi: ${moodTrend}`);
  }
  // Adım 4: Seyir defterine kayıt
  const logEntry = `Günlük başlangıcı: ${diaryStart.mood} ruh hali, ${diaryStart.questions.length} soru üretildi.`;
  await JourneyService.addJourneyLogEntry(logEntry);
  // Adım 5: Temaları vault'a ekle
  if (diaryStart.mood) {
    const updatedVault = AiService.mergeVaultData(context.initialVault, { themes: [diaryStart.mood] });
    await VaultService.updateUserVault(updatedVault);
  }
  console.log(`[ORCHESTRATOR] Gelişmiş günlük başlangıç tamamlandı: ${context.transactionId}`);
  return JSON.stringify(diaryStart);
}

/**
 * Gelişmiş günlük yansıma akışı
 */
async function handleDailyReflection(context: InteractionContext): Promise<string> {
  console.log(`[ORCHESTRATOR] Gelişmiş günlük yansıma başlatılıyor: ${context.transactionId}`);
  // Adım 1: Günlük yansıma yanıtı üret
  const reflection = await AiService.generateDailyReflectionResponse(context);
  context.derivedData.generatedReply = reflection;
  // Adım 2: Bugünkü mood'u vault'a kaydet
  const { todayMood } = context.initialEvent.data;
  if (todayMood) {
    await updateMoodInVault(context, todayMood);
  }
  // Adım 3: Mood trend'ini analiz et
  const moodTrend = analyzeMoodTrend(context);
  if (moodTrend) {
    context.derivedData.moodTrend = moodTrend;
    console.log(`[ORCHESTRATOR] Mood trend tespit edildi: ${moodTrend}`);
  }
  // Adım 4: Seyir defterine kayıt
  const logEntry = `Günlük yansıma: ${todayMood || 'belirsiz'} ruh hali ile gün tamamlandı.`;
  await JourneyService.addJourneyLogEntry(logEntry);
  // Adım 5: Moodu vault'a tema olarak ekle
  if (todayMood) {
    const updatedVault = AiService.mergeVaultData(context.initialVault, { themes: [todayMood] });
    await VaultService.updateUserVault(updatedVault);
  }
  console.log(`[ORCHESTRATOR] Gelişmiş günlük yansıma tamamlandı: ${context.transactionId}`);
  return reflection;
}

/**
 * Onboarding tamamlama akışı
 */
async function handleOnboardingCompletion(context: InteractionContext): Promise<string> {
  console.log(`[ORCHESTRATOR] Onboarding tamamlandı, cevaplar kaydediliyor: ${context.transactionId}`);
  
  // AI analizi yapma - sadece cevapları kaydet
  // Trait analizi daha sonra yapılacak, şimdilik masraftan kaçın
  
  // Vault güncelleme summary.tsx'te yapılıyor, burada tekrar yapma
  // Conflict'i önlemek için sadece log at
  
  console.log(`[ORCHESTRATOR] Onboarding cevapları başarıyla kaydedildi: ${context.transactionId}`);
  
  // UI'a başarılı olduğuna dair bir sinyal döndür
  return "ONBOARDING_SAVED";
} 