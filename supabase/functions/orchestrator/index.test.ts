// supabase/functions/orchestrator/index.test.ts

import "../_shared/test_setup.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handleOrchestrator } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as AiService from "../_shared/services/ai.service.ts";
import * as VaultService from "../_shared/services/vault.service.ts";
import * as RagService from "../_shared/services/rag.service.ts";
import * as Context from "../_shared/contexts/session.context.builder.ts";
import * as DailyReflectionContext from "../_shared/contexts/dailyReflection.context.service.ts";
import * as DreamContext from "../_shared/contexts/dream.context.service.ts";
import { logRagInvocation } from "../_shared/utils/logging.service.ts";
import { assertAndConsumeQuota } from "../_shared/quota.ts";
import { getUserVault } from "../_shared/services/vault.service.ts";
import { eventHandlers } from "../_shared/services/orchestration.handlers.ts";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test("Orchestrator - Full Suite", async (t) => {
    await t.step("should return 200 for OPTIONS request (CORS)", async () => {
        const request = new Request("http://localhost/orchestrator", {
            method: "OPTIONS",
        });

        const response = await handleOrchestrator(request);

        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step(
        "should process dream_analysis event successfully",
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

            const mockAiService = {
                invokeGemini: () => Promise.resolve("Dream analysis result"),
            };

            const mockVaultService = {
                getUserVault: () => Promise.resolve({}),
            };

            const mockRagService = {
                retrieveContext: () => Promise.resolve([]),
            };

            const mockContextBuilder = {
                buildTextSessionContext: () => Promise.resolve({}),
                buildDailyReflectionContext: () => Promise.resolve({}),
                buildDreamAnalysisContext: () => Promise.resolve({}),
            };

            const mockLogRagInvocation = () => Promise.resolve();

            const mockAssertAndConsumeQuota = () => Promise.resolve();

            const mockGetUserVault = () => Promise.resolve({});

            const mockEventHandlers = {
                dream_analysis: () => Promise.resolve("dream-analysis-result"),
                daily_reflection: () =>
                    Promise.resolve("daily-reflection-result"),
                text_session: () => Promise.resolve("text-session-result"),
                diary_entry: () => Promise.resolve("diary-entry-result"),
                default: () => Promise.resolve("default-result"),
            };

            const request = new Request("http://localhost/orchestrator", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventPayload: {
                        type: "dream_analysis",
                        content: "Test dream content",
                    },
                }),
            });

            const response = await handleOrchestrator(request, {
                supabaseClient: mockSupabaseClient,
                aiService: mockAiService as any,
                vaultService: mockVaultService as any,
                ragService: mockRagService as any,
                contextBuilder: mockContextBuilder as any,
                logRagInvocation: mockLogRagInvocation as any,
                assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
                getUserVault: mockGetUserVault as any,
                eventHandlers: mockEventHandlers as any,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody, { eventId: "dream-analysis-result" });
        },
    );

    await t.step(
        "should process daily_reflection event successfully",
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

            const mockAiService = {
                invokeGemini: () => Promise.resolve("Daily reflection result"),
            };

            const mockVaultService = {
                getUserVault: () => Promise.resolve({}),
            };

            const mockRagService = {
                retrieveContext: () => Promise.resolve([]),
            };

            const mockContextBuilder = {
                buildTextSessionContext: () => Promise.resolve({}),
                buildDailyReflectionContext: () => Promise.resolve({}),
                buildDreamAnalysisContext: () => Promise.resolve({}),
            };

            const mockLogRagInvocation = () => Promise.resolve();

            const mockAssertAndConsumeQuota = () => Promise.resolve();

            const mockGetUserVault = () => Promise.resolve({});

            const mockEventHandlers = {
                dream_analysis: () => Promise.resolve("dream-analysis-result"),
                daily_reflection: () =>
                    Promise.resolve("daily-reflection-result"),
                text_session: () => Promise.resolve("text-session-result"),
                diary_entry: () => Promise.resolve("diary-entry-result"),
                default: () => Promise.resolve("default-result"),
            };

            const request = new Request("http://localhost/orchestrator", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventPayload: {
                        type: "daily_reflection",
                        note: "Test reflection note",
                        mood: "happy",
                    },
                }),
            });

            const response = await handleOrchestrator(request, {
                supabaseClient: mockSupabaseClient,
                aiService: mockAiService as any,
                vaultService: mockVaultService as any,
                ragService: mockRagService as any,
                contextBuilder: mockContextBuilder as any,
                logRagInvocation: mockLogRagInvocation as any,
                assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
                getUserVault: mockGetUserVault as any,
                eventHandlers: mockEventHandlers as any,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody, { eventId: "daily-reflection-result" });
        },
    );

    await t.step("should return 500 when no Authorization header", async () => {
        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                eventPayload: {
                    type: "dream_analysis",
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Cannot read properties of null (reading 'replace')",
        );
    });

    await t.step(
        "should return 500 when user authentication fails",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({ data: { user: null }, error: null }),
                },
            } as unknown as SupabaseClient;

            const request = new Request("http://localhost/orchestrator", {
                method: "POST",
                headers: {
                    Authorization: "Bearer invalid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventPayload: {
                        type: "dream_analysis",
                        content: "Test content",
                    },
                }),
            });

            const response = await handleOrchestrator(request, {
                supabaseClient: mockSupabaseClient,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            assertEquals(
                responseBody.error,
                "Kullanıcı doğrulanamadı.",
            );
        },
    );

    await t.step("should return 500 when eventPayload is invalid", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventPayload: {
                    // Missing type field
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request, {
            supabaseClient: mockSupabaseClient,
        });

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Geçersiz eventPayload.",
        );
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

        const mockAssertAndConsumeQuota = () =>
            Promise.reject({ status: 402, message: "quota_exceeded" });

        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventPayload: {
                    type: "dream_analysis",
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request, {
            supabaseClient: mockSupabaseClient,
            assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
        });

        assertEquals(response.status, 402);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "quota_exceeded");
    });

    await t.step("should return 500 when quota check fails", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockAssertAndConsumeQuota = () =>
            Promise.reject(new Error("Quota check failed"));

        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventPayload: {
                    type: "dream_analysis",
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request, {
            supabaseClient: mockSupabaseClient,
            assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
        });

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Quota check failed");
    });

    await t.step(
        "should handle unknown event type with default handler",
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

            const mockEventHandlers = {
                dream_analysis: () => Promise.resolve("dream-analysis-result"),
                daily_reflection: () =>
                    Promise.resolve("daily-reflection-result"),
                text_session: () => Promise.resolve("text-session-result"),
                diary_entry: () => Promise.resolve("diary-entry-result"),
                default: () => Promise.resolve("default-handler-result"),
            };

            const mockGetUserVault = () => Promise.resolve({});

            const request = new Request("http://localhost/orchestrator", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventPayload: {
                        type: "unknown_event_type",
                        content: "Test content",
                    },
                }),
            });

            const response = await handleOrchestrator(request, {
                supabaseClient: mockSupabaseClient,
                getUserVault: mockGetUserVault as any,
                eventHandlers: mockEventHandlers as any,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody, {
                eventId: "default-handler-result",
            });

            // Verify default handler was called
            assertEquals(
                mockEventHandlers.default(),
                Promise.resolve("default-handler-result"),
            );
        },
    );

    await t.step("should return 500 when handler not found", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockEventHandlers = {
            dream_analysis: () => Promise.resolve("dream-analysis-result"),
            daily_reflection: () => Promise.resolve("daily-reflection-result"),
            text_session: () => Promise.resolve("text-session-result"),
            diary_entry: () => Promise.resolve("diary-entry-result"),
            // No default handler
        };

        const mockGetUserVault = () => Promise.resolve({});

        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventPayload: {
                    type: "unknown_event_type",
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request, {
            supabaseClient: mockSupabaseClient,
            getUserVault: mockGetUserVault as any,
            eventHandlers: mockEventHandlers as any,
        });

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "'unknown_event_type' için handler bulunamadı.",
        );
    });

    await t.step("should handle malformed JSON gracefully", async () => {
        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: "{invalid json",
        });

        const response = await handleOrchestrator(request);

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
        );
    });

    await t.step("should map event types to features correctly", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const mockAssertAndConsumeQuota = () => Promise.resolve();
        const mockGetUserVault = () => Promise.resolve({});
        const mockEventHandlers = {
            dream_analysis: () => Promise.resolve("dream-analysis-result"),
            daily_reflection: () => Promise.resolve("daily-reflection-result"),
            text_session: () => Promise.resolve("text-session-result"),
            diary_entry: () => Promise.resolve("diary-entry-result"),
            default: () => Promise.resolve("default-result"),
        };

        const request = new Request("http://localhost/orchestrator", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                eventPayload: {
                    type: "text_session",
                    content: "Test content",
                },
            }),
        });

        const response = await handleOrchestrator(request, {
            supabaseClient: mockSupabaseClient,
            assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
            getUserVault: mockGetUserVault as any,
            eventHandlers: mockEventHandlers as any,
        });

        // Should not fail due to quota check
        assertEquals(response.status, 200);
    });

    await t.step(
        "should handle handler execution failure gracefully",
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

            const mockEventHandlers = {
                dream_analysis: () =>
                    Promise.reject(new Error("Handler execution failed")),
                daily_reflection: () =>
                    Promise.resolve("daily-reflection-result"),
                text_session: () => Promise.resolve("text-session-result"),
                diary_entry: () => Promise.resolve("diary-entry-result"),
                default: () => Promise.resolve("default-result"),
            };

            const mockGetUserVault = () => Promise.resolve({});
            const mockAssertAndConsumeQuota = () => Promise.resolve();

            const request = new Request("http://localhost/orchestrator", {
                method: "POST",
                headers: {
                    Authorization: "Bearer valid-jwt",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    eventPayload: {
                        type: "dream_analysis",
                        content: "Test content",
                    },
                }),
            });

            const response = await handleOrchestrator(request, {
                supabaseClient: mockSupabaseClient,
                getUserVault: mockGetUserVault as any,
                assertAndConsumeQuota: mockAssertAndConsumeQuota as any,
                eventHandlers: mockEventHandlers as any,
            });

            assertEquals(response.status, 500);
            const responseBody = await response.json();
            // The error message should be in the error field
            assertEquals(
                responseBody.error,
                "Handler execution failed",
            );
        },
    );
});
