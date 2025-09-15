// supabase/functions/generate-onboarding-insight/index.ts - DİNAMİK DİL DESTEKLİ NİHAİ VERSİYON

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

interface RequestBody {
  answer1: string;
  answer2: string;
  answer3: string;
  language: string; // Dil parametresini ekledik
}

// Prompt'ları merkezi bir yerden yönetelim
const PROMPTS: Record<string, (a1: string, a2: string, a3: string) => string> =
  {
    tr: (a1, a2, a3) =>
      `ROL: Sen, bilge ve cesaretlendirici bir yol göstericisin.
GÖREV: Sana verilen 3 cevaptan yola çıkarak, kullanıcı için 2-3 cümlelik, pozitif ve geleceğe dönük bir içgörü yaz. Asla teşhis koyma, sadece gözlemlerini yansıt. "Sen" dilini kullan.
CEVAP 1 (Zihinsel Enerji): "${a1}"
CEVAP 2 (En Çok Yoran Şey): "${a2}"
CEVAP 3 (Küçük Adım): "${a3}"
İSTENEN ÇIKTI (Sadece JSON): { "insight": "Buraya 2-3 cümlelik içgörüyü yaz." }`,

    en: (a1, a2, a3) =>
      `ROLE: You are a wise and encouraging guide.
TASK: Based on the 3 answers provided, write a 2-3 sentence, positive, and forward-looking insight for the user. Never diagnose, only reflect observations. Use the "you" pronoun.
ANSWER 1 (Mental Energy): "${a1}"
ANSWER 2 (Biggest Drain): "${a2}"
ANSWER 3 (Small Step): "${a3}"
DESIRED OUTPUT (JSON only): { "insight": "Write the 2-3 sentence insight here." }`,

    de: (a1, a2, a3) =>
      `ROLLE: Du bist ein weiser und ermutigender Mentor.
AUFGABE: Schreibe basierend auf den 3 gegebenen Antworten eine 2-3 Sätze lange, positive und zukunftsorientierte Einsicht für den Benutzer. Stelle niemals eine Diagnose, spiegle nur Beobachtungen wider. Verwende die "Du"-Anrede.
ANTWORT 1 (Mentale Energie): "${a1}"
ANTWORT 2 (Größte Belastung): "${a2}"
ANTWORT 3 (Kleiner Schritt): "${a3}"
GEWÜNSCHTE AUSGABE (Nur JSON): { "insight": "Schreibe die 2-3 Sätze lange Einsicht hier." }`,
  };

serve(async (req: Request) => {
  if (req.method === "OPTIONS") { /* ... aynı ... */ }

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

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();

    // Validasyon - artık dil de gerekli
    if (
      !body.answer1?.trim() || !body.answer2?.trim() || !body.answer3?.trim() ||
      !body.language
    ) {
      return new Response(
        JSON.stringify({
          error: "All three answers and language are required",
        }),
        { status: 400 /*...*/ },
      );
    }

    // Gelen dile göre doğru prompt'u seç, desteklenmiyorsa İngilizce'ye (fallback) dön
    const getPrompt = PROMPTS[body.language] || PROMPTS.en;
    const prompt = getPrompt(
      body.answer1.trim(),
      body.answer2.trim(),
      body.answer3.trim(),
    );

    const response = await invokeGemini(
      prompt,
      config.AI_MODELS.FAST,
      {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: LLM_LIMITS.ONBOARDING_INSIGHT,
      },
    );

    const parsedResponse = JSON.parse(response);
    return new Response(JSON.stringify(parsedResponse), {
      status: 200, /*...*/
    });
  } catch (error) {
    console.error("Onboarding insight generation error:", error);
    // Hata durumunda güvenli fallback
    return new Response(
      JSON.stringify({
        insight: "Welcome to your journey! Every step will make you stronger.",
      }),
      { status: 200 /*...*/ },
    );
  }
});
