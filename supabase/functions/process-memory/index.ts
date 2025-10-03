// supabase/functions/process-memory/index.ts

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabase-admin.ts";
import {
  embedContentsBatch,
  invokeGemini,
} from "../_shared/services/ai.service.ts";

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

// AI servisleri için interface
interface AiServices {
  invokeGemini: typeof invokeGemini;
  embedContentsBatch: typeof embedContentsBatch;
}

// Test edilebilir ana fonksiyon
async function handleProcessMemory(
  req: Request,
  providedClient?: SupabaseClient,
  providedAiServices?: AiServices,
): Promise<Response> {
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
      mood,
      event_type,
      transaction_id,
    } = body;

    // Gerekli alanları kontrol et
    if (!source_event_id || !user_id || !content || !event_time) {
      throw new Error(
        "Gerekli alanlar eksik: source_event_id, user_id, content, event_time",
      );
    }

    // Bağımlılıkları belirle - test için sahte olanları kullan veya gerçek olanları oluştur
    const adminClient = providedClient ?? getSupabaseAdmin();

    const aiServices = providedAiServices ?? {
      invokeGemini,
      embedContentsBatch,
    };

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

    let sentiment_analysis: unknown = null;
    let stylometry_analysis: unknown = null;
    try {
      const rawAnalysis = await aiServices.invokeGemini(
        adminClient,
        analysisPrompt,
        "gemini-1.5-flash",
        {
          responseMimeType: "application/json",
        },
        transaction_id,
      );
      try {
        const parsed = JSON.parse(rawAnalysis) as {
          sentiment_analysis?: unknown;
          stylometry_analysis?: unknown;
        };
        sentiment_analysis = parsed.sentiment_analysis ?? null;
        stylometry_analysis = parsed.stylometry_analysis ?? null;
      } catch (_e) {
        console.warn(
          "[Process-Memory] AI analiz JSON parse edilemedi, boş veri ile devam ediliyor.",
        );
      }
    } catch (e) {
      console.warn(
        "[Process-Memory] AI analiz çağrısı başarısız, boş veri ile devam.",
        e,
      );
    }

    // 2. ÜÇ FARKLI EMBEDDING'İ OLUŞTUR (İçerik, Duygu, Stil)
    // Batch embedding: tek çağrıda 3 metin
    const batchTexts = [
      content,
      `Duygusal Profil: ${JSON.stringify(sentiment_analysis)}`,
      `Yazım Stili: ${JSON.stringify(stylometry_analysis)}`,
    ];
    let contentEmbedding: number[] | null = null;
    let sentimentEmbedding: number[] | null = null;
    let stylometryEmbedding: number[] | null = null;
    try {
      const batchRes = await aiServices.embedContentsBatch(
        adminClient,
        batchTexts,
        transaction_id,
      );
      if (batchRes.embeddings && batchRes.embeddings.length >= 3) {
        [contentEmbedding, sentimentEmbedding, stylometryEmbedding] = batchRes
          .embeddings as (number[] | null)[];
      } else {
        console.warn(
          "[Process-Memory] Batch embedding sonuçları eksik/boş, null vektörlerle devam.",
        );
      }
    } catch (e) {
      console.warn(
        "[Process-Memory] Embedding çağrısı başarısız, null vektörlerle devam.",
        e,
      );
    }

    // 3. Veriyi cognitive_memories'e kaydet
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
        transaction_id: transaction_id ?? null,
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
        // Hata objesini değil, anlamlı bir Error objesi fırlat!
        throw new Error(`Veritabanı hatası: ${dbError.message}`);
      }
    }

    // TODO: FAZ 1.5 - Buradan user_vault ve user_traits de güncellenecek. Şimdilik bu kadar yeter.

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[Process-Memory] KRİTİK HATA:", getErrorMessage(error));
    // Kalıcı log
    try {
      const logClient = providedClient ?? getSupabaseAdmin();
      const payload = await req.text().catch(() => "");
      await logClient.from("system_logs").insert({
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
}

// Export the handler for testing
export { handleProcessMemory };

// Sunucuyu sadece dosya doğrudan çalıştırıldığında başlat
if (import.meta.main) {
  Deno.serve(async (req) => await handleProcessMemory(req));
}
