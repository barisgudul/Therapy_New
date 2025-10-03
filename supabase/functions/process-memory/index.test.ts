// supabase/functions/process-memory/index.test.ts

import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handleProcessMemory } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
    embedContentsBatch,
    invokeGemini,
} from "../_shared/services/ai.service.ts";

// ORTAM DEĞİŞKENLERİNİ IMPORT'LARDAN SONRA AYARLA!
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

// Bu test suit'i, fonksiyonun tüm mantığını kapsar.
Deno.test("Process Memory - Full Suite", async (t) => {
    // --- TEMEL GİRDİ VE YETKİLENDİRME TESTLERİ ---
    // Bu testler mock gerektirmez, çünkü fonksiyonun en başındaki kontrolleri test eder.

    await t.step("should return 200 for OPTIONS request (CORS)", async () => {
        const request = new Request("http://localhost/process-memory", {
            method: "OPTIONS",
        });
        const response = await handleProcessMemory(request);
        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    // --- MOCK'LANMIŞ, İZOLE EDİLMİŞ SENARYO TESTLERİ ---
    // Bu bölüm, fonksiyonun ana mantığını test eder.

    // 1. "Happy Path": Her şeyin yolunda gittiği senaryo
    await t.step("should process and insert memory successfully", async () => {
        const mockAnalysisResult =
            '{"sentiment_analysis": {"dominant_emotion": "happy", "intensity_score": 0.8, "valence": "pozitif"}, "stylometry_analysis": {"avg_sentence_length": 15, "lexical_density": 0.6}}';
        const mockEmbeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6], [
            0.7,
            0.8,
            0.9,
        ]];

        // AI servislerini mock'la
        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.resolve(mockAnalysisResult),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: mockEmbeddings }),
        );

        // Supabase client'ı mock'la
        let insertedData: unknown = null;
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: (data: unknown) => {
                            insertedData = data;
                            return Promise.resolve({ error: null });
                        },
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content for analysis",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);

            // Veritabanına doğru verilerin kaydedildiğini kontrol et
            assert(insertedData !== null);
            const insertData = insertedData as Record<string, unknown>;
            assertEquals(insertData.user_id, "user-123");
            assertEquals(insertData.content, "Test content for analysis");
            assertEquals(insertData.content_embedding, [0.1, 0.2, 0.3]);
            assertEquals(insertData.sentiment_embedding, [0.4, 0.5, 0.6]);
            assertEquals(insertData.stylometry_embedding, [0.7, 0.8, 0.9]);

            // AI servislerinin doğru parametrelerle çağrıldığını kontrol et
            assertEquals(invokeGeminiStub.calls.length, 1);
            assertEquals(embedContentsBatchStub.calls.length, 1);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 2. "Sad Path": AI analiz hatası senaryosu
    await t.step("should handle AI analysis failure gracefully", async () => {
        // AI servislerini hata fırlatacak şekilde mock'la
        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.reject(new Error("AI servisi çöktü!")),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: [[0.1], [0.2], [0.3]] }),
        );

        // Supabase client'ı mock'la
        let insertedData: unknown = null;
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: (data: unknown) => {
                            insertedData = data;
                            return Promise.resolve({ error: null });
                        },
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);

            // Veritabanına null analiz verileriyle kaydedildiğini kontrol et
            assert(insertedData !== null);
            const insertData = insertedData as Record<string, unknown>;
            assertEquals(insertData.sentiment_data, null);
            assertEquals(insertData.stylometry_data, null);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 3. "Sad Path": Embedding hatası senaryosu
    await t.step("should handle embedding failure gracefully", async () => {
        const mockAnalysisResult =
            '{"sentiment_analysis": {"dominant_emotion": "happy"}, "stylometry_analysis": {"avg_sentence_length": 15}}';

        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.resolve(mockAnalysisResult),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.reject(new Error("Embedding servisi çöktü!")),
        );

        // Supabase client'ı mock'la
        let insertedData: unknown = null;
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: (data: unknown) => {
                            insertedData = data;
                            return Promise.resolve({ error: null });
                        },
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);

            // Veritabanına null embedding'lerle kaydedildiğini kontrol et
            assert(insertedData !== null);
            const insertData = insertedData as Record<string, unknown>;
            assertEquals(insertData.content_embedding, null);
            assertEquals(insertData.sentiment_embedding, null);
            assertEquals(insertData.stylometry_embedding, null);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 4. "Sad Path": Veritabanı hatası senaryosu
    await t.step("should handle database error gracefully", async () => {
        const mockAnalysisResult =
            '{"sentiment_analysis": {"dominant_emotion": "happy"}}';
        const mockEmbeddings = [[0.1], [0.2], [0.3]];

        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.resolve(mockAnalysisResult),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: mockEmbeddings }),
        );

        // Supabase client'ı hata fırlatacak şekilde mock'la
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: () =>
                            Promise.resolve({
                                error: {
                                    message: "Database connection failed",
                                    code: "DB_ERROR",
                                },
                            }),
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assert(
                responseBody.error.includes(
                    "Veritabanı hatası: Database connection failed",
                ),
            );
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 5. "Sad Path": Duplicate key hatası (unique violation)
    await t.step("should handle duplicate key error gracefully", async () => {
        const mockAnalysisResult =
            '{"sentiment_analysis": {"dominant_emotion": "happy"}}';
        const mockEmbeddings = [[0.1], [0.2], [0.3]];

        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.resolve(mockAnalysisResult),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: mockEmbeddings }),
        );

        // Supabase client'ı duplicate key hatası fırlatacak şekilde mock'la
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: () =>
                            Promise.resolve({
                                error: {
                                    message: "duplicate key value",
                                    code: "23505",
                                },
                            }),
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            // Duplicate key hatası başarılı olarak kabul edilmeli
            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 6. "Sad Path": Malformed JSON senaryosu
    await t.step("should handle malformed JSON gracefully", async () => {
        const request = new Request("http://localhost/process-memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{invalid json",
        });

        const response = await handleProcessMemory(request);

        assertEquals(response.status, 500);
        const body = await response.json();
        assert(body.error);
    });

    // 7. "Sad Path": Eksik gerekli alanlar
    await t.step("should handle missing required fields", async () => {
        // Mock AI servisleri
        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () =>
                Promise.resolve(
                    '{"sentiment_analysis": {"dominant_emotion": "neutral"}}',
                ),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: [[0.1], [0.2], [0.3]] }),
        );

        // Mock Supabase client
        const mockSupabaseClient = {
            from: () => ({
                insert: () => Promise.resolve({ error: null }),
            }),
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // source_event_id eksik
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    mood: "happy",
                    event_type: "text_session",
                    transaction_id: "tx-123",
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 500);
            const body = await response.json();
            assert(body.error);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });

    // 8. "Happy Path": Opsiyonel alanlar olmadan
    await t.step("should work without optional fields", async () => {
        const mockAnalysisResult =
            '{"sentiment_analysis": {"dominant_emotion": "neutral"}}';
        const mockEmbeddings = [[0.1], [0.2], [0.3]];

        const invokeGeminiStub = stub(
            { invokeGemini },
            "invokeGemini",
            () => Promise.resolve(mockAnalysisResult),
        );
        const embedContentsBatchStub = stub(
            { embedContentsBatch },
            "embedContentsBatch",
            () => Promise.resolve({ embeddings: mockEmbeddings }),
        );

        // Supabase client'ı mock'la
        let insertedData: unknown = null;
        const mockSupabaseClient = {
            from: (table: string) => {
                if (table === "cognitive_memories") {
                    return {
                        insert: (data: unknown) => {
                            insertedData = data;
                            return Promise.resolve({ error: null });
                        },
                    };
                }
                return {
                    insert: () => Promise.resolve({ error: null }),
                };
            },
        } as unknown as SupabaseClient;

        try {
            const request = new Request("http://localhost/process-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_event_id: "event-123",
                    user_id: "user-123",
                    content: "Test content",
                    event_time: "2024-01-07T12:00:00Z",
                    event_type: "text_session",
                    // mood ve transaction_id eksik
                }),
            });

            const response = await handleProcessMemory(
                request,
                mockSupabaseClient,
                {
                    invokeGemini: invokeGeminiStub,
                    embedContentsBatch: embedContentsBatchStub,
                },
            );

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);

            // Opsiyonel alanların null olarak kaydedildiğini kontrol et
            assert(insertedData !== null);
            const insertData = insertedData as Record<string, unknown>;
            assertEquals(insertData.mood, null);
            assertEquals(insertData.transaction_id, null);
        } finally {
            invokeGeminiStub.restore();
            embedContentsBatchStub.restore();
        }
    });
});
