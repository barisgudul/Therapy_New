import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/* ──────────────────────────────────────────────────────────────────────────
 * useGemini.ts  ·  v3.0   (intelligent-goals + flexible-response)
 * therapy. React-Native uygulaması için Gemini yardımcıları
 * ──────────────────────────────────────────────────────────────────────── */

/* 1 · Runtime ─────────────────────────────────────────────────────────── */
const KEY   = Constants.expoConfig?.extra?.GEMINI_API_KEY as string;
const MODEL = 'gemini-1.5-pro-latest';
const TEMP  = 0.8; // Biraz daha yaratıcılık için sıcaklığı hafifçe artırabiliriz.

/* 2 · Low-level fetch ─────────────────────────────────────────────────── */
async function llm(prompt: string, maxTokens = 150) { // Max token'ı biraz artıralım, esneklik olsun.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMP, topP: 0.9, maxOutputTokens: maxTokens },
  };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) { // Hata durumunu daha iyi yönetelim
      const errorText = await r.text();
      console.error('Gemini API Hatası:', r.status, errorText);
      return 'Sunucu tarafında bir sorun oluştu.';
    }
    const j = await r.json();
    return j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'Cevap alınamadı, lütfen tekrar deneyin.';
  } catch (e) {
    console.error('Gemini Fetch Hatası:', e);
    return 'İletişim hatası, internet bağlantınızı kontrol edin.';
  }
}

/* 3 · Profil yardımcıları (Aynı kalabilir) ────────────────────────────── */
async function getProfile() {
  try { const s = await AsyncStorage.getItem('userProfile'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function profileDesc(u: any) {
  if (!u) return '';
  return [
    u.nickname   && `Adı: ${u.nickname}`,
    u.birthDate  && `Doğum: ${u.birthDate}`,
    u.profession && `Meslek: ${u.profession}`,
    u.expectation&& `Beklentisi: ${u.expectation}`,
  ].filter(Boolean).join(' · ');
}

/* 4 · Geçmiş azaltıcı (Aynı kalabilir) ─────────────────────────────────── */
function compress(hist = '', keep = 8) { // Biraz daha fazla geçmiş tutabiliriz
  return hist
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-keep)
    .join('\n'); // Prefix'leri (user:, assistant:) prompt içinde halledeceğiz
}

/* 5 · Terapist tanımı (Aynı kalabilir) ─────────────────────────────────── */
const THERAPISTS = {
  therapist1: { persona: 'Dr. Elif — şefkatli ve anlayışlı bir Klinik Psikolog', tech: 'Duygu-odaklı ve Bilişsel Davranışçı Terapi (BDT) tekniklerini harmanlayan' },
  therapist3: { persona: 'Dr. Lina — enerjik ve çözüm odaklı bir BDT uzmanı', tech: 'BDT ve Pozitif Psikoloji odaklı' },
  coach1:     { persona: 'Coach Can — motive edici ve aksiyon odaklı bir yaşam koçu', tech: 'Hedef belirleme ve motivasyonel koçluk' },
} as const;
type TID = keyof typeof THERAPISTS;


// ==========================================================================
// YENİ: AKILLI HEDEF BELİRLEME SİSTEMİ
// ==========================================================================
/* 6 · Akıllı hedef seçici ──────────────────────────────────────────────── */
const GOAL_OPTIONS = [
  'Danışanın ifade ettiği duyguyu yansıtarak geçerli kılmak.',
  'Bir düşünce tuzağını (otomatik düşünceyi) nazikçe sorgulamak.',
  'Konuyu derinleştirmek için güçlü, açık uçlu bir soru sormak.',
  'Pratik, küçük bir başa çıkma stratejisi veya bakış açısı önermek.',
  'Konuşmanın gidişatını danışanın belirlemesine izin vermek, alanı ona bırakmak.',
  'Bedensel duyumlara veya "şimdi ve burada" anına odaklanmasını teşvik etmek.',
  'Danışanın kendi gücünü veya başa çıkma becerisini fark etmesini sağlamak.',
];

async function selectNextGoal(history: string, userMsg: string): Promise<string> {
  const goalPrompt = `
Bir terapi seansının bir bölümü aşağıdadır.
Konuşma Geçmişi:
${history}

Danışanın Son Mesajı: "${userMsg}"

Aşağıdaki terapi hedeflerinden, bu konuşma için **en uygun olan BİR TANESİNİ** seç ve sadece o cümlenin kendisini yaz.

Seçenekler:
${GOAL_OPTIONS.join('\n- ')}
  `.trim();

  // Hedef seçimi için daha az yaratıcı, daha odaklı bir model çağrısı yapalım.
  const goal = await llm(goalPrompt, 40); 
  // Gelen cevabın listedeki seçeneklerden biri olduğundan emin olalım.
  return GOAL_OPTIONS.find(o => goal.includes(o)) || GOAL_OPTIONS[2]; // Bulamazsa varsayılan olarak soru sorsun.
}


/* 7 · Yeni Prompt Oluşturucu ───────────────────────────────────────────── */
async function buildPrompt(p: {
  id: TID; profile: string; hist: string; userMsg:string; mood: string;
}) {
  const t = THERAPISTS[p.id] ?? THERAPISTS.therapist1;
  const riskWords = /(intihar|ölmek|zarar|kendimi kesmek)/i;
  const ethicLine = riskWords.test(p.userMsg)
    ? 'ÖNEMLİ: Danışanın güvenliği risk altında olabilir. Sakin kalarak profesyonel bir uzmana (psikolog, psikiyatrist) veya acil yardım hatlarına (örn: 112) ulaşmasını şiddetle tavsiye et. Bu uygulamanın bir kriz müdahale aracı olmadığını belirt.'
    : 'Etik Kural: Asla tıbbi tanı koyma veya ilaç reçete etme. Sen bir terapi asistanısın.';

  // YENİ: Hedefi artık dinamik olarak modelin kendisi seçecek!
  const therapyGoal = await selectNextGoal(p.hist, p.userMsg);

  // Mood bilgisini daha etkili kullan
  const moodContext = p.mood ? `
Mood Bilgisi: Danışan seans öncesi "${p.mood}" ruh halinde olduğunu belirtti. Bu bilgiyi göz önünde bulundurarak:
- Eğer olumsuz bir mood ise, daha destekleyici ve anlayışlı ol
- Eğer olumlu bir mood ise, bu pozitifliği korumaya yardımcı ol
- Mood değişimlerini takip et ve gerekirse konuşmaya dahil et
` : '';

  return `
Senin Kimliğin: ${t.persona}. Yaklaşımın: ${t.tech}.
${p.profile ? `Danışan Profili: ${p.profile}` : ''}
${ethicLine}
${moodContext}

Konuşma Geçmişi:
${p.hist}
Danışan: "${p.userMsg}"

Gizli Görevin (Danışana Belli Etme): ${therapyGoal}

Yanıt Kuralları:
- Cevabın akıcı, samimi ve doğal bir dilde olsun. Robot gibi konuşma.
- 2 ila 4 cümle arasında, dengeli bir uzunlukta cevap ver.
- Asla danışanın son söylediğini kelimesi kelimesine tekrar etme (papağanlaşma).
- Cevabın sonunda her zaman açık uçlu bir soruyla topu danışana at.
`.trim();
}

/* 8 · Genel üretici (ARTIK ÇOK DAHA AKILLI) ────────────────────────────── */
export async function generateTherapistReply(
  tid: TID,
  userMsg: string,
  mood = '',
  history = '',
  turn = 1, // turn'ü hâlâ profil göstermek için kullanabiliriz.
) {
  const profile = profileDesc(await getProfile());
  const compressedHistory = compress(history);
  
  // DEĞİŞİKLİK: buildPrompt artık asenkron, bu yüzden await kullanmalıyız.
  const prompt = await buildPrompt({
    id: tid,
    profile: turn % 4 === 1 ? profile : '', // Profili her 4 turda bir hatırlatalım
    hist: compressedHistory,
    userMsg,
    mood,
  });
  console.log('🧠 YENİ AKILLI PROMPT\n', prompt);

  // DEĞİŞİKLİK: Artık `strictThree` yok! Modelin doğal çıktısını kullanıyoruz.
  return await llm(prompt);
}


/* 9 · Daily reflection (≤2 cümle) ─────────────────────────────────────── */
export async function generateDailyReflectionResponse(note: string, mood: string) {
  const prof = profileDesc(await getProfile());
  const p = `${prof ? prof + '\n' : ''}Ruh hâli: ${mood}. Not: "${note}". 1–2 cümlelik samimi, motive edici yanıt ver.`;
  return llm(p, 60);
}

/* 10 · İleri analiz fonksiyonları (özet, günlük analizi)  
 *      — ihtiyaç durumda önceki sürüm koduyla eklenebilir.            */


/* ==========================================================================
   10 · Detailed summary placeholder (özelleştirilebilir)
   ====================================================================== */
export async function generateDetailedMoodSummary(entries: any[], days: number) {
  const p = `Son ${days} günlük duygu analizi için 4 başlıkta (Genel, Dalgalanmalar, Tetikleyiciler, Öneriler) ≤500 kelime, konuşma dili, pozitif ton.`;
  return llm(p);
}

/* ==========================================================================
   11 · Diary analysis (JSON)
   ====================================================================== */
export interface DiaryAnalysis {
  feedback: string;
  questions: string[];
  mood: string;
  tags: string[];
}
export async function analyzeDiaryEntry(text: string): Promise<DiaryAnalysis> {
  const p = `Günlük: ${text}\n\nYanıtı tam JSON şablonuyla ver:{"mood":"...","tags":[],"feedback":"...","questions":[]}`;
  const raw = await llm(p, { model: MODEL, maxTokens: 120 } as any);
  try {
    return JSON.parse(raw.replace(/^```json\n?|```$/g, ''));
  } catch {
    return { feedback: 'Analiz yapılamadı.', questions: [], mood: 'neutral', tags: [] };
  }
}