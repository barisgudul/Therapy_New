// services/ai.service.ts
import { assessTextSafety, SafetyClassification } from '../utils/guardians';
import { parseAndValidateJson } from '../utils/jsonValidator';
import { DiaryStart, DiaryStartSchema, DreamAnalysisResult, DreamAnalysisSchema, NextQuestionsSchema, SessionMemory, SessionMemorySchema } from "../utils/schemas";
import { supabase } from '../utils/supabase';
import { AppEvent, getEventsForLast } from './event.service';
import { getRecentJourneyLogEntries } from './journey.service';
import type { Traits } from './trait.service';

// ------------------- MODEL SABİTLERİ -------------------
const FAST_MODEL = 'gemini-2.5-flash';
const POWERFUL_MODEL = 'gemini-2.5-pro';
const GENIOUS_MODEL = POWERFUL_MODEL;

// ------------------- GENERATION CONFIG TİPİ -------------------
type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json';
};

// GEMINI_API_KEY ve sendToGemini fonksiyonunu kaldırıyorum.

export async function classifyTextSafety(text: string): Promise<SafetyClassification> {
  const prompt = `
    Aşağıdaki metni kendine zarar verme veya ağır umutsuzluk içeriği açısından analiz et.
    Metnin risk seviyesini şu 4 kategoriden SADECE BİRİ ile etiketle:

    - 'level_0_safe': Tehlike veya belirgin bir endişe yok. (Ör: "Bugün hava güzel", "İş yerinde yoruldum")
    - 'level_1_mild_concern': Genel bir üzüntü, depresyon veya mutsuzluk hali var ama doğrudan kendine zarar verme iması yok. (Ör: "Çok depresyondayım", "Hiçbir şeyden keyif almıyorum")
    - 'level_2_moderate_risk': Dolaylı olarak kendine zarar verme, yaşama isteksizliği veya ağır umutsuzluk ifadeleri var. (Ör: "Artık yaşamak istemiyorum", "Her şeyin bitmesini diliyorum")
    - 'level_3_high_alert': Doğrudan, net ve acil kendine zarar verme veya intihar planı/niyeti var. (Ör: "Kendimi öldüreceğim", "Canıma kıyacağım", "İntihar etmeyi planlıyorum")

    METİN: "${text}"

    ÇIKTI (Sadece tek kelime):
  `.trim();

  const config: GenerationConfig = { temperature: 0.0, maxOutputTokens: 10 };
  try {
    const classification = await invokeGemini(prompt, FAST_MODEL, config);
    const result = classification.trim().toLowerCase();
    if ([
      'level_0_safe',
      'level_1_mild_concern',
      'level_2_moderate_risk',
      'level_3_high_alert',
    ].includes(result)) {
      return result as SafetyClassification;
    }
    console.warn(`[GuardianV2] Beklenmedik sınıflandırma sonucu: '${result}'. Güvenlik için 'level_2_moderate_risk' varsayılıyor.`);
    return 'level_2_moderate_risk';
  } catch (error) {
    console.error('[GuardianV2] Metin sınıflandırma API hatası:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// === ZOD DOĞRULAMALI FONKSİYONLAR ===
// -------------------------------------------------------------

// --- GÜNLÜK AKIŞI: Başlangıç ---
export async function generateDiaryStart(initialEntry: string): Promise<DiaryStart> {
    // GÖREV 1: Gardiyan kontrolü
    const safetyCheck = await assessTextSafety(initialEntry, classifyTextSafety);
    const fallback: DiaryStart = { mood: "belirsiz", questions: ["Bu hissin kaynağı ne olabilir?", "Bu durumla ilgili neyi değiştirmek isterdin?", "Bu konu hakkında başka kimseyle konuştun mu?"] };
    if (!safetyCheck.isSafeForAI) {
        console.warn("🚨 [GARDIYAN-DIARY] Günlük başlangıcında Kırmızı Bayrak! Akış durdurulmalı.");
        throw new Error(safetyCheck.response!);
    }
    const prompt = `
        Bir kullanıcının günlük başlangıç yazısını analiz et. Görevin:
        1. Yazıdaki baskın duyguyu tek kelimeyle belirle (mood).
        2. Bu duygu ve metinden yola çıkarak, kullanıcının daha derine inmesini sağlayacak 3 farklı ve açık uçlu soru üret (questions).

        METİN: "${initialEntry}"

        ÇIKTI (Sadece JSON): { "mood": "belirlediğin_duygu", "questions": ["soru1", "soru2", "soru3"] }`;
    const config: GenerationConfig = { responseMimeType: 'application/json', temperature: 0.5 };

    try {
        const jsonString = await invokeGemini(prompt, FAST_MODEL, config);
        return parseAndValidateJson(jsonString, DiaryStartSchema) || fallback;
    } catch (e) {
        console.error("generateDiaryStart API çağrı hatası:", e);
        throw new Error("Günlük başlangıç oluşturulamadı.");
    }
}

// --- GÜNLÜK AKIŞI: Sonraki Sorular ---
export async function generateDiaryNextQuestions(conversationHistory: string): Promise<string[]> {
    // GÖREV 1: Gardiyan kontrolü
    const safetyCheck = await assessTextSafety(conversationHistory, classifyTextSafety);
    const fallback = ["Bu konuda başka ne söylemek istersin?", "Bu durum seni gelecekte nasıl etkileyebilir?", "Hissettiğin bu duyguya bir isim verecek olsan ne olurdu?"];
    if (!safetyCheck.isSafeForAI) {
        throw new Error(safetyCheck.response!);
    }
    const prompt = `
        Bir günlük diyalogu devam ediyor. Kullanıcının son cevabına dayanarak, sohbeti bir adım daha ileri taşıyacak 3 YENİ ve FARKLI soru üret.
        KONUŞMA GEÇMİŞİ:
        ${conversationHistory}

        ÇIKTI (Sadece JSON): { "questions": ["yeni_soru1", "yeni_soru2", "yeni_soru3"] }`;
        
    const config: GenerationConfig = { responseMimeType: 'application/json', temperature: 0.6 };

     try {
        const jsonString = await invokeGemini(prompt, FAST_MODEL, config);
        const data = parseAndValidateJson(jsonString, NextQuestionsSchema);
        return data?.questions || fallback;
    } catch (e) {
        console.error("generateDiaryNextQuestions API çağrı hatası:", e);
        throw new Error("Sonraki sorular oluşturulamadı.");
    }
}

// --- RÜYA ANALİZİ ---
export const analyzeDreamWithContext = async (dreamText: string, userVault: any): Promise<DreamAnalysisResult | null> => {
  const safetyCheck = await assessTextSafety(dreamText, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
  const recentLogs = await getRecentJourneyLogEntries(3);
  const context = `
    ### KULLANICI KASASI (Kişinin Özü) ###
    ${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}
    ### SON ZAMANLARDAKİ ETKİLEŞİMLER (Seyir Defterinden Fısıltılar) ###
    - ${recentLogs.join('\n- ')}`;

  const prompt = `
    ### ROL & GÖREV ###
    Sen, Jung'un arketip bilgeliği, Freud'un psikanalitik derinliği ve bir dedektifin keskin gözlem yeteneğine sahip bir AI'sın. Görevin, SADECE bir rüyayı yorumlamak DEĞİL, bu rüyanın, danışanın sana sunduğu yaşam bağlamı (Kasası ve Seyir Defteri) içindeki anlamını ve kökenini ortaya çıkarmaktır. Derin bağlantılar kur.
    ### VERİLER ###
    1.  **Yaşam Bağlamı (Kolektif Bilinç):** ${context}
    2.  **Analiz Edilecek Rüya Metni:** "${dreamText}"
    ### ÇIKTI FORMATI (KESİNLİKLE UYULMALIDIR) ###
    Lütfen yanıtını başka hiçbir metin eklemeden, doğrudan aşağıdaki JSON formatında ver:
    { "title": "Rüya için kısa, merak uyandıran bir başlık.", "summary": "Rüyanın 1-2 cümlelik genel özeti.", "themes": ["Rüyanın ana temaları (örn: 'kontrol kaybı', 'takdir edilme arzusu')"], "interpretation": "Rüyanın derinlemesine, sembolik ve psikolojik yorumu.", "crossConnections": [{"connection": "Rüyadaki [sembol], kullanıcının hayatındaki [olay] ile bağlantılı olabilir.", "evidence": "Bu bağlantıyı neden düşündüğünün bir cümlelik açıklaması."}], "questions": ["Kullanıcının bu bağlantıları düşünmesini sağlayacak 2 adet derin, açık uçlu soru."] }`;

  const config: GenerationConfig = { responseMimeType: 'application/json' };
  try {
    const jsonString = await invokeGemini(prompt, POWERFUL_MODEL, config);
    return parseAndValidateJson(jsonString, DreamAnalysisSchema);
  } catch (err) {
    console.error('[analyzeDreamWithContext] API çağrı hatası:', err);
    throw new Error("Rüya analizi oluşturulamadı.");
  }
};

// --- SEANS HAFIZA ANALİZİ ---
export async function analyzeSessionForMemory(transcript: string, userVault: any): Promise<SessionMemory | null> {
  // GÖREV 1: Gardiyan kontrolü
  const safetyCheck = await assessTextSafety(transcript, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
  const prompt = `
    ### ROL & GÖREV ###
    Sen, bir psikanalist ve hikaye anlatıcısının ruhuna sahip bir AI'sın. Görevin, aşağıdaki terapi dökümünün derinliklerine inerek hem ruhsal özünü hem de somut gerçeklerini çıkarmaktır. Yargılama, sadece damıt.
    
    ### KULLANICI KASASI (Kişinin Özü) ###
    ${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}
    
    ### ÇIKTI FORMATI ###
    Yanıtın KESİNLİKLE aşağıdaki JSON formatında olmalıdır. Başka hiçbir metin ekleme.
    { "log": "Bu seansın 1-2 cümlelik, şiirsel ama net özeti. Bu, bir 'seyir defteri'ne yazılacak bir giriş gibi olmalı.", "vaultUpdate": { "themes": ["Yeni ortaya çıkan veya pekişen 1-3 ana tema"], "coreBeliefs": { "ortaya_çıkan_temel_inanç_veya_değişimi": "'Yeterince iyi değilim' inancı somutlaştı." }, "keyInsights": ["Kullanıcının bu seansta vardığı en önemli 1-2 farkındalık."] } }
    ### SEANS DÖKÜMÜ ###
    ${transcript}`;

  const config: GenerationConfig = { responseMimeType: 'application/json' };
  try {
    const jsonString = await invokeGemini(prompt, POWERFUL_MODEL, config);
    return parseAndValidateJson(jsonString, SessionMemorySchema);
  } catch (e) {
    console.error("analyzeSessionForMemory API çağrı hatası:", e);
    throw new Error("Seans hafıza analizi oluşturulamadı.");
  }
}

// -------------------------------------------------------------
// === JSON ÜRETMEYEN NORMAL FONKSİYONLAR ===
// -------------------------------------------------------------
// Bu fonksiyonlar `sendToGemini`'yi doğrudan kullanır. Hata durumunda, ya `sendToGemini`
// hatayı yukarı fırlatır ya da biz bir `try-catch` ile yakalayıp anlamlı bir fallback döneriz.

export async function generateTherapistReply(therapistId: string, userMessage: string, intraSessionChatHistory: string, userVault: any): Promise<string> {
  const safetyCheck = await assessTextSafety(userMessage, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
  try {
    const recentLogEntries = await getRecentJourneyLogEntries(5);
    const journeyLogContext = recentLogEntries.length > 0 ? `### Geçmişten Gelen Fısıltılar ###\n- ${recentLogEntries.join('\n- ')}` : "";
    let traitsSummary = "Kullanıcının kişilik özellikleri hakkında henüz belirgin bir veri yok.";
    if (userVault?.traits) {
      const traits = userVault.traits;
      const summaries: string[] = [];
      if (typeof traits.confidence === 'number') summaries.push(`güven: ${(traits.confidence * 100).toFixed(0)}%`);
      if (typeof traits.anxiety_level === 'number') summaries.push(`kaygı: ${(traits.anxiety_level * 100).toFixed(0)}%`);
      if (traits.writing_style) summaries.push(`yazı stili: ${traits.writing_style}`);
      if (summaries.length > 0) traitsSummary = `Kullanıcının bilinen özellikleri: ${summaries.join(', ')}.`;
    }
    const personalities: Record<string, string> = { default: "Sen empatik ve destekleyici bir terapistsin." };
    const personality = personalities[therapistId] || personalities.default;
    let prompt = `
      ### Kolektif Bilinç ###
      Rolün: ${personality}. Aşağıdaki bilgileri, kullanıcıyı yıllardır tanıyormuş gibi sezgisel bir yanıt için kullan, asla tekrarlama.
      ${traitsSummary}
      Ana Temalar: ${userVault?.themes?.join(', ') || 'Belirlenmedi'}
      ${journeyLogContext}
      ### Aktif Oturum ###
      ${intraSessionChatHistory}
      ### Son Mesaj ###
      "${userMessage}"
      ### Görevin ###
      Bu bağlama uygun, 2-3 cümlelik sıcak ve empatik bir yanıt ver. Doğal ol. Sadece yanıtını yaz.`.trim();
    if (safetyCheck.level === 'sensitive_topic') {
      prompt = `DİKKAT: Konu hassas. Ekstra şefkatli ve destekleyici ol.\n` + prompt;
    }
    return await invokeGemini(prompt, GENIOUS_MODEL, { temperature: 0.85, maxOutputTokens: 300 });
  } catch (error) {
    console.error("[generateTherapistReply] Hata:", error);
    throw new Error("Terapist yanıtı oluşturulamadı.");
  }
}

export async function generateDailyReflectionResponse(todayNote: string, todayMood: string, userVault: any): Promise<string> {
  const safetyCheck = await assessTextSafety(todayNote, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
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
    console.error("[generateDailyReflectionResponse] Hata:", error);
    throw new Error("Günlük yansıma yanıtı oluşturulamadı.");
  }
}

export async function generateCumulativeSummary(previousSummary: string, newConversationChunk: string, userVault: any): Promise<string> {
  const safetyCheck = await assessTextSafety(newConversationChunk, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
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
    console.error("[generateCumulativeSummary] Hata:", error);
    throw new Error("Seans özeti oluşturulamadı.");
  }
}

export async function generateStructuredAnalysisReport(days: number, userVault: any): Promise<string> {
  try {
    // --- 1. GÜVENLİK KONTROLÜ - TÜM METİN VERİLERİ ---
    const vault = userVault || {}; // userVault artık garanti gelecek, ama null/undefined kontrolü için {} olarak default bırakabiliriz
    
    // UserVault içindeki metin alanlarını kontrol et
    const vaultTextFields = [
      vault.profile?.nickname,
      vault.profile?.bio,
      ...(vault.themes || []),
      ...(vault.keyInsights || []),
      ...(Object.values(vault.coreBeliefs || {}))
    ].filter(Boolean);

    for (const textField of vaultTextFields) {
      if (typeof textField === 'string') {
        const safetyCheck = await assessTextSafety(textField, classifyTextSafety);
        if (!safetyCheck.isSafeForAI) {
          throw new Error(safetyCheck.response!);
        }
      }
    }

    // --- 2. VERİ TOPLAMA ---
    const eventsFromPeriod = await getEventsForLast(days);
    if (eventsFromPeriod.length < 3) {
      throw new Error(`Yetersiz veri: ${eventsFromPeriod.length} olay bulundu, en az 3 olay gerekli.`);
    }

    // --- 3. KRİTİK GÜVENLİK KONTROLÜ - EVENTS İÇİNDEKİ TÜM METİNLER ---
    const safeEvents = await validateAndSanitizeEvents(eventsFromPeriod);
    if (safeEvents.length === 0) {
      throw new Error("Güvenlik kontrolünden geçen veri bulunamadı. Analiz yapılamıyor.");
    }

    // --- 4. AKILLI VERİ YOĞUNLAŞTIRMA ---
    const compressedDataFeed = await compressEventsForAnalysis(safeEvents, days);

    // --- 5. KULLANICI PROFİLİ HAZIRLAMA ---
    const userProfile = buildUserProfile(vault);

    // --- 6. ANALİZ PROMPT'U ---
    const prompt = buildAnalysisPrompt(days, userProfile, compressedDataFeed);

    const config: GenerationConfig = {
      temperature: 0.6,
      maxOutputTokens: 8192,
    };

    return await invokeGemini(prompt, POWERFUL_MODEL, config);
  } catch (error) {
    console.error("[generateStructuredAnalysisReport] Hata:", error);
    throw new Error("Analiz raporu oluşturulamadı.");
  }
}

// YENİ: Events içindeki tüm metinleri güvenlik kontrolünden geçir
async function validateAndSanitizeEvents(events: AppEvent[]): Promise<any[]> {
  const safeEvents: any[] = [];
  
  for (const event of events) {
    try {
      // Event'in tüm metin alanlarını topla
      const textFields = extractTextFieldsFromEvent(event);
      
      // Her metin alanını güvenlik kontrolünden geçir
      let hasUnsafeContent = false;
      for (const textField of textFields) {
        if (textField && typeof textField === 'string' && textField.trim().length > 0) {
          const safetyCheck = await assessTextSafety(textField, classifyTextSafety);
          if (!safetyCheck.isSafeForAI) {
            console.warn(`🚨 [SECURITY] Event ${event.id} (${event.type}) güvenlik kontrolünden geçemedi: ${safetyCheck.response}`);
            hasUnsafeContent = true;
            break;
          }
        }
      }
      
      // Güvenli olan event'i ekle
      if (!hasUnsafeContent) {
        const sanitizedEvent = sanitizeEventForAnalysis(event);
        safeEvents.push(sanitizedEvent);
      } else {
        console.log(`⚠️ [SECURITY] Event ${event.id} analizden çıkarıldı - güvenlik nedeniyle`);
      }
    } catch (error) {
      console.error(`❌ [SECURITY] Event ${event.id} güvenlik kontrolü sırasında hata:`, error);
      // Hata durumunda event'i güvenlik için çıkar
    }
  }
  
  return safeEvents;
}

// YENİ: Event'ten tüm metin alanlarını çıkar
function extractTextFieldsFromEvent(event: AppEvent): string[] {
  const textFields: string[] = [];
  
  // Event'in data alanındaki tüm metinleri topla
  if (event.data) {
    // data.text varsa ekle
    if (event.data.text && typeof event.data.text === 'string') {
      textFields.push(event.data.text);
    }
    
    // data.messages varsa (diary_entry, session events için)
    if (event.data.messages && Array.isArray(event.data.messages)) {
      event.data.messages.forEach((msg: any) => {
        if (msg.text && typeof msg.text === 'string') {
          textFields.push(msg.text);
        }
      });
    }
    
    // data.dreamText varsa (dream_analysis için)
    if (event.data.dreamText && typeof event.data.dreamText === 'string') {
      textFields.push(event.data.dreamText);
    }
    
    // data.analysis varsa (dream_analysis için)
    if (event.data.analysis && typeof event.data.analysis === 'object') {
      const analysis = event.data.analysis;
      if (analysis.interpretation && typeof analysis.interpretation === 'string') {
        textFields.push(analysis.interpretation);
      }
      if (analysis.summary && typeof analysis.summary === 'string') {
        textFields.push(analysis.summary);
      }
    }
    
    // SADECE BİLİNEN VE GÜVENLİ ALANLAR - GENEL DÖNGÜ KALDIRILDI
    // Diğer olası metin alanları artık manuel olarak kontrol edilir
  }
  
  return textFields;
}

// YENİ: Akıllı veri yoğunlaştırma fonksiyonu
async function compressEventsForAnalysis(events: any[], days: number): Promise<any[]> {
  const MAX_TOKENS = 8000; // Güvenli limit
  let currentTokens = 0;
  const compressedData: any[] = [];

  // Öncelik sırası: journey_log_entry > dream_analysis > diary_entry > session events
  const priorityOrder = ['journey_log_entry', 'dream_analysis', 'diary_entry', 'text_session', 'voice_session', 'video_session'];
  
  for (const eventType of priorityOrder) {
    const typeEvents = events.filter(e => e.type === eventType);
    
    for (const event of typeEvents) {
      const eventTokens = estimateTokenCount(JSON.stringify(event));
      
      if (currentTokens + eventTokens < MAX_TOKENS) {
        compressedData.push(event);
        currentTokens += eventTokens;
      } else {
        break; // Token limiti aşıldı
      }
    }
    
    if (currentTokens >= MAX_TOKENS * 0.9) break; // %90'a ulaştıysa dur
  }

  return compressedData;
}

// YENİ: Gelişmiş token tahmini
function estimateTokenCount(text: string): number {
  // Daha doğru token tahmini: Türkçe için 1 token ≈ 3.5 karakter
  return Math.ceil(text.length / 3.5);
}

// GÜNCELLENMİŞ: Event temizleme fonksiyonu
function sanitizeEventForAnalysis(event: AppEvent): any {
  const cleanEvent = {
    type: event.type,
    created_at: event.created_at,
    mood: event.mood,
    data: { ...event.data }
  };

  // Hassas verileri temizle ve güvenli hale getir
  if (cleanEvent.data.text && cleanEvent.data.text.length > 300) {
    // İlk 300 karakteri al, sonra güvenli bir şekilde kısalt
    const safeText = cleanEvent.data.text.substring(0, 300);
    // Cümle sonunda kesilmişse, son cümleyi tamamla
    const lastSentenceEnd = safeText.lastIndexOf('.');
    const lastQuestionEnd = safeText.lastIndexOf('?');
    const lastExclamationEnd = safeText.lastIndexOf('!');
    const lastEnd = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
    
    if (lastEnd > 200) { // En az 200 karakter olsun
      cleanEvent.data.text = safeText.substring(0, lastEnd + 1) + ' (devamı kısaltıldı)';
    } else {
      cleanEvent.data.text = safeText + ' (kısaltıldı)';
    }
  }

  // Messages array'ini de güvenli hale getir
  if (cleanEvent.data.messages && Array.isArray(cleanEvent.data.messages)) {
    cleanEvent.data.messages = cleanEvent.data.messages.map((msg: any) => {
      if (msg.text && typeof msg.text === 'string' && msg.text.length > 200) {
        return {
          ...msg,
          text: msg.text.substring(0, 200) + ' (kısaltıldı)'
        };
      }
      return msg;
    });
  }

  return cleanEvent;
}

function buildUserProfile(vault: any): string {
  const profile = vault.profile || {};
  const traits = vault.traits || {};
  const themes = vault.themes || [];
  const insights = vault.keyInsights || [];

  const profileParts = [];

  if (profile.nickname) profileParts.push(`İsim: ${profile.nickname}`);
  if (traits.confidence !== undefined) profileParts.push(`Güven: %${Math.round(traits.confidence * 100)}`);
  if (traits.anxiety_level !== undefined) profileParts.push(`Kaygı: %${Math.round(traits.anxiety_level * 100)}`);
  if (traits.writing_style) profileParts.push(`Yazı stili: ${traits.writing_style}`);
  if (themes.length > 0) profileParts.push(`Ana temalar: ${themes.join(', ')}`);
  if (insights.length > 0) profileParts.push(`Önemli içgörüler: ${insights.slice(0, 3).join(', ')}`);

  return profileParts.length > 0 ? profileParts.join(' | ') : 'Profil bilgisi yetersiz';
}

function buildAnalysisPrompt(days: number, userProfile: string, events: any[]): string {
  return `
Çıktının en başına büyük harflerle ve kalın olmadan sadece şu başlığı ekle: "Son ${days} Günlük Analiz"

Kullanıcının son ${days} günlük duygu durumu analizi için aşağıdaki yapıda detaylı ancak özlü bir rapor oluştur:

## 1. Genel Bakış
• Haftalık duygu dağılımı (ana duyguların yüzdeli dağılımı)
• Öne çıkan pozitif/negatif eğilimler
• Haftanın en belirgin 3 özelliği

## 2. Duygusal Dalgalanmalar
• Gün içi değişimler (sabah-akşam karşılaştırması)
• Haftalık trend (hafta başı vs hafta sonu)
• Duygu yoğunluğu gradyanı (1-10 arası skala tahmini)

## 3. Tetikleyici Analizi
• En sık tekrarlanan 3 olumsuz tetikleyici
• Etkili başa çıkma mekanizmaları
• Kaçırılan fırsatlar (gözden kaçan pozitif anlar)

## 4. Kişiye Özel Tavsiyeler
• Profil verilerine göre (${userProfile}) uyarlanmış 3 somut adım
• Haftaya özel mini hedefler
• Acil durum stratejisi (kriz anları için)

**Teknik Talimatlar:**
1. Rapor maksimum 600 kelime olsun
2. Her bölüm 3-4 maddeli paragraf şeklinde
3. Sayısal verileri yuvarlayarak yaz (%Yüzde, X/Y oran gibi)
4. Günlük konuşma dili kullan (akademik jargon yok)
5. **Markdown formatını kullan** - başlıklar için ##, madde işaretleri için •, vurgular için **kalın**
6. Pozitif vurguyu koru (eleştirel değil yapıcı olsun)
7. Eğer kullanıcı profili varsa, yanıtında kullanıcının ismiyle hitap et
8. Başka hiçbir başlık, özet, giriş veya kapanış cümlesi ekleme. Sadece yukarıdaki başlık ve ardından 4 ana bölüm gelsin

**Veriler:**
${JSON.stringify(events, null, 2)}
  `.trim();
}

export async function generateNextDreamQuestion(dreamAnalysis: DreamAnalysisResult, conversationHistory: { text: string; role: 'user' }[], userVault: any): Promise<string | null> {
  const userMessages = conversationHistory.filter(m => m.role === 'user').map(m => m.text).join('\n\n');
  const safetyCheck = await assessTextSafety(userMessages, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
  try {
    const formattedHistory = conversationHistory
      .map((m, i) => `Kullanıcının ${i + 1}. Cevabı: ${m.text}`)
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
  } catch (err) {
    console.error('[generateNextDreamQuestion] Soru üretilirken hata:', err);
    throw new Error("Rüya sorusu oluşturulamadı.");
  }
}

export async function generateFinalDreamFeedback(dreamAnalysis: DreamAnalysisResult, userAnswers: { text: string }[], userVault: any): Promise<string> {
  const allAnswers = userAnswers.map(ans => ans.text).join('\n\n');
  const safetyCheck = await assessTextSafety(allAnswers, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    throw new Error(safetyCheck.response!);
  }
  try {
    // Truncate interpretation and answers if too long to avoid MAX_TOKENS
    const maxInterpretationLength = 1200;
    const maxAnswerLength = 400;
    const truncatedInterpretation = dreamAnalysis.interpretation.length > maxInterpretationLength
      ? dreamAnalysis.interpretation.slice(0, maxInterpretationLength) + '... (kısaltıldı)'
      : dreamAnalysis.interpretation;
    const formattedAnswers = userAnswers
      .map((ans, i) => {
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
  } catch (err) {
    console.error('[generateFinalDreamFeedback] Geri bildirim üretilirken hata:', err);
    throw new Error("Rüya geri bildirimi oluşturulamadı.");
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
 * @param answers Kullanıcının onboarding akışında verdiği cevaplar (her adım bir cevap)
 * @returns traits: { confidence, anxiety, motivation, openness, stress }
 */
export async function analyzeOnboardingAnswers(answers: Record<string, string>): Promise<Partial<Traits> | null> {
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
        const jsonString = await invokeGemini(prompt, POWERFUL_MODEL, { responseMimeType: 'application/json' });
        return JSON.parse(jsonString);
    } catch(e) { return null; }
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
    throw err;
  }
}


