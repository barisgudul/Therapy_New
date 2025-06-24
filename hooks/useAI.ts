import Anthropic from '@anthropic-ai/sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import { AppEvent } from '../utils/eventLogger';

/* ==========================================================================
 * useAI.ts  ·  v6.6 (Focused Dynamic Persona Reply)
 *
 * Bu modül, AsyncStorage'dan seçilen terapist profiline göre
 * dinamik olarak yapay zeka cevapları üretir. Diğer fonksiyonlar
 * genel amaçlıdır.
 * ======================================================================= */

// -----------------------------------------------------------------------------
// 1. API YAPILANDIRMASI ve TİPLER
// -----------------------------------------------------------------------------

const GEMINI_API_KEY = Constants.expoConfig?.extra?.GEMINI_API_KEY as string;
const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY as string;
const ANTHROPIC_API_KEY = Constants.expoConfig?.extra?.ANTHROPIC_API_KEY as string;
const GROQ_API_KEY = Constants.expoConfig?.extra?.GROQ_API_KEY as string;

const MODELS = {
  openai_4o: 'gpt-4o',
  gemini_1_5: 'gemini-1.5-pro-latest',
  gemini_1_0: 'gemini-1.0-pro',
  claude_haiku: 'claude-3-haiku-20240307',
  groq_mixtral: 'mixtral-8x7b-32768',
  openai_gpt3_5: 'gpt-3.5-turbo'
};

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const groq = new Groq({ apiKey: GROQ_API_KEY });

export interface UserProfile {
  nickname?: string;
  birthDate?: string;
  profession?: string;
  expectation?: string;
  goals?: string[];
  interests?: string[];
}

export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}

class AIError extends Error {
  constructor(message: string, public service: string) {
    super(message);
    this.name = 'AIError';
  }
}

// -----------------------------------------------------------------------------
// TERAPİST PROFİLLERİ (generateTherapistReply için)
// -----------------------------------------------------------------------------

const THERAPIST_PROFILES = {
  therapist1: {
    id: 'therapist1',
    name: 'Dr. Elif',
    title: 'AI Klinik Psikolog',
    specialties: ['Duygusal zorluklar', 'Özşefkat', 'İlişki terapisi'],
    approach: 'Şefkatli ve duygusal, anaç tavırlı bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    philosophy: 'Duygularını onurlandırmak, kendini iyileştirmenin ilk adımıdır.',
    style: 'Empati ve dinleme öncelikli, duygulara odaklanır',
    about: 'Ben Dr. Elif. Duyguların keşfi ve iyileşme yolculuğunda sana şefkatle eşlik ederim. Seanslarda her duygunun güvenle ifade edilebildiği, yargısız bir alan yaratırım. Stres, özgüven ve ilişki sorunlarında destek olurum.',
  },
  therapist3: {
    id: 'therapist3',
    name: 'Dr. Lina',
    title: 'AI Bilişsel Davranışçı Uzmanı',
    specialties: ['Öz güven', 'Motivasyon', 'Yaşam hedefleri'],
    approach: 'Genç ruhlu ve motive edici bir terapist olarak, danışanlarımın içsel güçlerini keşfetmelerine yardımcı oluyorum. Her bireyin benzersiz olduğuna inanır, kişiye özel çözümler sunarım.',
    philosophy: 'Bugün küçük bir adım, yarın büyük bir değişimin başlangıcıdır.',
    style: 'Enerjik ve pozitif yaklaşımım, danışanlarımı cesaretlendirir ve değişim için motive eder.',
    about: 'Selam! Ben Dr. Lina. Hayata pozitif bakışımla, güçlü yönlerini keşfetmen ve hedeflerine ulaşman için seni desteklerim. Seanslarımda motive edici, pratik ve genç bir enerji sunarım. Hedef belirleme ve değişim konularında yanındayım.',
  },
  coach1: {
    id: 'coach1',
    name: 'Coach Can',
    title: 'AI Yaşam Koçu',
    specialties: ['Kişisel gelişim', 'Hedef belirleme', 'Performans artırma'],
    approach: 'Dinamik ve ilham verici bir koç olarak, danışanlarımın potansiyellerini ortaya çıkarmalarına ve hedeflerine ulaşmalarına yardımcı oluyorum. Her bireyin içinde keşfedilmeyi bekleyen bir güç olduğuna inanırım.',
    philosophy: 'Başarı, küçük adımların tutarlı bir şekilde atılmasıyla gelir.',
    style: 'Enerjik ve pratik yaklaşımım, danışanlarımı harekete geçirir ve hedeflerine ulaşmalarını sağlar.',
    about: 'Merhaba! Ben Coach Can. Yaşam koçluğu alanında uzmanlaşmış bir AI koçuyum. Dinamik ve ilham verici yaklaşımımla, potansiyelinizi ortaya çıkarmanıza ve hedeflerinize ulaşmanıza rehberlik ediyorum. Kişisel gelişim, kariyer planlaması ve performans artırma konularında yanınızdayım.',
  }
};

type TherapistID = keyof typeof THERAPIST_PROFILES;

// -----------------------------------------------------------------------------
// 2. Düşük Seviye API Çağrı Fonksiyonları
// -----------------------------------------------------------------------------

async function fetchFromGemini(prompt: string, model: string, maxTokens: number): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.75, maxOutputTokens: maxTokens } };
    try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Modelden boş yanıt geldi.';
    } catch (e) { throw new AIError((e as Error).message, `Gemini (${model})`); }
}

async function fetchFromOpenAI(prompt: string, model: string, maxTokens: number): Promise<string> {
  try {
      const completion = await openai.chat.completions.create({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
      return completion.choices[0].message.content?.trim() ?? 'Modelden boş yanıt geldi.';
  } catch (e) { throw new AIError((e as Error).message, `OpenAI (${model})`); }
}

async function fetchFromAnthropic(prompt: string, maxTokens: number): Promise<string> {
    try {
        const msg = await anthropic.messages.create({ model: MODELS.claude_haiku, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] });
        return msg.content[0].type === "text" ? msg.content[0].text : 'Modelden metin yanıtı alınamadı.';
    } catch (e) { throw new AIError((e as Error).message, "Anthropic"); }
}

async function fetchFromGroq(prompt: string, maxTokens: number): Promise<string> {
    try {
        const chatCompletion = await groq.chat.completions.create({ messages: [{ role: 'user', content: prompt }], model: MODELS.groq_mixtral, max_tokens: maxTokens });
        return chatCompletion.choices[0]?.message?.content || 'Modelden boş yanıt geldi.';
    } catch (e) { throw new AIError((e as Error).message, "Groq/Mixtral"); }
}

// -----------------------------------------------------------------------------
// 3. ÖZELLEŞMİŞ, GÖREV BAZLI LLM YÖNETİCİLERİ
// -----------------------------------------------------------------------------

type Plan = { name: string; fn: () => Promise<string>; };

async function executeFallbackChain(plans: Plan[]): Promise<string> {
  for (const plan of plans) {
    try {
      console.log(`▶️ Plan deneniyor: ${plan.name}`);
      return await plan.fn();
    } catch (error) {
      console.warn(`🟡 Plan (${plan.name}) başarısız. Sonraki deneniyor... Hata:`, (error as Error).message);
    }
  }
  console.error("🔴 TÜM AI PLANLARI BAŞARISIZ OLDU.");
  return "Üzgünüm, AI asistanlarımız şu anda yanıt vermiyor. Lütfen daha sonra tekrar deneyin.";
}

async function llmForDailyReflection(prompt: string, maxTokens: number): Promise<string> {
    const plans: Plan[] = [
        { name: "Groq (Mixtral)", fn: () => fetchFromGroq(prompt, maxTokens) },
        { name: "Gemini 1.0", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_0, maxTokens) },
        { name: "Claude Haiku", fn: () => fetchFromAnthropic(prompt, maxTokens) },
        { name: "OpenAI GPT-3.5", fn: () => fetchFromOpenAI(prompt, MODELS.openai_gpt3_5, maxTokens) },
        { name: "Gemini 1.5 (Yedek)", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_5, maxTokens) },
    ];
    return executeFallbackChain(plans);
}

async function llmForDiaryAnalysis(prompt: string, maxTokens: number): Promise<string> {
    const plans: Plan[] = [
        { name: "Gemini 1.0", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_0, maxTokens) },
        { name: "Claude Haiku", fn: () => fetchFromAnthropic(prompt, maxTokens) },
        { name: "Groq (Mixtral)", fn: () => fetchFromGroq(prompt, maxTokens) },
        { name: "OpenAI GPT-3.5", fn: () => fetchFromOpenAI(prompt, MODELS.openai_gpt3_5, maxTokens) },
        { name: "Gemini 1.5 (Yedek)", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_5, maxTokens) },
    ];
    return executeFallbackChain(plans);
}

async function llmForSmartestTasks(prompt: string, maxTokens: number): Promise<string> {
  const plans: Plan[] = [
      { name: "OpenAI GPT-4o", fn: () => fetchFromOpenAI(prompt, MODELS.openai_4o, maxTokens) },
      { name: "Gemini 1.5 Pro", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_5, maxTokens) },
      { name: "Claude Haiku", fn: () => fetchFromAnthropic(prompt, maxTokens) },
      { name: "Gemini 1.0", fn: () => fetchFromGemini(prompt, MODELS.gemini_1_0, maxTokens) },
      { name: "Groq (Mixtral)", fn: () => fetchFromGroq(prompt, maxTokens) },
      { name: "OpenAI GPT-3.5", fn: () => fetchFromOpenAI(prompt, MODELS.openai_gpt3_5, maxTokens) },
  ];
  return executeFallbackChain(plans);
}

// -----------------------------------------------------------------------------
// 4. UYGULAMA SEVİYESİ YARDIMCI FONKSİYONLAR
// -----------------------------------------------------------------------------

async function getUserProfile(): Promise<UserProfile | null> {
    try {
      const profileString = await AsyncStorage.getItem('userProfile');
      return profileString ? JSON.parse(profileString) : null;
    } catch { return null; }
}

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

function compress(history = '', keep = 8): string {
    return history.split('\n').map(l => l.trim()).filter(Boolean).slice(-keep).join('\n');
}

// -----------------------------------------------------------------------------
// 5. ÖZEL PROMPT OLUŞTURUCU (Sadece Terapist Cevabı için)
// -----------------------------------------------------------------------------

async function buildTherapistPrompt(p: { id: TherapistID; profileDesc: string; history: string; userMsg: string; mood: string; }): Promise<string> {
    const therapist = THERAPIST_PROFILES[p.id];

    const personaPrompt = `
SENİN KİMLİĞİN VE ROLÜN:
- Adın: ${therapist.name}
- Unvanın: ${therapist.title}
- Hakkında: ${therapist.about}
- Uzmanlık Alanların: ${therapist.specialties.join(', ')}.

İLETİŞİM TARZIN VE FELSEFEN:
- Yaklaşımın: ${therapist.approach}
- İletişim Tarzın: ${therapist.style}
- Ana Felsefen: "${therapist.philosophy}"
    `.trim();

    const safetyCheck = "ETİK KURAL: Asla tıbbi tanı koyma, kriz durumlarında profesyonel yardım önermelisin.";
    const dynamicGoal = "Kullanıcının ifade ettiği duyguları ve ihtiyaçları anla, ona göre destekleyici bir sohbet ortamı yarat.";

    return `
${personaPrompt}

KULLANICI PROFİLİ: ${p.profileDesc}
O ANKİ DUYGU DURUMU: Kullanıcı bu seansa "${p.mood}" hissederek başladı.
GÜVENLİK NOTU: ${safetyCheck}

KONUŞMA GEÇMİŞİ (Sohbetin Bağlamı Budur):
${p.history.trim() === '' ? 'Bu ilk mesaj.' : p.history}

KULLANICININ SON MESAJI: "${p.userMsg}"

GİZLİ GÖREVİN: ${dynamicGoal}

YANIT KURALLARI:
1. Yanıtını MUTLAKA yukarıda tanımlanan kimliğine, tarzına ve felsefene %100 sadık kalarak oluştur.
2. Yanıtını MUTLAKA konuşma geçmişini dikkate alarak oluştur.
3. 2-4 cümle arasında, dengeli ve kısa bir cevap ver.
4. Cevabını her zaman açık uçlu bir soruyla bitirerek sohbeti devam ettir.`.trim();
}

// -----------------------------------------------------------------------------
// 6. UYGULAMANIN KULLANDIĞI EXPORT EDİLMİŞ FONKSİYONLAR
// -----------------------------------------------------------------------------

export async function generateTherapistReply(userMsg: string, mood = '', history = '', turn = 1): Promise<string> {
  let selectedTherapistId: TherapistID = 'therapist1'; // Varsayılan terapist

  try {
    const storedTherapist = await AsyncStorage.getItem('selectedTherapist');
    if (storedTherapist) {
      const therapistObject = JSON.parse(storedTherapist);
      if (therapistObject.id && THERAPIST_PROFILES[therapistObject.id as TherapistID]) {
        selectedTherapistId = therapistObject.id;
      }
    }
  } catch (error) {
    console.error("AsyncStorage'dan terapist okunamadı, varsayılan kullanılıyor:", error);
  }

  const profile = await getUserProfile();
  const profileDescription = (turn === 1 || turn % 4 === 1) ? createUserDescription(profile) : 'Daha önce paylaşıldı.';
  
  const prompt = await buildTherapistPrompt({ 
    id: selectedTherapistId, 
    profileDesc: profileDescription, 
    history: compress(history), 
    userMsg, 
    mood 
  });
  
  return await llmForSmartestTasks(prompt, 200);
}

export async function generateDailyReflectionResponse(note: string, mood: string): Promise<string> {
  const profile = await getUserProfile();
  const prompt = `ROL: Sen, kullanıcının gün sonu yansımasını okuyan, sıcak ve cesaret verici bir yol arkadaşısın.\nKULLANICI: ${profile?.nickname || 'Kullanıcı'}\nBİLGİ: Kullanıcı bugün kendini "${mood}" olarak etiketledi ve şunları yazdı: "${note}"\n\nGÖREVİN: Yargılamadan, sadece duygusunu geçerli kılan ve ona destek olan 1-2 samimi cümle yaz.`.trim();
  return await llmForDailyReflection(prompt, 80);
}

export async function analyzeDiaryEntry(text: string): Promise<DiaryAnalysis> {
  const prompt = `GÜNLÜK METNİ ANALİZİ\nMETİN: "${text}"\n\nGÖREV: Metni analiz et ve çıktıyı AŞAĞIDAKİ JSON ŞABLONUNA TAM UYGUN OLARAK doldur. SADECE JSON nesnesi döndür.\n\nJSON ŞABLONU:\n{"mood": "ana duygu", "tags": ["anahtar kelimeler"], "feedback": "nazik bir geri bildirim.", "questions": ["düşündürücü bir soru"]}`.trim();
  const rawJson = await llmForDiaryAnalysis(prompt, 250);
  try {
    const cleanJson = rawJson.replace(/```(json)?/g, '').trim();
    return JSON.parse(cleanJson);
  } catch {
    return { feedback: 'Analiz yapılamadı.', questions: [], mood: 'belirsiz', tags: [] };
  }
}

export async function generateDetailedMoodSummary(events: AppEvent[], days: number): Promise<string> {
    const userProfile = await getUserProfile();
    const userDescription = createUserDescription(userProfile);
    const prompt = `ANA GÖREV: Aşağıdaki olay akışını analiz ederek ${days} günlük, bütünsel bir ruh hali raporu oluştur.\n\nÖNEMLİ KURAL: "Veri yetersiz" deme. Sana verilen olaylar arasındaki GERÇEK bağlantıları kurarak mümkün olan en iyi analizi yap.\n\nKULLANICI BİLGİLERİ: ${userDescription}\n\nKAYNAK VERİLER (Olay Akışı):\n${JSON.stringify(events, null, 2)}\n\nRAPOR YAPISI: Aşağıdaki 4 başlığı kullan.\n\nGenel Bakış\n...\nDuygusal Dalgalanmalar\n...\nTetikleyici Analizi\n...\nKişiye Özel Tavsiyeler\n...\n\n!! FORMATLAMA KURALLARI: SADECE DÜZ METİN kullan, Markdown kullanma. Başlıkları yazdıktan sonra alt satıra geç. Her bölümde fikirleri yeni paragraflarla ayır. Kullanıcıya "${userProfile?.nickname || 'değerli kullanıcı'}" ismiyle hitap et.`.trim();
    return await llmForSmartestTasks(prompt, 800);
}