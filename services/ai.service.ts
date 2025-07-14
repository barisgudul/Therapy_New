// services/ai.service.ts
import { ZodSchema, z } from 'zod';
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

// ------------------- MODEL SABİTLERİ -------------------
const FAST_MODEL = 'gemini-2.5-flash';
const POWERFUL_MODEL = 'gemini-2.5-pro';
const GENIOUS_MODEL = POWERFUL_MODEL;

// YENİ EKLE: Terapist Kişilik Tipleri
type TherapistPersonality = 'calm' | 'motivational' | 'analytical' | 'default';

// ------------------- GENERATION CONFIG TİPİ -------------------
type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json';
};

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
    const prompt = `Bir kullanıcının günlük başlangıç yazısını analiz et. Görevin:
1. Yazıdaki baskın duyguyu tek kelimeyle belirle (mood).
2. Bu duygu ve metinden yola çıkarak, kullanıcının daha derine inmesini sağlayacak 3 farklı ve açık uçlu soru üret (questions).

METİN: "${initialEntry}"

ÇIKTI (Sadece JSON): { "mood": "belirlediğin_duygu", "questions": ["soru1", "soru2", "soru3"] }`;
    try {
        return await invokeAndValidate(prompt, FAST_MODEL, DiaryStartSchema, { responseMimeType: 'application/json', temperature: 0.5 });
    } catch (error) {
        console.error("generateDiaryStart hatası:", getErrorMessage(error));
        return { mood: "belirsiz", questions: ["Bu hissin kaynağı ne olabilir?", "Bu durumla ilgili neyi değiştirmek isterdin?", "Bu konu hakkında başka kimseyle konuştun mu?"] };
    }
}

// --- GÜNLÜK AKIŞI: Sonraki Sorular ---
export async function generateDiaryNextQuestions(context: InteractionContext): Promise<string[]> {
    const { conversationHistory } = context.initialEvent.data;
    const prompt = `Bir günlük diyalogu devam ediyor. Kullanıcının son cevabına dayanarak, sohbeti bir adım daha ileri taşıyacak 3 YENİ ve FARKLI soru üret.
KONUŞMA GEÇMİŞİ:
${conversationHistory}

ÇIKTI (Sadece JSON): { "questions": ["yeni_soru1", "yeni_soru2", "yeni_soru3"] }`;
    try {
        const result = await invokeAndValidate(prompt, FAST_MODEL, NextQuestionsSchema, { responseMimeType: 'application/json', temperature: 0.6 });
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
    const prompt = `### ROL & GÖREV ###\nSen, Jung'un arketip bilgeliği, Freud'un psikanalitik derinliği ve bir dedektifin keskin gözlem yeteneğine sahip bir AI'sın. Görevin, SADECE bir rüyayı yorumlamak DEĞİL, bu rüyanın, danışanın sana sunduğu yaşam bağlamı (Kasası ve Seyir Defteri) içindeki anlamını ve kökenini ortaya çıkarmaktır. Derin bağlantılar kur.\n### VERİLER ###\n1.  **Yaşam Bağlamı (Kolektif Bilinç):** ${ctx}\n2.  **Analiz Edilecek Rüya Metni:** "${dreamText}"\n### ÇIKTI FORMATI (KESİNLİKLE UYULMALIDIR) ###\nLütfen yanıtını başka hiçbir metin eklemeden, doğrudan aşağıdaki JSON formatında ver:\n{ "title": "Rüya için kısa, merak uyandıran bir başlık.", "summary": "Rüyanın 1-2 cümlelik genel özeti.", "themes": ["Rüyanın ana temaları (örn: 'kontrol kaybı', 'takdir edilme arzusu')"], "interpretation": "Rüyanın derinlemesine, sembolik ve psikolojik yorumu.", "crossConnections": [{"connection": "Rüyadaki [sembol], kullanıcının hayatındaki [olay] ile bağlantılı olabilir.", "evidence": "Bu bağlantıyı neden düşündüğünün bir cümlelik açıklaması."}], "questions": ["Kullanıcının bu bağlantıları düşünmesini sağlayacak 2 adet derin, açık uçlu soru."] }`;
    try {
        return await invokeAndValidate(prompt, POWERFUL_MODEL, DreamAnalysisSchema, { responseMimeType: 'application/json' });
    } catch (error) {
        console.error("analyzeDreamWithContext hatası:", getErrorMessage(error));
        throw new ApiError("Rüya yorumu oluşturulamadı.");
    }
}

// --- SEANS HAFIZA ANALİZİ ---
export async function analyzeSessionForMemory(context: InteractionContext): Promise<SessionMemory> {
    const transcript = context.initialEvent.data.transcript || context.initialEvent.data.userMessage || "";
    const userVault = context.initialVault;
    const prompt = `### ROL & GÖREV ###\nSen, bir psikanalist ve hikaye anlatıcısının ruhuna sahip bir AI'sın. Görevin, aşağıdaki terapi dökümünün derinliklerine inerek hem ruhsal özünü hem de somut gerçeklerini çıkarmaktır. Yargılama, sadece damıt.\n\n### KULLANICI KASASI (Kişinin Özü) ###\n${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}\n\n### ÇIKTI FORMATI ###\nYanıtın KESİNLİKLE aşağıdaki JSON formatında olmalıdır. Başka hiçbir metin ekleme.\n{ "log": "Bu seansın 1-2 cümlelik, şiirsel ama net özeti. Bu, bir 'seyir defteri'ne yazılacak bir giriş gibi olmalı.", "vaultUpdate": { "themes": ["Yeni ortaya çıkan veya pekişen 1-3 ana tema"], "coreBeliefs": { "ortaya_çıkan_temel_inanç_veya_değişimi": "'Yeterince iyi değilim' inancı somutlaştı." }, "keyInsights": ["Kullanıcının bu seansta vardığı en önemli 1-2 farkındalık."] } }\n### SEANS DÖKÜMÜ ###\n${transcript}`;
    try {
        return await invokeAndValidate(prompt, POWERFUL_MODEL, SessionMemorySchema, { responseMimeType: 'application/json' });
    } catch (error) {
        console.error("analyzeSessionForMemory hatası:", getErrorMessage(error));
        throw new ApiError("Seans hafıza analizi oluşturulamadı.");
    }
}

// -------------------------------------------------------------
// === JSON ÜRETMEYEN NORMAL FONKSİYONLAR ===
// -------------------------------------------------------------
// Bu fonksiyonlar `sendToGemini`'yi doğrudan kullanır. Hata durumunda, ya `sendToGemini`
// hatayı yukarı fırlatır ya da biz bir `try-catch` ile yakalayıp anlamlı bir fallback döneriz.


export async function generateDailyReflectionResponse(context: InteractionContext): Promise<string> {
  const { todayNote, todayMood } = context.initialEvent.data;
  const userVault = context.initialVault;
  
  try {
    const userName = userVault?.profile?.nickname;

    const prompt = `
      Sen empatik ve destekleyici bir yapay zekâ terapistsin.
      ${userName ? `Kullanıcının adı ${userName}.` : ''}
      Kullanıcı bugün duygularını ve düşüncelerini paylaştı.
      Ruh hali: ${todayMood}
      Yazısı: "${todayNote}"
      Sadece bugüne ve yazdıklarına odaklanarak, kısa, empatik ve motive edici bir yanıt ver. Güven ver. Asla soru sorma. Eğer adını biliyorsan adıyla hitap et.`.trim();
      
    return await invokeGemini(prompt, FAST_MODEL, { temperature: 0.7, maxOutputTokens: 150 });
  } catch (error) {
    console.error("[generateDailyReflectionResponse] Hata:", getErrorMessage(error));
    throw new ApiError("Günlük yansıma yanıtı oluşturulamadı.");
  }
}

export async function generateCumulativeSummary(context: InteractionContext): Promise<string> {
  const { previousSummary, newConversationChunk } = context.initialEvent.data;
  const userVault = context.initialVault;
  
  try {
    const prompt = `
### GÖREV ###
Aşağıda bir terapi seansından iki bölüm bulunmaktadır:
1.  **ÖNCEKİ ÖZET:** Bu, seansın şu ana kadarki genel bir özetidir. (Eğer boşsa, bu seansın ilk özeti demektir).
2.  **YENİ KONUŞMALAR:** Bu, seansın son birkaç dakikasında geçen yeni diyaloglardır.

Senin görevin, **YENİ KONUŞMALAR**'daki önemli bilgileri alıp, bunları **ÖNCEKİ ÖZET**'e entegre ederek, güncel ve bütüncül YENİ BİR ÖZET oluşturmaktır.

### KURALLAR ###
-   Yeni özet, eskisinin üzerine ekleme yaparak oluşturulmalı, hiçbir önemli detay kaybolmamalı.
-   Özet, akıcı bir metin halinde ve en fazla 4-5 cümle olmalı.
-   Sadece özet metnini döndür, başka hiçbir yorum ekleme.
---
### VERİLER ###
**ÖNCEKİ ÖZET:**
${previousSummary || "Bu, seansın ilk bölümü. Henüz bir özet bulunmuyor."}
**YENİ KONUŞMALAR:**
${newConversationChunk}
---
### YENİ BÜTÜNCÜL ÖZET (Sadece bu kısmı doldur): ###
    `.trim();

    const config: GenerationConfig = {
      temperature: 0.2,
      maxOutputTokens: 500,
    };
    return await invokeGemini(prompt, FAST_MODEL, config);
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
    return await invokeGemini(prompt, POWERFUL_MODEL, { 
      temperature: 0.6,
      maxOutputTokens: 8192,
    });
  
  } catch (error) {
    console.error("[generateStructuredAnalysisReport] Orkestrasyon sırasında hata!", getErrorMessage(error));
    if (isAppError(error)) throw error;
    throw new ApiError("Analiz raporu oluşturulamadı.");
  }
}

// Eski fonksiyonlar artık analysis_pipeline klasörüne taşındı

export async function generateNextDreamQuestion(context: InteractionContext): Promise<string | null> {
  // FONKSİYONUN BAŞINDA CONTEXT'TEN VERİLERİ ÇEK
  const { initialEvent, initialVault } = context;
  const dreamAnalysis = initialEvent.data.dreamAnalysisResult || initialEvent.data.analysis;
  const conversationHistory = initialEvent.data.fullDialogue || [];
  const userVault = initialVault;
  
  try {
    const formattedHistory = conversationHistory
      .filter((m: any) => m.role === 'user')
      .map((m: any, i: number) => `Kullanıcının ${i + 1}. Cevabı: ${m.text}`)
      .join('\n');

    const prompt = `
### ROL & GÖREV ###
Sen, rüya analizi diyaloglarını yöneten usta bir terapistsin. Görevin, verilen bağlama göre sohbeti bir adım daha derinleştirecek TEK ve ANLAMLI bir soru üretmektir. Başka HİÇBİR ŞEY yazma, sadece soruyu yaz.

### KULLANICI KASASI (Kişinin Özü) ###
${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}

### BAĞLAM (Bu rüya hakkında konuşuyoruz) ###
- **Rüya Özeti:** ${dreamAnalysis.summary}
- **Temel Yorum:** ${dreamAnalysis.interpretation}
- **Orijinal Sorular:** ${dreamAnalysis.questions.join(', ')}

### ÖNCEKİ KONUŞMALAR ###
${formattedHistory || "Henüz kullanıcıdan bir cevap alınmadı. Diyaloğu başlatmak için ilk soruyu üret."}

### TALİMATLAR (ÇOK ÖNEMLİ) ###
1.  **TEK BİR SORU ÜRET:** Kullanıcının son cevabını veya rüyanın henüz keşfedilmemiş bir yönünü temel alarak, açık uçlu, düşünmeye teşvik edici YENİ BİR SORU üret.
2.  **ASLA YORUM YAPMA:** Yanıtında "Harika bir nokta.", "Anlıyorum..." gibi ifadeler KULLANMA. Çıktın sadece ve sadece soru metni olmalı.
3.  **TEKRARDAN KAÇIN:** Daha önce sorduğun sorulardan veya orijinal analizdeki sorulardan farklı bir soru sormaya çalış.

### ÇIKTI (Sadece tek bir soru metni): ###
    `.trim();

    const config: GenerationConfig = {
      temperature: 0.8,
      maxOutputTokens: 100, // Sadece soru için
    };

    const nextQuestion = await invokeGemini(prompt, FAST_MODEL, config);
    // Gemini'nin soru işaretini eklemediği durumlar için
    return nextQuestion.endsWith('?') ? nextQuestion : nextQuestion + '?';
  } catch (error) {
    console.error('[generateNextDreamQuestion] Soru üretilirken hata:', getErrorMessage(error));
    throw new ApiError("Rüya sorusu oluşturulamadı.");
  }
}

export async function generateFinalDreamFeedback(context: InteractionContext): Promise<string> {
  // AYNI ŞEKİLDE CONTEXT'TEN VERİLERİ ÇEK
  const { initialEvent, initialVault } = context;
  const dreamAnalysis = initialEvent.data.dreamAnalysisResult || initialEvent.data.analysis;
  const userAnswers = initialEvent.data.fullDialogue.filter((m: any) => m.role === 'user');
  const userVault = initialVault;
  
  try {
    // Truncate interpretation and answers if too long to avoid MAX_TOKENS
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
  
    const prompt = `
### ROL & GÖREV ###
Sen, bir rüya analizi ve 3 adımlı bir keşif diyaloğunu tamamlamış olan bilge Kozmik Terapistsin. Görevin, tüm bu süreci sentezleyerek, kullanıcıya içgörü kazandıran, sıcak, cesaretlendirici ve sonuç odaklı son bir geri bildirim sunmaktır.

### KULLANICI KASASI (Kişinin Özü) ###
${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}

### BAĞLAM ###
- **Orijinal Rüya Yorumu:** ${truncatedInterpretation}
- **Keşif Diyaloğu Cevapları:**
${formattedAnswers}

### TALİMATLAR ###
1.  **Sentezle:** Orijinal rüya yorumunu ve kullanıcının verdiği ÜÇ cevabı birleştirerek bütüncül bir bakış açısı oluştur. Cevaplar arasındaki bağlantılara dikkat et.
2.  **Özetle:** Kullanıcıyı bu keşif yolculuğu için takdir eden, 3-4 cümlelik etkili bir sonuç paragrafı yaz. Rüyanın ana mesajının, kullanıcının cevaplarıyla nasıl daha da aydınlandığını vurgula.
3.  **Güçlendir:** Kullanıcıyı bu içgörülerle baş başa bırakan, ona pozitif bir düşünce veya hafif bir cesaretlendirmenin yanı sıra, gerekirse bir eylem adımı öner.

### ÇIKTI (Sadece sonuç metni) ###
    `.trim();

    const config: GenerationConfig = {
      temperature: 0.5,
      maxOutputTokens: 300,
    };

    const finalFeedback = await invokeGemini(prompt, FAST_MODEL, config);
    return finalFeedback;
  } catch (error) {
    console.error('[generateFinalDreamFeedback] Geri bildirim üretilirken hata:', getErrorMessage(error));
    throw new ApiError("Rüya geri bildirimi oluşturulamadı.");
  }
}

export function mergeVaultData(currentVault: any, vaultUpdate: any): any {
  const newVault = JSON.parse(JSON.stringify(currentVault)); // Derin kopya

  const mergeArrayUnique = (target: string[], source: string[]) => [...new Set([...(target || []), ...source])];

  if (vaultUpdate.themes) {
    newVault.themes = mergeArrayUnique(newVault.themes, vaultUpdate.themes);
  }
  if (vaultUpdate.coreBeliefs) {
    newVault.coreBeliefs = { ...(newVault.coreBeliefs || {}), ...vaultUpdate.coreBeliefs };
  }
  if (vaultUpdate.keyInsights) {
    newVault.keyInsights = mergeArrayUnique(newVault.keyInsights, vaultUpdate.keyInsights);
  }
  
  return newVault;
}

// --- ONBOARDING ANALİZİ: Kullanıcı cevaplarından trait çıkarımı ---
/**
 * Kullanıcının onboarding cevaplarını analiz eder ve trait skorları döndürür.
 * @param context InteractionContext içinde answers verisi
 * @returns traits: { confidence, anxiety, motivation, openness, stress }
 */
export async function analyzeOnboardingAnswers(context: InteractionContext): Promise<Partial<Traits>> {
    const { answers } = context.initialEvent.data;
    const formattedAnswers = Object.values(answers).join('\n - ');
    const prompt = `
Aşağıda bir kullanıcının onboarding sürecinde verdiği cevaplar var. Her bir cevabı analiz et ve aşağıdaki trait'ler için 0-1 arası bir skor tahmini yap:
- confidence
- anxiety_level
- motivation
- openness
- neuroticism

Cevaplar:
${formattedAnswers}

ÇIKTI (Sadece JSON): { "confidence": 0.0-1.0, "anxiety_level": 0.0-1.0, "motivation": 0.0-1.0, "openness": 0.0-1.0, "neuroticism": 0.0-1.0 }
    `.trim();

    try {
        // Artık hem JSON çıkarımını hem de doğrulamayı tek fonksiyonla yapıyoruz.
        return await invokeAndValidate(prompt, POWERFUL_MODEL, TraitsSchema, {
            responseMimeType: 'application/json'
        });
    } catch(error) { 
        console.error("analyzeOnboardingAnswers hatası:", getErrorMessage(error));
        // throw new ApiError'ın devam etmesi doğru, böylece orkestratör hatayı yakalayabilir.
        throw new ApiError("Kişilik analizi oluşturulamadı.");
    }
}

/**
 * Kullanıcının durumuna ve belirlenen kişiliğe göre dinamik bir terapist yanıtı üretir.
 * Bu fonksiyon, dört ayrı fonksiyonun görevini tek başına üstlenir.
 * @param context Etkileşim bağlamı
 * @param personality Hedeflenen terapist kişiliği ('calm', 'motivational', vb.)
 * @returns Yapay zeka tarafından üretilmiş terapist yanıtı
 */
export async function generateAdaptiveTherapistReply(context: InteractionContext, personality: TherapistPersonality): Promise<string> {
  const { userMessage, intraSessionChatHistory } = context.initialEvent.data;
  const userVault = context.initialVault;

  // Kişilik tanımları merkezileştirildi. Yeni kişilik eklemek istersen sadece burayı değiştirirsin.
  const personalityDescriptions: Record<TherapistPersonality, string> = {
    default: "Sen empatik ve destekleyici bir terapistsin. Amacın güvenli bir alan yaratmak.",
    calm: "Sen sakinleştirici ve güven verici bir terapistsin. Topraklanma ve güvenlik hissi üzerine odaklanıyorsun.",
    motivational: "Sen motivasyonel ve cesaretlendirici bir koçsun. Kullanıcının iç gücünü ve potansiyelini ortaya çıkarmasına yardım ediyorsun.",
    analytical: "Sen analitik ve derinlemesine düşünen bir terapistsin. Olaylar arasındaki gizli bağlantıları ve davranış kalıplarını ortaya çıkarıyorsun."
  };
  
  const selectedPersonalityDescription = personalityDescriptions[personality] || personalityDescriptions.default;

  try {
    const recentLogEntries = await getRecentJourneyLogEntries(5);
    const journeyLogContext = recentLogEntries.length > 0 ? `### Geçmişten Gelen Fısıltılar (Seyir Defteri)\n- ${recentLogEntries.join('\n- ')}` : "";
    
    const currentMood = context.derivedData.dominantMood || userVault?.currentMood;
    const moodTrend = context.derivedData.moodTrend;
    const moodContext = currentMood ? `\nMevcut Ruh Hali: ${currentMood}` : "";
    const trendContext = moodTrend ? `\nMood Trendi: ${moodTrend === 'pozitif_trend' ? 'Pozitife doğru' : moodTrend === 'negatif_trend' ? 'Negatife doğru' : 'Kararsız'}` : "";
    
    let traitsSummary = "Kullanıcının kişilik özellikleri hakkında henüz belirgin bir veri yok.";
    if (userVault?.traits) {
      const traits = userVault.traits as Partial<Traits> & { motivation?: number };
      const summaries: string[] = [];
      if (typeof traits.confidence === 'number') summaries.push(`güven: ${(traits.confidence * 100).toFixed(0)}%`);
      if (typeof traits.anxiety_level === 'number') summaries.push(`kaygı: ${(traits.anxiety_level * 100).toFixed(0)}%`);
      // motivasyon trait'i traitKeys içinde yok, ama AI çıktısında olabilir, bu yüzden string key ile de kontrol et
      const motivation = (traits as any).motivation ?? traits['motivation'];
      if (typeof motivation === 'number') summaries.push(`motivasyon: ${(motivation * 100).toFixed(0)}%`);
      if (typeof traits.openness === 'number') summaries.push(`açıklık: ${(traits.openness * 100).toFixed(0)}%`);
      if (traits.writing_style) summaries.push(`yazı stili: ${traits.writing_style}`);
      if (summaries.length > 0) traitsSummary = `Kullanıcının bilinen özellikleri: ${summaries.join(', ')}.`;
    }
    
    const prompt = `
### Kolektif Bilinç (BUNLARI YANITINDA ASLA TEKRARLAMA, SADECE SEZ)
Rolün: ${selectedPersonalityDescription}
${traitsSummary}
Ana Temalar: ${userVault?.themes?.join(', ') || 'Belirlenmedi'}${moodContext}${trendContext}
${journeyLogContext}

### Aktif Oturum (Mevcut Konuşma)
${intraSessionChatHistory || "Bu, konuşmanın ilk mesajı."}

### Son Mesaj (Yanıt Vermen Gereken Mesaj)
"${userMessage}"

### Görevin (TALİMATLARA KESİNLİKLE UY)
1.  Verilen ROLE bürün.
2.  Tüm Kolektif Bilinci kullanarak kullanıcıyı yıllardır tanıyormuş gibi sezgisel, doğal ve 2-3 cümlelik sıcak bir yanıt ver.
3.  Asla "Rolüm gereği..." gibi ifadeler kullanma. SADECE YANITINI YAZ.`.trim();
    
    // Model ve konfigürasyon burada dinamik olarak ayarlanabilir, şimdilik sabit bırakıyoruz.
    return await invokeGemini(prompt, GENIOUS_MODEL, { temperature: 0.8, maxOutputTokens: 300 });

  } catch (error) {
    console.error(`[generateAdaptiveTherapistReply] Hata (Kişilik: ${personality}):`, getErrorMessage(error));
    throw new ApiError("Terapist yanıtı oluşturulamadı.");
  }
}

export async function invokeGemini(prompt: string, model: string, config?: GenerationConfig): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke('api-gateway', {
      body: {
        type: 'gemini',
        payload: { model, prompt, config }
      },
    });
    if (error) throw error;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("API Gateway'den boş Gemini yanıtı alındı.");
    return reply;
  } catch (err: any) {
    console.error('[invokeGemini] Hatası:', err.message);
    throw new ApiError("AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.");
  }
}


