// supabase/functions/embed-memory/index.ts (PROD'A HAZIR VERSİYON)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 🔥 DÜZELTME: Gelen verilerin tiplerini net bir şekilde tanımlıyoruz. 'any' yok.
interface RequestBody {
  user_id: string;
  content: string;
  metadata: Record<string, unknown>;
  event: {
    id: number;
    created_at: string;
    mood?: string;
  };
  // vault'u şimdilik kullanmıyoruz, ama gelecekte kullanacağız.
  // Kullanmadığımız için değişken adını '_' ile başlatıyoruz ki linter sussun.
  _vault: Record<string, unknown>;
}

// Bu sınıfı şimdilik burada tutuyoruz.
class TimeEmbeddingGenerator {
  static generate(
    event: RequestBody["event"],
    _vault: RequestBody["_vault"],
  ): number[] {
    const time = new Date(event.created_at);
    const features = [
      time.getHours() / 23,
      time.getDay() / 6,
      (new Date(time.getFullYear(), 0, 1).getTime() - time.getTime()) /
            86400000 % 30 / 29,
      this.calculateMoodVelocity(event, _vault),
      0,
    ];
    return this.padVector(features, 768);
  }
  private static calculateMoodVelocity(
    event: RequestBody["event"],
    _vault: RequestBody["_vault"],
  ): number {
    const moodMap: Record<string, number> = {
      "mutlu": 1,
      "neşeli": 0.8,
      "huzurlu": 0.6,
      "nötr": 0,
      "yorgun": -0.4,
      "üzgün": -0.8,
      "kaygılı": -1,
    };
    return moodMap[event.mood || "nötr"] || 0;
  }
  private static padVector(features: number[], targetLength: number): number[] {
    const padded = [...features];
    while (padded.length < targetLength) {
      padded.push(0);
    }
    return padded;
  }
}

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

    // Gelen isteği tanımladığımız tipe göre cast ediyoruz.
    const { user_id, content, metadata, event, _vault } = await req
      .json() as RequestBody;
    if (!content || !user_id || !event) {
      throw new Error(
        'İstek içinde "content", "user_id" ve "event" alanları zorunludur.',
      );
    }

    const googleApiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`;
    const apiResponse = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/embedding-001`,
        content: { parts: [{ text: content }] },
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.json();
      const errorMessage = errorBody?.error?.message ||
        JSON.stringify(errorBody);
      throw new Error(
        `Google API hatası: ${apiResponse.status} - ${errorMessage}`,
      );
    }

    const responseJson = await apiResponse.json();
    const contentEmbeddingVector = responseJson.embedding?.values;
    if (!contentEmbeddingVector) {
      throw new Error("Google API yanıtı 'embedding' vektörü içermiyor.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const time_vector = TimeEmbeddingGenerator.generate(event, _vault);

    const { error: dbError } = await supabaseAdmin.from("event_time_embeddings")
      .insert({
        user_id,
        event_id: event.id,
        content,
        event_time: event.created_at,
        content_vector: contentEmbeddingVector,
        time_vector,
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
  } catch (error: unknown) {
    return new Response(JSON.stringify({ error: getErrorMessage(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
