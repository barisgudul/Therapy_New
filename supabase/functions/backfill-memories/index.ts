// supabase/functions/backfill-memories/index.ts (NİHAİ VERSİYON)

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { embedContentsBatch, invokeGemini } from "../_shared/ai.service.ts";
import { extractContentFromEvent } from "../_shared/utils/event-helpers.ts";

// --- Tipler ---
interface BackfillEventRow {
  id: string;
  user_id: string;
  type: string;
  data: Record<string, unknown> | null;
  created_at: string;
  mood?: string;
}

interface ProcessableEvent {
  id: string;
  user_id: string;
  type: string;
  created_at: string;
  mood?: string;
  content: string;
}

// --- HELPER FONKSİYONLAR ---
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// extractContentFromEvent artık _shared/utils/event-helpers.ts içinden geliyor

async function processSingleEvent(
  adminClient: SupabaseClient,
  event: {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    mood?: string;
    type: string;
  },
) {
  const transaction_id = `backfill-${event.id}`;
  try {
    const { data: existing } = await adminClient.from("cognitive_memories")
      .select("id").eq("source_event_id", event.id).maybeSingle();
    if (existing) return { status: "skipped" } as const;

    console.log(`[Backfill] Event ${event.id} işleniyor...`);

    // --- process-memory mantığı (inline) ---
    const analysisPrompt =
      `### GÖREV: METİN DNA ANALİZİ ###\nSana verilen metni analiz et ve cevabını SADECE tek bir JSON objesi olarak ver.\n### METİN ###\n"${event.content}"\n### İSTENEN ÇIKTI FORMATI ###\n{\n  "sentiment_analysis": { "dominant_emotion": "Metindeki en baskın duygu", "intensity_score": 0.8, "valence": "pozitif" },\n  "stylometry_analysis": { "avg_sentence_length": 15, "lexical_density": 0.6 }\n}`;
    const rawAnalysis = await invokeGemini(
      analysisPrompt,
      "gemini-1.5-flash",
      { responseMimeType: "application/json" },
      transaction_id,
    );
    let sentiment_analysis: unknown;
    let stylometry_analysis: unknown;
    try {
      const parsed = JSON.parse(rawAnalysis) as {
        sentiment_analysis?: unknown;
        stylometry_analysis?: unknown;
      };
      sentiment_analysis = parsed.sentiment_analysis;
      stylometry_analysis = parsed.stylometry_analysis;
    } catch (_e) {
      throw new Error("AI analysis result is not valid JSON.");
    }

    const batchTexts = [
      event.content,
      `Duygusal Profil: ${JSON.stringify(sentiment_analysis)}`,
      `Yazım Stili: ${JSON.stringify(stylometry_analysis)}`,
    ];
    const batchRes = await embedContentsBatch(batchTexts, transaction_id);
    if (!batchRes.embeddings || batchRes.embeddings.length < 3) {
      throw new Error("Batch embedding sonuçları eksik.");
    }
    const [contentEmbedding, sentimentEmbedding, stylometryEmbedding] = batchRes
      .embeddings as (number[] | null)[];

    const { error: dbError } = await adminClient.from("cognitive_memories")
      .insert({
        user_id: event.user_id,
        source_event_id: event.id,
        content: event.content,
        event_time: event.created_at,
        sentiment_data: sentiment_analysis,
        stylometry_data: stylometry_analysis,
        content_embedding: contentEmbedding ?? null,
        sentiment_embedding: sentimentEmbedding ?? null,
        stylometry_embedding: stylometryEmbedding ?? null,
        transaction_id,
        mood: event.mood ?? null,
        event_type: event.type ?? null,
      });
    if (dbError) throw dbError;

    return { status: "processed" } as const;
  } catch (error) {
    console.error(
      `[Backfill] Event ${event.id} işlenirken hata:`,
      getErrorMessage(error),
    );
    return { status: "failed", error: getErrorMessage(error) } as const;
  }
}

// --- ANA FONKSİYON ---
Deno.serve(async (_req) => {
  if (_req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    console.log("--- NİHAİ HAFIZA CANLANDIRMA OPERASYONU ---");

    const { data: { users }, error: userError } = await adminClient.auth.admin
      .listUsers();
    if (userError) throw userError;

    let totalProcessed = 0, totalSkipped = 0, totalFailed = 0;

    for (const user of users ?? []) {
      console.log(`-> Kullanıcı ${user.id} için geçmiş taranıyor...`);
      const { data: eventsRaw, error: eventError } = await adminClient.from(
        "events",
      ).select("*").eq("user_id", user.id);
      if (eventError) {
        console.error(`Event çekilemedi:`, eventError);
        continue;
      }

      const events = (eventsRaw ?? []) as unknown[];
      const toProcess: ProcessableEvent[] = [];
      for (const e of events) {
        if (e && typeof e === "object") {
          const row = e as BackfillEventRow;
          const content = extractContentFromEvent({
            type: row.type,
            data: row.data,
          });
          if (content && content.length > 10) {
            toProcess.push({
              id: row.id,
              user_id: row.user_id,
              type: row.type,
              created_at: row.created_at,
              mood: row.mood,
              content,
            });
          }
        }
      }

      console.log(
        `-> Kullanıcı ${user.id} için ${toProcess.length} adet işlenecek anlamlı event bulundu.`,
      );

      // Paralel işlem (hız)
      const settled = await Promise.allSettled(
        toProcess.map((ev) => processSingleEvent(adminClient, ev)),
      );
      for (const r of settled) {
        if (r.status === "fulfilled") {
          if (r.value.status === "processed") totalProcessed++;
          else if (r.value.status === "skipped") totalSkipped++;
          else totalFailed++;
        } else {
          totalFailed++;
        }
      }
    }

    const summary =
      `--- OPERASYON TAMAMLANDI ---\n✅ İşlenen: ${totalProcessed}\n⏩ Atlanan: ${totalSkipped}\n❌ Başarısız: ${totalFailed}\n---------------------`;
    console.log(summary);
    return new Response(
      JSON.stringify({ message: "Backfill Tamamlandı", summary }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    console.error("KRİTİK HATA:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
