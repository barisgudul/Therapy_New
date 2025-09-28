// supabase/functions/generate-onboarding-insight/index.ts - NİHAİ VE TAM VERSİYON

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

// ADIM 1: Arayüzü frontend ile eşleşecek şekilde genişlet
interface OnboardingInsightResponse {
  pattern?: string;
  reframe?: string;
  potential?: string;
  first_step?: string;
  micro_habit?: string;
  success_metric?: string;
  affirmation?: string;
  plan_7d?: string;
}

// ADIM 2: Prompt'u, AI'a yeni görevler verecek şekilde baştan yaz
const PROMPTS: Record<
  string,
  (a1: string, a2: string, a3: string, nickname: string) => string
> = {
  tr: (a1, a2, a3, nickname) =>
    `ROL: Sen, bilge ve keskin zekalı bir performans psikoloğusun.
GÖREV: Kullanıcının (${nickname}) 3 cevabını kullanarak, aşağıdaki JSON şemasına uygun şekilde ODAKLI ve EYLEME DÖNÜK bir analiz üret. Her alan, en fazla 2-3 cümleden oluşan kısa ve etkili bir metin olmalı.

JSON ŞEMASI:
{
  "pattern": "Gözlemlediğin en temel düşünce kalıbını ${nickname}'a hitap ederek açıkla.",
  "reframe": "Bu kalıbı, bir zayıflık yerine bir 'sinyal' veya 'koruma mekanizması' olarak yeniden çerçeveleyen, güçlendirici bir bakış açısı sun.",
  "potential": "Bu durumun içindeki gizli gücü veya potansiyeli ortaya çıkaran ilham verici bir metin yaz.",
  "first_step": "Kullanıcının belirttiği adımı neden harika bir başlangıç olduğunu vurgulayan motive edici bir metinle onayla.",
  "micro_habit": "Kullanıcının atacağı adıma dayanan, 2 dakikadan fazla sürmeyecek, aşırı basit, somut bir 'mikro alışkanlık' öner.",
  "success_metric": "Bu mikro alışkanlığın başarısını ölçmek için, evet/hayır şeklinde takip edilebilecek basit bir 'başarı ölçütü' tanımla.",
  "affirmation": "Tüm analize uygun, kullanıcının kendisine söyleyebileceği, tek cümlelik, güçlü bir 'olumlama' cümlesi yaz.",
  "plan_7d": "İlk 7 gün için, bu içgörülerle ilgili çok basit ve uygulanabilir bir '7 günlük eylem planı' oluştur (tek bir paragraf)."
}

CEVAPLAR:
- Enerji: "${a1}"
- Zorluk: "${a2}"
- Adım: "${a3}"

KURALLAR:
- Sadece geçerli JSON üret.
- Çıktı dili Türkçe olmalı.
- Tüm alanları doldurmaya çalış.
- Metinler kısa, net ve etkili olacak.`,

  en: (a1, a2, a3, nickname) =>
    `ROLE: You are a wise and sharp performance psychologist.
TASK: Using the 3 answers from the user (${nickname}), produce a FOCUSED and ACTIONABLE analysis in the JSON schema below. Each field must be a short, effective text of max 2-3 sentences.

JSON SCHEMA:
{
  "pattern": "Explain the core thought pattern you observe, addressing ${nickname}.",
  "reframe": "Provide a powerful perspective that reframes this pattern not as a weakness, but as a 'signal' or 'protection mechanism'.",
  "potential": "Write an inspiring text that uncovers the hidden strength or potential within this situation.",
  "first_step": "Affirm the user's stated step with a motivating text highlighting why it's a great start.",
  "micro_habit": "Suggest an extremely simple, concrete 'micro-habit' based on the user's step that takes no more than 2 minutes.",
  "success_metric": "Define a simple 'success metric' that can be tracked with a yes/no to measure the success of this micro-habit.",
  "affirmation": "Write a single, powerful 'affirmation' sentence suitable for the whole analysis that the user can tell themselves.",
  "plan_7d": "Create a very simple and actionable '7-day action plan' related to these insights (a single paragraph)."
}

ANSWERS:
- Energy: "${a1}"
- Challenge: "${a2}"
- Step: "${a3}"

RULES:
- Produce only valid JSON.
- Output language must be English.
- Try to fill all fields.
- Texts must be short, clear, and impactful.`,

  de: (a1, a2, a3, nickname) =>
    `ROLLE: Du bist ein weiser und scharfsinniger Leistungspsychologe.
AUFGABE: Erstelle anhand der 3 Antworten des Benutzers (${nickname}) eine FOKUSSIERTE und UMSETZBARE Analyse im unten stehenden JSON-Schema. Jeder Bereich muss ein kurzer, effektiver Text von maximal 2-3 Sätzen sein.

JSON-SCHEMA:
{
  "pattern": "Erkläre das zentrale Denkmuster, das du beobachtest, und sprich ${nickname} direkt an.",
  "reframe": "Biete eine kraftvolle Perspektive, die dieses Muster nicht als Schwäche, sondern als 'Signal' oder 'Schutzmechanismus' neu einordnet.",
  "potential": "Schreibe einen inspirierenden Text, der die verborgene Stärke oder das Potenzial in dieser Situation aufdeckt.",
  "first_step": "Bestätige den vom Benutzer genannten Schritt mit einem motivierenden Text, der hervorhebt, warum er ein großartiger Anfang ist.",
  "micro_habit": "Schlage eine extrem einfache, konkrete 'Mikro-Gewohnheit' vor, die auf dem Schritt des Benutzers basiert und nicht länger als 2 Minuten dauert.",
  "success_metric": "Definiere eine einfache 'Erfolgskennzahl', die mit Ja/Nein verfolgt werden kann, um den Erfolg dieser Mikro-Gewohnheit zu messen.",
  "affirmation": "Schreibe einen einzigen, kraftvollen 'Affirmationssatz', der zur gesamten Analyse passt und den der Benutzer sich selbst sagen kann.",
  "plan_7d": "Erstelle einen sehr einfachen und umsetzbaren '7-Tage-Aktionsplan' im Zusammenhang mit diesen Erkenntnissen (ein einziger Absatz)."
}

ANTWORTEN:
- Energie: "${a1}"
- Herausforderung: "${a2}"
- Schritt: "${a3}"

REGELN:
- Produziere nur gültiges JSON.
- Die Ausgabesprache muss Deutsch sein.
- Versuche, alle Felder auszufüllen.
- Die Texte müssen kurz, klar und wirkungsvoll sein.`,
};

serve(async (req: Request) => {
  // ... fonksiyonun başındaki güvenlik ve validasyon kodları aynı kalıyor ...
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
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
    if (
      !body.answer1?.trim() || !body.answer2?.trim() || !body.answer3?.trim() ||
      !body.language || !body.nickname?.trim()
    ) {
      return new Response(
        JSON.stringify({ error: "All inputs are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Kullanıcı girdilerini güvenli hale getir (tırnak ve özel karakter kaçışı)
    const escapeForPrompt = (text: string) => JSON.stringify(text).slice(1, -1);
    const safeA1 = escapeForPrompt(body.answer1.trim());
    const safeA2 = escapeForPrompt(body.answer2.trim());
    const safeA3 = escapeForPrompt(body.answer3.trim());
    const safeNickname = escapeForPrompt(body.nickname.trim());

    const getPrompt = PROMPTS[body.language] || PROMPTS.en;
    const prompt = getPrompt(
      safeA1,
      safeA2,
      safeA3,
      safeNickname,
    );

    // ======================================================================
    // === DEBUG: Gemini'ye gönderilen prompt'u logla ===
    console.log("--- PROMPT GEMINI'YE GÖNDERİLİYOR --- \n", prompt);
    // ======================================================================

    const response = await invokeGemini(prompt, config.AI_MODELS.FAST, {
      temperature: 0.7,
      maxOutputTokens: LLM_LIMITS.ONBOARDING_INSIGHT,
    });

    let parsedResponse: OnboardingInsightResponse = {};
    try {
      parsedResponse = JSON.parse(response) as OnboardingInsightResponse;
    } catch (_parseError) {
      console.error(
        `[${user.id}] Gemini'den gelen JSON parse edilemedi. Ham yanıt:`,
        response,
      );
    }

    // ADIM 3: Fallback (yedek) metinlerini tüm yeni alanlar için ekle
    const lang = ["tr", "en", "de"].includes(body.language)
      ? body.language
      : "en";
    const defaultsByLang: Record<string, Record<string, string>> = {
      tr: {
        pattern:
          "Zorluklar ve enerji seviyen arasında bir bağlantı görünüyor. Bu kalıbı anlamak, değişimin ilk adımıdır.",
        reframe:
          "Bu durumu bir engel olarak değil, neye gerçekten önem verdiğini gösteren bir pusula olarak görebilirsin.",
        potential:
          "Bu zorluğun içinde aynı zamanda bir büyüme fırsatı da saklı. Bu, dayanıklılığını keşfetmen için bir şans.",
        first_step:
          "Belirttiğin bu adım, başlamak için harika bir nokta. Küçük adımlar, en büyük yolculukları başlatır.",
        micro_habit:
          "Her güne başlarken 1 dakika boyunca sadece nefesine odaklan.",
        success_metric:
          "Bu hafta kaç gün 1 dakikalık nefes egzersizini tamamladığını işaretle.",
        affirmation: "Her adımda daha da güçleniyorum.",
        plan_7d:
          "Bu hafta, belirlediğin küçük adımı en az 3 kez tekrarlamaya odaklan.",
      },
      en: {
        pattern:
          "There appears to be a link between your challenges and energy levels. Naming this pattern is the first step toward change.",
        reframe:
          "You can see this not as an obstacle, but as a compass pointing to what you truly value.",
        potential:
          "Within this challenge lies a real opportunity for growth. It’s a chance to discover and strengthen your resilience.",
        first_step:
          "The step you mentioned is an excellent way to begin. Small steps ignite the longest journeys.",
        micro_habit:
          "Start each day by focusing on your breath for just 1 minute.",
        success_metric:
          "Track how many days this week you complete the 1-minute breathing exercise.",
        affirmation: "I am growing stronger with every step.",
        plan_7d:
          "This week, focus on repeating your chosen small step at least 3 times.",
      },
      de: {
        pattern:
          "Zwischen deinen Herausforderungen und deinem Energieniveau scheint es einen Zusammenhang zu geben. Dieses Muster zu benennen ist der erste Schritt zur Veränderung.",
        reframe:
          "Du kannst dies nicht als Hindernis sehen, sondern als Kompass, der auf das zeigt, was dir wirklich wichtig ist.",
        potential:
          "In dieser Herausforderung steckt eine echte Wachstumschance. Es ist eine Gelegenheit, deine Widerstandskraft zu entdecken und zu stärken.",
        first_step:
          "Der von dir genannte Schritt ist ein hervorragender Anfang. Kleine Schritte starten die längsten Reisen.",
        micro_habit:
          "Beginne jeden Tag damit, dich eine Minute lang auf deinen Atem zu konzentrieren.",
        success_metric:
          "Verfolge, an wie vielen Tagen du diese 1-minütige Atemübung in dieser Woche absolvierst.",
        affirmation: "Ich werde mit jedem Schritt stärker.",
        plan_7d:
          "Konzentriere dich diese Woche darauf, deinen gewählten kleinen Schritt mindestens 3 Mal zu wiederholen.",
      },
    };

    const d = defaultsByLang[lang];
    const safe = {
      pattern: parsedResponse.pattern || d.pattern,
      reframe: parsedResponse.reframe || d.reframe,
      potential: parsedResponse.potential || d.potential,
      first_step: parsedResponse.first_step || d.first_step,
      micro_habit: parsedResponse.micro_habit || d.micro_habit,
      success_metric: parsedResponse.success_metric || d.success_metric,
      affirmation: parsedResponse.affirmation || d.affirmation,
      plan_7d: parsedResponse.plan_7d || d.plan_7d,
    };

    // ... fonksiyonun geri kalanı (veritabanına yazma, cevap döndürme) aynı ...
    const { data: existingVault, error: fetchError } = await supabaseClient
      .from("user_vaults").select("vault_data").eq("user_id", user.id).single();
    if (fetchError) {
      console.error(`[${user.id}] Mevcut vault çekilemedi:`, fetchError);
    }
    const currentVaultData = existingVault?.vault_data || {};
    const updatedVaultData = { ...currentVaultData, onboardingInsight: safe };
    const { error: vaultError } = await supabaseClient.from("user_vaults")
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
    } else {console.log(
        `[${user.id}] Analiz başarıyla user_vaults'a kaydedildi`,
      );}
    // ... analysis_reports ve process-memory kısımları da aynı kalabilir ...

    return new Response(JSON.stringify(safe), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Onboarding insight generation fatal error:", message);
    return new Response(
      JSON.stringify({
        error: "Analysis generation failed.",
        details: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
