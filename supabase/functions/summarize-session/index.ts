// supabase/functions/summarize-session/index.ts
import { Sentry } from "../_shared/sentry.ts";
import { cors } from "../_shared/cors.ts";
import { getAuthContext, isPreflight } from "../_shared/auth.ts";
import * as AiService from "../_shared/services/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

type SummarizeRequest = {
  sessionText: string;
  language?: string; // "tr" | "en" | "de"
  transactionId?: string;
};

type SummarizeResponse = { summary: string };

function buildSummaryPrompt(text: string, language: string): string {
  const map: Record<string, string> = {
    tr:
      `Aşağıdaki sohbet metnini 3 cümlede ÖZETLE. Yalın, net ve tekrar etmeyen bir dil kullan. İçerik hassassa sağduyulu ol. Sadece özet yaz.\n---\n${text}`,
    en:
      `Summarize the following chat text in 3 sentences. Be concise, clear, and avoid repetition. Be sensible with sensitive content. Write only the summary.\n---\n${text}`,
    de:
      `Fasse den folgenden Chattext in 3 Sätzen zusammen. Sei prägnant, klar und ohne Wiederholungen. Gehe sensibel mit heiklen Inhalten um. Schreibe nur die Zusammenfassung.\n---\n${text}`,
  };
  return map[["tr", "en", "de"].includes(language) ? language : "en"];
}

async function handler(req: Request): Promise<Response> {
  const headers = cors(req);
  if (isPreflight(req)) return new Response("ok", { headers });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as SummarizeRequest;
    const sessionText = String(body?.sessionText || "").trim();
    const language = (body?.language || "tr").toLowerCase();
    const transactionId = String(body?.transactionId || crypto.randomUUID());

    if (!sessionText) {
      return new Response(JSON.stringify({ error: "sessionText gerekli" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { supabase } = await getAuthContext(req);
    const prompt = buildSummaryPrompt(sessionText, language);

    const summaryText = await AiService.invokeGemini(
      supabase,
      prompt,
      config.AI_MODELS.FAST,
      { temperature: 0.2, maxOutputTokens: LLM_LIMITS.SESSION_SUMMARY },
      transactionId,
      sessionText,
    );

    const res: SummarizeResponse = { summary: summaryText };
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    Sentry.captureException(e);
    const message = e instanceof Response
      ? undefined
      : (e instanceof Error ? e.message : String(e));
    if (e instanceof Response) return e;
    return new Response(JSON.stringify({ error: message || "Unknown error" }), {
      status: 400,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handler(req));
}
