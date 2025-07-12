// hooks/useGemini.ts
import Constants from "expo-constants";
import { useVaultStore } from '../store/vaultStore';
import { getEventsForLast, getRecentJourneyLogEntries, Traits } from '../utils/eventLogger';
import { assessTextSafety, SafetyClassification } from '../utils/guardians';
import { parseAndValidateJson } from '../utils/jsonValidator';
import { DiaryStart, DiaryStartSchema, DreamAnalysisResult, DreamAnalysisSchema, NextQuestionsSchema, SessionMemory, SessionMemorySchema } from "../utils/schemas";

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

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY;

// ------------------- ÇEKİRDEK API FONKSİYONU -------------------
// Bu fonksiyon artık sadece iki görev yapar: isteği gönderir ve yanıtın ham metnini döndürür.
// Başarısız olursa, hatayı yukarı fırlatır. Asla kendisi bir hata mesajı string'i DÖNDÜRMEZ.
export const sendToGemini = async (text: string, model: string, config?: GenerationConfig): Promise<string> => {
  try {
    const requestBody = { contents: [{ parts: [{ text }] }], ...(config && { generationConfig: config }) };
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) }
    );
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.error?.message || 'Bilinmeyen API hatası');
    }
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      throw new Error("AI'dan boş yanıt alındı.");
    }
    return reply;
  } catch (err: any) {
    console.error(`[${model}] Gemini API çağrısı sırasında kritik hata:`, err.message);
    throw err; // Hatayı yukarı fırlat
  }
};

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
    const classification = await sendToGemini(prompt, FAST_MODEL, config);
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
    return 'level_2_moderate_risk';
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
        return { mood: "acil_durum", questions: [safetyCheck.response!] };
    }
    const prompt = `
        Bir kullanıcının günlük başlangıç yazısını analiz et. Görevin:
        1. Yazıdaki baskın duyguyu tek kelimeyle belirle (mood).
        2. Bu duygu ve metinden yola çıkarak, kullanıcının daha derine inmesini sağlayacak 3 farklı ve açık uçlu soru üret (questions).

        METİN: "${initialEntry}"

        ÇIKTI (Sadece JSON): { "mood": "belirlediğin_duygu", "questions": ["soru1", "soru2", "soru3"] }`;
    const config: GenerationConfig = { responseMimeType: 'application/json', temperature: 0.5 };

    try {
        const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
        return parseAndValidateJson(jsonString, DiaryStartSchema) || fallback;
    } catch (e) {
        console.error("generateDiaryStart API çağrı hatası:", e);
        return fallback;
    }
}

// --- GÜNLÜK AKIŞI: Sonraki Sorular ---
export async function generateDiaryNextQuestions(conversationHistory: string): Promise<string[]> {
    // GÖREV 1: Gardiyan kontrolü
    const safetyCheck = await assessTextSafety(conversationHistory, classifyTextSafety);
    const fallback = ["Bu konuda başka ne söylemek istersin?", "Bu durum seni gelecekte nasıl etkileyebilir?", "Hissettiğin bu duyguya bir isim verecek olsan ne olurdu?"];
    if (!safetyCheck.isSafeForAI) {
        return [safetyCheck.response!];
    }
    const prompt = `
        Bir günlük diyalogu devam ediyor. Kullanıcının son cevabına dayanarak, sohbeti bir adım daha ileri taşıyacak 3 YENİ ve FARKLI soru üret.
        KONUŞMA GEÇMİŞİ:
        ${conversationHistory}

        ÇIKTI (Sadece JSON): { "questions": ["yeni_soru1", "yeni_soru2", "yeni_soru3"] }`;
        
    const config: GenerationConfig = { responseMimeType: 'application/json', temperature: 0.6 };

     try {
        const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
        const data = parseAndValidateJson(jsonString, NextQuestionsSchema);
        return data?.questions || fallback;
    } catch (e) {
        console.error("generateDiaryNextQuestions API çağrı hatası:", e);
        return fallback;
    }
}

// --- RÜYA ANALİZİ ---
export const analyzeDreamWithContext = async (dreamText: string): Promise<DreamAnalysisResult | null> => {
  const safetyCheck = await assessTextSafety(dreamText, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return null;
  }
  const userVault = useVaultStore.getState().vault;
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
    const jsonString = await sendToGemini(prompt, POWERFUL_MODEL, config);
    return parseAndValidateJson(jsonString, DreamAnalysisSchema);
  } catch (err) {
    console.error('[analyzeDreamWithContext] API çağrı hatası:', err);
    return null;
  }
};

// --- SEANS HAFIZA ANALİZİ ---
export async function analyzeSessionForMemory(transcript: string): Promise<SessionMemory | null> {
  // GÖREV 1: Gardiyan kontrolü
  const safetyCheck = await assessTextSafety(transcript, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return null;
  }
  const prompt = `
    ### ROL & GÖREV ###
    Sen, bir psikanalist ve hikaye anlatıcısının ruhuna sahip bir AI'sın. Görevin, aşağıdaki terapi dökümünün derinliklerine inerek hem ruhsal özünü hem de somut gerçeklerini çıkarmaktır. Yargılama, sadece damıt.
    ### ÇIKTI FORMATI ###
    Yanıtın KESİNLİKLE aşağıdaki JSON formatında olmalıdır. Başka hiçbir metin ekleme.
    { "log": "Bu seansın 1-2 cümlelik, şiirsel ama net özeti. Bu, bir 'seyir defteri'ne yazılacak bir giriş gibi olmalı.", "vaultUpdate": { "themes": ["Yeni ortaya çıkan veya pekişen 1-3 ana tema"], "coreBeliefs": { "ortaya_çıkan_temel_inanç_veya_değişimi": "'Yeterince iyi değilim' inancı somutlaştı." }, "keyInsights": ["Kullanıcının bu seansta vardığı en önemli 1-2 farkındalık."] } }
    ### SEANS DÖKÜMÜ ###
    ${transcript}`;

  const config: GenerationConfig = { responseMimeType: 'application/json' };
  try {
    const jsonString = await sendToGemini(prompt, POWERFUL_MODEL, config);
    return parseAndValidateJson(jsonString, SessionMemorySchema);
  } catch (e) {
    console.error("analyzeSessionForMemory API çağrı hatası:", e);
    return null;
  }
}

// -------------------------------------------------------------
// === JSON ÜRETMEYEN NORMAL FONKSİYONLAR ===
// -------------------------------------------------------------
// Bu fonksiyonlar `sendToGemini`'yi doğrudan kullanır. Hata durumunda, ya `sendToGemini`
// hatayı yukarı fırlatır ya da biz bir `try-catch` ile yakalayıp anlamlı bir fallback döneriz.

export async function generateTherapistReply(therapistId: string, userMessage: string, intraSessionChatHistory: string): Promise<string> {
  const safetyCheck = await assessTextSafety(userMessage, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return safetyCheck.response!;
  }
  try {
    const userVault = useVaultStore.getState().vault || {};
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
    return await sendToGemini(prompt, GENIOUS_MODEL, { temperature: 0.85, maxOutputTokens: 300 });
  } catch (error) {
    console.error("[generateTherapistReply] Hata:", error);
    return "Üzgünüm, şu anda bir yanıt oluşturamıyorum. Lütfen daha sonra tekrar deneyin.";
  }
}

export async function generateDailyReflectionResponse(todayNote: string, todayMood: string): Promise<string> {
  const safetyCheck = await assessTextSafety(todayNote, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return safetyCheck.response!;
  }
  try {
    const userVault = useVaultStore.getState().vault;
    const userName = userVault?.profile?.nickname;

    const prompt = `
      Sen empatik ve destekleyici bir yapay zekâ terapistsin.
      ${userName ? `Kullanıcının adı ${userName}.` : ''}
      Kullanıcı bugün duygularını ve düşüncelerini paylaştı.
      Ruh hali: ${todayMood}
      Yazısı: "${todayNote}"
      Sadece bugüne ve yazdıklarına odaklanarak, kısa, empatik ve motive edici bir yanıt ver. Güven ver. Asla soru sorma. Eğer adını biliyorsan adıyla hitap et.`.trim();
      
    return await sendToGemini(prompt, FAST_MODEL, { temperature: 0.7, maxOutputTokens: 150 });
  } catch (error) {
    console.error("[generateDailyReflectionResponse] Hata:", error);
    return "Bugünkü paylaşımın için teşekkürler. Seni anlıyorum ve yanındayım.";
  }
}

export async function generateCumulativeSummary(previousSummary: string, newConversationChunk: string): Promise<string> {
  const safetyCheck = await assessTextSafety(newConversationChunk, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return safetyCheck.response!;
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
    return await sendToGemini(prompt, FAST_MODEL, config);
  } catch (error) {
    console.error("[generateCumulativeSummary] Hata:", error);
    return "Seans özeti oluşturulamadı.";
  }
}

export async function generateStructuredAnalysisReport(days: number): Promise<string> {
  // GÖREV 1: Gardiyan kontrolü
  // Bu fonksiyonun kullanıcıdan metin alan kısmı eventsFromPeriod ve userVault. Bunlar AI'a gönderilmeden önce, eğer bir event.text veya userVault içindeki metinlerden biri riskli ise, raporun başına acil mesaj eklenmeli. Ancak burada toplu veri var, bu yüzden sadece userVault.profile?.nickname gibi alanları kontrol etmek anlamlı. Yine de, örnek olarak userVault.profile?.nickname için kontrol ekliyorum.
  const userVault = useVaultStore.getState().vault || {};
  if (userVault.profile?.nickname) {
    const safetyCheck = await assessTextSafety(userVault.profile.nickname, classifyTextSafety);
    if (!safetyCheck.isSafeForAI) {
      return safetyCheck.response!;
    }
  }
  try {
    // --- 1. KOLEKTİF BİLİNÇ'ten veriyi topla ---
    const eventsFromPeriod = await getEventsForLast(days);

    // --- 2. VERİ YOĞUNLAŞTIRICI (Bu, token limitlerini korumak için ZORUNLU) ---
    let compressedDataFeed: any[] = []; // AppEvent yerine any kullanıyoruz
    const tokenBudget = 10000;
    let currentTokenCount = 0;

    // Dinamik Yoğunlaştırıcı Mantığı (önceki gibi)
    const priorityEventTypes = ['journey_log_entry', 'dream_analysis', 'diary_entry'];
    eventsFromPeriod
        .filter(e => priorityEventTypes.includes(e.type))
        .forEach(event => {
            const eventString = JSON.stringify(event);
            if (currentTokenCount + eventString.length < tokenBudget * 0.8) {
                compressedDataFeed.push(event);
                currentTokenCount += eventString.length;
            }
        });
    if (days < 10) { // Daha cömert davranalım
        eventsFromPeriod
            .filter(e => ['text_session', 'voice_session', 'video_session'].includes(e.type))
            .forEach(event => {
                const eventString = JSON.stringify(event);
                if (currentTokenCount + eventString.length < tokenBudget) {
                    compressedDataFeed.push(event);
                    currentTokenCount += eventString.length;
                }
            });
    }

    // --- 3. SENİN PROMPT'UN İÇİN VERİLERİ HAZIRLA ---
    const userDesc = `Kullanıcının bilinen temel kişilik yapısı ve genel temaları şunlardır: ${JSON.stringify(userVault)}`;
    const entries = compressedDataFeed;

    // --- 4. SENİN ORİJİNAL, DEĞİŞTİRİLMEMİŞ PROMPT'UNU ÇALIŞTIR ---
    const prompt = `
Çıktının en başına büyük harflerle ve kalın olmadan sadece şu başlığı ekle: "Son ${days} Günlük Analiz"

Kullanıcının son ${days} günlük duygu durumu analizi için aşağıdaki yapıda detaylı ancak özlü bir rapor oluştur:

1. Genel Bakış
• Haftalık duygu dağılımı (ana duyguların yüzdeli dağılımı)
• Öne çıkan pozitif/negatif eğilimler
• Haftanın en belirgin 3 özelliği

2. Duygusal Dalgalanmalar
• Gün içi değişimler (sabah-akşam karşılaştırması)
• Haftalık trend (hafta başı vs hafta sonu)
• Duygu yoğunluğu gradyanı (1-10 arası skala tahmini)

3. Tetikleyici Analizi
• En sık tekrarlanan 3 olumsuz tetikleyici
• Etkili başa çıkma mekanizmaları
• Kaçırılan fırsatlar (gözden kaçan pozitif anlar)

4. Kişiye Özel Tavsiyeler
• Profil verilerine göre (${userDesc}) uyarlanmış 3 somut adım
• Haftaya özel mini hedefler
• Acil durum stratejisi (kriz anları için)

Teknik Talimatlar:
1. Rapor maksimum 600 kelime olsun
2. Her bölüm 3-4 maddeli paragraf şeklinde
3. Sayısal verileri yuvarlayarak yaz (%Yüzde, X/Y oran gibi)
4. Günlük konuşma dili kullan (akademik jargon yok)
5. Başlıklarda markdown kullanma
6. Pozitif vurguyu koru (eleştirel değil yapıcı olsun)
7. Eğer kullanıcı profili varsa, yanıtında kullanıcının ismiyle hitap et.
8. Yanıtında kesinlikle markdown, yıldız, tire, köşeli parantez, madde işareti veya herhangi bir özel karakter kullanma. Sadece düz metin ve başlıklar kullan.
9. Başka hiçbir başlık, özet, giriş veya kapanış cümlesi ekleme. Sadece yukarıdaki başlık ve ardından 4 ana bölüm gelsin.

Veriler:
${JSON.stringify(entries, null, 2)}
    `.trim();

    const config: GenerationConfig = {
      temperature: 0.6,
      maxOutputTokens: 8192, 
    };

    return await sendToGemini(prompt, POWERFUL_MODEL, config);
  } catch (error) {
    console.error("[generateStructuredAnalysisReport] Hata:", error);
    return "Analiz raporu oluşturulamadı.";
  }
}

export async function generateNextDreamQuestion(dreamAnalysis: DreamAnalysisResult, conversationHistory: { text: string; role: 'user' }[]): Promise<string | null> {
  const userMessages = conversationHistory.filter(m => m.role === 'user').map(m => m.text).join('\n\n');
  const safetyCheck = await assessTextSafety(userMessages, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return safetyCheck.response!;
  }
  try {
    const formattedHistory = conversationHistory
      .map((m, i) => `Kullanıcının ${i + 1}. Cevabı: ${m.text}`)
      .join('\n');

    const prompt = `
### ROL & GÖREV ###
Sen, rüya analizi diyaloglarını yöneten usta bir terapistsin. Görevin, verilen bağlama göre sohbeti bir adım daha derinleştirecek TEK ve ANLAMLI bir soru üretmektir. Başka HİÇBİR ŞEY yazma, sadece soruyu yaz.

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

    const nextQuestion = await sendToGemini(prompt, FAST_MODEL, config);
    // Gemini'nin soru işaretini eklemediği durumlar için
    return nextQuestion.endsWith('?') ? nextQuestion : nextQuestion + '?';
  } catch (err) {
    console.error('[generateNextDreamQuestion] Soru üretilirken hata:', err);
    return null;
  }
}

export async function generateFinalDreamFeedback(dreamAnalysis: DreamAnalysisResult, userAnswers: { text: string }[]): Promise<string> {
  const allAnswers = userAnswers.map(ans => ans.text).join('\n\n');
  const safetyCheck = await assessTextSafety(allAnswers, classifyTextSafety);
  if (!safetyCheck.isSafeForAI) {
    return safetyCheck.response!;
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

    const finalFeedback = await sendToGemini(prompt, FAST_MODEL, config);
    return finalFeedback;
  } catch (err) {
    console.error('[generateFinalDreamFeedback] Geri bildirim üretilirken hata:', err);
    return 'Rüya analizi tamamlandı, ancak geri bildirimde bir hata oluştu.';
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
        const jsonString = await sendToGemini(prompt, POWERFUL_MODEL, { responseMimeType: 'application/json' });
        return JSON.parse(jsonString);
    } catch(e) { return null; }
}