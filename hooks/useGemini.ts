import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";

// ------------------- MODEL SABİTLERİ -------------------
const FAST_MODEL = 'gemini-1.5-flash-latest'; // Hızlı sohbetler için
const POWERFUL_MODEL = 'gemini-1.5-pro-latest'; // Derin analizler için
const GENIOUS_MODEL = 'gemini-1.5-pro-latest'; // En güçlü model, en yüksek maliyetli
// ------------------- GENERATION CONFIG TİPİ -------------------
type GenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'application/json';
};

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
    console.log(`[${model}] Gemini raw response:`, JSON.stringify(data).substring(0, 200) + '...');
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (data.error) {
      throw new Error(data.error.message);
    }
    if (!reply) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      console.warn(`Cevap alınamadı. Bitirme sebebi: ${finishReason}`);
      return "Üzgünüm, şu anda yanıt veremiyorum.";
    }
    return reply;
  } catch (err) {
    console.error(`[${model}] Gemini API hatası:`, err);
    return "Bir sorunla karşılaştım, lütfen sonra tekrar dene.";
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
  // ---- PROMPT'U GEVŞETİYORUZ ----
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
${chatHistory}  // Bu değişken artık hibrit geçmişi (özet + son konuşmalar) içermeli

### KULLANICININ SON MESAJI ###
"${userMessage}"

### ÇIKTI (Sadece bu kısma yanıt yaz) ###
`.trim();

  console.log("AI'ya giden PROMPT:", prompt);
  // ---- CONFIG'İ AYARLIYORUZ ----
  const config: GenerationConfig = {
    temperature: 0.85, // Daha insansı ve çeşitli cevaplar için artırıldı
    maxOutputTokens: 300, 
  };
  return await sendToGemini(prompt, FAST_MODEL, config);
}

// ---- DİĞER FONKSİYONLAR (ESKİ HALİYLE KORUNDU) ----
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
  const config: GenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 80,
  };
  return await sendToGemini(prompt, FAST_MODEL, config);
}

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
1. Rapor maksimum 500 kelime olsun
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
  const config: GenerationConfig = {
    temperature: 0.6,
    maxOutputTokens: 500,
  };
  return await sendToGemini(prompt, POWERFUL_MODEL, config);
}

export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}

export const analyzeDiaryEntry = async (text: string): Promise<DiaryAnalysis> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${FAST_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Aşağıdaki günlük yazısını analiz et ve şu bilgileri ver:\n            1. Duygu durumu (mood): Kullanıcının genel duygu durumunu belirle (mutlu, üzgün, kaygılı, nötr vb.)\n            2. Etiketler (tags): Günlükte geçen önemli konuları etiketle (örn: aile, iş, sağlık, ilişki vb.)\n            3. Geri bildirim: Kullanıcıya destekleyici ve yapıcı bir geri bildirim ver\n            4. Sorular: Kullanıcıyı düşünmeye teşvik eden 3 soru öner\n\n            Günlük yazısı:\n            ${text}\n\n            Lütfen yanıtını tam olarak şu JSON formatında ver, başka hiçbir metin ekleme:\n            {\n              "mood": "duygu durumu",\n              "tags": ["etiket1", "etiket2", "etiket3"],\n              "feedback": "geri bildirim metni",\n              "questions": ["soru1", "soru2", "soru3"]\n            }`
            }]
          }]
        })
      });
    const data = await response.json();
    console.log("Gemini raw response:", data);
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("API yanıtı boş geldi");
    }
    const cleanedText = responseText.trim().replace(/^```json\n?|\n?```$/g, '');
    try {
      const analysis = JSON.parse(cleanedText);
      return {
        feedback: analysis.feedback || "Geri bildirim alınamadı",
        questions: analysis.questions || [],
        mood: analysis.mood || "neutral",
        tags: analysis.tags || []
      };
    } catch (parseError) {
      console.error("JSON parse hatası:", parseError);
      console.error("Temizlenmiş yanıt:", cleanedText);
      return {
        feedback: "Üzgünüm, şu anda analiz yapamıyorum. Lütfen daha sonra tekrar deneyin.",
        questions: [],
        mood: "neutral",
        tags: []
      };
    }
  } catch (error) {
    console.error('AI analiz hatası:', error);
    return {
      feedback: 'Üzgünüm, şu anda analiz yapamıyorum. Lütfen daha sonra tekrar deneyin.',
      questions: [],
      mood: 'neutral',
      tags: []
    };
  }
};

// ------------------------------------------------------------------
// ---- YENİ FONKSİYON: BİRİKİMLİ ÖZET OLUŞTURUCU ----
// ------------------------------------------------------------------
/**
 * Önceki bir özeti ve yeni sohbet metnini alarak güncellenmiş bir seans özeti oluşturur.
 * @param previousSummary - Bir önceki özet metni. Boş olabilir.
 * @param newConversationChunk - Özetlenecek yeni konuşma bölümü.
 * @returns Yeni, birleştirilmiş özet metni.
 */
export async function generateCumulativeSummary(
  previousSummary: string,
  newConversationChunk: string
): Promise<string> {
  const prompt = `
### GÖREV ###
Aşağıda bir terapi seansından iki bölüm bulunmaktadır:
1.  **ÖNCEKİ ÖZET:** Bu, seansın şu ana kadarki genel bir özetidir. (Eğer boşsa, bu seansın ilk özeti demektir).
2.  **YENİ KONUŞMALAR:** Bu, seansın son birkaç dakikasında geçen yeni diyaloglardır.

Senin görevin, **YENİ KONUŞMALAR**'daki önemli bilgileri (yeni konular, duygular, kişiler, olaylar) alıp, bunları **ÖNCEKİ ÖZET**'e entegre ederek, güncel ve bütüncül YENİ BİR ÖZET oluşturmaktır.

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

  // Özetleme için hızlı model hem yeterli hem de maliyet açısından verimlidir.
  // Temperature'ı düşük tutarak daha olgusal bir özet almayı hedefleriz.
  const config: GenerationConfig = {
    temperature: 0.2,
    maxOutputTokens: 500, // Özetin çok uzamasını engeller
  };

  // Özetleme için FAST_MODEL'i kullanıyoruz.
  return await sendToGemini(prompt, FAST_MODEL, config);
}