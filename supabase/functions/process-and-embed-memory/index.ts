// supabase/functions/process-and-embed-memory/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Tipleri tanımla, gevşekliğe yer yok.
interface ProcessRequestBody {
    source_event_id: number;
    user_id: string;
    content: string;
    event_time: string;
    mood?: string;
}

// Hata ayıklama için standart yardımcımız.
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
}

// ANA İŞİ YAPAN FONKSİYON
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // --- 1. Gerekli Bilgileri Al ---
        const { source_event_id, user_id, content, event_time } = await req
            .json() as ProcessRequestBody;
        const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
        const adminClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY sırrı bulunamadı.");
        }

        // --- 2. Zihinsel DNA Analizi İçin Gemini'yi Çağır ---
        const analysisPrompt = `
### GÖREV: METİN DNA ANALİZİ ###
Sana verilen metni analiz et ve cevabını SADECE tek bir JSON objesi olarak ver.
### METİN ###
"${content}"
### İSTENEN ÇIKTI FORMATI ###
{
  "sentiment_analysis": { "dominant_emotion": "Metindeki en baskın duygu", "secondary_emotion": "İkinci en baskın duygu", "intensity_score": "Duygusal yoğunluğun 0.0-1.0 skoru", "valence": "'pozitif', 'negatif', veya 'nötr'" },
  "stylometry_analysis": { "avg_sentence_length": "Ortalama cümle uzunluğu (kelime sayısı)", "lexical_density": "Kelime çeşitliliğinin 0.0-1.0 skoru", "pronoun_ratio": { "first_person_singular": "1. tekil şahıs zamirlerinin oranı (0.0-1.0)", "first_person_plural": "1. çoğul şahıs zamirlerinin oranı (0.0-1.0)" } }
}`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: analysisPrompt }] }],
                    generationConfig: { responseMimeType: "application/json" },
                }),
            },
        );

        if (!geminiRes.ok) {
            const errorBody = await geminiRes.text();
            throw new Error(`Gemini analiz hatası: ${errorBody}`);
        }

        const geminiData = await geminiRes.json();
        const analysisResult = JSON.parse(
            geminiData.candidates[0].content.parts[0].text,
        );
        const { sentiment_analysis, stylometry_analysis } = analysisResult;

        // --- 3. ÜÇ FARKLI EMBEDDING'İ OLUŞTUR ---
        const embeddingRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:batchEmbedContents?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requests: [
                        {
                            model: "models/embedding-001",
                            content: { parts: [{ text: content }] },
                        },
                        {
                            model: "models/embedding-001",
                            content: {
                                parts: [{
                                    text: `Duygusal Profil: ${
                                        JSON.stringify(sentiment_analysis)
                                    }`,
                                }],
                            },
                        },
                        {
                            model: "models/embedding-001",
                            content: {
                                parts: [{
                                    text: `Yazım Stili: ${
                                        JSON.stringify(stylometry_analysis)
                                    }`,
                                }],
                            },
                        },
                    ],
                }),
            },
        );

        if (!embeddingRes.ok) {
            const errorBody = await embeddingRes.text();
            throw new Error(`Embedding hatası: ${errorBody}`);
        }

        const embeddingData = await embeddingRes.json();
        const content_embedding = embeddingData.embeddings[0].values;
        const sentiment_embedding = embeddingData.embeddings[1].values;
        const stylometry_embedding = embeddingData.embeddings[2].values;

        // --- 4. Zenginleştirilmiş Veriyi Veritabanına Kaydet ---
        const { error: dbError } = await adminClient.from("cognitive_memories")
            .insert({
                user_id,
                source_event_id,
                content,
                event_time,
                sentiment_data: sentiment_analysis,
                stylometry_data: stylometry_analysis,
                content_embedding,
                sentiment_embedding,
                stylometry_embedding,
            });

        if (dbError) throw dbError;

        return new Response(
            JSON.stringify({
                message:
                    "Zihinsel DNA başarıyla işlendi ve hafızaya kaydedildi.",
            }),
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
