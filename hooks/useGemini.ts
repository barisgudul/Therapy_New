import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AppEvent } from '../utils/eventLogger';

/* ==========================================================================
 * useGemini.ts  ·  v4.0 Final (Comprehensive & Robust)
 *
 * Bu dosya, Therapy uygulamasının tüm Gemini AI etkileşimlerini yönetir.
 * Her fonksiyon, maksimum kalite ve tutarlılık için özel olarak tasarlanmış
 * prompt mühendisliği tekniklerini kullanır.
 * ======================================================================= */

// -----------------------------------------------------------------------------
// 1. TEMEL YAPILANDIRMA VE ARAYÜZLER
// -----------------------------------------------------------------------------

const KEY   = Constants.expoConfig?.extra?.GEMINI_API_KEY as string;
const MODEL = 'gemini-1.5-pro-latest';
const TEMP  = 0.75; // Dengeli ve tutarlı yanıtlar için ideal bir sıcaklık.

/** Kullanıcı profilinin yapısını tanımlar. */
export interface UserProfile {
  nickname?: string;
  birthDate?: string;
  profession?: string;
  expectation?: string;
  goals?: string[];
  interests?: string[];
}

/** Bir günlük girişinin yapısını tanımlar. */
export interface LogEntry {
  timestamp: number;
  mood: string;
  reflection: string;
  activities?: string[];
  sleepHours?: number;
}

/** Yapılandırılmış günlük analizi çıktısının formatını tanımlar. */
export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}

// -----------------------------------------------------------------------------
// 2. DÜŞÜK SEVİYE API VE YARDIMCI FONKSİYONLAR
// -----------------------------------------------------------------------------

/**
 * Gemini API'sine ham bir prompt gönderir ve metin yanıtını alır.
 * @param prompt AI'a gönderilecek olan görev tanımı.
 * @param maxTokens Üretilecek maksimum token sayısı.
 * @returns AI tarafından üretilen metin.
 */
async function llm(prompt: string, maxTokens = 200): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMP, topP: 0.95, maxOutputTokens: maxTokens },
  };
  try {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Hatası:', response.status, errorText);
      return 'Üzgünüm, şu an sunucuya ulaşmakta zorlanıyorum. Lütfen daha sonra tekrar deneyin.';
    }
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Anlaşılır bir yanıt alınamadı. Farklı bir şekilde sormayı deneyin.';
  } catch (error) {
    console.error('Gemini Fetch Hatası:', error);
    return 'İnternet bağlantınızda bir sorun olabilir. Lütfen kontrol edip tekrar deneyin.';
  }
}

/** Cihaz hafızasından kullanıcı profilini alır. */
async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const profileString = await AsyncStorage.getItem('userProfile');
    return profileString ? JSON.parse(profileString) : null;
  } catch {
    return null;
  }
}

/**
 * Kullanıcı profilini, AI'ın anlayacağı zengin ve anlatısal bir metne dönüştürür.
 * @param profile Kullanıcı profili nesnesi.
 * @returns AI için hazırlanmış profil özeti.
 */
function createUserDescription(profile: UserProfile | null): string {
  if (!profile) return 'Kullanıcı profili mevcut değil.';
  const parts = [
    profile.nickname    && `Kullanıcının adı ${profile.nickname}.`,
    profile.birthDate   && `Doğum tarihi ${profile.birthDate}.`,
    profile.profession  && `Mesleği ${profile.profession}.`,
    profile.expectation && `Uygulamadan beklentisi: "${profile.expectation}".`,
    profile.goals       && profile.goals.length > 0 && `Ana hedefleri şunlardır: ${profile.goals.join(', ')}.`,
    profile.interests   && profile.interests.length > 0 && `İlgi alanları: ${profile.interests.join(', ')}.`
  ];
  return parts.filter(Boolean).join(' ');
}

/** Uzun bir konuşma geçmişini, sadece son kısımlarını alarak kısaltır. */
function compress(history = '', keep = 8): string {
  return history.split('\n').map(l => l.trim()).filter(Boolean).slice(-keep).join('\n');
}

// -----------------------------------------------------------------------------
// 3. TERAPİST SOHBETİ FONKSİYONLARI
// -----------------------------------------------------------------------------

const THERAPISTS = {
  therapist1: { persona: 'Dr. Elif', tech: 'şefkatli ve anlayışlı bir yaklaşımla, Duygu Odaklı Terapi ve Bilişsel Davranışçı Terapi tekniklerini kullanır' },
  therapist3: { persona: 'Dr. Lina', tech: 'enerjik ve çözüm odaklı bir dille, BDT ve Pozitif Psikoloji tekniklerini uygular' },
  coach1:     { persona: 'Koç Can', tech: 'motive edici ve eylem odaklı bir üslupla, hedef belirleme ve başa çıkma stratejileri üzerine odaklanır' },
} as const;
type TID = keyof typeof THERAPISTS;

const GOAL_OPTIONS = [
  'Kullanıcının ifade ettiği duyguyu yansıtarak geçerli kılmak.',
  'Bir düşünce tuzağını (otomatik düşünceyi) nazikçe sorgulamak.',
  'Konuyu derinleştirmek için güçlü, açık uçlu bir soru sormak.',
  'Pratik, küçük bir başa çıkma stratejisi veya bakış açısı önermek.',
  'Konuşmanın gidişatını kullanıcının belirlemesine izin vermek, alanı ona bırakmak.',
  'Bedensel duyumlara veya "şimdi ve burada" anına odaklanmasını teşvik etmek.',
  'Kullanıcının kendi gücünü veya başa çıkma becerisini fark etmesini sağlamak.',
];

/** Konuşmanın gidişatına göre en uygun bir sonraki terapötik hedefi seçer. */
async function selectNextGoal(history: string, userMsg: string): Promise<string> {
  const goalPrompt = `Bir terapi seansının bir bölümü aşağıdadır.\nGeçmiş: ${history}\nKullanıcı: "${userMsg}"\n\nAşağıdaki terapi hedeflerinden bu konuşma için en uygun olan BİR TANESİNİ seç ve sadece o cümlenin kendisini yaz.\n\nSeçenekler:\n- ${GOAL_OPTIONS.join('\n- ')}`.trim();
  const goal = await llm(goalPrompt, 40);
  return GOAL_OPTIONS.find(o => goal.includes(o)) || GOAL_OPTIONS[2];
}

/**
 * Terapist yanıtı için tüm bileşenleri birleştirerek son prompt'u oluşturur.
 */
async function buildTherapistPrompt(p: { id: TID; profileDesc: string; history: string; userMsg: string; mood: string; }): Promise<string> {
  const therapist = THERAPISTS[p.id] ?? THERAPISTS.therapist1;
  const safetyCheck = /(intihar|ölmek|zarar|kendimi kesmek)/i.test(p.userMsg)
    ? 'ACİL DURUM KURALI: Kullanıcının güvenliği risk altında olabilir. Sakin kalarak profesyonel bir uzmana (psikolog, psikiyatrist) veya acil yardım hatlarına (örn: 112) ulaşmasını şiddetle tavsiye et. Bu uygulamanın bir kriz müdahale aracı olmadığını belirt.'
    : 'ETİK KURAL: Asla tıbbi tanı koyma veya ilaç reçete etme. Sen bir terapi asistanısın, doktor değilsin.';
    const dynamicGoal = p.history.trim() === ''
    ? await selectNextGoal(p.history, p.userMsg)
    : "Konuşmanın akışına ve bir önceki cevabına göre doğal bir şekilde devam et.";

  return `
SENİN KİMLİĞİN: Sen, ${therapist.persona} adında bir AI terapistsin. Yaklaşımın: ${therapist.tech}.
KULLANICI PROFİLİ: ${p.profileDesc}
GÜVENLİK NOTU: ${safetyCheck}
O ANKİ DUYGU: Kullanıcı bu seansa "${p.mood}" hissederek başladı. Bu bilgiyi aklında tut.

KONUŞMA GEÇMİŞİ (Sohbetin Bağlamı Budur):
${p.history.trim() === '' ? 'Bu ilk mesaj, henüz bir geçmiş yok.' : p.history}

KULLANICININ SON MESAJI (Cevap Vermen Gereken): "${p.userMsg}"
GİZLİ GÖREVİN (Kullanıcıya Belli Etme): ${dynamicGoal}

YANIT KURALLARI:
1. Yanıtını MUTLAKA konuşma geçmişini dikkate alarak oluştur. Konuşulanları unutma.
2. 2 ila 4 cümle arasında, dengeli bir uzunlukta cevap ver.
3. Asla kullanıcının son söylediğini kelimesi kelimesine tekrar etme (papağanlaşma).
4. Cevabını, kullanıcıyı düşünmeye teşvik eden açık uçlu bir soruyla bitir.
`.trim();
}

/**
 * Bir kullanıcı mesajına terapist yanıtı üretir.
 * @param tid Kullanılacak terapist kimliği.
 * @param userMsg Kullanıcının son mesajı.
 * @param mood Kullanıcının o anki ruh hali.
 * @param history Konuşma geçmişi.
 * @param turn Konuşmanın kaçıncı turda olduğu (profil hatırlatması için).
 */
export async function generateTherapistReply(tid: TID, userMsg: string, mood = '', history = '', turn = 1): Promise<string> {
  const profile = await getUserProfile();
  // Profili her 4 turda bir veya ilk turda hatırlat
  const profileDescription = (turn === 1 || turn % 4 === 1) ? createUserDescription(profile) : 'Daha önce paylaşıldı.';
  
  const prompt = await buildTherapistPrompt({
    id: tid,
    profileDesc: profileDescription,
    history: compress(history),
    userMsg,
    mood,
  });
  
  // console.log('🧠 Terapist Promptu:', prompt);
  return await llm(prompt, 200);
}

// -----------------------------------------------------------------------------
// 4. GÜNLÜK VE ANALİZ FONKSİYONLARI
// -----------------------------------------------------------------------------

/**
 * Kullanıcının günlük yansımasına kısa, empatik ve motive edici bir yanıt verir.
 * @param note Kullanıcının yazdığı günlük notu.
 * @param mood Kullanıcının belirttiği ruh hali.
 */
export async function generateDailyReflectionResponse(note: string, mood: string): Promise<string> {
  const profile = await getUserProfile();
  const prompt = `
ROL: Sen, kullanıcının gün sonu yansımasını okuyan, sıcak ve cesaret verici bir yol arkadaşısın.
KULLANICI: ${profile?.nickname || 'Kullanıcı'}
BİLGİ: Kullanıcı bugün kendini "${mood}" olarak etiketledi ve şunları yazdı: "${note}"

GÖREVİN: Yargılamadan, sadece duygusunu geçerli kılan ve ona destek olan 5 samimi cümle yaz. Asla tavsiye verme. Sadece dinle ve yanında olduğunu hissettir.
`.trim();
  return await llm(prompt, 80);
}

/**
 * Kullanıcının günlük girişini analiz eder ve yapılandırılmış JSON formatında döner.
 * @param text Günlük metni.
 * @returns {DiaryAnalysis} formatında bir nesne.
 */
export async function analyzeDiaryEntry(text: string): Promise<DiaryAnalysis> {
  const prompt = `
GÜNLÜK METNİ ANALİZİ
METİN: "${text}"

GÖREV: Yukarıdaki metni analiz et ve çıktıyı AŞAĞIDAKİ JSON ŞABLONUNA TAM UYGUN OLARAK doldur. Cevabında SADECE ve SADECE JSON nesnesi olmalı, başka hiçbir metin veya işaret olmamalı.

JSON ŞABLONU:
{
  "mood": "Metinden anlaşılan ana duygu (örneğin: 'huzurlu', 'stresli', 'karışık', 'mutlu')",
  "tags": ["Metindeki anahtar kelimeler veya temalar (3-5 adet)", "iş", "aile", "kişisel gelişim"],
  "feedback": "Kullanıcının yazdıklarına dair 1-2 cümlelik, nazik ve yapıcı bir geri bildirim.",
  "questions": ["Kullanıcıyı daha derine inmeye teşvik edecek 1-2 açık uçlu soru", "Bu konuda en çok neyin değişmesini isterdin?"]
}
`.trim();
  const rawJson = await llm(prompt, 250);
  try {
    // AI'ın bazen eklediği ```json bloğunu temizle
    const cleanJson = rawJson.replace(/^```json\n?|```$/g, '');
    return JSON.parse(cleanJson);
  } catch {
    return { feedback: 'Günün analizi yapılırken bir sorun oluştu.', questions: [], mood: 'belirsiz', tags: [] };
  }
}

/**
 * Kullanıcının TÜM olay kayıtlarını analiz ederek premium bir rapor oluşturur.
 * @param events Analiz edilecek olaylar dizisi.
 * @param days Raporun kapsadığı gün sayısı.
 */
export async function generateDetailedMoodSummary(events: AppEvent[], days: number): Promise<string> {
  // 1. Gerekli verileri hazırla
  const userProfile = await getUserProfile();
  const userDescription = createUserDescription(userProfile);

  // 2. YENİ VERİ FORMATINA UYGUN PROMPT
  const prompt = `
ANA GÖREV: Aşağıda KAYNAK VERİLER bölümünde JSON formatında bir olay (event) akışı bulunmaktadır. Bu verileri kullanarak kullanıcının son ${days} günü hakkında detaylı ve bütünsel bir ruh hali raporu oluştur.

ÖNEMLİ KURAL: "Veri yetersiz" gibi ifadeler KULLANMA. Sana verilen olay akışıyla mümkün olan en iyi analizi yap. Olaylar arasındaki bağlantıları kur. Örneğin, bir 'session_start' olayındaki 'kötü' ruh hali ile 'daily_reflection'daki 'iş stresi' notu arasında bir ilişki var mı?

KULLANICI BİLGİLERİ: ${userDescription}

KAYNAK VERİLER (Olay Akışı):
${JSON.stringify(events, null, 2)}

RAPOR YAPISI VE TALİMATLARI:
Aşağıdaki 4 başlığı kullanarak raporunu oluştur.

Genel Bakış
KAYNAK VERİLER'deki duygu dağılımını (örneğin %60 pozitif) analiz et. Verilerden yola çıkarak haftanın en belirgin 3 özelliğini (başarı, zorluk, olay vb.) bul ve vurgula.

Duygusal Dalgalanmalar
Verilerdeki duygu geçişlerinin ne kadar keskin olduğunu ve hangi günler daha belirgin olduğunu (örn. hafta başı vs sonu) belirt. Genel bir duygu yoğunluk skoru (1-10) tahmini yap.

Tetikleyici Analizi
Verilerdeki olayları incele. 'daily_reflection' veya 'diary_entry' içindeki 'reflection'/'not' metinlerini, 'text_session' gibi olaylardaki 'messages' (sohbet geçmişi) içerikleriyle karşılaştır. Kullanıcının belirli konular (örneğin 'iş', 'aile') hakkında konuştuktan sonra ruh halinin nasıl değiştiğini analiz et. Tekrar eden temaları ve bunların duygularla ilişkisini bul.

Kişiye Özel Tavsiyeler
Kullanıcının profilindeki hedeflere (${userProfile?.goals?.join(', ') || 'belirtilmemiş'}) ve ilgi alanlarına (${userProfile?.interests?.join(', ') || 'belirtilmemiş'}) göre 3 somut adım öner. Verilerden yola çıkarak haftaya özel bir hedef ve bir kriz anı stratejisi sun.

!! TEKNİK FORMATLAMA KURALLARI (UYULMASI ZORUNLU) !!
1. Rapor 750 kelimeyi geçmesin.
2. Cevabın SADECE DÜZ METİN olmalı. Markdown, yıldız, tire, madde işareti veya başka bir özel karakter KULLANMA.
3. Başlıkları tam olarak 'Genel Bakış', 'Duygusal Dalgalanmalar' vb. şeklinde yaz ve sonraki satıra geç.
4. Her bölümde, fikirleri yeni bir paragrafla (yeni bir satırda başlayarak) ayır.
5. Kullanıcıya "${userProfile?.nickname || 'değerli kullanıcı'}" ismiyle hitap et.
`.trim();

  // console.log("💎 Gönderilen Bütünsel Analiz Promptu:\n", prompt);
  return await llm(prompt, 800); // Token sayısını artırmak gerekebilir
}