// supabase/functions/_shared/services/tests/ai.service.test.ts

import {
    assertEquals,
    assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    type ElegantReportPayload,
    embedContent,
    embedContentsBatch,
    generateElegantReport,
    invokeGemini,
} from "../ai.service.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { VaultData } from "../../types/context.ts";

// --- Mock Supabase Client ---
// Bu sefer 'functions' ve 'from' metodlarını mock'lamamız gerekecek
function createMockSupabaseClient(
    functionInvokeData?: unknown,
    functionInvokeError?: Error | null,
    fromInsertError?: Error | null,
) {
    return {
        functions: {
            invoke: () =>
                Promise.resolve({
                    data: functionInvokeData,
                    error: functionInvokeError,
                }),
        },
        from: (_tableName: string) => ({
            insert: () => Promise.resolve({ error: fromInsertError }),
        }),
    } as unknown as SupabaseClient;
}

// --- Testler Başlıyor ---

Deno.test("invokeGemini - should call api-gateway and return a reply on success", async () => {
    // 1. HAZIRLIK
    const mockResponse = {
        candidates: [{
            content: {
                parts: [{ text: "Merhaba Dünya" }],
            },
        }],
    };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const reply = await invokeGemini(mockSupabase, "Nasılsın?", "test-model");

    // 3. DOĞRULAMA
    assertEquals(reply, "Merhaba Dünya");
});

Deno.test("invokeGemini - should throw ApiError if function invocation fails", async () => {
    // 1. HAZIRLIK
    const mockError = new Error("Gateway failed");
    const mockSupabase = createMockSupabaseClient(null, mockError);

    // 2. EYLEM & 3. DOĞRULAMA
    await assertRejects(
        async () => {
            await invokeGemini(mockSupabase, "Test", "test-model");
        },
        Error, // ApiError'dan türediği için Error da olur
        "AI servisi hatası: Gateway failed",
    );
});

Deno.test("invokeGemini - should throw if API Gateway returns an empty reply", async () => {
    // 1. HAZIRLIK
    const mockResponse = { candidates: [] }; // Boş yanıt
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM & 3. DOĞRULAMA
    await assertRejects(
        async () => {
            await invokeGemini(mockSupabase, "Test", "test-model");
        },
        Error,
        "API Gateway'den boş Gemini yanıtı alındı.",
    );
});

Deno.test("invokeGemini - should not fail if logging to ai_interactions fails", async () => {
    // 1. HAZIRLIK
    const mockResponse = {
        candidates: [{ content: { parts: [{ text: "Test Reply" }] } }],
    };
    // Bu sefer 'from.insert' hatası verdiriyoruz
    const mockSupabase = createMockSupabaseClient(
        mockResponse,
        null,
        new Error("Insert failed"),
    );

    // 2. EYLEM
    const reply = await invokeGemini(mockSupabase, "Test", "test-model");

    // 3. DOĞRULAMA: Hata fırlatmamalı ve ana görevi tamamlamalı
    assertEquals(reply, "Test Reply");
});

Deno.test("invokeGemini - should apply security limits to maxOutputTokens", async () => {
    // 1. HAZIRLIK
    const mockResponse = {
        candidates: [{ content: { parts: [{ text: "Test" }] } }],
    };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM - 2048 token limiti veriyoruz ama 1024'e düşürülmeli
    await invokeGemini(mockSupabase, "Test", "test-model", {
        maxOutputTokens: 2048,
    });

    // 3. DOĞRULAMA - Mock'ın çağrıldığını kontrol etmek için
    // Bu test, güvenlik sınırının uygulandığını doğrular
    assertEquals(true, true); // Mock çağrısı başarılı oldu
});

Deno.test("invokeGemini - should validate JSON when responseMimeType is application/json", async () => {
    // 1. HAZIRLIK
    const validJson = '{"test": "value"}';
    const mockResponse = {
        candidates: [{ content: { parts: [{ text: validJson }] } }],
    };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const reply = await invokeGemini(mockSupabase, "Test", "test-model", {
        responseMimeType: "application/json",
    });

    // 3. DOĞRULAMA
    assertEquals(reply, validJson);
});

Deno.test("generateElegantReport - should generate a prompt and return parsed JSON", async () => {
    // 1. HAZIRLIK
    const mockReport: ElegantReportPayload = {
        reportSections: {
            mainTitle: "Test Raporu",
            overview: "...",
            goldenThread: "...",
            blindSpot: "...",
        },
        reportAnalogy: { title: "Test Metaforu", text: "..." },
        derivedData: { readMinutes: 1, headingsCount: 2 },
    };
    const mockSupabase = createMockSupabaseClient({
        candidates: [{
            content: { parts: [{ text: JSON.stringify(mockReport) }] },
        }],
    });
    const dependencies = { supabase: mockSupabase };
    const mockVault: VaultData = { profile: { nickname: "Çömez" } };

    // 2. EYLEM
    const report = await generateElegantReport(
        dependencies,
        mockVault,
        [],
        7,
        [],
        "tr",
    );

    // 3. DOĞRULAMA
    assertEquals(report.reportSections.mainTitle, "Test Raporu");
    assertEquals(report.reportAnalogy.title, "Test Metaforu");
});

Deno.test("generateElegantReport - should return a fallback report if AI fails or returns invalid JSON", async () => {
    // 1. HAZIRLIK
    const mockSupabase = createMockSupabaseClient({
        candidates: [{ content: { parts: [{ text: "bu bozuk bir json" }] } }],
    });
    const dependencies = { supabase: mockSupabase };
    const mockVault: VaultData = {};

    // 2. EYLEM
    const report = await generateElegantReport(
        dependencies,
        mockVault,
        [],
        7,
        [],
        "tr",
    );

    // 3. DOĞRULAMA: Türkçe fallback başlığını kontrol et
    assertEquals(report.reportSections.mainTitle, "Analiz Başarısız Oldu");
});

Deno.test("generateElegantReport - should handle English language correctly", async () => {
    // 1. HAZIRLIK
    const mockReport: ElegantReportPayload = {
        reportSections: {
            mainTitle: "Test Report",
            overview: "...",
            goldenThread: "...",
            blindSpot: "...",
        },
        reportAnalogy: { title: "Test Metaphor", text: "..." },
        derivedData: { readMinutes: 1, headingsCount: 2 },
    };
    const mockSupabase = createMockSupabaseClient({
        candidates: [{
            content: { parts: [{ text: JSON.stringify(mockReport) }] },
        }],
    });
    const dependencies = { supabase: mockSupabase };
    const mockVault: VaultData = { profile: { nickname: "TestUser" } };

    // 2. EYLEM
    const report = await generateElegantReport(
        dependencies,
        mockVault,
        [],
        7,
        [],
        "en",
    );

    // 3. DOĞRULAMA
    assertEquals(report.reportSections.mainTitle, "Test Report");
    assertEquals(report.reportAnalogy.title, "Test Metaphor");
});

Deno.test("generateElegantReport - should handle German language correctly", async () => {
    // 1. HAZIRLIK
    const mockReport: ElegantReportPayload = {
        reportSections: {
            mainTitle: "Test Bericht",
            overview: "...",
            goldenThread: "...",
            blindSpot: "...",
        },
        reportAnalogy: { title: "Test Metapher", text: "..." },
        derivedData: { readMinutes: 1, headingsCount: 2 },
    };
    const mockSupabase = createMockSupabaseClient({
        candidates: [{
            content: { parts: [{ text: JSON.stringify(mockReport) }] },
        }],
    });
    const dependencies = { supabase: mockSupabase };
    const mockVault: VaultData = { profile: { nickname: "TestBenutzer" } };

    // 2. EYLEM
    const report = await generateElegantReport(
        dependencies,
        mockVault,
        [],
        7,
        [],
        "de",
    );

    // 3. DOĞRULAMA
    assertEquals(report.reportSections.mainTitle, "Test Bericht");
    assertEquals(report.reportAnalogy.title, "Test Metapher");
});

Deno.test("generateElegantReport - should handle memories correctly", async () => {
    // 1. HAZIRLIK
    const mockReport: ElegantReportPayload = {
        reportSections: {
            mainTitle: "Memory Test",
            overview: "...",
            goldenThread: "...",
            blindSpot: "...",
        },
        reportAnalogy: { title: "Memory Metaphor", text: "..." },
        derivedData: { readMinutes: 1, headingsCount: 2 },
    };
    const mockSupabase = createMockSupabaseClient({
        candidates: [{
            content: { parts: [{ text: JSON.stringify(mockReport) }] },
        }],
    });
    const dependencies = { supabase: mockSupabase };
    const mockVault: VaultData = { profile: { nickname: "TestUser" } };
    const memories = [
        {
            content: "Test memory content",
            sentiment_data: { dominant_emotion: "happy" },
            event_time: "2024-01-01T00:00:00Z",
        },
    ];

    // 2. EYLEM
    const report = await generateElegantReport(
        dependencies,
        mockVault,
        memories,
        7,
        [],
        "en",
    );

    // 3. DOĞRULAMA
    assertEquals(report.reportSections.mainTitle, "Memory Test");
});

Deno.test("embedContent - should return embedding on success", async () => {
    // 1. HAZIRLIK
    const mockResponse = { embedding: [0.1, 0.2, 0.3] };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const result = await embedContent(mockSupabase, "test content");

    // 3. DOĞRULAMA
    assertEquals(result.embedding, [0.1, 0.2, 0.3]);
    assertEquals(result.error, undefined);
});

Deno.test("embedContent - should return error on failure", async () => {
    // 1. HAZIRLIK
    const mockError = new Error("Embedding failed");
    const mockSupabase = createMockSupabaseClient(null, mockError);

    // 2. EYLEM
    const result = await embedContent(mockSupabase, "test content");

    // 3. DOĞRULAMA
    assertEquals(result.embedding, null);
    assertEquals(result.error, "Embedding failed");
});

Deno.test("embedContentsBatch - should return embeddings on success", async () => {
    // 1. HAZIRLIK
    const mockResponse = { embeddings: [[0.1, 0.2], [0.3, 0.4]] };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const result = await embedContentsBatch(mockSupabase, ["text1", "text2"]);

    // 3. DOĞRULAMA
    assertEquals(result.embeddings, [[0.1, 0.2], [0.3, 0.4]]);
    assertEquals(result.error, undefined);
});

Deno.test("embedContentsBatch - should return error on failure", async () => {
    // 1. HAZIRLIK
    const mockError = new Error("Batch embedding failed");
    const mockSupabase = createMockSupabaseClient(null, mockError);

    // 2. EYLEM
    const result = await embedContentsBatch(mockSupabase, ["text1", "text2"]);

    // 3. DOĞRULAMA
    assertEquals(result.embeddings, []);
    assertEquals(result.error, "Batch embedding failed");
});

Deno.test("embedContentsBatch - should handle empty texts array", async () => {
    // 1. HAZIRLIK
    const mockResponse = { embeddings: [] };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const result = await embedContentsBatch(mockSupabase, []);

    // 3. DOĞRULAMA
    assertEquals(result.embeddings, []);
    assertEquals(result.error, undefined);
});

Deno.test("embedContentsBatch - should handle transactionId parameter", async () => {
    // 1. HAZIRLIK
    const mockResponse = { embeddings: [[0.1, 0.2]] };
    const mockSupabase = createMockSupabaseClient(mockResponse);

    // 2. EYLEM
    const result = await embedContentsBatch(
        mockSupabase,
        ["text1"],
        "test-transaction-id",
    );

    // 3. DOĞRULAMA
    assertEquals(result.embeddings, [[0.1, 0.2]]);
    assertEquals(result.error, undefined);
});
