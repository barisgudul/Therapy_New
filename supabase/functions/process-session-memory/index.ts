// supabase/functions/process-session-memory/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabase as adminClient } from "../_shared/supabase-admin.ts";
import * as AiService from "../_shared/ai.service.ts";
import { config, LLM_LIMITS } from "../_shared/config.ts";

const getSummaryPrompt = (transcript: string) =>
  `Bu sohbet transkriptini analiz et ve özetle. Ana temaları, duyguları ve önemli noktaları çıkar. Özet, hafıza sisteminde saklanacak ve gelecekteki sohbetlerde kullanılacak. Transkript:

${transcript}

Özet:`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await adminClient.auth.getUser(jwt);
    if (!user) throw new Error("Kullanıcı doğrulanamadı.");

    const { messages, eventId, language } = await req.json(); // eventId'yi client'tan alacağız
    if (!messages || messages.length < 2) {
      throw new Error("Özetlenecek kadar mesaj yok.");
    }
    if (!eventId) throw new Error("Kaynak event ID'si eksik.");

    const transcript = messages.map((m: { sender: string; text: string }) =>
      `${m.sender === "user" ? "Ben" : "O"}: ${m.text}`
    ).join("\n");

    // Dil belirleme: tr/en/de dışı ise en olarak ayarla
    const lang = ["tr", "en", "de"].includes(String(language))
      ? String(language)
      : "en";

    // Dil-duyarlı kısa istem başı ekleyelim (özeti aynı dilde üretmesi için)
    const langHint: Record<string, string> = {
      tr: "Özetini tamamen Türkçe yaz.",
      en: "Write the summary entirely in English.",
      de: "Schreibe die Zusammenfassung vollständig auf Deutsch.",
    };

    const summary = await AiService.invokeGemini(
      `${langHint[lang]}\n\n${getSummaryPrompt(transcript)}`,
      config.AI_MODELS.INTENT,
      { maxOutputTokens: LLM_LIMITS.SESSION_SUMMARY },
    );
    if (!summary || summary.trim().length < 10) {
      throw new Error("AI'dan geçerli özet alınamadı.");
    }

    // İŞTE KRİTİK DEĞİŞİKLİK BURADA!
    // Özeti doğrudan veritabanına kaydetmek yerine, asıl işi yapan 'process-memory' function'ını çağırıyoruz.
    const { error: invokeError } = await adminClient.functions.invoke(
      "process-memory",
      {
        body: {
          source_event_id: eventId,
          user_id: user.id,
          content: summary,
          event_time: new Date().toISOString(),
          event_type: "text_session_summary", // Tipini değiştirelim ki karışmasın
        },
      },
    );

    if (invokeError) {
      throw new Error(
        `process-memory'i tetiklerken hata: ${invokeError.message}`,
      );
    }

    console.log(
      `✅ [Process-Session-Memory] Hafıza işleme, ${eventId} için başarıyla tetiklendi.`,
    );

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
