// supabase/functions/generate-onboarding-insight/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

interface RequestBody {
  answer1: string;
  answer2: string;
  answer3: string;
}

interface ResponseBody {
  insight: string;
}

serve(async (req: Request) => {
  // CORS kontrolü
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // === GÜVENLİK ADIMI BAŞLANGIÇ ===
    // Authorization header'ını al ve kullanıcıyı doğrula
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // === GÜVENLİK ADIMI BİTİŞ ===
    // Sadece POST isteklerini kabul et
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Request body'yi parse et
    const body: RequestBody = await req.json();

    // Validasyon - üç cevap da gerekli
    if (
      !body.answer1?.trim() || !body.answer2?.trim() || !body.answer3?.trim()
    ) {
      return new Response(
        JSON.stringify({ error: "All three answers are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Güvenli prompt oluştur
    const prompt = `ROL: Sen, bilge ve cesaretlendirici bir yol göstericisin.
GÖREV: Sana verilen 3 cevaptan yola çıkarak, kullanıcı için 2-3 cümlelik, pozitif ve geleceğe dönük bir içgörü yaz. Asla teşhis koyma, sadece gözlemlerini yansıt. "Sen" dilini kullan.

CEVAP 1 (Zihinsel Enerji): "${body.answer1.trim()}"
CEVAP 2 (En Çok Yoran Şey): "${body.answer2.trim()}"
CEVAP 3 (Küçük Adım): "${body.answer3.trim()}"

İSTENEN ÇIKTI (Sadece JSON):
{
  "insight": "Buraya 2-3 cümlelik içgörüyü yaz."
}`;

    // Gemini-1.5-flash ile çağır - çok düşük token limiti
    const response = await invokeGemini(
      prompt,
      config.AI_MODELS.FAST, // gemini-1.5-flash-latest
      {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: LLM_LIMITS.ONBOARDING_INSIGHT, // Çok düşük limit
      },
    );

    // JSON parse et
    const parsedResponse: ResponseBody = JSON.parse(response);

    // Başarılı yanıt döndür
    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Onboarding insight generation error:", error);

    // Hata durumunda güvenli fallback
    return new Response(
      JSON.stringify({
        insight: "Yolculuğuna hoş geldin! Her adımın seni daha güçlü kılacak.",
      }),
      {
        status: 200, // Her zaman 200 döndür, kullanıcıyı rahatsız etme
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
