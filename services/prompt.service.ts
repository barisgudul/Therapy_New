// services/prompt.service.ts
// Sessiz Kâhin için katı prompt üretimi

import { supabase } from "../utils/supabase";

export type OracleInputs = {
  dreamTheme: string; // örn: "Boğulma ve Kontrol Kaybı"
  pastLink: string; // örn: "Babanın kaybı ve abinle gerilim"
  blindSpot: string; // rapordaki ilgili cümle
  goldenThread: string; // rapordaki ana yön
};

export function buildSilentOraclePrompt(i: OracleInputs): string {
  return `
ROL: Sen, veriler arasındaki derin bağlantıları anlayan ve bunları net, öz ve insancıl bir dille ifade eden bir analiz motorusun. Amaç: Kullanıcıya karmaşık verilerden damıtılmış, eyleme dönük içgörüler sunmak. Jargon yok. Uzatma yok.

Kurallar:
- Üç kısa cümle üret: f1, f2, f3. Sadece JSON döndür.
- f1: Geçmiş yankıyı tek cümlede söyle. Golden thread veya somut bağlantıya dayan.
- f2: Soru sorma. Net teşhis kur. Şablon: "Görmediğin şey şu: Bu [RÜYA_TEMASI], senin [KÖR_NOKTA] alışkanlığından besleniyor."
- f3: O gün yapılabilir tek bir mikro eylem öner. [GEÇMİŞ_BAĞLANTISI] ve [RÜYA_TEMASI] ile uyumlu olsun. Jenerik ifadelerden kaçın.
- İlişki barizse ad belirt (abi/kardeş/baba/anne), aksi halde "güvendiğin biri" de.

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
}`;
}

export type OracleOutput = { f1: string; f2: string; f3: string };

export async function generateSilentOracle(
  i: OracleInputs,
): Promise<OracleOutput> {
  const prompt = buildSilentOraclePrompt(i);
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
