// supabase/functions/generate-onboarding-insight/index.ts - DİNAMİK DİL DESTEKLİ NİHAİ VERSİYON

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

interface OnboardingInsightResponse {
  pattern?: string;
  potential?: string;
  first_step?: string;
}

// Prompt'ları HIZLI ve ETKİLİ olacak şekilde yeniden yazdık.
const PROMPTS: Record<
  string,
  (a1: string, a2: string, a3: string, nickname: string) => string
> = {
  tr: (a1, a2, a3, nickname) =>
    `ROL: Sen, bilge ve keskin zekalı bir performans psikoloğusun.
GÖREV: Kullanıcının (${nickname}) 3 cevabını kullanarak, aşağıdaki JSON şemasına uygun şekilde ODAKLI ve ETKİLİ bir analiz üret. Her alan, en fazla 2 cümleden oluşan kısa ve etkili bir paragraf olmalı.

JSON ŞEMASI:
{
  "pattern": "Gözlemlediğin en temel düşünce kalıbını ${nickname}'a hitap ederek kısa bir paragrafta açıkla.",
  "potential": "Bu durumun içindeki gizli gücü veya potansiyeli ortaya çıkaran güçlü bir paragraf yaz.",
  "first_step": "Kullanıcının belirttiği adımı neden harika bir başlangıç olduğunu vurgulayan motive edici bir paragrafla onayla."
}

CEVAPLAR:
- Enerji: "${a1}"
- Zorluk: "${a2}"
- Adım: "${a3}"

KURALLAR:
- Sadece geçerli JSON üret.
- Çıktı dili Türkçe olmalı.
- HER ALAN KISA VE ETKİLİ BİR PARAGRAF OLMALI.`,

  en: (a1, a2, a3, nickname) =>
    `ROLE: You are a wise and sharp performance psychologist.
TASK: Using the 3 answers from the user (${nickname}), produce a FOCUSED and IMPACTFUL analysis in the JSON schema below. Each field must be a short and effective paragraph of max 2 sentences.

JSON SCHEMA:
{
  "pattern": "Explain the core thought pattern you observe in a short paragraph, addressing ${nickname}.",
  "potential": "Write a powerful paragraph uncovering the hidden strength or potential within this situation.",
  "first_step": "Affirm the user's step with a motivating paragraph highlighting why it's a great start."
}

ANSWERS:
- Energy: "${a1}"
- Challenge: "${a2}"
- Step: "${a3}"

RULES:
- Produce only valid JSON.
- Output language must be English.
- EACH FIELD MUST BE A SHORT AND EFFECTIVE PARAGRAPH.`,

  de: (a1, a2, a3, nickname) =>
    `ROLLE: Du bist ein weiser und scharfsinniger Leistungspsychologe.
AUFGABE: Erstelle anhand der 3 Antworten des Benutzers (${nickname}) eine FOKUSSIERTE und WIRKUNGSVOLLE Analyse im unten stehenden JSON-Schema. Jeder Bereich muss ein kurzer und wirkungsvoller Absatz von maximal 2 Sätzen sein.

JSON-SCHEMA:
{
  "pattern": "Erkläre das zentrale Denkmuster, das du beobachtest, in einem kurzen Absatz und sprich ${nickname} an.",
  "potential": "Schreibe einen kraftvollen Absatz, der die verborgene Stärke oder das Potenzial in dieser Situation aufdeckt.",
  "first_step": "Bestätige den Schritt des Benutzers mit einem motivierenden Absatz, der hervorhebt, warum er ein großartiger Anfang ist."
}

ANTWORTEN:
- Energie: "${a1}"
- Herausforderung: "${a2}"
- Schritt: "${a3}"

REGELN:
- Produziere nur gültiges JSON.
- Die Ausgabesprache muss Deutsch sein.
- JEDER BEREICH MUSS EIN KURZER UND WIRKUNGSVOLLER ABSATZ SEIN.`,
};

serve(async (req: Request) => {
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

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      answer1: string;
      answer2: string;
      answer3: string;
      language: string;
      nickname: string;
    };

    // Validasyon - artık dil de gerekli
    if (
      !body.answer1?.trim() || !body.answer2?.trim() || !body.answer3?.trim() ||
      !body.language || !body.nickname?.trim()
    ) {
      return new Response(
        JSON.stringify({
          error: "All three answers, language, and nickname are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Gelen dile göre doğru prompt'u seç, desteklenmiyorsa İngilizce'ye (fallback) dön
    const getPrompt = PROMPTS[body.language] || PROMPTS.en;
    const prompt = getPrompt(
      body.answer1.trim(),
      body.answer2.trim(),
      body.answer3.trim(),
      body.nickname.trim(),
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

    let parsedResponse: OnboardingInsightResponse = {};
    try {
      parsedResponse = JSON.parse(response) as OnboardingInsightResponse;
    } catch (_parseError) {
      console.error(
        `[${user.id}] Gemini'den gelen JSON parse edilemedi. Ham yanıt:`,
        response,
      );
    }

    // Lokalize fallback'ler (tr/en/de)
    const lang = ["tr", "en", "de"].includes(body.language)
      ? body.language
      : "en";
    const defaultsByLang: Record<string, Record<string, string>> = {
      tr: {
        reportTitle: "İlk Analizin",
        h_pattern: "Düşünce Kalıbın",
        h_potential: "Gizli Potansiyelin",
        h_first_step: "İlk Adımın",
        analogy_title: "Yolun Başlangıcı",
        analogy_text: "Her yolculuk, atılan ilk adımla anlam kazanır.",
        pattern:
          "Zorluklar ve enerji seviyen arasında bir bağlantı görünüyor. Bu kalıbı anlamak, değişimin ilk adımıdır.",
        potential:
          "Bu zorluğun içinde aynı zamanda bir büyüme fırsatı da saklı. Bu, dayanıklılığını keşfetmen için bir şans.",
        first_step:
          "Belirttiğin bu adım, başlamak için harika bir nokta. Küçük adımlar, en büyük yolculukları başlatır.",
      },
      en: {
        reportTitle: "Your First Analysis",
        h_pattern: "Thought Pattern",
        h_potential: "Hidden Potential",
        h_first_step: "First Step",
        analogy_title: "The Journey Begins",
        analogy_text: "Every journey gains meaning with the first step taken.",
        pattern:
          "There appears to be a link between your challenges and energy levels. Naming this pattern is the first step toward change.",
        potential:
          "Within this challenge lies a real opportunity for growth. It’s a chance to discover and strengthen your resilience.",
        first_step:
          "The step you mentioned is an excellent way to begin. Small steps ignite the longest journeys.",
      },
      de: {
        reportTitle: "Deine Erste Analyse",
        h_pattern: "Denkmuster",
        h_potential: "Verborgenes Potenzial",
        h_first_step: "Erster Schritt",
        analogy_title: "Der Beginn der Reise",
        analogy_text: "Jede Reise gewinnt an Bedeutung mit dem ersten Schritt.",
        pattern:
          "Zwischen deinen Herausforderungen und deinem Energieniveau scheint es einen Zusammenhang zu geben. Dieses Muster zu benennen ist der erste Schritt zur Veränderung.",
        potential:
          "In dieser Herausforderung steckt eine echte Wachstumschance. Es ist eine Gelegenheit, deine Widerstandskraft zu entdecken und zu stärken.",
        first_step:
          "Der von dir genannte Schritt ist ein hervorragender Anfang. Kleine Schritte starten die längsten Reisen.",
      },
    };

    const d = defaultsByLang[lang];
    const safe = {
      pattern: parsedResponse.pattern || d.pattern,
      potential: parsedResponse.potential || d.potential,
      first_step: parsedResponse.first_step || d.first_step,
    };

    // === USER_VAULTS'A ANALİZ KAYDI ===
    // Profiles tablosu sorun çıkarıyor, user_vaults'a yazalım
    // Önce mevcut vault'u çekelim
    const { data: existingVault, error: fetchError } = await supabaseClient
      .from("user_vaults")
      .select("vault_data")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error(`[${user.id}] Mevcut vault çekilemedi:`, fetchError);
    }

    // Vault data'yı güncelle veya oluştur
    const currentVaultData = existingVault?.vault_data || {};
    const updatedVaultData = {
      ...currentVaultData,
      // Vault'a string alanlardan oluşan yapıyı yazarız (store ile uyumlu)
      onboardingInsight: safe,
    };

    // user_vaults'a güncelle veya ekle
    const { error: vaultError } = await supabaseClient
      .from("user_vaults")
      .upsert({
        user_id: user.id,
        vault_data: updatedVaultData,
        nickname: user.user_metadata?.nickname,
      }, { onConflict: "user_id" });

    if (vaultError) {
      console.error(
        `[${user.id}] User vault'a analiz kaydedilemedi:`,
        vaultError,
      );
    } else {
      console.log(`[${user.id}] Analiz başarıyla user_vaults'a kaydedildi`);
    }
    // ===============================================

    // === ANALYSIS_REPORTS'A KAYDET ===
    try {
      const dHead = defaultsByLang[lang];

      const reportContent = {
        reportSections: {
          mainTitle: dHead.reportTitle,
          overview: `**${dHead.h_pattern}**\n${safe.pattern}`,
          goldenThread: `**${dHead.h_potential}**\n${safe.potential}`,
          blindSpot: `**${dHead.h_first_step}**\n${safe.first_step}`,
        },
        reportAnalogy: {
          title: dHead.analogy_title,
          text: dHead.analogy_text,
        },
        derivedData: { readMinutes: 1, headingsCount: 3 },
      };

      const { error: insertReportError } = await supabaseClient
        .from("analysis_reports")
        .insert({
          user_id: user.id,
          content: reportContent,
          days_analyzed: 1,
        });

      if (insertReportError) {
        console.error(
          `[${user.id}] analysis_reports insert hatası:`,
          insertReportError,
        );
      }
    } catch (err) {
      console.error(
        `[${user.id}] analysis_reports kayıt sırasında beklenmeyen hata:`,
        err,
      );
    }
    // ===============================================

    // === KURUCU ANILARI HAFIZAYA İŞLE (FIRE-AND-FORGET) ===
    try {
      const onboardingAnswers = [
        { content: body.answer1, type: "onboarding_energy" },
        { content: body.answer2, type: "onboarding_challenge" },
        { content: body.answer3, type: "onboarding_step" },
      ];

      onboardingAnswers.forEach((answer) => {
        // Beklemeden tetikle
        supabaseClient.functions.invoke("process-memory", {
          body: {
            source_event_id: `onboarding-${user.id}`,
            user_id: user.id,
            content: answer.content,
            event_time: new Date().toISOString(),
            event_type: answer.type,
          },
        }).then(() => {
          // no-op
        }).catch((err) => {
          console.error(`[${user.id}] process-memory invoke hatası:`, err);
        });
      });

      console.log(`[${user.id}] 3 kurucu anı için hafıza işleme tetiklendi.`);
    } catch (err) {
      console.error(
        `[${user.id}] Kurucu anıları işleme tetiklenirken hata:`,
        err,
      );
    }
    // ===============================================

    // 2. Tutarlı ve güvenli veriyi (safe) frontend'e geri gönder
    return new Response(JSON.stringify(safe), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Onboarding insight generation fatal error:", message);
    return new Response(
      JSON.stringify({
        error:
          "Analiz oluşturulurken beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
        details: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
