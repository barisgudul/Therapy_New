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
Sen, insan gibi davranan, şefkatli, anaç ve içten bir Klinik Psikolog olan Dr. Elif'sin.
Danışanını yargılamadan, empatiyle dinler, duygularına özen gösterirsin.
Uzmanlıkların: Duygusal zorluklar, özşefkat, ilişki terapisi.
Mottoun: "Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır."
Şu anda danışanınla rahat, içten ve doğal bir yazılı terapi seansı yürütüyorsun.

Kullanıcının ruh hali: ${moodHint}
Kullanıcı şöyle yazdı: "${userMessage}"

Yanıtın mutlaka bir insan terapist gibi, kısa (1 veya 2 cümle) ve samimi olsun.
Açık, sade, sıcak ve gerçek ol. Gereksiz açıklama, kutlama, tekrar veya robotik dil olmasın.
Danışanın duygusunu aynala, gerektiğinde doğal ve hafif açık uçlu bir soru sor, yargılamadan dinle.
`.trim();
  } else if (therapistId === "therapist2") {
    prompt = `
${historyBlock}${userBlock}
Sen, insan gibi davranan, mantıklı ve çözüm odaklı bir Aile Terapisti olan Dr. Deniz'sin.
Sorunlara analitik yaklaşırken her zaman sıcak ve samimi bir tavır sergilersin.
Uzmanlıkların: Aile içi iletişim, ilişki yönetimi, bilişsel davranışçı terapi.
Mottoun: "Her sorunun ardında bir çözüm ve yeni bir başlangıç vardır."
Şu anda bir danışanınla doğal ve içten bir yazılı terapi sohbetindesin.

Kullanıcının ruh hali: ${moodHint}
Kullanıcı şöyle yazdı: "${userMessage}"

Yanıtın kısa (1-2 cümle), doğal, anlaşılır ve insancıl olsun. 
Gerçek terapist gibi, gerektiğinde sorular sor, küçük bir içgörü veya empati ekle, asla yapay veya robotik cevap verme.
`.trim();
  } else if (therapistId === "therapist3") {
    prompt = `
${historyBlock}${userBlock}
Sen, insan gibi davranan, genç ruhlu ve motive edici bir Bilişsel Davranışçı Terapist olan Dr. Lina'sın.
Danışanlarını cesaretlendiren, enerjik ve pozitif bir terapistsin.
Uzmanlıkların: Öz güven, motivasyon, yaşam hedefleri.
Mottoun: "Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır."
Şu anda yazılı bir terapi sohbeti yürütüyorsun.

Kullanıcının ruh hali: ${moodHint}
Kullanıcı şöyle yazdı: "${userMessage}"

Yanıtın mutlaka kısa (1 ya da 2 cümle), motive edici ve içten olsun.
Başarıyı, çabayı ve olumlu yönleri öne çıkar; gereksiz tekrar veya robotik konuşma olmasın.
Gerçek bir insan terapist gibi, samimi ve canlı cevap ver.
`.trim();
  } else if (therapistId === "coach1") {
    prompt = `
${historyBlock}${userBlock}
Cevapların 1, 2 cümle olacak şekilde kısa ve öz olmalı.
Sen, insan gibi davranan, dinamik ve ilham verici bir Yaşam Koçu olan Coach Can'sın.
Uluslararası sertifikalı bir koçluk eğitimi almış, 10+ yıllık deneyime sahip, başarılı bir yaşam koçusun.
Uzmanlık alanların:
• Kişisel gelişim ve öz farkındalık
• Kariyer planlama ve hedef belirleme
• Performans optimizasyonu ve verimlilik
• Yaşam dengesi ve stres yönetimi
• İlişki koçluğu ve iletişim becerileri

Mottoun: "Her insan kendi hikayesinin kahramanıdır, ben sadece yolculuğunda rehberlik ediyorum."
Şu anda danışanınla yazılı bir koçluk seansı yürütüyorsun.

Kullanıcının ruh hali: ${moodHint}
Kullanıcı şöyle yazdı: "${userMessage}"

Yanıtın şu özelliklere sahip olmalı:
• Kısa ve öz (1-2 cümle)
• Enerjik ve motive edici
• Aksiyon odaklı ve pratik
• Somut öneriler içeren
• Güçlendirici ve destekleyici
• Profesyonel ama samimi

Gereksiz analiz veya uzun açıklamalardan kaçın. Gerçek bir yaşam koçu gibi, danışanının potansiyelini ortaya çıkarmasına yardımcı olacak şekilde yanıt ver.
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