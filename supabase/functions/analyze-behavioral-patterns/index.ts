// supabase/functions/analyze-behavioral-patterns/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import { BehavioralPatternAnalyzer } from "../_shared/services/behavioral-pattern-analyzer.service.ts";
import { invokeGemini } from "../_shared/services/ai.service.ts";

async function handleAnalyzeBehavioralPatterns(
  req: Request,
  // Test için dışarıdan client enjekte etme kapısı
  providedAdminClient?: ReturnType<typeof getSupabaseAdmin>,
): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Güvenlik: Kullanıcıyı doğrula
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const adminClient = providedAdminClient ?? getSupabaseAdmin(); // Client'ı burada al
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(jwt);
    if (!user) throw new Error("Kullanıcı doğrulanamadı.");

    const body = await req.json().catch(() => ({}));
    const days = body.periodDays ?? body.days ?? 7; // her iki adı da destekle
    if (!days || typeof days !== "number" || days <= 0) {
      throw new Error(
        "Geçerli bir 'periodDays' veya 'days' parametresi gerekli.",
      );
    }

    // Analiz servisini çağır
    const dependencies = {
      supabaseClient: adminClient,
      aiService: {
        invokeGemini: (
          prompt: string,
          model: string,
          options?: { temperature?: number; maxOutputTokens?: number },
        ) => invokeGemini(adminClient, prompt, model, options),
      },
    };
    const analysisResult = await BehavioralPatternAnalyzer.analyzePatterns(
      dependencies,
      user.id,
      days,
    );

    return new Response(JSON.stringify(analysisResult), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      status: 200,
    });
  } catch (error) {
    const message = (error as Error)?.message ?? String(error);
    console.error("[analyze-behavioral-patterns] KRİTİK HATA:", message, error);
    return new Response(JSON.stringify({ error: message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      status: 400,
    });
  }
}

export { handleAnalyzeBehavioralPatterns };

// Sunucuyu sadece dosya doğrudan çalıştırıldığında başlat
if (import.meta.main) {
  serve((req: Request) => handleAnalyzeBehavioralPatterns(req));
}
