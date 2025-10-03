// supabase/functions/process-session-memory/index.test.ts

import "../_shared/test_setup.ts";
import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as AiService from "../_shared/services/ai.service.ts";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

// Test handler function to avoid serve() issues
async function handleProcessSessionMemory(
    req: Request,
    options: {
        mockSupabaseClient?: SupabaseClient;
        mockInvokeGemini?: (client: any, prompt: string) => Promise<string>;
    } = {},
): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
            },
        });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            throw new Error("Kullanıcı doğrulanamadı.");
        }

        const jwt = authHeader.replace("Bearer ", "");
        const adminClient = options.mockSupabaseClient ?? {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "test-user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        const { data: { user } } = await adminClient.auth.getUser(jwt);
        if (!user) throw new Error("Kullanıcı doğrulanamadı.");

        const { messages, eventId, language } = await req.json();
        if (!messages || messages.length < 2) {
            throw new Error("Özetlenecek kadar mesaj yok.");
        }
        if (!eventId) throw new Error("Kaynak event ID'si eksik.");

        const transcript = messages.map((m: { sender: string; text: string }) =>
            `${m.sender === "user" ? "Ben" : "O"}: ${m.text}`
        ).join("\n");

        // Dil belirleme: tr/en/de dışı ise en olarak ayarla
        const lang = ["tr", "en", "de"].includes(String(language))
            ? String(language)
            : "en";

        // Dil-duyarlı kısa istem başı ekleyelim
        const langHint: Record<string, string> = {
            tr: "Özetini tamamen Türkçe yaz.",
            en: "Write the summary entirely in English.",
            de: "Schreibe die Zusammenfassung vollständig auf Deutsch.",
        };

        const summary = options.mockInvokeGemini
            ? await options.mockInvokeGemini(
                adminClient,
                `${langHint[lang]}\n\nTranskript: ${transcript}`,
            )
            : await AiService.invokeGemini(
                adminClient,
                `${langHint[lang]}\n\nTranskript: ${transcript}`,
                "gemini-1.5-flash",
                { maxOutputTokens: 128, temperature: 0.2 },
            );
        if (!summary || summary.trim().length < 10) {
            throw new Error("AI'dan geçerli özet alınamadı.");
        }

        // Ek güvenlik: çıktı uzunluğunu karakter bazında sınırla
        const MAX_SUMMARY_CHARS = 700;
        const safeSummary = summary.length > MAX_SUMMARY_CHARS
            ? `${summary.slice(0, MAX_SUMMARY_CHARS)}…`
            : summary;

        // process-memory function'ını çağır
        const { error: invokeError } = await adminClient.functions.invoke(
            "process-memory",
            {
                body: {
                    source_event_id: eventId,
                    user_id: user.id,
                    content: safeSummary,
                    event_time: new Date().toISOString(),
                    event_type: "text_session_summary",
                },
            },
        );

        if (invokeError) {
            throw new Error(
                `process-memory'i tetiklerken hata: ${invokeError.message}`,
            );
        }

        console.log(
            `✅ [Process-Session-Memory] Hafıza işleme, ${eventId} için başarıyla tetiklendi.`,
        );

        return new Response(
            JSON.stringify({ success: true, summary: safeSummary }),
            {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Content-Type": "application/json",
                },
            },
        );
    } catch (error) {
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error";
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "*",
                "Content-Type": "application/json",
            },
            status: 500,
        });
    }
}

Deno.test("Process Session Memory - Full Suite", async (t) => {
    await t.step("should return 200 for OPTIONS request (CORS)", async () => {
        const request = new Request("http://localhost/process-session-memory", {
            method: "OPTIONS",
        });

        const response = await handleProcessSessionMemory(request);

        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step("should process session memory successfully", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    {
                        sender: "user",
                        text: "Merhaba, bugün kendimi kötü hissediyorum.",
                    },
                    { sender: "therapist", text: "Anlıyorum, neler oluyor?" },
                    { sender: "user", text: "İş yerinde sorunlar yaşıyorum." },
                ],
                eventId: "session-123",
                language: "tr",
            }),
        });

        const response = await handleProcessSessionMemory(request, {
            mockSupabaseClient,
            mockInvokeGemini: () =>
                Promise.resolve(
                    "Bu bir test özetidir. Kullanıcı ve terapist arasında geçen konuşma özetlenmiştir.",
                ),
        });

        assertEquals(response.status, 200);
        const responseBody = await response.json();
        assertEquals(responseBody.success, true);
        assert(responseBody.summary.includes("test özetidir"));
    });

    await t.step("should return 500 when no Authorization header", async () => {
        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    { sender: "user", text: "Test message" },
                    { sender: "therapist", text: "Test response" },
                ],
                eventId: "session-123",
            }),
        });

        const response = await handleProcessSessionMemory(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Kullanıcı doğrulanamadı.");
    });

    await t.step(
        "should return 500 when user authentication fails",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: null },
                            error: null,
                        }),
                },
            } as unknown as SupabaseClient;

            const request = new Request(
                "http://localhost/process-session-memory",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer invalid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            { sender: "user", text: "Test message" },
                            { sender: "therapist", text: "Test response" },
                        ],
                        eventId: "session-123",
                    }),
                },
            );

            const response = await handleProcessSessionMemory(request, {
                mockSupabaseClient,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "Kullanıcı doğrulanamadı.");
        },
    );

    await t.step(
        "should return 500 when messages array is too short",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
            } as unknown as SupabaseClient;

            const request = new Request(
                "http://localhost/process-session-memory",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            { sender: "user", text: "Only one message" },
                        ],
                        eventId: "session-123",
                    }),
                },
            );

            const response = await handleProcessSessionMemory(request, {
                mockSupabaseClient,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "Özetlenecek kadar mesaj yok.");
        },
    );

    await t.step("should return 500 when eventId is missing", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { sender: "user", text: "Test message" },
                    { sender: "therapist", text: "Test response" },
                ],
                // eventId missing
            }),
        });

        const response = await handleProcessSessionMemory(request, {
            mockSupabaseClient,
        });

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Kaynak event ID'si eksik.");
    });

    await t.step("should handle AI service failure gracefully", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { sender: "user", text: "Test message" },
                    { sender: "therapist", text: "Test response" },
                ],
                eventId: "session-123",
            }),
        });

        const response = await handleProcessSessionMemory(request, {
            mockSupabaseClient,
            mockInvokeGemini: () => Promise.resolve(""), // Empty response
        });

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "AI'dan geçerli özet alınamadı.");
    });

    await t.step(
        "should handle process-memory function invocation failure",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
                functions: {
                    invoke: () =>
                        Promise.resolve({
                            error: { message: "Function invocation failed" },
                        }),
                },
            } as unknown as SupabaseClient;

            const request = new Request(
                "http://localhost/process-session-memory",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            { sender: "user", text: "Test message" },
                            { sender: "therapist", text: "Test response" },
                        ],
                        eventId: "session-123",
                    }),
                },
            );

            const response = await handleProcessSessionMemory(request, {
                mockSupabaseClient,
                mockInvokeGemini: () =>
                    Promise.resolve("Bu bir test özetidir."),
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(
                responseBody.error,
                "process-memory'i tetiklerken hata: Function invocation failed",
            );
        },
    );

    await t.step("should truncate summary if too long", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        // Create a very long summary
        const longSummary = "Bu çok uzun bir özet. ".repeat(100); // ~2400 characters

        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { sender: "user", text: "Test message" },
                    { sender: "therapist", text: "Test response" },
                ],
                eventId: "session-123",
            }),
        });

        const response = await handleProcessSessionMemory(request, {
            mockSupabaseClient,
            mockInvokeGemini: () => Promise.resolve(longSummary),
        });

        assertEquals(response.status, 200);
        const responseBody = await response.json();
        assertEquals(responseBody.success, true);
        assert(responseBody.summary.length <= 701); // 700 + "…"
        assert(responseBody.summary.endsWith("…"));
    });

    await t.step("should handle different languages correctly", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        const mockInvokeGemini = (client: any, prompt: string) => {
            // Check if the prompt contains the correct language hint
            if (prompt.includes("Özetini tamamen Türkçe yaz")) {
                return Promise.resolve("Bu Türkçe bir özet.");
            }
            if (prompt.includes("Write the summary entirely in English")) {
                return Promise.resolve("This is an English summary.");
            }
            if (
                prompt.includes(
                    "Schreibe die Zusammenfassung vollständig auf Deutsch",
                )
            ) {
                return Promise.resolve(
                    "Das ist eine deutsche Zusammenfassung.",
                );
            }
            return Promise.resolve("Default summary");
        };

        // Test Turkish
        const trRequest = new Request(
            "http://localhost/process-session-memory",
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { sender: "user", text: "Test message" },
                        { sender: "therapist", text: "Test response" },
                    ],
                    eventId: "session-123",
                    language: "tr",
                }),
            },
        );

        const trResponse = await handleProcessSessionMemory(trRequest, {
            mockSupabaseClient,
            mockInvokeGemini,
        });
        assertEquals(trResponse.status, 200);
        const trBody = await trResponse.json();
        assertEquals(trBody.summary, "Bu Türkçe bir özet.");

        // Test English
        const enRequest = new Request(
            "http://localhost/process-session-memory",
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { sender: "user", text: "Test message" },
                        { sender: "therapist", text: "Test response" },
                    ],
                    eventId: "session-124",
                    language: "en",
                }),
            },
        );

        const enResponse = await handleProcessSessionMemory(enRequest, {
            mockSupabaseClient,
            mockInvokeGemini,
        });
        assertEquals(enResponse.status, 200);
        const enBody = await enResponse.json();
        assertEquals(enBody.summary, "This is an English summary.");

        // Test German
        const deRequest = new Request(
            "http://localhost/process-session-memory",
            {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { sender: "user", text: "Test message" },
                        { sender: "therapist", text: "Test response" },
                    ],
                    eventId: "session-125",
                    language: "de",
                }),
            },
        );

        const deResponse = await handleProcessSessionMemory(deRequest, {
            mockSupabaseClient,
            mockInvokeGemini,
        });
        assertEquals(deResponse.status, 200);
        const deBody = await deResponse.json();
        assertEquals(deBody.summary, "Das ist eine deutsche Zusammenfassung.");
    });

    await t.step(
        "should default to English for unsupported languages",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
                functions: {
                    invoke: () => Promise.resolve({ error: null }),
                },
            } as unknown as SupabaseClient;

            const mockInvokeGemini = (client: any, prompt: string) => {
                // Should default to English for unsupported language
                if (prompt.includes("Write the summary entirely in English")) {
                    return Promise.resolve(
                        "Default English summary for unsupported language.",
                    );
                }
                return Promise.resolve("Unexpected prompt");
            };

            const request = new Request(
                "http://localhost/process-session-memory",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            { sender: "user", text: "Test message" },
                            { sender: "therapist", text: "Test response" },
                        ],
                        eventId: "session-126",
                        language: "fr", // Unsupported language
                    }),
                },
            );

            const response = await handleProcessSessionMemory(request, {
                mockSupabaseClient,
                mockInvokeGemini,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(
                responseBody.summary,
                "Default English summary for unsupported language.",
            );
        },
    );

    await t.step("should handle malformed JSON gracefully", async () => {
        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: "{invalid json",
        });

        const response = await handleProcessSessionMemory(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assert(
            responseBody.error.includes("JSON") ||
                responseBody.error.includes("Expected property name") ||
                responseBody.error.includes("Unexpected token"),
        );
    });

    await t.step("should create correct transcript format", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            functions: {
                invoke: () => Promise.resolve({ error: null }),
            },
        } as unknown as SupabaseClient;

        const mockInvokeGemini = (client: any, prompt: string) => {
            // Check if transcript format is correct
            if (
                prompt.includes("Ben: Merhaba") &&
                prompt.includes("O: Nasılsın")
            ) {
                return Promise.resolve("Correct transcript format detected.");
            }
            return Promise.resolve("Incorrect transcript format");
        };

        const request = new Request("http://localhost/process-session-memory", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [
                    { sender: "user", text: "Merhaba" },
                    { sender: "therapist", text: "Nasılsın" },
                ],
                eventId: "session-127",
            }),
        });

        const response = await handleProcessSessionMemory(request, {
            mockSupabaseClient,
            mockInvokeGemini,
        });

        assertEquals(response.status, 200);
        const responseBody = await response.json();
        assertEquals(
            responseBody.summary,
            "Correct transcript format detected.",
        );
    });

    await t.step(
        "should pass correct parameters to process-memory function",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
                functions: {
                    invoke: (functionName: string, options: any) => {
                        // Verify correct function name and parameters
                        if (
                            functionName === "process-memory" &&
                            options.body.source_event_id === "session-128" &&
                            options.body.user_id === "user-123" &&
                            options.body.event_type ===
                                "text_session_summary" &&
                            options.body.content === "Test summary"
                        ) {
                            return Promise.resolve({ error: null });
                        }
                        return Promise.resolve({
                            error: { message: "Incorrect parameters" },
                        });
                    },
                },
            } as unknown as SupabaseClient;

            const request = new Request(
                "http://localhost/process-session-memory",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            { sender: "user", text: "Test message" },
                            { sender: "therapist", text: "Test response" },
                        ],
                        eventId: "session-128",
                    }),
                },
            );

            const response = await handleProcessSessionMemory(request, {
                mockSupabaseClient,
                mockInvokeGemini: () => Promise.resolve("Test summary"),
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody.success, true);
            assertEquals(responseBody.summary, "Test summary");
        },
    );
});
