import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/* ──────────────────────────────────────────────────────────────────────────
 * useGemini.ts  ·  v2.6   (strict-3-sentences + dynamic goals)
 * therapy. React-Native uygulaması için Gemini yardımcıları
 * ──────────────────────────────────────────────────────────────────────── */

/* 1 · Runtime ─────────────────────────────────────────────────────────── */
const KEY   = Constants.expoConfig?.extra?.GEMINI_API_KEY as string;
const MODEL = 'gemini-1.5-pro-latest';          // gerekirse 2.0-flash’a geç
const TEMP  = 0.75;

/* 2 · Low-level fetch ─────────────────────────────────────────────────── */
async function llm(prompt: string, maxTokens = 120) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: TEMP, topP: 0.9, maxOutputTokens: maxTokens },
  };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    return j?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Cevap alınamadı.';
  } catch (e) {
    console.error('Gemini hata:', e);
    return 'Sunucu hatası.';
  }
}

/* 3 · Profil yardımcıları ─────────────────────────────────────────────── */
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

/* 4 · Geçmiş azaltıcı ─────────────────────────────────────────────────── */
function compress(hist = '', keep = 6) {
  return hist
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-keep)
    .map((l, i) => `${i % 2 === 0 ? 'user:' : 'assistant:'} ${l.replace(/^[DT]:\s*/, '')}`)
    .join('\n');
}

/* 5 · Terapist tanımı ─────────────────────────────────────────────────── */
const THERAPISTS = {
  therapist1: { persona: 'Dr. Elif — şefkatli Klinik Psikolog', tech: 'Duygu-odaklı destek' },
  therapist3: { persona: 'Dr. Lina — enerjik BDT uzmanı', tech: 'CBT + Pozitif psikoloji' },
  coach1:     { persona: 'Coach Can — aksiyon odaklı koç', tech: 'Motivational coaching' },
} as const;
type TID = keyof typeof THERAPISTS;

/* 6 · Mikro-hedef mantığı ─────────────────────────────────────────────── */
const GOALS = [
  'Danışanın şu anki deneyimini adlandırmasına yardım et.',
  'Düşünce-duygu bağını görünür kıl; otomatik düşünceyi yakala.',
  'Küçük bir davranış deneyi öner; olası engeli sor.',
  'İçsel eleştirmene şefkat sesi bulmasına rehberlik et.',
];
function nextGoal(turn: number, userMsg: string) {
  if (/sık|yeter/i.test(userMsg))          return 'Konuyu hafiflet, sohbeti kullanıcının seçtiği bir alana yönlendir.';
  if (/duygu/i.test(userMsg) && /istem/i.test(userMsg))
    return '“Duygu” kelimesini kullanmadan, beden duyumları veya düşünce ayrıştırmasıyla ilerle.';
  return GOALS[(turn - 1) % GOALS.length];
}

/* 7 · Prompt oluşturucu ──────────────────────────────────────────────── */
function buildPrompt(p: {
  id: TID; turn: number; profile: string; hist: string; userMsg: string; mood: string;
}) {
  const t = THERAPISTS[p.id] ?? THERAPISTS.therapist1;
  const riskWords = /(intihar|ölmek|zarar|kendimi)/i;
  const ethicLine = riskWords.test(p.userMsg)
    ? 'Kriz sezilirse profesyonel yardım öner.'
    : 'Etik: tanı & reçete verme.';
  const personaLine = p.turn === 1 ? `${t.persona}. Yaklaşım: ${t.tech}.` : t.persona;
  return `
${p.profile && p.turn % 3 === 1 ? `Danışan profili: ${p.profile}` : ''}
${personaLine}
${ethicLine}
${p.hist ? `Geçmiş:\n${p.hist}` : ''}
Son mesaj: "${p.userMsg}"

Terapi hedefi: ${nextGoal(p.turn, p.userMsg)}
Görev: Tam **3 cümle** yaz — 1) anlayış 2) içgörü/öneri 3) açık-uçlu soru.
Aynı cümleyi kelimesi kelimesine tekrarlama.`.trim();
}

function strictThree(txt: string) {
  const sent = txt.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  return sent.join(' ').trim();
}

/* 8 · Genel üretici ───────────────────────────────────────────────────── */
export async function generateTherapistReply(
  tid: TID,
  userMsg: string,
  mood = '',
  history = '',
  turn = 1,
) {
  const profile = profileDesc(await getProfile());
  const prompt  = buildPrompt({
    id: tid, turn, profile, hist: compress(history), userMsg, mood,
  });
  console.log('🧠 prompt\n', prompt);

  const raw = await llm(prompt);
  return strictThree(raw);
}

/* 9 · Daily reflection (≤2 cümle) ─────────────────────────────────────── */
export async function generateDailyReflectionResponse(note: string, mood: string) {
  const prof = profileDesc(await getProfile());
  const p = `${prof ? prof + '\n' : ''}Ruh hâli: ${mood}. Not: "${note}". 1–2 cümlelik samimi, motive edici yanıt ver.`;
  return strictThree(await llm(p, 60));
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
