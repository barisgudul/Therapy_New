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
  language: string,
): string[] {
  const hints: string[] = [];

  if (dossier.recentMood) {
    const line = language === "en"
      ? `User's recent mood: ${dossier.recentMood}`
      : language === "de"
      ? `Jüngste Stimmung des Nutzers: ${dossier.recentMood}`
      : `Kullanıcının yakın zamandaki ruh hali: ${dossier.recentMood}`;
    hints.push(line);
  }

  if (dossier.recentTopics && dossier.recentTopics.length > 0) {
    const line = language === "en"
      ? `Recent topics: ${dossier.recentTopics.join(", ")}`
      : language === "de"
      ? `Kürzliche Themen: ${dossier.recentTopics.join(", ")}`
      : `Son konuştuğu konular: ${dossier.recentTopics.join(", ")}`;
    hints.push(line);
  }

  if (dossier.lastInteractionTime) {
    const line = language === "en"
      ? `Last interaction: ${dossier.lastInteractionTime} - ${
        dossier.lastInteractionType || "chat"
      }`
      : language === "de"
      ? `Letzte Interaktion: ${dossier.lastInteractionTime} - ${
        dossier.lastInteractionType || "Chat"
      }`
      : `Son etkileşim: ${dossier.lastInteractionTime} - ${
        dossier.lastInteractionType || "sohbet"
      }`;
    hints.push(line);
  }

  // Extract emotional patterns from past context
  const emotionWords = language === "en"
    ? {
      positive: /\b(happy|peace|nice|good|success|hope)\b/gi,
      negative: /\b(sad|anxiety|stress|hard|problem|worry)\b/gi,
      neutral: /\b(normal|so so|okay|average)\b/gi,
    }
    : language === "de"
    ? {
      positiv: /\b(glücklich|ruhe|schön|gut|erfolg|hoffnung)\b/gi,
      negativ: /\b(traurig|angst|stress|schwer|problem|sorge)\b/gi,
      neutral: /\b(normal|geht so|okay|durchschnittlich)\b/gi,
    }
    : {
      pozitif: /\b(mutlu|huzur|güzel|iyi|başarı|umut)\b/gi,
      negatif: /\b(üzgün|kaygı|stres|zor|problem|endişe)\b/gi,
      nötr: /\b(normal|fena değil|idare|orta)\b/gi,
    };

  for (const [emotion, pattern] of Object.entries(emotionWords)) {
    if (pattern.test(pastContext)) {
      const line = language === "en"
        ? `There are ${emotion} emotions in the past context`
        : language === "de"
        ? `Im vergangenen Kontext gibt es ${emotion}e Emotionen`
        : `Geçmiş bağlamda ${emotion} duygular var`;
      hints.push(line);
      break;
    }
  }

  return hints;
}

// Detect conversation type from user message
function detectConversationType(message: string, language: string): string {
  const patterns = language === "en"
    ? {
      emotion_share: /\b(feel|sad|happy|anxious|stressed|tired)\b/i,
      daily_event: /\b(today|yesterday|happened|saw|talked|met)\b/i,
      future_plan: /\b(tomorrow|future|plan|thinking|want to do)\b/i,
      relationship: /\b(partner|spouse|friend|family|mother|father)\b/i,
      work: /\b(work|project|boss|manager|meeting|job)\b/i,
      health: /\b(ill|doctor|pain|treatment|insomnia)\b/i,
      general: /./,
    }
    : language === "de"
    ? {
      gefuehl: /\b(ich fühle|traurig|glücklich|ängstlich|gestresst|müde)\b/i,
      alltag: /\b(heute|gestern|passierte|sah|sprach|traf)\b/i,
      zukunft: /\b(morgen|zukunft|plan|denke|tun möchte)\b/i,
      beziehung: /\b(partner|ehepartner|freund|familie|mutter|vater)\b/i,
      arbeit: /\b(arbeit|projekt|chef|leiter|meeting|job)\b/i,
      gesundheit: /\b(krank|arzt|schmerz|behandlung|schlaflos)\b/i,
      allgemein: /./,
    }
    : {
      "duygu_paylaşımı":
        /\b(hissediyorum|üzgün|mutlu|kaygılı|stresli|yorgun)\b/i,
      "günlük_olay": /\b(bugün|dün|oldu|yaşadım|gördüm|konuştum)\b/i,
      "gelecek_planı":
        /\b(yarın|gelecek|planlıyorum|düşünüyorum|yapmak istiyorum)\b/i,
      "ilişki_konusu": /\b(sevgili|eş|arkadaş|aile|anne|baba)\b/i,
      "iş_konusu": /\b(iş|proje|patron|müdür|toplantı|meslek)\b/i,
      "sağlık": /\b(hasta|doktor|ağrı|tedavi|uykusuz)\b/i,
      "genel_sohbet": /./,
    } as Record<string, RegExp>;

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) return type;
  }
  return language === "en"
    ? "general"
    : language === "de"
    ? "allgemein"
    : "genel_sohbet";
}

// Generate contextual conversation starters
function generateContextualStarters(
  dossier: UserDossier,
  convType: string,
  userMessage: string,
  language: string,
): string[] {
  const starters: string[] = [];

  if (
    dossier.recentTopics?.includes("iş/kariyer") &&
    (convType === "iş_konusu" || convType === "work")
  ) {
    starters.push(
      language === "en"
        ? "Work issues seem to be affecting you"
        : language === "de"
        ? "Arbeitsthemen scheinen dich zu beschäftigen"
        : "İş konularının seni etkilediğini görüyorum",
    );
    starters.push(
      language === "en"
        ? "Your career looks intense these days"
        : language === "de"
        ? "Deine Karriere wirkt derzeit intensiv"
        : "Kariyerinde bu dönem yoğun geçiyor gibi",
    );
  }

  if (
    dossier.recentMood === "kaygılı" &&
    (convType === "duygu_paylaşımı" || convType === "emotion_share")
  ) {
    starters.push(
      language === "en"
        ? "I understand your anxiety continues"
        : language === "de"
        ? "Ich verstehe, deine Angst hält an"
        : "Kaygının devam ettiğini anlıyorum",
    );
    starters.push(
      language === "en"
        ? "These feelings sound familiar"
        : language === "de"
        ? "Diese Gefühle kommen mir bekannt vor"
        : "Bu hisler tanıdık geliyor",
    );
  }

  if (
    dossier.lastInteractionType === "dream_analysis" &&
    (userMessage.includes("rüya") ||
      userMessage.toLowerCase().includes("dream") ||
      userMessage.toLowerCase().includes("traum"))
  ) {
    starters.push(
      language === "en"
        ? "Your dreams are still on your mind"
        : language === "de"
        ? "Deine Träume beschäftigen dich weiterhin"
        : "Rüyaların hala meşgul ediyor seni",
    );
    starters.push(
      language === "en"
        ? "Seems you've noticed new things since the last dream analysis"
        : language === "de"
        ? "Seit der letzten Traumanalyse scheinst du Neues bemerkt zu haben"
        : "Önceki rüya analizinden sonra yeni şeyler fark etmişsin",
    );
  }

  // Default contextual starters
  if (starters.length === 0) {
    if (userMessage.length < 20) {
      starters.push(
        language === "en"
          ? "You kept it short, feel free to continue"
          : language === "de"
          ? "Du hast dich kurz gefasst, mach gern weiter"
          : "Kısa tutmuşsun, devam et istersen",
      );
    } else {
      starters.push(
        language === "en"
          ? "It's important that you brought this up"
          : language === "de"
          ? "Es ist wichtig, dass du dieses Thema ansprichst"
          : "Bu konuyu açman önemli",
      );
    }
  }

  return starters;
}

export function generateTextSessionPrompt(
  data: PromptData,
  language: string = "tr",
): string {
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
    language,
  );

  // Detect conversation type
  const convType = detectConversationType(userMessage, language);

  // Generate contextual starters
  const contextualStarters = generateContextualStarters(
    userDossier,
    convType,
    userMessage,
    language,
  );

  // Clean user message
  const safeUser = (userMessage || "").replace(/\s+/g, " ").slice(0, 900);

  // Dynamic style selection based on context
  const styles = language === "en"
    ? [
      "natural and friendly, not too formal",
      "empathetic and supportive, without exaggeration",
      "curious and exploratory, without pushing",
    ]
    : language === "de"
    ? [
      "natürlich und freundlich, nicht zu formell",
      "einfühlsam und unterstützend, ohne Übertreibung",
      "neugierig und erkundend, ohne zu drängen",
    ]
    : [
      "doğal ve samimi, fazla resmi değil",
      "anlayışlı ve destekleyici, ama abartısız",
      "meraklı ve keşfedici, ama zorlamadan",
    ];
  const selectedStyle = styles[styleMode] || styles[0];

  // Build flags
  const flags = [
    lastAiEndedWithQuestion ? "NO_QUESTION" : null,
    userLooksBored ? "RE_ENGAGE" : null,
    (convType === "duygu_paylaşımı" || convType === "emotion_share")
      ? "EMOTIONAL"
      : null,
  ].filter(Boolean).join(",");

  // Build the prompt with rich context
  const lang = ["tr", "en", "de"].includes(language) ? language : "en";

  type LocalizedBundle = {
    role: string;
    contextUser: string;
    recentMood: string;
    lastMeeting: string;
    continuity: string;
    convType: string;
    starters: string;
    relevantPast: string;
    noContext: string;
    recentActivity: string;
    recentChat: string;
    firstMsg: string;
    flags: string;
    rules: string[];
    examples: string[];
    instruction: string;
  };

  const bundles: Record<"tr" | "en" | "de", LocalizedBundle> = {
    tr: {
      role:
        "Sen kullanıcıyla derin bağ kuran, onun geçmişini hatırlayan ve bağlamsal sohbet eden bir yol arkadaşısın.",
      contextUser: "Kullanıcı",
      recentMood: "Son ruh hali",
      lastMeeting: "Son görüşme",
      continuity: "Sürekliliği için ipuçları:",
      convType: "Konuşma tipi",
      starters: "Bağlamsal başlangıçlar",
      relevantPast: "Alakalı geçmiş:",
      noContext: "Henüz kayıtlı bağlam yok",
      recentActivity: "Son aktiviteler:",
      recentChat: "Yakın sohbet:",
      firstMsg: "İlk mesaj",
      flags: "Aktif bayraklar",
      rules: [
        "BAĞLAM KULLAN: Kullanıcının geçmişinden ve son aktivitelerinden yola çıkarak konuş",
        "DOĞAL AKIŞ: Konuşma bir önceki mesaja ve genel bağlama uygun olsun",
        "KİŞİSELLEŞTİR: Kullanıcının tekrar eden temalarını ve duygularını tanı",
        'DERİNLİK: Yüzeysel "nasılsın" yerine, bağlamdan yola çıkarak spesifik konulara değin',
        "KISA VE ÖZ: 1-2 cümle, gereksiz uzatma yok",
        "NO_QUESTION: Eğer aktifse, soru sorma",
        "RE_ENGAGE: Eğer aktifse, konuyu ilginç bir yöne çevir",
        "EMOTIONAL: Eğer aktifse, duyguya odaklan, pratik çözümlerden kaçın",
        "ÇIKTI DİLİ: Yanıt dili Türkçe olmalı",
      ],
      examples: [
        'Örnek 1 (Bağlamsal):\nKullanıcı: "Bugün de aynı his"\nSen: "O iş toplantısı stresi hala devam ediyor demek; geçen hafta bahsettiğin proje mi yoksa yeni bir durum mu?"',
        'Örnek 2 (Kişisel):\nKullanıcı: "Yine uyuyamadım"\nSen: "Uykusuzluk döngün üç gündür sürüyor, özellikle gelecek planların kafanı meşgul ediyor gibiydi."',
        'Örnek 3 (NO_QUESTION aktif):\nKullanıcı: "Bilmiyorum işte"\nSen: "Bu belirsizlik hissi tanıdık; geçen seferki gibi bir adım geriden bakınca netleşiyor bazen."',
      ],
      instruction:
        'Yukarıdaki bağlamı kullanarak, kullanıcıyla DOĞAL ve KİŞİSEL bir sohbet yap. Onun geçmişini hatırladığını hissettir ama "kayıtlarıma göre" gibi robotik ifadeler kullanma. Cevabını yaz:',
    },
    en: {
      role:
        "You are a companion who builds deep rapport, remembers the user's past, and chats contextually.",
      contextUser: "User",
      recentMood: "Recent mood",
      lastMeeting: "Last interaction",
      continuity: "Continuity hints:",
      convType: "Conversation type",
      starters: "Contextual starters",
      relevantPast: "Relevant past:",
      noContext: "No recorded context yet",
      recentActivity: "Recent activities:",
      recentChat: "Recent chat:",
      firstMsg: "First message",
      flags: "Active flags",
      rules: [
        "USE CONTEXT: Speak using the user's past and recent activities",
        "NATURAL FLOW: Align with the last message and overall context",
        "PERSONALIZE: Recognize recurring themes and emotions",
        'DEPTH: Go specific based on context instead of superficial "how are you"',
        "BRIEF: 1-2 sentences, no unnecessary length",
        "NO_QUESTION: If active, do not ask a question",
        "RE_ENGAGE: If active, steer the topic in an engaging direction",
        "EMOTIONAL: If active, focus on feelings, avoid practical fixes",
        "OUTPUT LANGUAGE: Response must be in English",
      ],
      examples: [
        'Example 1 (Contextual):\nUser: "Same feeling today"\nYou: "So the stress from that work meeting is still there; was it the project you mentioned last week or something new?"',
        'Example 2 (Personal):\nUser: "I couldn’t sleep again"\nYou: "Your sleepless cycle has lasted three days, and your future plans seemed to occupy your mind."',
        'Example 3 (NO_QUESTION active):\nUser: "I don’t know"\nYou: "That sense of uncertainty is familiar; sometimes taking a step back brings clarity."',
      ],
      instruction:
        "Using the above context, have a NATURAL and PERSONAL conversation. Show that you remember their past without robotic phrases like 'according to my records'. Write your reply:",
    },
    de: {
      role:
        "Du bist ein Begleiter, der tiefes Vertrauen aufbaut, sich an die Vergangenheit des Nutzers erinnert und kontextuell spricht.",
      contextUser: "Nutzer",
      recentMood: "Jüngste Stimmung",
      lastMeeting: "Letzte Interaktion",
      continuity: "Hinweise zur Kontinuität:",
      convType: "Gesprächstyp",
      starters: "Kontextuelle Einstiege",
      relevantPast: "Relevante Vergangenheit:",
      noContext: "Noch kein aufgezeichneter Kontext",
      recentActivity: "Jüngste Aktivitäten:",
      recentChat: "Jüngster Chat:",
      firstMsg: "Erste Nachricht",
      flags: "Aktive Flags",
      rules: [
        "KONTEXT NUTZEN: Sprich anhand der Vergangenheit und der jüngsten Aktivitäten des Nutzers",
        "NATÜRLICHER FLUSS: Passe dich der letzten Nachricht und dem Gesamtzusammenhang an",
        "PERSONALISIEREN: Erkenne wiederkehrende Themen und Emotionen",
        'TIEFE: Gehe kontextspezifisch vor statt oberflächlichem "Wie geht\'s"',
        "KURZ: 1-2 Sätze, keine unnötige Länge",
        "NO_QUESTION: Wenn aktiv, keine Frage stellen",
        "RE_ENGAGE: Wenn aktiv, das Thema ansprechend weiterführen",
        "EMOTIONAL: Wenn aktiv, auf Gefühle fokussieren, praktische Lösungen vermeiden",
        "AUSGABESPRACHE: Antwort muss auf Deutsch sein",
      ],
      examples: [
        'Beispiel 1 (Kontextuell):\nNutzer: "Heute dasselbe Gefühl"\nDu: "Der Stress aus dieser Besprechung ist also noch da; war es das Projekt von letzter Woche oder etwas Neues?"',
        'Beispiel 2 (Persönlich):\nNutzer: "Ich konnte wieder nicht schlafen"\nDu: "Dein Schlaflosigkeitszyklus dauert seit drei Tagen an, und deine Zukunftspläne scheinen deinen Kopf zu beschäftigen."',
        'Beispiel 3 (NO_QUESTION aktiv):\nNutzer: "Ich weiß nicht"\nDu: "Dieses Gefühl der Ungewissheit ist vertraut; manchmal schafft ein Schritt zurück Klarheit."',
      ],
      instruction:
        "Nutze den obigen Kontext für ein NATÜRLICHES und PERSÖNLICHES Gespräch. Zeige, dass du dich erinnerst, ohne robotische Phrasen wie 'laut meinen Aufzeichnungen'. Schreibe deine Antwort:",
    },
  };

  const L: LocalizedBundle = bundles[lang as "tr" | "en" | "de"];

  return `
<ROLE>
${L.role}
Stil / Style: ${selectedStyle}
</ROLE>

<CONTEXT>
${userDossier.nickname ? `${L.contextUser}: ${userDossier.nickname}` : ""}
${userDossier.recentMood ? `${L.recentMood}: ${userDossier.recentMood}` : ""}
${
    userDossier.lastInteractionTime
      ? `${L.lastMeeting}: ${userDossier.lastInteractionTime}`
      : ""
  }

${L.continuity}
${continuityHints.map((h) => `- ${h}`).join("\n")}

${L.convType}: ${convType}
${L.starters}: ${contextualStarters.join(" | ")}

${L.relevantPast}
${pastContext || L.noContext}

${activityContext ? `${L.recentActivity}\n${activityContext}` : ""}

${L.recentChat}
${shortTermMemory || L.firstMsg}

${L.flags}: ${flags || "NORMAL"}
</CONTEXT>

<RULES>
${L.rules.map((r) => `- ${r}`).join("\n")}
</RULES>

<EXAMPLES>
${L.examples.join("\n\n")}
</EXAMPLES>

<USER_MESSAGE>
${safeUser}
</USER_MESSAGE>

<INSTRUCTION>
${L.instruction}
</INSTRUCTION>
`.trim();
}
