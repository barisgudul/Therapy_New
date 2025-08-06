// services/rag.service.ts
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { PromptTemplate } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { AI_MODELS } from '../constants/AIConfig';
import { supabase } from '../utils/supabase';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY; 

// İŞTE KARARIMIZIN KODA DÖKÜLMÜŞ HALİ: SAĞLAM, GÜVENİLİR MODEL
const embeddingsForRetrieval = new GoogleGenerativeAIEmbeddings({
    apiKey: GEMINI_API_KEY,
    model: "embedding-001"
});

export function addMemoryAsync(userId: string, content: string, metadata: Record<string, any> = {}): void {
    supabase.functions.invoke('embed-memory', {
        body: { user_id: userId, content: content, metadata: metadata },
    }).then(({ error }) => {
        if (error) console.error(`[RAG] 'embed-memory' tetiklenemedi:`, error);
    });
}

export async function queryWithContext(userId: string, question: string, promptTemplate: PromptTemplate): Promise<string> {
    console.log("[RAG_SERVICE] Manuel RAG süreci başlıyor...");

    // ADIM 1: RETRIEVAL (Bu kısım LangChain ile kalabilir, çünkü Supabase entegrasyonu iyi çalışıyor)
    const vectorStore = new SupabaseVectorStore(embeddingsForRetrieval, {
        client: supabase,
        tableName: 'memory_embeddings',
        queryName: 'match_documents',
        filter: { user_id: userId }
    });
    const retriever = vectorStore.asRetriever({ k: 5 });
    const relevantDocs = await retriever.getRelevantDocuments(question);
    const context = relevantDocs.map((d) => d.pageContent).join("\n---\n");
    console.log("[RAG_SERVICE] Geçmiş anılar çekildi. Context uzunluğu:", context.length);

    // ADIM 2: PROMPT OLUŞTURMA
    const finalPrompt = await promptTemplate.format({
        context: context || "Geçmiş anı bulunamadı.",
        question: question
    });
    console.log("[RAG_SERVICE] Final prompt oluşturuldu.");

    // ADIM 3: GENERATION (MANUEL FETCH İLE)
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS.FAST}:generateContent?key=${GEMINI_API_KEY}`;
    
    const apiResponse = await fetch(googleApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: finalPrompt }] }],
        }),
    });

    if (!apiResponse.ok) {
        const errorBody = await apiResponse.json();
        throw new Error(`Google API error: ${apiResponse.status} - ${JSON.stringify(errorBody)}`);
    }

    const responseJson = await apiResponse.json();
    
    // YENİ, KURŞUN GEÇİRMEZ PARSER
    let resultText: string | undefined;
    try {
        resultText = responseJson.candidates[0].content.parts[0].text;
    } catch (e) {
        console.error("API yanıtını parse ederken birincil yöntem başarısız oldu, tüm yanıtı logluyorum:", JSON.stringify(responseJson, null, 2));
        // Eğer birincil yöntem çalışmazsa, bu genellikle güvenlik filtresi veya başka bir sorundur.
        // Hata mesajını daha anlamlı hale getirelim.
        const finishReason = responseJson.candidates?.[0]?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
             throw new Error(`AI üretimi durdurdu. Sebep: ${finishReason}`);
        }
    }

    if (!resultText) {
        throw new Error("AI'dan geçerli bir metin yanıtı alınamadı. Yanıt yapısı beklenmedik olabilir.");
    }
    
    console.log("[RAG_SERVICE] Manuel RAG süreci başarıyla tamamlandı.");
    return resultText;
}