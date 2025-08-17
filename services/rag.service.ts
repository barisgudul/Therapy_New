// services/rag.service.ts
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { AI_MODELS } from "../constants/AIConfig";
import { supabase } from "../utils/supabase";
import { invokeGemini } from "./ai.service";

// API key'i ortam değişkenlerinden al
const getGeminiApiKey = (): string => {
  // React Native için process.env kullan
  // deno-lint-ignore no-process-global
  const fromEnv = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;

  throw new Error(
    "GEMINI_API_KEY veya GOOGLE_API_KEY ortam değişkeni bulunamadı",
  );
};

// ————————————————————————————————————————————————
// Query Niyet Çözücü (Prefrontal Korteks)
// ————————————————————————————————————————————————
type QueryIntent =
  | "emotion_expression"
  | "event_recall"
  | "pattern_inquiry"
  | "unknown";

async function analyzeQueryIntent(query: string): Promise<QueryIntent> {
  const prompt =
    `Bir kullanıcının sorgusunu analiz et ve niyetini şu kategorilerden biriyle etiketle: 'emotion_expression' (bir duygu ifade ediyor), 'event_recall' (geçmiş bir olayı hatırlamaya çalışıyor), 'pattern_inquiry' (bir davranış kalıbı hakkında soru soruyor). Sorgu: "${query}"`;

  try {
    const classification = await invokeGemini(prompt, AI_MODELS.FAST, {
      maxOutputTokens: 20,
    });

    const normalized = classification.toLowerCase();
    if (normalized.includes("emotion_expression")) {
      return "emotion_expression";
    }
    if (normalized.includes("event_recall")) return "event_recall";
    if (normalized.includes("pattern_inquiry")) return "pattern_inquiry";
    return "unknown";
  } catch (e) {
    console.error("Sorgu niyeti analizi başarısız:", e);
    return "unknown";
  }
}

// ————————————————————————————————————————————————
// Embed Helper: Sorguyu Gemini ile vektörle (lazy init + güvenli fallback)
// ————————————————————————————————————————————————
async function embedQuery(query: string): Promise<number[]> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    // Test/CI veya anahtarsız ortamlarda güvenli fallback: boş vektör
    return [];
  }
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: "embedding-001",
  });
  return await embeddings.embedQuery(query);
}

// ————————————————————————————————————————————————
// Çok Katmanlı Arama: İçerik, Duygu ve Stil katmanları
// ————————————————————————————————————————————————
type MatchRow = { id: string | number; content: string; score: number };
export type SourceLayer = "content" | "sentiment" | "stylometry";

export async function retrieveContext(
  userId: string,
  query: string,
): Promise<{ content: string; source_layer: SourceLayer }[]> {
  // 1) Niyeti anla
  const intent = await analyzeQueryIntent(query);

  // 2) Ağırlıkları belirle
  let weights: { content: number; sentiment: number; stylometry: number } = {
    content: 0.6,
    sentiment: 0.3,
    stylometry: 0.1,
  };
  if (intent === "emotion_expression") {
    weights = { content: 0.2, sentiment: 0.7, stylometry: 0.1 };
  } else if (intent === "event_recall") {
    weights = { content: 0.8, sentiment: 0.2, stylometry: 0.0 };
  }

  // 3) Sorguyu embed et
  const queryEmbedding = await embedQuery(query);

  // 4) Katmanlı aramaları paralel yap
  const MATCH_COUNT = 12;
  const MATCH_THRESHOLD = 0;

  const [contentRes, sentimentRes, stylometryRes] = await Promise.all([
    supabase.rpc("match_memories_by_content", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    }),
    supabase.rpc("match_memories_by_sentiment", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    }),
    supabase.rpc("match_memories_by_stylometry", {
      p_user_id: userId,
      query_embedding: queryEmbedding,
      match_count: MATCH_COUNT,
      match_threshold: MATCH_THRESHOLD,
    }),
  ]);

  // 5) AKILLI BİRLEŞTİRME - Tek geçişte skorları topla ve dominant katmanı belirle
  const fused = new Map<
    string | number,
    {
      content: string;
      score: number;
      dominant_layer: SourceLayer;
      dominant_score: number;
    }
  >();

  const processMatches = (
    matches: MatchRow[] | null,
    weight: number,
    layer: SourceLayer,
  ) => {
    if (!matches || weight <= 0) return;
    for (const m of matches) {
      const weightedScore = (m.score ?? 0) * weight;
      const prev = fused.get(m.id);
      if (prev) {
        // Skoru ekle ve eğer bu katmanın katkısı daha yüksekse, dominant katmanı güncelle
        if (weightedScore > prev.dominant_score) {
          prev.dominant_layer = layer;
          prev.dominant_score = weightedScore;
        }
        prev.score += weightedScore;
      } else {
        // Yeni olarak ekle ve bu katmanı dominant olarak ayarla
        fused.set(m.id, {
          content: m.content,
          score: weightedScore,
          dominant_layer: layer,
          dominant_score: weightedScore,
        });
      }
    }
  };

  // Her katmanı işle
  processMatches(
    contentRes.data as MatchRow[] | null,
    weights.content,
    "content",
  );
  processMatches(
    sentimentRes.data as MatchRow[] | null,
    weights.sentiment,
    "sentiment",
  );
  processMatches(
    stylometryRes.data as MatchRow[] | null,
    weights.stylometry,
    "stylometry",
  );

  // 6) Sonucu sırala ve formatla
  const sorted = Array.from(fused.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  return sorted.map((item) => ({
    content: item.content,
    source_layer: item.dominant_layer,
  }));
}

export async function queryWithContext(
  userId: string,
  question: string,
  promptTemplate?: PromptTemplate,
): Promise<string> {
  console.log("[RAG_SERVICE] 🧠 Algısal Sentez başlıyor...");

  const synthesizedContext = await retrieveContext(userId, question);
  const formattedContext = synthesizedContext
    .map((c) => `- (Kaynak: ${c.source_layer}) ${c.content}`)
    .join("\n");

  let finalPrompt: string;
  if (promptTemplate) {
    // Özel şablon ile (ör. rüya analizi JSON çıktısı)
    finalPrompt = await promptTemplate.format({
      context: formattedContext,
      question,
    });
  } else {
    // Genel ve etiketli prompt
    finalPrompt = `
### BAĞLAM DOSYASI (En Alakalı Anılar) ###
${formattedContext}

### KULLANICI SORUSU ###
"${question}"

### GÖREVİN ###
Sen bir "bilinç sentezleyicisisin". Sana sunulan, farklı katmanlardan (olay, duygu) gelen en alakalı anıları birleştirerek, kullanıcıya daha önce hiç fark etmediği bir bağlantıyı gösteren derin bir cevap üret.`
      .trim();
  }

  try {
    const resultText = await invokeGemini(finalPrompt, AI_MODELS.POWERFUL, {
      temperature: 0.7,
      maxOutputTokens: 1500,
    });
    console.log("[RAG_SERVICE] ✅ Algısal Sentez tamamlandı.");
    return resultText;
  } catch (error) {
    console.error("[RAG_SERVICE] ❌ Nihai cevap üretiminde hata:", error);
    throw new Error(
      "RAG süreci sırasında bir hata oluştu. Lütfen tekrar deneyin.",
    );
  }
}
