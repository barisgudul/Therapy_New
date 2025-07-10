// hooks/useGemini.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";
import { AppEvent, getEventsForLast, getRecentJourneyLogEntries, getUserVault } from '../utils/eventLogger';

// ------------------- MODEL SABİTLERİ -------------------
const FAST_MODEL = 'gemini-1.5-flash'; // Hızlı ve genel amaçlı kullanım için (Gemini 2.5 Flash henüz API'de bu isimle olmayabilir, en güncel flash'ı kullanalım)
const POWERFUL_MODEL = 'gemini-2.5-pro'; // Derin ve uzun analizler için (Aynı şekilde, en güncel pro)

// DİKKAT: Bu değişken 'flash' modeline ayarlı. TherapistReply bu modeli kullanıyor.
// Eğer terapist cevaplarının daha güçlü modelle üretilmesini isterseniz bunu POWERFUL_MODEL yapın.
const GENIOUS_MODEL = POWERFUL_MODEL;

// ------------------- GENERATION CONFIG TİPİ -------------------
type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json';
};

// Pro model için güvenli maksimum token sayısı
const PRO_MAX_TOKENS = 8192;
// Flash model için güvenli maksimum token sayısı
const FLASH_MAX_TOKENS = 8192;


const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY;

// ---- GÜNCELLENMİŞ Ortak Fonksiyon ----
export const sendToGemini = async (
  text: string,
  model: string, // Hangi modelin kullanılacağı belirtilecek
  config?: GenerationConfig // Opsiyonel yapılandırma
): Promise<string> => {
  try {
    const requestBody = {
      contents: [{ parts: [{ text }] }],
      ...(config && { generationConfig: config }),
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );
    const data = await response.json();
    
    if (!response.ok) {
        console.error(`[${model}] Gemini API Error Response:`, JSON.stringify(data, null, 2));
        const errorMessage = data?.error?.message || 'Bilinmeyen bir API hatası oluştu.';
        throw new Error(errorMessage);
    }

    console.log(`[${model}] Gemini raw response:`, JSON.stringify(data).substring(0, 200) + '...');
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      const safetyReason = data?.candidates?.[0]?.safetyRatings?.find(r => r.blocked)?.category;
      console.warn(`Cevap alınamadı. Bitirme sebebi: ${finishReason}. Güvenlik sebebi: ${safetyReason || 'Yok'}`);
      if (finishReason === "SAFETY") {
        return "Üzgünüm, isteğiniz güvenlik filtrelerimize takıldığı için yanıt veremiyorum.";
      }
       if (finishReason === "MAX_TOKENS") {
        return "Cevap çok uzun olduğu için tamamlanamadı. Lütfen tekrar dener misin?";
      }
      return "Üzgünüm, şu anda yanıt veremiyorum.";
    }
    return reply;
  } catch (err: any) {
    console.error(`[${model}] Gemini API hatası:`, err.message);
    return `Bir sorunla karşılaştım: ${err.message}. Lütfen sonra tekrar dene.`;
  }
};

// ---- Kullanıcı Profilini Getir ve Kısa Açıklama Üret ----
async function getUserProfile() {
  try {
    const stored = await AsyncStorage.getItem('userProfile');
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function makeUserDesc(userProfile: any) {
  if (!userProfile) return '';
  let desc = '';
  if (userProfile.nickname) desc += `Adı: ${userProfile.nickname}.\n`;
  if (userProfile.birthDate) desc += `Doğum tarihi: ${userProfile.birthDate}.\n`;
  if (userProfile.profession) desc += `Meslek: ${userProfile.profession}.\n`;
  if (userProfile.expectation) desc += `Terapiden beklentisi: ${userProfile.expectation}.\n`;
  if (userProfile.history) desc += `Hayatındaki önemli deneyim: ${userProfile.history}.\n`;
  return desc.trim();
}

// ---- TERAPİST KARAKTERLERİNE GÖRE MESAJLAŞMA (YENİ PROMPT YAPISI) ----
// MODEL: Flash
export async function generateTherapistReply(
  therapistId: string,
  userMessage: string,
  intraSessionChatHistory: string // Bu seans içi geçmişi
) {
  // --- MAKRO HAFIZAYI TOPLA ---
  const userVault = await getUserVault() || {};
  const recentLogEntries = await getRecentJourneyLogEntries(5);
  const journeyLogContext = recentLogEntries.length > 0
    ? `### Geçmişten Gelen Fısıltılar (Önceki Seanslardan Özetler) ###\n- ${recentLogEntries.join('\n- ')}`
    : "";

  // Kişilik prompt'u aynı kalıyor...
  const personalities: Record<string, string> = {
    therapist1: "Sen Dr. Elif'sin; şefkatli, anaç ve sakin bir klinik psikologsun.",
    therapist2: "Sen Dr. Deniz'sin; mantıklı ve çözüm odaklı bir aile terapistisin.",
    therapist3: "Sen Dr. Lina'sın; enerjik, genç ruhlu ve motive edici bir terapistsin.",
    coach1: "Sen Coach Can'sın; dinamik, ilham verici ve pratik bir yaşam koçusun.",
    default: "Sen empatik ve destekleyici bir terapistsin."
  };
  const personality = personalities[therapistId] || personalities.default;
  
  const prompt = `
    ### Kolektif Bilinç ###
    Senin rolün ${personality}. Karşındaki kişi hakkında bildiğin her şey aşağıda özetlenmiştir. Cevaplarını bu derin anlayışla oluştur, ancak bu bilgileri doğrudan papağan gibi tekrarlama. Onları bir temel olarak kullan ve sezgisel bir şekilde yanıtına yansıt.

    ### Kullanıcı Kasası (Kişinin Özü) ###
    ${JSON.stringify(userVault, null, 2)}

    ${journeyLogContext}

    ### Aktif Oturum (Şu Anki Konuşma) ###
    ${intraSessionChatHistory}

    ### Kullanıcının Kalbinden Gelen Son Söz ###
    "${userMessage}"

    ### Görevin ###
    Sıcak, empatik ve BU BAĞLAMA UYGUN, 2-3 cümlelik bir yanıt ver. Görevin, sanki yıllardır bu insanı tanıyormuşsun gibi bir his yaratmak. Geçmişteki bir temaya ustaca bir gönderme yapabilirsin, ama bunu her zaman yapmak zorunda değilsin. Doğal ol. Sadece yanıtını yaz.
  `.trim();

  const config: GenerationConfig = {
    temperature: 0.85, 
    maxOutputTokens: 300, 
  };

  // Bu kritik cevap için GENIOUS_MODEL'ı (Pro) kullanmak, kaliteyi artırır.
  return await sendToGemini(prompt, GENIOUS_MODEL, config);
}

// ---- DİĞER FONKSİYONLAR ----

// MODEL: Flash
export async function generateDailyReflectionResponse(todayNote: string, todayMood: string) {
  const userProfile = await getUserProfile();
  const userDesc = makeUserDesc(userProfile);
  const prompt = `
${userDesc ? userDesc + '\n' : ''}
Sen bir empatik ve destekleyici yapay zekâ terapistsin.
Kullanıcı bugün duygularını ve düşüncelerini günlük olarak paylaştı.
Bugünkü ruh hali: ${todayMood}
Bugünkü yazısı: "${todayNote}"

Sadece bugüne ve yazdığı hisse odaklan. Kısa, sade, empatik, motive edici ve samimi bir yanıt ver. 
Güven ve iyi hissetmesini sağla. Ona asla soru sorma, öneri verirken aşırı kişisel detaya girme, ona adıyla veya mesleğine uygun şekilde hitap edebilirsin. 
Cevabın akıcı ve doğal bir Türkçeyle, robot gibi olmadan, ama asla uzun olmayacak şekilde yazılsın.
Kullanıcı profil bilgisi yoksa anonim biriyle konuştuğunu unutma ve isimsiz hitap et. İstersen emojiler kullanabilirsin ama asla zorunda değilsin aşırıya kaçma emojilerde.
  `.trim();
  // Bu fonksiyon için 80 token makul ve güvenli bir limittir. Değişiklik gerekmiyor.
  const config: GenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 80,
  };
  return await sendToGemini(prompt, FAST_MODEL, config);
}

// ---- VERİ TOPLAMA VE DÖNÜŞTÜRME (YENİ EK) ----

/**
 * Bu, ai_summary.tsx'den çağrılacak yeni ana fonksiyondur.
 * Veriyi toplar, sıkıştırır ve senin orijinal prompt'unu besler.
 * Fonksiyonun adını da netleştirelim.
 */
export async function generateStructuredAnalysisReport(days: number): Promise<string> {
    
    // --- 1. KOLEKTİF BİLİNÇ'ten veriyi topla ---
    const eventsFromPeriod = await getEventsForLast(days);
    const userVault = await getUserVault() || {};

    // --- 2. VERİ YOĞUNLAŞTIRICI (Bu, token limitlerini korumak için ZORUNLU) ---
    let compressedDataFeed: AppEvent[] = [];
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

    // a) `userDesc`'i 'userVault' kullanarak oluştur.
    const userDesc = `Kullanıcının bilinen temel kişilik yapısı ve genel temaları şunlardır: ${JSON.stringify(userVault)}`;

    // b) `entries`'i sıkıştırılmış veriyle doldur.
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
}

/**
 * GÜNLÜK AKIŞI İÇİN - 1. ADIM: Başlangıç Analizi ve İlk Sorular
 * Sadece ilk metni alır, ana ruh halini belirler ve ilk 3 keşif sorusunu üretir.
 * @param initialEntry Kullanıcının ilk serbest yazısı.
 */
export async function generateDiaryStart(initialEntry: string): Promise<{ mood: string; questions: string[] }> {
    const prompt = `
        Bir kullanıcının günlük başlangıç yazısını analiz et. Görevin:
        1. Yazıdaki baskın duyguyu tek kelimeyle belirle (mood).
        2. Bu duygu ve metinden yola çıkarak, kullanıcının daha derine inmesini sağlayacak 3 farklı ve açık uçlu soru üret (questions).

        METİN: "${initialEntry}"

        ÇIKTI (Sadece JSON):
        { "mood": "belirlediğin_duygu", "questions": ["soru1", "soru2", "soru3"] }
    `;
    const config: GenerationConfig = { maxOutputTokens: 256, responseMimeType: 'application/json', temperature: 0.5 };
    try {
        const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
        const data = JSON.parse(jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1));
        return data;
    } catch (e) {
        console.error("generateDiaryStart hatası:", e);
        return { mood: "belirsiz", questions: ["Bu hissin kaynağı ne olabilir?", "Bu durumla ilgili neyi değiştirmek isterdin?", "Bu konu hakkında başka kimseyle konuştun mu?"] };
    }
}

/**
 * GÜNLÜK AKIŞI İÇİN - 2. ADIM: Yeni Sorular Üretme
 * Önceki konuşmaları temel alarak bir sonraki 3 soruyu üretir.
 * @param conversationHistory Şimdiye kadarki tüm diyalog.
 */
export async function generateDiaryNextQuestions(conversationHistory: string): Promise<string[]> {
    const prompt = `
        Bir günlük diyalogu devam ediyor. Kullanıcının son cevabına dayanarak, sohbeti bir adım daha ileri taşıyacak 3 YENİ ve FARKLI soru üret.

        KONUŞMA GEÇMİŞİ:
        ${conversationHistory}

        ÇIKTI (Sadece JSON):
        { "questions": ["yeni_soru1", "yeni_soru2", "yeni_soru3"] }
    `;
    const config: GenerationConfig = { maxOutputTokens: 256, responseMimeType: 'application/json', temperature: 0.6 };
     try {
        const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
        const data = JSON.parse(jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1));
        return data.questions;
    } catch (e) {
        console.error("generateDiaryNextQuestions hatası:", e);
        return ["Bu konuda başka ne söylemek istersin?", "Bu durum seni gelecekte nasıl etkileyebilir?", "Hissettiğin bu duyguya bir isim verecek olsan ne olurdu?"];
    }
}

// MODEL: Flash
export async function generateCumulativeSummary(
  previousSummary: string,
  newConversationChunk: string
): Promise<string> {
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

  // Özetleme için 500 token makul ve güvenli bir limittir. Değişiklik gerekmiyor.
  const config: GenerationConfig = {
    temperature: 0.2,
    maxOutputTokens: 500,
  };
  return await sendToGemini(prompt, FAST_MODEL, config);
}

export interface DreamAnalysisResult {
  title: string;
  summary: string;
  themes: string[];
  // "symbols" bölümünü kaldırıyoruz, çünkü "crossConnections" daha güçlü.
  interpretation: string;
  crossConnections: { connection: string; evidence: string }[]; // YENİ: Çapraz Bağlantılar
  questions: string[];
}

/**
 * GÜNCELLENMİŞ: Sadece rüyayı değil, kullanıcının Kolektif Bilincini de kullanarak analiz yapar.
 * @param dreamText Kullanıcının anlattığı rüya.
 */
export const analyzeDreamWithContext = async (dreamText: string): Promise<DreamAnalysisResult | null> => {
  // 1. ZENGİNLEŞTİRİLMİŞ BAĞLAMI TOPLA
  const userVault = await getUserVault();
  const recentLogs = await getRecentJourneyLogEntries(3); // Son 3 etkileşimin özeti
  const context = `
    ### KULLANICI KASASI (Kişinin Özü) ###
    ${userVault ? JSON.stringify(userVault) : "Henüz veri yok."}

    ### SON ZAMANLARDAKİ ETKİLEŞİMLER (Seyir Defterinden Fısıltılar) ###
    - ${recentLogs.join('\n- ')}
  `.trim();

  const prompt = `
    ### ROL & GÖREV ###
    Sen, Jung'un arketip bilgeliği, Freud'un psikanalitik derinliği ve bir dedektifin keskin gözlem yeteneğine sahip bir AI'sın. Görevin, SADECE bir rüyayı yorumlamak DEĞİL, bu rüyanın, danışanın sana sunduğu yaşam bağlamı (Kasası ve Seyir Defteri) içindeki anlamını ve kökenini ortaya çıkarmaktır. "Oha!" dedirtecek bağlantılar kur.

    ### VERİLER ###
    1.  **Yaşam Bağlamı (Kolektif Bilinç):**
        ${context}
    
    2.  **Analiz Edilecek Rüya Metni:**
        "${dreamText}"

    ### ÇIKTI FORMATI (KESİNLİKLE UYULMALIDIR) ###
    Lütfen yanıtını başka hiçbir metin eklemeden, doğrudan aşağıdaki JSON formatında ver:
    {
      "title": "Rüya için kısa, merak uyandıran bir başlık.",
      "summary": "Rüyanın 1-2 cümlelik genel özeti.",
      "themes": ["Rüyanın ana temaları (örn: 'kontrol kaybı', 'takdir edilme arzusu')"],
      "interpretation": "Rüyanın derinlemesine, sembolik ve psikolojik yorumu. Bu yorum, rüyanın kendi içindeki anlamını açıklar.",
      "crossConnections": [
        {
          "connection": "Rüyadaki [belirli bir sembol veya olay], kullanıcının hayatındaki [Kasa'dan veya Seyir Defteri'nden bir tema/olay] ile bağlantılı olabilir.",
          "evidence": "Bu bağlantıyı neden düşündüğünü bir cümleyle açıkla. (Örn: Rüyadaki 'yüksek bir binadan düşme' hissi, dün seansta bahsettiğiniz 'yeni projedeki başarısızlık korkusu'nun bir yansıması olabilir.)"
        }
      ],
      "questions": ["Kullanıcının bu bağlantıları düşünmesini sağlayacak 2 adet derin, açık uçlu soru."]
    }
  `.trim();

  const config: GenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 4096, // Bu önemli bir analiz, cömert olalım
    responseMimeType: 'application/json',
  };

  try {
    const jsonString = await sendToGemini(prompt, POWERFUL_MODEL, config);
    const cleanedJson = jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1);
    return JSON.parse(cleanedJson) as DreamAnalysisResult;
  } catch (err) {
    console.error('[analyzeDreamWithContext] Rüya analizi sırasında hata:', err);
    return null;
  }
};

// Eski analyzeDream fonksiyonunu silebilir veya "deprecated" olarak işaretleyebilirsiniz.

/**
 * YENİ: Sadece bir sonraki soruyu üretir.
 * Rüya analizi ve önceki konuşmalara dayanarak bir sonraki mantıklı soruyu üretir.
 * @param dreamAnalysis - Orijinal rüya analizi objesi.
 * @param conversationHistory - Şu ana kadar geçen konuşmalar (sadece kullanıcı cevapları).
 * @returns AI'ın üreteceği yeni soru.
 */
export async function generateNextDreamQuestion(
  dreamAnalysis: DreamAnalysisResult,
  conversationHistory: { text: string; role: 'user' }[]
): Promise<string | null> {
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

  try {
    const nextQuestion = await sendToGemini(prompt, FAST_MODEL, config);
    // Gemini'nin soru işaretini eklemediği durumlar için
    return nextQuestion.endsWith('?') ? nextQuestion : nextQuestion + '?';
  } catch (err) {
    console.error('[generateNextDreamQuestion] Soru üretilirken hata:', err);
    return null;
  }
}

/**
 * GÜNCELLENDİ: Rüya analizi ve 3 kullanıcı cevabını alarak son bir özet oluşturur.
 * @param dreamAnalysis Orijinal rüya analizi objesi.
 * @param userAnswers Kullanıcının 3 cevabını içeren dizi.
 * @returns 3-4 cümlelik sonuç odaklı bir geri bildirim metni.
 */
export async function generateFinalDreamFeedback(
  dreamAnalysis: DreamAnalysisResult,
  userAnswers: { text: string }[],
): Promise<string> {
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

    try {
      const finalFeedback = await sendToGemini(prompt, FAST_MODEL, config);
      return finalFeedback;
    } catch (err) {
      console.error('[generateFinalDreamFeedback] Geri bildirim üretilirken hata:', err);
      return 'Rüya analizi tamamlandı, ancak geri bildirimde bir hata oluştu.';
    }
}

/**
 * Seans dökümünü analiz edip 'Kasa' ve 'Defter' için hafıza parçacıkları üretir.
 */
export async function analyzeSessionForMemory(transcript: string): Promise<{ log: string; vaultUpdate: any } | null> {
  const prompt = `
    ### ROL & GÖREV ###
    Sen, bir psikanalist ve hikaye anlatıcısının ruhuna sahip bir AI'sın. Görevin, aşağıdaki terapi dökümünün derinliklerine inerek hem ruhsal özünü hem de somut gerçeklerini çıkarmaktır. Yargılama, sadece damıt.

    ### ÇIKTI FORMATI ###
    Yanıtın KESİNLİKLE aşağıdaki JSON formatında olmalıdır. Başka hiçbir metin ekleme.

    {
      "log": "Bu seansın 1-2 cümlelik, şiirsel ama net özeti. Bu, bir 'seyir defteri'ne yazılacak bir giriş gibi olmalı. (Örn: 'Kullanıcı, babasının gölgesinin bugünkü başarılarını nasıl kararttığını fark etti; sessiz bir aydınlanma anı yaşandı.')",
      "vaultUpdate": {
        "themes": ["Yeni ortaya çıkan veya pekişen 1-3 ana tema (örn: 'baba figürüyle çatışma', 'yetersizlik duygusu')", "terapötik ittifakın güçlenmesi"],
        "coreBeliefs": {
          "ortaya_çıkan_temel_inanç_veya_değişimi": "'Yeterince iyi değilim' inancı, 'Patronumun onayı benim değerimi belirler' şeklinde somutlaştı."
        },
        "keyInsights": ["Kullanıcının bu seansta vardığı en önemli 1-2 farkındalık. (örn: 'Eleştirilme korkusunun aslında sevilmeme korkusu olduğunu fark etti.')"]
      }
    }

    ### SEANS DÖKÜMÜ ###
    ${transcript}
  `;

  const config: GenerationConfig = { 
    responseMimeType: 'application/json', 
    temperature: 0.3,
    maxOutputTokens: 2048,
  };

  try {
    const jsonString = await sendToGemini(prompt, POWERFUL_MODEL, config); // Bu önemli iş için güçlü modeli kullanıyoruz.
    const cleanedJson = jsonString.substring(jsonString.indexOf('{'), jsonString.lastIndexOf('}') + 1);
    return JSON.parse(cleanedJson);
  } catch (e) {
    console.error("analyzeSessionForMemory JSON parse hatası:", e);
    return null;
  }
}

/**
 * Verilen Kasa güncelleme talimatlarını mevcut Kasaya akıllıca birleştirir.
 */
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