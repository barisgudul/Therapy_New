// supabase/functions/embed-memory/index.ts (STERİLİZE EDİLMİŞ VE TAŞ GİBİ VERSİYON)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_EMBEDDING_MODEL = "embedding-001";

// 🔥 DÜZELTME 1: Hataları güvenli bir şekilde metne çeviren o sihirli fonksiyon.
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY sunucu sırrı bulunamadı.");
    }

    const { content, user_id, metadata = {} } = await req.json();
    if (!content || !user_id) {
      throw new Error(
        'İstek içinde "content" ve "user_id" alanları zorunludur.',
      );
    }

    // --- MANUEL API ÇAĞRISI ---
    const googleApiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;

    const apiResponse = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${GEMINI_EMBEDDING_MODEL}`,
        content: { parts: [{ text: content }] },
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json();
      // Hata mesajını daha anlaşılır hale getiriyoruz.
      const errorMessage = errorBody?.error?.message ||
        JSON.stringify(errorBody);
      throw new Error(
        `Google API hatası: ${apiResponse.status} - ${errorMessage}`,
      );
    }

    const responseJson = await apiResponse.json();
    const embeddingVector = responseJson.embedding?.values;
    if (!embeddingVector) {
      throw new Error(
        "Google API yanıtı, beklenen 'embedding' vektörünü içermiyor.",
      );
    }
    // --- MANUEL API ÇAĞRISI BİTTİ ---

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: dbError } = await supabaseAdmin.from("memory_embeddings")
      .insert({
        user_id,
        content,
        embedding: embeddingVector,
        metadata,
      });
    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({ message: "Embedding işlemi başarıyla tamamlandı." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) { // 🔥 DÜZELTME 2: Artık 'unknown' tipini güvenli bir şekilde yakalıyoruz.
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
