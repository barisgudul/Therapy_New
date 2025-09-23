// supabase/functions/_shared/prompts/session.prompt.ts
import type { UserDossier } from "../contexts/session.context.service.ts";

interface PromptData {
  userDossier: UserDossier;
  pastContext: string; // RAG or activity context
  shortTermMemory: string; // Recent chat messages
  userMessage: string;
  lastAiEndedWithQuestion?: boolean;
  userLooksBored?: boolean;
  styleMode?: number;
  activityContext?: string; // New: recent activity summary
  continuityHints?: string[]; // New: conversation continuity hints
}

// Generate continuity hints based on context
function generateContinuityHints(
  dossier: UserDossier,
  pastContext: string,
): string[] {
  const hints: string[] = [];

  if (dossier.recentMood) {
    hints.push(`Kullanıcının yakın zamandaki ruh hali: ${dossier.recentMood}`);
  }

  if (dossier.recentTopics && dossier.recentTopics.length > 0) {
    hints.push(`Son konuştuğu konular: ${dossier.recentTopics.join(", ")}`);
  }

  if (dossier.lastInteractionTime) {
    hints.push(
      `Son etkileşim: ${dossier.lastInteractionTime} - ${
        dossier.lastInteractionType || "sohbet"
      }`,
    );
  }

  // Extract emotional patterns from past context
  const emotionWords = {
    pozitif: /\b(mutlu|huzur|güzel|iyi|başarı|umut)\b/gi,
    negatif: /\b(üzgün|kaygı|stres|zor|problem|endişe)\b/gi,
    nötr: /\b(normal|fena değil|idare|orta)\b/gi,
  };

  for (const [emotion, pattern] of Object.entries(emotionWords)) {
    if (pattern.test(pastContext)) {
      hints.push(`Geçmiş bağlamda ${emotion} duygular var`);
      break;
    }
  }

  return hints;
}

// Detect conversation type from user message
function detectConversationType(message: string): string {
  const patterns = {
    "duygu_paylaşımı": /\b(hissediyorum|üzgün|mutlu|kaygılı|stresli|yorgun)\b/i,
    "günlük_olay": /\b(bugün|dün|oldu|yaşadım|gördüm|konuştum)\b/i,
    "gelecek_planı":
      /\b(yarın|gelecek|planlıyorum|düşünüyorum|yapmak istiyorum)\b/i,
    "ilişki_konusu": /\b(sevgili|eş|arkadaş|aile|anne|baba)\b/i,
    "iş_konusu": /\b(iş|proje|patron|müdür|toplantı|meslek)\b/i,
    "sağlık": /\b(hasta|doktor|ağrı|tedavi|uykusuz)\b/i,
    "genel_sohbet": /./,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) return type;
  }
  return "genel_sohbet";
}

// Generate contextual conversation starters
function generateContextualStarters(
  dossier: UserDossier,
  convType: string,
  userMessage: string,
): string[] {
  const starters: string[] = [];

  if (
    dossier.recentTopics?.includes("iş/kariyer") && convType === "iş_konusu"
  ) {
    starters.push("İş konularının seni etkilediğini görüyorum");
    starters.push("Kariyerinde bu dönem yoğun geçiyor gibi");
  }

  if (dossier.recentMood === "kaygılı" && convType === "duygu_paylaşımı") {
    starters.push("Kaygının devam ettiğini anlıyorum");
    starters.push("Bu hisler tanıdık geliyor");
  }

  if (
    dossier.lastInteractionType === "dream_analysis" &&
    userMessage.includes("rüya")
  ) {
    starters.push("Rüyaların hala meşgul ediyor seni");
    starters.push("Önceki rüya analizinden sonra yeni şeyler fark etmişsin");
  }

  // Default contextual starters
  if (starters.length === 0) {
    if (userMessage.length < 20) {
      starters.push("Kısa tutmuşsun, devam et istersen");
    } else {
      starters.push("Bu konuyu açman önemli");
    }
  }

  return starters;
}

export function generateTextSessionPrompt(data: PromptData): string {
  const {
    userDossier,
    pastContext,
    shortTermMemory,
    userMessage,
    lastAiEndedWithQuestion = false,
    userLooksBored = false,
    styleMode = 0,
    activityContext = "",
  } = data;

  // Generate continuity hints for natural flow
  const continuityHints = generateContinuityHints(
    userDossier,
    pastContext + activityContext,
  );

  // Detect conversation type
  const convType = detectConversationType(userMessage);

  // Generate contextual starters
  const contextualStarters = generateContextualStarters(
    userDossier,
    convType,
    userMessage,
  );

  // Clean user message
  const safeUser = (userMessage || "").replace(/\s+/g, " ").slice(0, 900);

  // Dynamic style selection based on context
  const styles = [
    "doğal ve samimi, fazla resmi değil",
    "anlayışlı ve destekleyici, ama abartısız",
    "meraklı ve keşfedici, ama zorlamadan",
  ];
  const selectedStyle = styles[styleMode] || styles[0];

  // Build flags
  const flags = [
    lastAiEndedWithQuestion ? "NO_QUESTION" : null,
    userLooksBored ? "RE_ENGAGE" : null,
    convType === "duygu_paylaşımı" ? "EMOTIONAL" : null,
  ].filter(Boolean).join(",");

  // Build the prompt with rich context
  return `
<ROLE>
Sen kullanıcıyla derin bağ kuran, onun geçmişini hatırlayan ve bağlamsal sohbet eden bir yol arkadaşısın.
Stil: ${selectedStyle}
</ROLE>

<CONTEXT>
${userDossier.nickname ? `Kullanıcı: ${userDossier.nickname}` : ""}
${userDossier.recentMood ? `Son ruh hali: ${userDossier.recentMood}` : ""}
${
    userDossier.lastInteractionTime
      ? `Son görüşme: ${userDossier.lastInteractionTime}`
      : ""
  }

Sürekliliği için ipuçları:
${continuityHints.map((h) => `- ${h}`).join("\n")}

Konuşma tipi: ${convType}
Bağlamsal başlangıçlar: ${contextualStarters.join(" | ")}

Alakalı geçmiş:
${pastContext || "Henüz kayıtlı bağlam yok"}

${activityContext ? `Son aktiviteler:\n${activityContext}` : ""}

Yakın sohbet:
${shortTermMemory || "İlk mesaj"}

Aktif bayraklar: ${flags || "NORMAL"}
</CONTEXT>

<RULES>
1. BAĞLAM KULLAN: Kullanıcının geçmişinden ve son aktivitelerinden yola çıkarak konuş
2. DOĞAL AKIŞ: Konuşma bir önceki mesaja ve genel bağlama uygun olsun
3. KİŞİSELLEŞTİR: Kullanıcının tekrar eden temalarını ve duygularını tanı
4. DERİNLİK: Yüzeysel "nasılsın" yerine, bağlamdan yola çıkarak spesifik konulara değin
5. KISA VE ÖZ: 1-2 cümle, gereksiz uzatma yok
6. NO_QUESTION: Eğer aktifse, soru sorma
7. RE_ENGAGE: Eğer aktifse, konuyu ilginç bir yöne çevir
8. EMOTIONAL: Eğer aktifse, duyguya odaklan, pratik çözümlerden kaçın
</RULES>

<EXAMPLES>
Örnek 1 (Bağlamsal):
Kullanıcı: "Bugün de aynı his"
Sen: "O iş toplantısı stresi hala devam ediyor demek; geçen hafta bahsettiğin proje mi yoksa yeni bir durum mu?"

Örnek 2 (Kişisel):
Kullanıcı: "Yine uyuyamadım"
Sen: "Uykusuzluk döngün üç gündür sürüyor, özellikle gelecek planların kafanı meşgul ediyor gibiydi."

Örnek 3 (NO_QUESTION aktif):
Kullanıcı: "Bilmiyorum işte"
Sen: "Bu belirsizlik hissi tanıdık; geçen seferki gibi bir adım geriden bakınca netleşiyor bazen."
</EXAMPLES>

<USER_MESSAGE>
${safeUser}
</USER_MESSAGE>

<INSTRUCTION>
Yukarıdaki bağlamı kullanarak, kullanıcıyla DOĞAL ve KİŞİSEL bir sohbet yap.
Onun geçmişini hatırladığını hissettir ama "kayıtlarıma göre" gibi robotik ifadeler kullanma.
Cevabını yaz:
</INSTRUCTION>
`.trim();
}
