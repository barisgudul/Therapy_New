import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from "expo-constants";

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY;

// ---- Gemini API Ortak Fonksiyon ----
export const sendToGemini = async (text: string): Promise<string> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text }] }],
        }),
      }
    );
    const data = await response.json();
    console.log("Gemini raw response:", data);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ?? "Cevap alınamadı.";
  } catch (err) {
    console.error("Gemini API hatası:", err);
    return "Sunucu hatası oluştu.";
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

// ---- DİJİTAL TERAPİ GÜNLÜĞÜ (DAILY WRITE) ----
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

  return await sendToGemini(prompt);
}

// ---- TERAPİST KARAKTERLERİNE GÖRE MESAJLAŞMA (TEXT SESSION) ----
export async function generateTherapistReply(
  therapistId: string,
  userMessage: string,
  moodHint: string = "",
  chatHistory: string = "",
  messageCount: number = 1 // <-- zorunlu parametre
) {
  const userProfile = await getUserProfile();
  const userDesc = makeUserDesc(userProfile);

  // --- Her 3 mesajda bir (ve ilk mesajda) profil ve "ismini kullan" talimatı, diğerlerinde ise "ismini kullanma" talimatı eklenir ---
  const showProfile = (messageCount === 1) || (messageCount % 3 === 0);
  const userBlock = showProfile && userDesc
    ? `${userDesc}\nCevaplarında kullanıcıya ismiyle (ör. ${userProfile.nickname}) hitap et.`
    : 'Cevaplarında kullanıcının ismini kullanma.';

  const historyBlock = chatHistory
    ? `Geçmiş sohbetiniz:\n${chatHistory}\n\n`
    : "";

  let prompt = "";

  if (therapistId === "therapist1") {
    prompt = `
${historyBlock}${userBlock}
Unutma 2 cümleden fazla cevap vermiyeceksin.
Sen Dr. Elif'sin - şefkatli, anaç bir Klinik Psikolog. Yumuşak, sakin bir ses tonun var. Bazen sıcak hitap şekilleri kullanırsın. Danışanın duygulara odaklanır, güvenli bir liman gibi davranırsın.
Unutma 2 cümleden fazla cevap vermiyeceksin.
Kullanıcının ruh hali: ${moodHint}  
Kullanıcı: "${userMessage}"

En fazla 2 cümle yaz. Şefkatli, huzur verici ve içten ol. Duygularını anladığını göster, yargılama.
`.trim();
  } else if (therapistId === "therapist3") {
    prompt = `
${historyBlock}${userBlock}
Unutma 2 cümleden fazla cevap vermiyeceksin.
Sen Dr. Lina'sın - genç ruhlu, enerjik bir Bilişsel Davranışçı Uzmanı. Modern ve dinamiksin. Çözüm odaklısın, danışanın güçlü yanlarını öne çıkarırsın.
Maximum 2 cümlelik cevaplar ver.
Kullanıcının ruh hali: ${moodHint}
Kullanıcı: "${userMessage}"

En fazla 2 cümle yaz. Motive edici, pozitif ve cesaret verici ol. Başarıyı ve çabayı öne çıkar.
`.trim();
  } else if (therapistId === "coach1") {
    prompt = `
${historyBlock}${userBlock}
Unutma 2 cümleden fazla cevap vermiyeceksin.
Sen Coach Can'sın - dinamik, aksiyon odaklı bir Yaşam Koçu. Liderlik ruhun var. Danışana somut adımlar önerir, harekete geçirirsin.
Unutma 2 cümleden fazla cevap vermiyeceksin.
Kullanıcının ruh hali: ${moodHint}
Kullanıcı: "${userMessage}"

En fazla 2 cümle yaz. Enerjik, pratik ve aksiyon odaklı ol. Somut öneriler ver.
`.trim();
  } else {
    prompt = `
${historyBlock}${userBlock}
Sen, gerçek bir insan terapist gibi davranan, empatik ve destekleyici bir sohbet rehberisin.
Amacın danışanına duygusal destek vermek, onu anlamak ve yanında olduğunu hissettirmek.
Kullanıcı şöyle yazdı: "${userMessage}"
${moodHint ? `Onun ruh hali: ${moodHint}` : ""}

Yanıtların kısa (1-2 cümle), sıcak, samimi ve insani olsun.
Gerektiğinde doğal ve hafif bir soru ekle, asla mekanik veya tekrar eden cümleler kurma.
Gerçek bir insan gibi sohbet et.
`.trim();
  }

  // 👇 API'ya gönderilen PROMPT'u logla (kesin kontrol için)
  console.log("AI'ya giden PROMPT:", prompt);

  return await sendToGemini(prompt);
}

// ---- Detaylı AI Analizi ----
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

  return await sendToGemini(prompt);
}

// ---- GÜNLÜK ANALİZİ ----
export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}

export const analyzeDiaryEntry = async (text: string): Promise<DiaryAnalysis> => {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Aşağıdaki günlük yazısını analiz et ve şu bilgileri ver:
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
            }`
          }]
        }]
      })
    });

    const data = await response.json();
    console.log("Gemini raw response:", data);

    // API yanıtını güvenli bir şekilde işle
    const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("API yanıtı boş geldi");
    }

    // Yanıt metnini temizle ve JSON olarak parse et
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
      // API yanıtı JSON formatında değilse, varsayılan değerler döndür
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