// services/rag.service.ts
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { AI_MODELS } from "../constants/AIConfig";
import { supabase } from "../utils/supabase";
import { invokeGemini } from "./ai.service";

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// İŞTE KARARIMIZIN KODA DÖKÜLMÜŞ HALİ: SAĞLAM, GÜVENİLİR MODEL
const embeddingsForRetrieval = new GoogleGenerativeAIEmbeddings({
    apiKey: GEMINI_API_KEY,
    model: "embedding-001",
});

// Artık 'event' ve 'vault' objelerini de kabul ediyor.
export async function addMemoryAsync(
    userId: string,
    content: string,
    event: any,
    vault: any,
    metadata: Record<string, any> = {},
): Promise<void> {
    const { error } = await supabase.functions.invoke("embed-memory", {
        body: { user_id: userId, content, event, vault, metadata },
    });

    if (error) {
        console.error(`[RAG] 'embed-memory' tetiklenemedi:`, error);
        // Hata fırlatma, arka plan işlemi olduğu için UI'ı çökertmesin.
    }
}

// YENİ: Akıllı Re-ranking için yardımcı fonksiyon
async function rerankDocuments(
    question: string,
    documents: any[],
): Promise<string> {
    if (documents.length === 0) {
        return "Geçmiş anı bulunamadı.";
    }

    if (documents.length <= 3) {
        // 3 veya daha az doküman varsa direkt birleştir
        return documents.map((d) => d.pageContent).join("\n---\n");
    }

    console.log(
        `[RAG_RE-RANKING] ${documents.length} doküman arasından en alakalı 3 tanesi seçiliyor...`,
    );

    // Dokümanları formatla
    const formattedDocs = documents.map((doc, index) =>
        `DOKÜMAN ${index + 1}:\n${doc.pageContent}\n`
    ).join("\n");

    const rerankPrompt = `
SORU: "${question}"

AŞAĞIDAKİ DOKÜMANLAR ARASINDAN, BU SORUYA EN ÇOK IŞIK TUTAN 3 TANESİNİ SEÇ:

${formattedDocs}

GÖREV: Bu soruya en alakalı 3 dokümanın içeriğini seç ve birleştir. 
Sadece seçtiğin dokümanların içeriğini ver, başka açıklama yapma.
Eğer hiçbiri alakalı değilse "Bu soru için alakalı geçmiş anı bulunamadı." yaz.

SEÇİLEN DOKÜMANLAR:
`;

    try {
        const selectedContext = await invokeGemini(
            rerankPrompt,
            AI_MODELS.FAST,
            {
                temperature: 0.3,
                maxOutputTokens: 1000,
            },
        );

        console.log(
            `[RAG_RE-RANKING] Re-ranking tamamlandı. Seçilen context uzunluğu: ${selectedContext.length}`,
        );
        return selectedContext;
    } catch (error) {
        console.error(
            "[RAG_RE-RANKING] Re-ranking hatası, ilk 3 doküman kullanılıyor:",
            error,
        );
        // Hata durumunda ilk 3 dokümanı kullan
        return documents.slice(0, 3).map((d) => d.pageContent).join("\n---\n");
    }
}

// YENİ: Debug ve test fonksiyonları
export async function debugRAGPipeline(
    userId: string,
    question: string,
): Promise<{
    step1_retrieval: any[];
    step2_reranking: string;
    step3_finalPrompt: string;
}> {
    console.log("[RAG_DEBUG] 🐛 Debug modu başlatılıyor...");

    // ADIM 1: Geniş arama
    const vectorStore = new SupabaseVectorStore(embeddingsForRetrieval, {
        client: supabase,
        tableName: "memory_embeddings",
        queryName: "match_documents",
        filter: { user_id: userId },
    });

    const retriever = vectorStore.asRetriever({ k: 12 });
    const potentialDocs = await retriever.getRelevantDocuments(question);

    console.log(
        `[RAG_DEBUG] 📚 Adım 1: ${potentialDocs.length} doküman bulundu`,
    );

    // ADIM 2: Re-ranking
    const bestContext = await rerankDocuments(question, potentialDocs);

    // ADIM 3: Final prompt (örnek)
    const samplePromptTemplate = PromptTemplate.fromTemplate(
        "Context: {context}\n\nSoru: {question}\n\nCevap:",
    );
    const finalPrompt = await samplePromptTemplate.format({
        context: bestContext,
        question: question,
    });

    return {
        step1_retrieval: potentialDocs.map((doc) => ({
            content: doc.pageContent.substring(0, 100) + "...",
            metadata: doc.metadata,
        })),
        step2_reranking: bestContext,
        step3_finalPrompt: finalPrompt,
    };
}

export async function queryWithContext(
    userId: string,
    question: string,
    promptTemplate: PromptTemplate,
): Promise<string> {
    console.log("[RAG_SERVICE] 🧠 Akıllı RAG süreci başlıyor...");

    // ADIM 1: GENİŞ ARAMA - Daha fazla potansiyel doküman al
    const vectorStore = new SupabaseVectorStore(embeddingsForRetrieval, {
        client: supabase,
        tableName: "memory_embeddings",
        queryName: "match_documents",
        filter: { user_id: userId },
    });

    // 5 yerine 12 doküman al (daha geniş arama)
    const retriever = vectorStore.asRetriever({ k: 12 });
    const potentialDocs = await retriever.getRelevantDocuments(question);

    console.log(
        `[RAG_SERVICE] 📚 ${potentialDocs.length} potansiyel doküman bulundu.`,
    );

    // ADIM 2: AKILLI ELEME (RE-RANKING) - En alakalı 3 dokümanı seç
    const bestContext = await rerankDocuments(question, potentialDocs);
    console.log(
        `[RAG_SERVICE] 🎯 Re-ranking tamamlandı. Final context uzunluğu: ${bestContext.length}`,
    );

    // ADIM 3: NİHAİ PROMPT OLUŞTURMA
    const finalPrompt = await promptTemplate.format({
        context: bestContext,
        question: question,
    });
    console.log("[RAG_SERVICE] 📝 Final prompt oluşturuldu.");

    // ADIM 4: NİHAİ CEVAP ÜRETİMİ - Güçlü modelle
    try {
        const resultText = await invokeGemini(finalPrompt, AI_MODELS.POWERFUL, {
            temperature: 0.7,
            maxOutputTokens: 1500,
        });

        console.log("[RAG_SERVICE] ✅ Akıllı RAG süreci başarıyla tamamlandı.");
        return resultText;
    } catch (error) {
        console.error("[RAG_SERVICE] ❌ Nihai cevap üretiminde hata:", error);
        throw new Error(
            "RAG süreci sırasında bir hata oluştu. Lütfen tekrar deneyin.",
        );
    }
}
