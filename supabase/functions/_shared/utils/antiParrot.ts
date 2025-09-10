// supabase/functions/_shared/utils/antiParrot.ts
import { invokeGemini } from "../ai.service.ts";
import { config, LLM_LIMITS } from "../config.ts";

// ---- Yardımcılar ----
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[’‘]/g, "'") // tek tırnak çeşitleri
    .replace(/[“”„«»‹›]/g, '"') // çift tırnak çeşitleri
    .replace(/\s+/g, " ")
    .trim();
}

// En uzun ortak KELİME dizisi (Longest Common Substring by words)
function longestCommonWordRun(a: string, b: string): number {
  // Performans için çok uzun metinleri 150 kelime ile sınırla
  const capWords = (s: string, n = 150) => s.split(/\s+/).slice(0, n).join(" ");
  const aCapped = capWords(norm(a));
  const bCapped = capWords(norm(b));

  const A = aCapped.split(" ");
  const B = bCapped.split(" ");
  const dp: number[][] = Array(A.length + 1).fill(0).map(() =>
    Array(B.length + 1).fill(0)
  );
  let best = 0;
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      if (A[i - 1] === B[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best) {
          best = dp[i][j];
          // Erken çıkış optimizasyonu - eşik 5'ten büyükse yeterli
          if (best >= 5) return best;
        }
      }
    }
  }
  return best;
}

// Basit trigram Jaccard
function jaccardTrigram(a: string, b: string): number {
  const grams = (s: string) => {
    const x = norm(s);
    const arr: string[] = [];
    for (let i = 0; i < Math.max(0, x.length - 2); i++) {
      arr.push(x.slice(i, i + 3));
    }
    return new Set(arr);
  };
  const A = grams(a), B = grams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

// ---- Kurallar ----
// Unicode sorununu önlemek için daha kaba ama sağlam regex
const QUOTE_OR_REPHRASE_OPENERS = [
  /(^|\n)\s*[^"\n]{0,40}"[^"]{3,}"\s*(demişsin|söylemişsin|yazmışsın|diyorsun)/i,
];

const CLICHE_PATTERNS = [
  /nasıl hissett(iriyor|i|in|iyorsun)/i,
  /nasıl bir duygu\??/i,
  /daha (fazla )?detay(anlat|landır| vere)bilir misin/i,
  /bunu biraz (açar mısın|açabilir misin)/i,
  /paylaştığın için teşekkürler/i,
  /bu (oldukça|epey) güçlü bir ifade/i,
  /hisset(tiğini|tiklerini) (anlıyorum|duyuyorum)/i,
  /önceki konuşmalarımızda/i,
];

const BORING_PATTERNS = [
  /\bhangi (aşamasında|kısmı|sayfalar)\b/i,
  /\bmerak ettim\b/i,
  /^\s*anladım[.!]?\s*$/i,
];

function isBoring(text: string) {
  if (!text) return false;
  const onlyQuestion = text.trim().split(/\s+/).length <= 4 &&
    /[?؟]$/.test(text.trim());
  return BORING_PATTERNS.some((re) => re.test(text)) || onlyQuestion;
}

export function hasCliches(text: string): boolean {
  if (!text) return false;
  return CLICHE_PATTERNS.some((re) => re.test(text));
}

export function looksParroty(userMsg: string, aiReply: string): boolean {
  if (!userMsg || !aiReply) return false;
  const u = norm(userMsg);
  const r = norm(aiReply);

  // 1) Tırnak içinde alıntı/“demişsin” benzeri açılışlar -> doğrudan papağan
  if (QUOTE_OR_REPHRASE_OPENERS.some((re) => re.test(r))) return true;

  // 2) Cümlede herhangi bir alıntı varsa (tırnak) -> papağan (koşulsuz)
  if (/"[^"]{3,}"/.test(r)) return true;

  // 3) 5+ kelimelik ortak dizi
  if (longestCommonWordRun(u, r) >= 5) return true;

  // 4) Trigram benzerliği (daha az agresif eşik)
  if (jaccardTrigram(u, r) >= 0.55) return true;

  return false;
}

export async function ensureNonParrotReply(
  userMsg: string,
  aiReply: string,
  opts?: { noQuestionTurn?: boolean; forbidPersonal?: boolean },
  transactionId?: string,
): Promise<string> {
  const askedAgain = /[?؟]\s*$/.test(aiReply.trim()) &&
    /[?؟]\s*$/.test(userMsg.trim());

  // kişisel yaşam iddiasını yakalayan kaba filtre
  const personalClaim =
    /\b(benim|bende|ben)\b.*\b(gün|günüm|bugün|iş|yoğun|program|plan)\b/i.test(
      aiReply,
    );

  const needRewrite = looksParroty(userMsg, aiReply) ||
    hasCliches(aiReply) ||
    askedAgain ||
    (opts?.forbidPersonal && personalClaim);

  let out = aiReply;

  // Boş/çöken yeniden-yazım için temel fallback
  out = (out || "").trim();
  if (!out) {
    const cleanUser = (userMsg || "").replace(/["'“”‘’]/g, "").slice(0, 160);
    return (cleanUser ? `Not aldım: ${cleanUser}.` : "Not aldım.") +
      " Buradan devam edelim mi, yoksa odağı daraltıp tek bir küçük adım seçelim?";
  }

  if (needRewrite) {
    const prompt = `
Cevabı daha doğal ve kısa yaz.
- Son tur soru ise bu tur **soru sorma**.
- Kişisel deneyim uydurma; "benim günüm/işim..." deme.
- LOW_ENERGY dışında A/B kullanma.
[KULLANICI]
${userMsg}
[ESKİ]
${aiReply}
[YENİ (1–2 cümle)]
`.trim();

    out = await invokeGemini(
      prompt,
      config.AI_MODELS.RESPONSE,
      { temperature: 0.6, maxOutputTokens: LLM_LIMITS.TEXT_SESSION_RESPONSE },
      transactionId,
      userMsg,
    );
  }

  // Sert post-process: noQuestionTurn ise soru işareti ile bitirme
  if (opts?.noQuestionTurn) out = out.replace(/[?؟]\s*$/, ".");

  // Sert post-process: kişisel yaşam izi kalmışsa pivotla
  if (
    opts?.forbidPersonal && /\b(ben|benim|bende)\b/i.test(out) &&
    /\b(gün|iş|bugün|yoğun)\b/i.test(out)
  ) {
    out =
      "Benim gündemim sabit; önemli olan seninki. İstersen kısa bir yerden başlayalım ya da konuyu değiştirelim.";
  }

  // İKİNCİ PAS + ZORUNLU ŞABLON EMNİYETİ
  // Model yeniden yazsa da hâlâ papağanlık varsa, güvenli şablona düş
  if (
    looksParroty(userMsg, out) || hasCliches(out) || isBoring(out) || askedAgain
  ) {
    const cleanUser = (userMsg || "").replace(/["'“”‘’]/g, "").slice(0, 160);
    // Daha bağlamsal ve yönlendirici güvenli cevap
    const base = cleanUser ? `Not aldım: ${cleanUser}.` : "Not aldım.";
    if (opts?.noQuestionTurn) {
      // Önceki tur soru ile bitti; bu tur soru yok.
      return base +
        " Buradan tek bir küçük adımı seçiyorum: önceki mesajındaki en belirgin duyguya bir ad ver.";
    }
    return base +
      " Buradan devam edelim mi, yoksa odağı daraltıp tek bir küçük adım seçelim?";
  }

  return out.trim();
}
