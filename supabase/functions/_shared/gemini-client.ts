// supabase/functions/_shared/gemini-client.ts
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeGemini } from "./services/ai.service.ts";

export type GeminiConfig = {
    temperature?: number;
    responseMimeType?: string;
    maxOutputTokens?: number;
};

/**
 * Ayrık edge fonksiyonlarının ortak Gemini çağrısı için hafif sarmalayıcı.
 * `api-gateway` üstünden güvenli şekilde yönlendirir.
 */
export async function generateWithGemini(
    supabase: SupabaseClient,
    prompt: string,
    model: string,
    config?: GeminiConfig,
    transactionId?: string,
    userMessage?: string,
): Promise<string> {
    return await invokeGemini(
        supabase,
        prompt,
        model,
        config,
        transactionId,
        userMessage,
    );
}
