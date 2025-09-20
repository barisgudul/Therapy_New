// services/prompt.service.ts
// Sessiz Kâhin için katı prompt üretimi

import { supabase } from "../utils/supabase";

export type OracleInputs = {
  dreamTheme: string; // örn: "Boğulma ve Kontrol Kaybı"
  pastLink: string; // örn: "Babanın kaybı ve abinle gerilim"
  blindSpot: string; // rapordaki ilgili cümle
  goldenThread: string; // rapordaki ana yön
};

export function buildSilentOraclePrompt(
  i: OracleInputs,
  language: string,
): string {
  const lang = ["tr", "en", "de"].includes(language) ? language : "en";

  const PROMPTS: Record<string, string> = {
    tr: `
ROL: Sen, veriler arasındaki derin bağlantıları anlayan ve bunları net, öz ve insancıl bir dille ifade eden bir analiz motorusun. Amaç: Kullanıcıya karmaşık verilerden damıtılmış, eyleme dönük içgörüler sunmak. Jargon yok. Uzatma yok.

Kurallar:
- Üç kısa cümle üret: f1, f2, f3. Sadece JSON döndür.
- f1: Geçmiş yankıyı tek cümlede söyle. Golden thread veya somut bağlantıya dayan.
- f2: Soru sorma. Net teşhis kur. Şablon: "Görmediğin şey şu: Bu [RÜYA_TEMASI], senin [KÖR_NOKTA] alışkanlığından besleniyor."
- f3: O gün yapılabilir tek bir mikro eylem öner. [GEÇMİŞ_BAĞLANTISI] ve [RÜYA_TEMASI] ile uyumlu olsun. Jenerik ifadelerden kaçın.
- İlişki barizse ad belirt (abi/kardeş/baba/anne), aksi halde "güvendiğin biri" de.
- ÇIKTI DİLİ: Türkçe olmalı.

Veriler:
[RÜYA_TEMASI]: ${i.dreamTheme}
[GEÇMİŞ_BAĞLANTISI]: ${i.pastLink}
[KÖR_NOKTA]: ${i.blindSpot}
[GOLDEN_THREAD]: ${i.goldenThread}

ÇIKTI (yalnızca JSON):
{
  "f1": "Bu his tanıdık... <golden thread veya bağlantıya dayalı vurucu cümle>",
  "f2": "Görmediğin şey şu: Bu <tema>, senin <kör nokta> alışkanlığından besleniyor.",
  "f3": "Atacağın adım: <tema ile uyumlu mikro eylem>"
}`.trim(),
    en: `
ROLE: You distill deep links between data into clear, human insights. Goal: deliver actionable insights in plain language.

Rules:
- Produce three short lines: f1, f2, f3. Return JSON only.
- f1: State the past echo in one sentence. Base it on the golden thread or a concrete link.
- f2: No questions. Clear statement. Template: "What you don’t see is this: This [DREAM_THEME] is being fed by your habit of [BLIND_SPOT]."
- f3: Suggest one micro action for today aligned with [PAST_LINK] and [DREAM_THEME]. Avoid generic phrasing.
- Name relationships when obvious (brother/father/mother); otherwise say "someone you trust".
- OUTPUT LANGUAGE: Must be English.

Data:
[DREAM_THEME]: ${i.dreamTheme}
[PAST_LINK]: ${i.pastLink}
[BLIND_SPOT]: ${i.blindSpot}
[GOLDEN_THREAD]: ${i.goldenThread}

OUTPUT (JSON only):
{
  "f1": "This feels familiar... <punchy line based on link>",
  "f2": "What you don’t see is this: This <theme> is fed by your <blind spot> habit.",
  "f3": "Your step: <micro action aligned with the theme>"
}`.trim(),
    de: `
ROLLE: Du destillierst tiefe Zusammenhänge zu klaren, menschlichen Einsichten. Ziel: Handlungsimpulse ohne Jargon.

Regeln:
- Erzeuge drei kurze Zeilen: f1, f2, f3. Gib ausschließlich JSON zurück.
- f1: Nenne das Echo aus der Vergangenheit in einem Satz. Stütze dich auf den Golden Thread oder eine konkrete Verbindung.
- f2: Keine Fragen. Klare Aussage. Vorlage: "Was du nicht siehst: Dieses [TRAUMTHEMA] nährt sich aus deiner Gewohnheit, [BLINDER_FLECK]."
- f3: Schlage eine heutige Mikro-Handlung vor, stimmig mit [VERGANGENHEITS-LINK] und [TRAUMTHEMA]. Vermeide generische Formulierungen.
- Benenne Beziehungen, wenn offensichtlich (Bruder/Vater/Mutter), sonst „jemand, dem du vertraust“.
- AUSGABESPRACHE: Deutsch.

Daten:
[TRAUMTHEMA]: ${i.dreamTheme}
[VERGANGENHEITS-LINK]: ${i.pastLink}
[BLINDER_FLECK]: ${i.blindSpot}
[GOLDEN_THREAD]: ${i.goldenThread}

AUSGABE (nur JSON):
{
  "f1": "Das fühlt sich vertraut an... <prägnanter Satz basierend auf der Verbindung>",
  "f2": "Was du nicht siehst: Dieses <Thema> nährt sich aus deiner Gewohnheit <blinder Fleck>.",
  "f3": "Dein Schritt: <zum Thema passende Mikro-Handlung>"
}`.trim(),
  };

  return PROMPTS[lang];
}

export type OracleOutput = { f1: string; f2: string; f3: string };

export async function generateSilentOracle(
  i: OracleInputs,
  language: string,
): Promise<OracleOutput> {
  const prompt = buildSilentOraclePrompt(i, language);
  const { data, error } = await supabase.functions.invoke("api-gateway", {
    body: {
      type: "gemini",
      payload: {
        model: "gemini-1.5-flash",
        prompt,
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 180,
        },
      },
    },
  });
  if (error) throw error;
  const text = (data as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | undefined)?.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    const parsed = JSON.parse(String(text)) as Partial<OracleOutput>;
    return {
      f1: typeof parsed.f1 === "string" ? parsed.f1 : "Bu his tanıdık...",
      f2: typeof parsed.f2 === "string"
        ? parsed.f2
        : "Görmediğin şey şu: Bu tema, kaçınma alışkanlığından besleniyor.",
      f3: typeof parsed.f3 === "string"
        ? parsed.f3
        : "Atacağın adım: Bugün 1 dakikalığına kontrolü bırak.",
    };
  } catch (_e) {
    return {
      f1: "Bu his tanıdık...",
      f2: "Görmediğin şey şu: Bu tema, kaçınma alışkanlığından besleniyor.",
      f3: "Atacağın adım: Bugün 1 dakikalığına kontrolü bırak.",
    };
  }
}

interface Prompt {
  content: string;
  metadata: { [key: string]: import("../types/json.ts").JsonValue };
  version: number;
}

interface PromptData {
  content: string;
  metadata?: { [key: string]: import("../types/json.ts").JsonValue };
  version: number;
}

const promptCache = new Map<string, Prompt>();

export async function getActivePrompt(name: string): Promise<Prompt> {
  const cacheKey = `${name}@active`;
  if (promptCache.has(cacheKey)) {
    return promptCache.get(cacheKey)!;
  }

  const { data, error } = await supabase
    .rpc("get_active_prompt_by_name", { p_name: name })
    .single();

  if (error || !data) {
    console.error(`Aktif prompt bulunamadı: ${name}`, error);
    throw new Error(`Kritik prompt alınamadı: ${name}`);
  }

  const promptData = data as PromptData;
  const prompt: Prompt = {
    content: promptData.content,
    metadata: promptData.metadata || {},
    version: promptData.version,
  };
  promptCache.set(cacheKey, prompt);

  return prompt;
}
