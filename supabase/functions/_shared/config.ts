// supabase/functions/_shared/config.ts
export const AI_MODELS = {
  INTENT: "gemini-1.5-flash",
  RESPONSE: "gemini-1.5-flash",
};

export const RAG_CONFIG = {
  THRESHOLD: 0.75,
  COUNT: 3,
};

export const PROMPT_LIMITS = {
  MAX_PROMPT_LENGTH: 1000,
  MAX_RESPONSE_LENGTH: 500,
};
