// supabase/functions/analyze-dream/index.ts
import { Sentry } from "../_shared/sentry.ts";
import { cors } from "../_shared/cors.ts";
import { getAuthContext, isPreflight } from "../_shared/auth.ts";
import { buildDreamAnalysisContext } from "../_shared/contexts/dream.context.service.ts";
import { generateDreamAnalysisPrompt } from "../_shared/prompts/dreamAnalysis.prompt.ts";
import * as AiService from "../_shared/services/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

type AnalyzeDreamRequest = {
  dreamText: string;
  language?: string; // "tr" | "en" | "de"
  transactionId?: string;
};

type AnalyzeDreamResponse = {
  analysis: string; // JSON ya da düz metin; responseMimeType'a göre değişir
};

async function handler(req: Request): Promise<Response> {
  const headers = cors(req);

  if (isPreflight(req)) {
    return new Response("ok", { headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as AnalyzeDreamRequest;
    const dreamText = String(body?.dreamText || "").trim();
    const language = (body?.language || "tr").toLowerCase();
    const transactionId = String(body?.transactionId || crypto.randomUUID());

    if (!dreamText) {
      return new Response(JSON.stringify({ error: "dreamText gerekli" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    const { supabase, userId } = await getAuthContext(req);

    const deps = {
      supabaseClient: supabase,
      aiService: AiService,
      ragService: await import("../_shared/services/rag.service.ts"),
      logRagInvocation:
        (await import("../_shared/utils/logging.service.ts")).logRagInvocation,
    } as const;

    const { userDossier, ragContext } = await buildDreamAnalysisContext(
      deps,
      userId,
      dreamText,
      transactionId,
    );

    const prompt = generateDreamAnalysisPrompt(
      { userDossier, ragContext, dreamText },
      language,
    );

    const responseText = await AiService.invokeGemini(
      supabase,
      prompt,
      config.AI_MODELS.ADVANCED,
      {
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: LLM_LIMITS.DREAM_ANALYSIS,
      },
      transactionId,
      dreamText,
    );

    const resBody: AnalyzeDreamResponse = { analysis: responseText };
    return new Response(JSON.stringify(resBody), {
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
      headers: { ...cors(req), "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  Deno.serve((req) => handler(req));
}
