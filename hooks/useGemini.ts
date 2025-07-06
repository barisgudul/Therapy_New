import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";

// ------------------- MODEL SABİTLERİ -------------------
const FAST_MODEL = 'gemini-1.5-flash'; // Hızlı ve genel amaçlı kullanım için (Gemini 2.5 Flash henüz API'de bu isimle olmayabilir, en güncel flash'ı kullanalım)
const POWERFUL_MODEL = 'gemini-2.5-pro'; // Derin ve uzun analizler için (Aynı şekilde, en güncel pro)

// DİKKAT: Bu değişken 'flash' modeline ayarlı. TherapistReply bu modeli kullanıyor.
// Eğer terapist cevaplarının daha güçlü modelle üretilmesini isterseniz bunu POWERFUL_MODEL yapın.
const GENIOUS_MODEL = FAST_MODEL;

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
  moodHint: string = "",
  chatHistory: string = "",
  messageCount: number = 1
) {
  const userProfile = await getUserProfile();
  const showProfile = (messageCount === 1) || (messageCount % 3 === 0);
  const userContext = showProfile && userProfile?.nickname
    ? `Kullanıcının adı ${userProfile.nickname}. Cevabında ona adıyla hitap et.`
    : 'Kullanıcının adını KULLANMA.';
  const personalities: Record<string, string> = {
    therapist1: "Sen Dr. Elif'sin; şefkatli, anaç ve sakin bir klinik psikologsun.",
    therapist2: "Sen Dr. Deniz'sin; mantıklı ve çözüm odaklı bir aile terapistisin.",
    therapist3: "Sen Dr. Lina'sın; enerjik, genç ruhlu ve motive edici bir terapistsin.",
    coach1: "Sen Coach Can'sın; dinamik, ilham verici ve pratik bir yaşam koçusun.",
    default: "Sen empatik ve destekleyici bir terapistsin."
  };
  const personality = personalities[therapistId] || personalities.default;
  const prompt = `
### ROL & GÖREV ###
${personality}
Görevin, aşağıdaki seans özeti ve son konuşmalara dayanarak, kullanıcıya rolüne uygun, destekleyici ve DOĞRUDAN ilgili bir yanıt vermek.

### YANIT STİLİ (ÇOK ÖNEMLİ) ###
1.  **Doğal ve Akıcı:** Cevabın, gerçek bir terapistin kuracağı gibi sıcak, empatik ve akıcı olmalı. Robot gibi konuşma.
2.  **Dengeli Uzunluk:** Cevabın 2-3 cümle civarında olsun. Ne tek kelimelik kadar kısa, ne de bir paragraf kadar uzun olmalı. Kullanıcıyı sıkmadan, ona değer verdiğini hissettir.
3.  **Odaklı Kal:** Cevabın, kullanıcının son mesajındaki ana duygu veya konuya odaklansın. Konuyu dağıtma.
4.  **Soru Sorabilirsin:** Gerekli görürsen, kullanıcıyı düşünmeye teşvik edecek TEK bir açık uçlu soru sorabilirsin. Ama her zaman soru sormak zorunda değilsin.
5.  **Destekleyici Ol:** Yargılamadan veya eleştirmeden, kullanıcının duygularını anladığını ve onu desteklediğini göster.

### BAĞLAM ###
- ${userContext}
- Kullanıcının ruh hali: ${moodHint || 'Belirtilmemiş'}
${chatHistory}

### KULLANICININ SON MESAJI ###
"${userMessage}"

### ÇIKTI (Sadece bu kısma yanıt yaz) ###
`.trim();

  console.log("AI'ya giden PROMPT (Therapist Reply):", prompt.substring(0, 300) + '...');
  
  // DEĞİŞİKLİK: maxOutputTokens, kısa bir sohbet cevabı için 300'e düşürüldü.
  // Bu, hem daha hızlı yanıt alınmasını sağlar hem de gereksiz token kullanımını önler.
  const config: GenerationConfig = {
    temperature: 0.85, 
    maxOutputTokens: 300, 
  };
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

// MODEL: Pro
export async function generateDetailedMoodSummary(entries: any[], days: number) {
  const userProfile = await getUserProfile();
  const userDesc = makeUserDesc(userProfile);
  const prompt = `
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

Veriler:
${JSON.stringify(entries, null, 2)}
`.trim();

  // DEĞİŞİKLİK: maxOutputTokens, 15000'den Pro modelinin desteklediği üst limit olan 8192'ye düşürüldü.
  // 15000 değeri API hatasına sebep oluyordu.
  const config: GenerationConfig = {
    temperature: 0.6,
    maxOutputTokens: PRO_MAX_TOKENS 
  };
  return await sendToGemini(prompt, POWERFUL_MODEL, config);
}

export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}

// MODEL: Flash
export const analyzeDiaryEntry = async (text: string): Promise<DiaryAnalysis> => {
    const prompt = `Aşağıdaki günlük yazısını analiz et ve şu bilgileri ver:
1. Duygu durumu (mood): Kullanıcının genel duygu durumunu belirle (mutlu, üzgün, kaygılı, nötr vb.)
2. Etiketler (tags): Günlükte geçen önemli konuları etiketle (örn: aile, iş, sağlık, ilişki vb.)
3. Geri bildirim: Kullanıcıya destekleyici ve yapıcı bir geri bildirim ver
4. Sorular: Kullanıcıyı düşünmeye teşvik eden 3 soru öner

Günlük yazısı:
${text}

Lütfen yanıtını tam olarak şu JSON formatında ver, başka hiçbir metin ekleme:
{
  "mood": "duygu durumu",
  "tags": ["etiket1", "etiket2", "etiket3"],
  "feedback": "geri bildirim metni",
  "questions": ["soru1", "soru2", "soru3"]
}`;

    // DEĞİŞİKLİK: Bu fonksiyon ortak sendToGemini kullanacak şekilde refactor edildi.
    // JSON çıktısı için responseMimeType ve makul bir token limiti eklendi.
    const config: GenerationConfig = {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
    };

    try {
        const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
        // JSON dışındaki karakterleri temizle
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        let cleanedText = (firstBrace !== -1 && lastBrace !== -1)
          ? jsonString.substring(firstBrace, lastBrace + 1)
          : jsonString.trim();
        // Eğer hala başı ve sonu tırnak ise, bir kez daha parse et
        if (cleanedText.startsWith('"') && cleanedText.endsWith('"')) {
          cleanedText = cleanedText.slice(1, -1);
          cleanedText = cleanedText.replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        const analysis: DiaryAnalysis = JSON.parse(cleanedText);
        return analysis;
    } catch (err) {
        console.error('[analyzeDiaryEntry] Günlük analizi sırasında hata:', err);
        return {
            feedback: 'Üzgünüm, şu anda analiz yapamıyorum. Lütfen daha sonra tekrar deneyin.',
            questions: [],
            mood: 'neutral',
            tags: []
        };
    }
};

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
  symbols: { symbol: string; meaning: string }[];
  interpretation: string;
  questions: string[];
}

// MODEL: Flash
export const analyzeDream = async (dreamText: string): Promise<DreamAnalysisResult | null> => {
  const userProfile = await getUserProfile();
  const userDesc = makeUserDesc(userProfile);

  // Çok uzun rüya metinlerini kısalt
  const maxDreamLength = 1500;
  const safeDreamText = dreamText.length > maxDreamLength
    ? dreamText.slice(0, maxDreamLength) + '... (kısaltıldı)'
    : dreamText;

  const prompt = `
### ROL & GÖREV ###
Sen, rüya sembolizmi, Jungcu arketipler ve modern psikodinamik yaklaşımlar konusunda uzmanlaşmış, empatik ve bilge bir rüya analistisin. Görevin, kullanıcının rüyasını analiz etmek ve bulgularını yapılandırılmış bir JSON formatında sunmaktır.

### YORUM İLKELERİ ###
1.  **Asla Kesin Konuşma:** Yorumlarını "bu rüya ... anlamına geliyor" gibi kesin ifadelerle değil, "... sembolize ediyor olabilir", "... hissini yansıtıyor olabilir", "... ile bağlantılı olabilir" gibi olasılık belirten ifadelerle yap.
2.  **Kişiselleştir:** Eğer varsa, kullanıcının profil bilgilerini (yaş, meslek, beklentiler) yorumuna anlamlı bir şekilde entegre et. Bu, analizi daha kişisel ve isabetli kılar.
3.  **Yapıcı ve Destekleyici Ol:** Yorumların korkutucu veya olumsuz olmamalı. Her zaman kullanıcıyı güçlendiren, ona içgörü kazandıran ve pozitif bir bakış açısı sunan bir dil kullan.
4.  **Derinlikli Ol:** Sadece yüzeydeki sembolleri değil, rüyanın genel atmosferini, duygusal tonunu ve olası altında yatan dinamikleri de analiz et.

### KULLANICI BİLGİLERİ ###
${userDesc || "Kullanıcı profili bilgisi mevcut değil."}

### KULLANICININ RÜYASI ###
"${safeDreamText}"

### ÇIKTI FORMATI (ÇOK ÖNEMLİ) ###
Lütfen yanıtını SADECE ve SADECE aşağıdaki yapıda bir JSON nesnesi olarak döndür. Başka hiçbir metin, açıklama veya kod bloğu işareti ekleme.

{
  "title": "Rüya İçin Kısa ve Etkileyici Bir Başlık",
  "summary": "Rüyanın 1-2 cümlelik genel özeti.",
  "themes": ["Ana Tema 1", "Ana Tema 2", "Ana Tema 3"],
  "symbols": [
    { "symbol": "Önemli Sembol 1", "meaning": "Bu sembolün rüya ve kullanıcı bağlamındaki olası anlamı." },
    { "symbol": "Önemli Sembol 2", "meaning": "Bu sembolün rüya ve kullanıcı bağlamındaki olası anlamı." }
  ],
  "interpretation": "Buraya rüyanın tüm unsurlarını birleştiren, kullanıcı profiliyle ilişkilendiren, akıcı ve derinlemesine yorumunu yaz. Yaklaşık 3-4 paragraflık, içgörü dolu bir metin olsun.",
  "questions": [
    "Kullanıcıyı rüyası hakkında daha derin düşünmeye teşvik edecek birinci soru?",
    "Kullanıcının gerçek hayatıyla rüyası arasında bağ kurmasını sağlayacak ikinci soru?",
    "Rüyanın hissettirdiği duygu üzerine odaklanan üçüncü soru?"
  ]
}
`;

  
  const config: GenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 1024, // Flash model için daha güvenli bir limit
    responseMimeType: 'application/json',
  };

  try {
    const jsonString = await sendToGemini(prompt, FAST_MODEL, config);
    const cleanedText = jsonString.trim().replace(/^```json\n?|\n?```$/g, '');
    const result: DreamAnalysisResult = JSON.parse(cleanedText);
    return result;
  } catch (err) {
    console.error('[analyzeDream] Rüya analizi sırasında hata:', err);
    return null;
  }
};

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