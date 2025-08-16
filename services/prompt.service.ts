// services/prompt.service.ts
import { supabase } from "../utils/supabase";

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
