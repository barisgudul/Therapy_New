// supabase/functions/process-memory/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { embedContentsBatch, invokeGemini } from "../_shared/ai.service.ts";

// Gelen isteğin neye benzemesi gerektiğini tanımlıyoruz.
interface RequestBody {
  source_event_id: string;
  user_id: string;
  content: string;
  event_time: string;
  mood?: string;
  event_type: string;
  transaction_id?: string;
}

// Hata ayıklama için
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const {
      source_event_id,
      user_id,
      content,
      event_time,
      mood, // ARTIK BÖYLE
      event_type, // ARTIK BÖYLE
      transaction_id,
    } = body;

    console.log(
      `[Process-Memory][${
        transaction_id ?? "no-tx"
      }] Event ${source_event_id} için işlem başlıyor.`,
    );

    // 1. ZİHİNSEL DNA ANALİZİ (Duygu ve Stil)
    const analysisPrompt = `### GÖREV: METİN DNA ANALİZİ ###
    Sana verilen metni analiz et ve cevabını SADECE tek bir JSON objesi olarak ver.
    ### METİN ###
    "${content}"
    ### İSTENEN ÇIKTI FORMATI ###
    {
      "sentiment_analysis": { "dominant_emotion": "Metindeki en baskın duygu", "intensity_score": 0.8, "valence": "pozitif" },
      "stylometry_analysis": { "avg_sentence_length": 15, "lexical_density": 0.6 }
    }`;

    const rawAnalysis = await invokeGemini(
      analysisPrompt,
      "gemini-1.5-flash",
      {
        responseMimeType: "application/json",
      },
      transaction_id,
    );
    let analysisResult: unknown;
    try {
      analysisResult = JSON.parse(rawAnalysis);
    } catch (_e) {
      console.error(
        "[Process-Memory] AI'dan gelen analiz sonucu JSON değil:",
        rawAnalysis,
      );
      throw new Error("AI analysis result is not valid JSON.");
    }
    const { sentiment_analysis, stylometry_analysis } = analysisResult as {
      sentiment_analysis: unknown;
      stylometry_analysis: unknown;
    };

    // 2. ÜÇ FARKLI EMBEDDING'İ OLUŞTUR (İçerik, Duygu, Stil)
    // Batch embedding: tek çağrıda 3 metin
    const batchTexts = [
      content,
      `Duygusal Profil: ${JSON.stringify(sentiment_analysis)}`,
      `Yazım Stili: ${JSON.stringify(stylometry_analysis)}`,
    ];
    const batchRes = await embedContentsBatch(batchTexts, transaction_id);
    if (!batchRes.embeddings || batchRes.embeddings.length === 0) {
      throw new Error("Batch embedding sonuçları boş döndü.");
    }
    const [contentEmbedding, sentimentEmbedding, stylometryEmbedding] = batchRes
      .embeddings as (number[] | null)[];

    // 3. Veriyi cognitive_memories'e kaydet
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: dbError } = await adminClient.from("cognitive_memories")
      .insert({
        user_id,
        source_event_id,
        content,
        event_time,
        sentiment_data: sentiment_analysis,
        stylometry_data: stylometry_analysis,
        content_embedding: contentEmbedding ?? null,
        sentiment_embedding: sentimentEmbedding ?? null,
        stylometry_embedding: stylometryEmbedding ?? null,
        transaction_id,
        mood: mood ?? null,
        event_type: event_type ?? null,
      });

    if (dbError) {
      // Eğer event zaten varsa (duplicate call), bu bir hata değil.
      if (dbError.code === "23505") { // unique_violation
        console.warn(
          `[Process-Memory][${
            transaction_id ?? "no-tx"
          }] Event ${source_event_id} zaten işlenmiş. Atlanıyor.`,
        );
      } else {
        throw dbError;
      }
    }

    console.log(
      `✅ [Process-Memory][${
        transaction_id ?? "no-tx"
      }] Event ${source_event_id} başarıyla hafızaya işlendi.`,
    );

    // TODO: FAZ 1.5 - Buradan user_vault ve user_traits de güncellenecek. Şimdilik bu kadar yeter.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[Process-Memory] KRİTİK HATA:", getErrorMessage(error));
    // Kalıcı log
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const payload = await req.text().catch(() => "");
      await adminClient.from("system_logs").insert({
        function_name: "process-memory",
        log_level: "ERROR",
        message: getErrorMessage(error),
        payload: payload || null,
      });
    } catch (_logErr) {
      // swallow
    }
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
