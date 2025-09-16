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

// Prompt'ları merkezi bir yerden yönetelim - NİHAİ YAPISAL VERSİYON
const PROMPTS: Record<string, (a1: string, a2: string, a3: string) => string> =
  {
    tr: (a1, a2, a3) =>
      `ROL: Sen, Stanford mezunu, empatik bir performans psikoloğusun.
GÖREV: Kullanıcının 3 cevabını kullanarak, aşağıdaki 3 anahtarı dolduran bir JSON nesnesi oluştur. Her bir alan tek bir cümle olmalı. Tonun bilge, kısa ve güçlü olmalı.
1.  **pattern**: Cevap 1 (enerji) ve Cevap 2 (zorluk) arasındaki gözlemlenebilir düşünce kalıbını tanımla. Örneğin, "Enerjinin düşük olması, genellikle [Zorluk]'a odaklandığında ortaya çıkan bir kalıp gibi görünüyor."
2.  **potential**: Cevap 2'deki (zorluk) durumu yeniden çerçevele (reframe) ve içindeki gizli gücü veya potansiyeli ortaya çıkar. Örneğin, eğer zorluk 'mükemmeliyetçilik' ise potansiyel 'yüksek standartlara sahip olmak'tır. Eğer zorluk 'başkalarını memnun etme çabası' ise potansiyel 'derin bir empati yeteneği'dir. Cümlen, "Bu durum aynı zamanda [Gizli Potansiyel] gibi bir gücü de içinde barındırıyor." şeklinde olmalı.
3.  **first_step**: Cevap 3'ü (adım), bu yeni keşfedilen potansiyeli kullanarak kalıbı kırmak için atılacak ilk mantıklı eylem olarak sun. Cümlen, "Belirttiğin '[Küçük Adım]' adımı, bu gücünü kullanarak başlayabileceğin harika bir nokta." şeklinde olmalı.

CEVAPLAR:
- Zihinsel Enerji: "${a1}"
- En Çok Yoran Şey: "${a2}"
- Küçük Adım: "${a3}"

İSTENEN ÇIKTI (Sadece JSON): { "pattern": "...", "potential": "...", "first_step": "..." }`,

    en: (a1, a2, a3) =>
      `ROLE: You are an empathetic performance psychologist from Stanford.
TASK: Using the user's 3 answers, create a JSON object that fills the following 3 keys. Each field must be a single sentence. Your tone should be wise, concise, and powerful.
1.  **pattern**: Describe the observable thought pattern between Answer 1 (energy) and Answer 2 (challenge). E.g., "It seems to be a pattern that your low energy appears when you focus on [The Challenge]."
2.  **potential**: Reframe the situation in Answer 2 (challenge) and uncover the hidden strength or potential within it. E.g., if the challenge is 'perfectionism', the potential is 'having high standards'. If the challenge is 'people-pleasing', the potential is 'a deep capacity for empathy'. Your sentence should be like, "This situation also holds a hidden strength, such as [The Hidden Potential]."
3.  **first_step**: Present Answer 3 (the step) as the first logical action to break the pattern using this newly discovered potential. Your sentence should be like, "The small step you mentioned, '[The Small Step]', is an excellent place to start using this strength."

ANSWERS:
- Mental Energy: "${a1}"
- Biggest Drain: "${a2}"
- Small Step: "${a3}"

DESIRED OUTPUT (JSON only): { "pattern": "...", "potential": "...", "first_step": "..." }`,

    de: (a1, a2, a3) =>
      `ROLLE: Du bist ein einfühlsamer Leistungspsychologe aus Stanford.
AUFGABE: Erstelle anhand der 3 Antworten des Benutzers ein JSON-Objekt, das die folgenden 3 Schlüssel ausfüllt. Jedes Feld muss ein einziger Satz sein. Dein Ton sollte weise, prägnant und kraftvoll sein.
1.  **pattern**: Beschreibe das beobachtbare Denkmuster zwischen Antwort 1 (Energie) und Antwort 2 (Herausforderung). Z.B.: "Es scheint ein Muster zu sein, dass deine niedrige Energie auftritt, wenn du dich auf [Die Herausforderung] konzentrierst."
2.  **potential**: Formuliere die Situation in Antwort 2 (Herausforderung) neu und decke die verborgene Stärke oder das Potenzial darin auf. Z.B.: Wenn die Herausforderung 'Perfektionismus' ist, ist das Potenzial 'hohe Standards zu haben'. Wenn die Herausforderung 'People-Pleasing' ist, ist das Potenzial 'eine tiefe Fähigkeit zur Empathie'. Dein Satz sollte lauten: "Diese Situation birgt auch eine verborgene Stärke, wie zum Beispiel [Das verborgene Potenzial]."
3.  **first_step**: Präsentiere Antwort 3 (der Schritt) als die erste logische Handlung, um das Muster unter Nutzung dieses neu entdeckten Potenzials zu durchbrechen. Dein Satz sollte lauten: "Der kleine Schritt, den du erwähnt hast, '[Der kleine Schritt]', ist ein ausgezeichneter Ausgangspunkt, um diese Stärke zu nutzen."

ANTWORTEN:
- Mentale Energie: "${a1}"
- Größte Belastung: "${a2}"
- Kleiner Schritt: "${a3}"

GEWÜNSCHTE AUSGABE (Nur JSON): { "pattern": "...", "potential": "...", "first_step": "..." }`,
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
    // Hata durumunda güvenli fallback - yeni yapısal format
    return new Response(
      JSON.stringify({
        pattern:
          "Her yolculuk bir ilk adımla başlar ve sen o adımı atmaya hazırsın.",
        potential: "Zorlukların içinde her zaman büyüme potansiyeli gizlidir.",
        first_step: "Bu yolda ilerlemeye devam etmen, en büyük gücün olacak.",
      }),
      { status: 200 /*...*/ },
    );
  }
});
