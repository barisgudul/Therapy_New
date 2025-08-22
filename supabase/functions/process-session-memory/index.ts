// supabase/functions/process-session-memory/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { invokeGemini } from "../_shared/ai.service.ts";

const getSummaryPrompt = (transcript: string) => `
Aşağıdaki sohbet transkriptini, sanki bir günlüğe not alıyormuş gibi, geçmiş zaman kipiyle ve birinci tekil şahıs ("ben") ağzından 2-3 cümlelik kısa bir anıya dönüştür. Bu anı, konuşmanın ana fikrini ve duygusunu yansıtmalıdır.

TRANSKRİPT:
${transcript}

ANI ÖZETİ (2-3 CÜMLE):
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { transcript } = await req.json();

    // Authorization header'dan JWT'yi al
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header eksik");
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await adminClient.auth.getUser(
      jwt,
    );

    if (authError || !user) {
      throw new Error("Kullanıcı doğrulanamadı.");
    }

    if (!transcript) {
      throw new Error("Transkript eksik.");
    }

    console.log(
      `🧠 [Memory] Kullanıcı ${user.id} için sohbet özeti oluşturuluyor...`,
    );

    // 1. AI ile özeti oluştur
    const summaryPrompt = getSummaryPrompt(transcript);
    const summary = await invokeGemini(summaryPrompt, "gemini-1.5-flash");

    if (!summary || summary.trim().length < 10) {
      throw new Error("AI'dan geçerli bir özet alınamadı.");
    }

    console.log(
      `📝 [Memory] Özet oluşturuldu: "${summary.substring(0, 100)}..."`,
    );

    // 2. cognitive_memories'e kaydet
    const { error: insertError } = await adminClient.from("cognitive_memories")
      .insert({
        user_id: user.id,
        content: summary,
        event_time: new Date().toISOString(),
        event_type: "text_session",
        // sentiment ve stylometry'yi şimdilik null geçebiliriz veya ayrı bir AI çağrısıyla üretebiliriz
        sentiment_data: null,
        stylometry_data: null,
      });

    if (insertError) {
      console.error(
        `❌ [Memory] cognitive_memories'e kayıt hatası:`,
        insertError,
      );
      throw insertError;
    }

    console.log(
      `✅ [Memory] Kullanıcı ${user.id} için hafıza kaydı başarıyla oluşturuldu.`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Hafıza kaydı oluşturuldu.",
        summary: summary.substring(0, 200) + "...", // Özetin ilk 200 karakterini döndür
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [Memory] process-session-memory hatası:`, errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
