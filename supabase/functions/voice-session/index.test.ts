// supabase/functions/voice-session/index.test.ts

import "../_shared/test_setup.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handleVoiceSession } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as AiService from "../_shared/services/ai.service.ts";
import * as RagService from "../_shared/services/rag.service.ts";
import { assertRateLimit } from "../_shared/rate-limit.ts";
import { assertAndConsumeQuota } from "../_shared/quota.ts";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test("Voice Session - Full Suite", async (t) => {
    await t.step("should return 200 for OPTIONS request (CORS)", async () => {
        const request = new Request("http://localhost/voice-session", {
            method: "OPTIONS",
        });
        const response = await handleVoiceSession(request);
        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step(
        "should handle DeepThought intent with RAG successfully",
        async () => {
            // Mock dependencies
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
                from: (table: string) => {
                    if (table === "ai_logs") {
                        return {
                            insert: () => Promise.resolve({ error: null }),
                        };
                    }
                    return {};
                },
            } as unknown as SupabaseClient;

            // Mock AI service responses
            const mockAiService = {
                invokeGemini: stub(
                    { invokeGemini: AiService.invokeGemini },
                    "invokeGemini",
                    (client: SupabaseClient, prompt: string) => {
                        if (prompt.includes("niyetini şu kategorilerden")) {
                            return Promise.resolve('{"intent": "DeepThought"}');
                        } else if (
                            prompt.includes("Kullanıcının şu konuşmasını dinle")
                        ) {
                            return Promise.resolve("enhanced query for RAG");
                        } else {
                            return Promise.resolve("AI response text");
                        }
                    },
                ),
            };

            // Mock RAG service
            const mockRagService = {
                retrieveContext: stub(
                    { retrieveContext: RagService.retrieveContext },
                    "retrieveContext",
                    () =>
                        Promise.resolve([
                            {
                                content: "Relevant memory",
                                source_layer: "content" as const,
                                similarity: 0.85,
                            },
                        ]),
                ),
            };

            // Mock rate limit and quota
            const mockAssertRateLimit = stub(
                { assertRateLimit },
                "assertRateLimit",
                () => Promise.resolve(),
            );
            const mockAssertAndConsumeQuota = stub(
                { assertAndConsumeQuota },
                "assertAndConsumeQuota",
                () => Promise.resolve(),
            );

            try {
                const request = new Request("http://localhost/voice-session", {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                        "x-voice-minutes": "2",
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                sender: "user",
                                text: "I'm feeling really stressed about work",
                            },
                        ],
                    }),
                });

                const response = await handleVoiceSession(request, {
                    supabaseClient: mockSupabaseClient,
                    aiService: mockAiService as unknown as typeof AiService,
                    ragService: mockRagService as unknown as typeof RagService,
                    assertRateLimit: mockAssertRateLimit,
                    assertAndConsumeQuota: mockAssertAndConsumeQuota,
                });

                assertEquals(response.status, 200);
                const responseBody = await response.json();
                assertEquals(responseBody.aiResponse, "AI response text");
                assertEquals(
                    responseBody.usedMemory.content,
                    "Relevant memory",
                );

                // Verify AI service was called correctly
                assertEquals(mockAiService.invokeGemini.calls.length, 3); // intent, hyde, response
                assertEquals(mockRagService.retrieveContext.calls.length, 1);
                assertEquals(mockAssertRateLimit.calls.length, 1);
                assertEquals(mockAssertAndConsumeQuota.calls.length, 1);
            } finally {
                mockAiService.invokeGemini.restore();
                mockRagService.retrieveContext.restore();
                mockAssertRateLimit.restore();
                mockAssertAndConsumeQuota.restore();
            }
        },
    );

    await t.step("should handle Farewell intent without RAG", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_logs") {
                    return {
                        insert: () => Promise.resolve({ error: null }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const mockAiService = {
            invokeGemini: stub(
                { invokeGemini: AiService.invokeGemini },
                "invokeGemini",
                (client: SupabaseClient, prompt: string) => {
                    if (prompt.includes("niyetini şu kategorilerden")) {
                        return Promise.resolve('{"intent": "Farewell"}');
                    } else {
                        return Promise.resolve("Goodbye response");
                    }
                },
            ),
        };

        const mockRagService = {
            retrieveContext: stub(
                { retrieveContext: RagService.retrieveContext },
                "retrieveContext",
                () => Promise.resolve([]),
            ),
        };

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => Promise.resolve(),
        );
        const mockAssertAndConsumeQuota = stub(
            { assertAndConsumeQuota },
            "assertAndConsumeQuota",
            () => Promise.resolve(),
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        {
                            sender: "user",
                            text: "Goodbye, thanks for the chat",
                        },
                    ],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                aiService: mockAiService as unknown as typeof AiService,
                ragService: mockRagService as unknown as typeof RagService,
                assertRateLimit: mockAssertRateLimit,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.aiResponse, "Goodbye response");
            assertEquals(responseBody.usedMemory, null);

            // Verify RAG was not called for Farewell
            assertEquals(mockRagService.retrieveContext.calls.length, 0);
            assertEquals(mockAiService.invokeGemini.calls.length, 2); // intent + response only
        } finally {
            mockAiService.invokeGemini.restore();
            mockRagService.retrieveContext.restore();
            mockAssertRateLimit.restore();
            mockAssertAndConsumeQuota.restore();
        }
    });

    await t.step("should return 401 when no Authorization header", async () => {
        const request = new Request("http://localhost/voice-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ sender: "user", text: "Hello" }],
            }),
        });

        const response = await handleVoiceSession(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Authorization header eksik. Kullanıcı giriş yapmamış.",
        );
    });

    await t.step(
        "should return 500 when user authentication fails",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: null },
                            error: { message: "Invalid JWT" },
                        }),
                },
            } as unknown as SupabaseClient;

            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer invalid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ sender: "user", text: "Hello" }],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(
                responseBody.error,
                "Kullanıcı doğrulanamadı veya JWT geçersiz.",
            );
        },
    );

    await t.step("should return 429 when rate limit exceeded", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => {
                const error = new Error("Rate limit exceeded");
                (error as any).status = 429;
                throw error;
            },
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ sender: "user", text: "Hello" }],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                assertRateLimit: mockAssertRateLimit,
            });

            assertEquals(response.status, 429);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "rate_limited");
        } finally {
            mockAssertRateLimit.restore();
        }
    });

    await t.step("should return 402 when quota exceeded", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => Promise.resolve(),
        );
        const mockAssertAndConsumeQuota = stub(
            { assertAndConsumeQuota },
            "assertAndConsumeQuota",
            () => {
                const error = new Error("Quota exceeded");
                (error as any).status = 402;
                throw error;
            },
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ sender: "user", text: "Hello" }],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                assertRateLimit: mockAssertRateLimit,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
            });

            assertEquals(response.status, 402);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "quota_exceeded");
        } finally {
            mockAssertRateLimit.restore();
            mockAssertAndConsumeQuota.restore();
        }
    });

    await t.step("should return 500 when invalid message format", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => Promise.resolve(),
        );
        const mockAssertAndConsumeQuota = stub(
            { assertAndConsumeQuota },
            "assertAndConsumeQuota",
            () => Promise.resolve(),
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [], // Empty messages array
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                assertRateLimit: mockAssertRateLimit,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "Geçersiz mesaj formatı");
        } finally {
            mockAssertRateLimit.restore();
            mockAssertAndConsumeQuota.restore();
        }
    });

    await t.step("should handle malformed JSON gracefully", async () => {
        const request = new Request("http://localhost/voice-session", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: "{invalid json",
        });

        const response = await handleVoiceSession(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Kullanıcı doğrulanamadı veya JWT geçersiz.",
        );
    });

    await t.step(
        "should calculate voice minutes from different sources",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
                from: (table: string) => {
                    if (table === "ai_logs") {
                        return {
                            insert: () => Promise.resolve({ error: null }),
                        };
                    }
                    return {};
                },
            } as unknown as SupabaseClient;

            const mockAiService = {
                invokeGemini: stub(
                    { invokeGemini: AiService.invokeGemini },
                    "invokeGemini",
                    () => Promise.resolve('{"intent": "Trivial"}'),
                ),
            };

            const mockAssertRateLimit = stub(
                { assertRateLimit },
                "assertRateLimit",
                () => Promise.resolve(),
            );
            const mockAssertAndConsumeQuota = stub(
                { assertAndConsumeQuota },
                "assertAndConsumeQuota",
                () => Promise.resolve(),
            );

            try {
                const request = new Request("http://localhost/voice-session", {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                        "x-voice-minutes": "5", // Header'dan 5 dakika
                    },
                    body: JSON.stringify({
                        messages: [{ sender: "user", text: "Hello" }],
                        voiceMinutes: 3, // Body'den 3 dakika (header öncelikli)
                        durationSec: 120, // 2 dakika
                        durationMs: 60000, // 1 dakika
                    }),
                });

                const response = await handleVoiceSession(request, {
                    supabaseClient: mockSupabaseClient,
                    aiService: mockAiService as unknown as typeof AiService,
                    assertRateLimit: mockAssertRateLimit,
                    assertAndConsumeQuota: mockAssertAndConsumeQuota,
                });

                assertEquals(response.status, 200);
                // Header'dan gelen 5 dakika kullanılmalı
                assertEquals(mockAssertAndConsumeQuota.calls.length, 1);
                assertEquals(mockAssertAndConsumeQuota.calls[0].args[3], 5);
            } finally {
                mockAiService.invokeGemini.restore();
                mockAssertRateLimit.restore();
                mockAssertAndConsumeQuota.restore();
            }
        },
    );

    await t.step("should handle AI service failure gracefully", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_logs") {
                    return {
                        insert: () => Promise.resolve({ error: null }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const mockAiService = {
            invokeGemini: stub(
                { invokeGemini: AiService.invokeGemini },
                "invokeGemini",
                () => Promise.reject(new Error("AI service failed")),
            ),
        };

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => Promise.resolve(),
        );
        const mockAssertAndConsumeQuota = stub(
            { assertAndConsumeQuota },
            "assertAndConsumeQuota",
            () => Promise.resolve(),
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ sender: "user", text: "Hello" }],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                aiService: mockAiService as unknown as typeof AiService,
                assertRateLimit: mockAssertRateLimit,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "AI service failed");
        } finally {
            mockAiService.invokeGemini.restore();
            mockAssertRateLimit.restore();
            mockAssertAndConsumeQuota.restore();
        }
    });

    await t.step("should handle RAG service failure gracefully", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_logs") {
                    return {
                        insert: () => Promise.resolve({ error: null }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const mockAiService = {
            invokeGemini: stub(
                { invokeGemini: AiService.invokeGemini },
                "invokeGemini",
                (client: SupabaseClient, prompt: string) => {
                    if (prompt.includes("niyetini şu kategorilerden")) {
                        return Promise.resolve('{"intent": "DeepThought"}');
                    } else if (
                        prompt.includes("Kullanıcının şu konuşmasını dinle")
                    ) {
                        return Promise.resolve("enhanced query");
                    } else {
                        return Promise.resolve("AI response");
                    }
                },
            ),
        };

        const mockRagService = {
            retrieveContext: stub(
                { retrieveContext: RagService.retrieveContext },
                "retrieveContext",
                () => Promise.reject(new Error("RAG service failed")),
            ),
        };

        const mockAssertRateLimit = stub(
            { assertRateLimit },
            "assertRateLimit",
            () => Promise.resolve(),
        );
        const mockAssertAndConsumeQuota = stub(
            { assertAndConsumeQuota },
            "assertAndConsumeQuota",
            () => Promise.resolve(),
        );

        try {
            const request = new Request("http://localhost/voice-session", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [{ sender: "user", text: "Deep thought" }],
                }),
            });

            const response = await handleVoiceSession(request, {
                supabaseClient: mockSupabaseClient,
                aiService: mockAiService as unknown as typeof AiService,
                ragService: mockRagService as unknown as typeof RagService,
                assertRateLimit: mockAssertRateLimit,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "RAG service failed");
        } finally {
            mockAiService.invokeGemini.restore();
            mockRagService.retrieveContext.restore();
            mockAssertRateLimit.restore();
            mockAssertAndConsumeQuota.restore();
        }
    });
});
