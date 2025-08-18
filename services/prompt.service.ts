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
}
`;
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
