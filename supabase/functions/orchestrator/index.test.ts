// supabase/functions/orchestrator/index.test.ts

import "../_shared/test_setup.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handleOrchestrator } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Import proper types
import type { ElegantReportPayload } from "../_shared/services/ai.service.ts";
import type {
    InteractionContext,
    LoggingService,
    VaultData,
} from "../_shared/types/context.ts";
import type { SourceLayer } from "../_shared/services/rag.service.ts";
import type { TextSessionContext } from "../_shared/contexts/session.context.builder.ts";
import type { HandlerDependencies } from "../_shared/services/orchestration.handlers.ts";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

// Mock interfaces for test objects
interface MockAiService {
    invokeGemini: () => Promise<string>;
    generateElegantReport: () => Promise<ElegantReportPayload>;
    embedContent: () => Promise<{ embedding: number[] | null; error?: string }>;
    embedContentsBatch: () => Promise<
        { embeddings: (number[] | null)[]; error?: string }
    >;
}

interface MockVaultService {
    getUserVault: () => Promise<VaultData | null>;
    updateUserVault: () => Promise<void>;
}

interface MockRagService {
    retrieveContext: () => Promise<
        { content: string; source_layer: SourceLayer; similarity: number }[]
    >;
}

interface MockContextBuilder {
    buildTextSessionContext: () => Promise<TextSessionContext>;
    buildDailyReflectionContext: () => Promise<
        { dossier: { userName: string }; retrievedMemories: unknown[] }
    >;
    buildDreamAnalysisContext: () => Promise<
        { userDossier: string; ragContext: string }
    >;
}

interface MockLogRagInvocation {
    (): Promise<void>;
}

interface MockAssertAndConsumeQuota {
    (): Promise<void>;
}

interface MockGetUserVault {
    (): Promise<VaultData | null>;
}

interface MockEventHandlers {
    dream_analysis: (
        dependencies: HandlerDependencies,
        context: InteractionContext,
    ) => Promise<{ eventId: string }>;
    daily_reflection: (
        dependencies: HandlerDependencies,
        context: InteractionContext,
    ) => Promise<
        {
            aiResponse: string;
            conversationTheme: string;
            decisionLogId: string;
            pendingSessionId: string;
        }
    >;
    text_session: (
        dependencies: HandlerDependencies,
        context: InteractionContext,
    ) => Promise<
        {
            aiResponse: string;
            usedMemory: { content: string; source_layer: string } | null;
        }
    >;
    diary_entry: (
        dependencies: HandlerDependencies,
        context: InteractionContext,
    ) => Promise<
        {
            aiResponse: string;
            nextQuestions?: string[];
            isFinal: boolean;
            conversationId: string;
        }
    >;
    default?: (
        dependencies: HandlerDependencies,
        context: InteractionContext,
    ) => Promise<string>;
    [key: string]:
        | ((
            dependencies: HandlerDependencies,
            context: InteractionContext,
        ) => Promise<unknown>)
        | undefined;
}

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
            } as SupabaseClient;

            const mockAiService: MockAiService = {
                invokeGemini: () => Promise.resolve("Dream analysis result"),
                generateElegantReport: () =>
                    Promise.resolve({
                        reportSections: {
                            mainTitle: "Test Title",
                            overview: "Test Overview",
                            goldenThread: "Test Golden Thread",
                            blindSpot: "Test Blind Spot",
                        },
                        reportAnalogy: {
                            title: "Test Analogy Title",
                            text: "Test Analogy Text",
                        },
                        derivedData: {
                            readMinutes: 2,
                            headingsCount: 4,
                        },
                    }),
                embedContent: () =>
                    Promise.resolve({ embedding: [1, 2, 3], error: undefined }),
                embedContentsBatch: () =>
                    Promise.resolve({
                        embeddings: [[1, 2, 3]],
                        error: undefined,
                    }),
            };

            const mockVaultService: MockVaultService = {
                getUserVault: () => Promise.resolve({} as VaultData),
                updateUserVault: () => Promise.resolve(),
            };

            const mockRagService: MockRagService = {
                retrieveContext: () =>
                    Promise.resolve([{
                        content: "Test content",
                        source_layer: "content" as SourceLayer,
                        similarity: 0.8,
                    }]),
            };

            const mockContextBuilder: MockContextBuilder = {
                buildTextSessionContext: () =>
                    Promise.resolve({
                        userDossier: {
                            nickname: "Test User",
                            dnaSummary: "Test DNA",
                            recentMood: "happy",
                            recentTopics: [],
                            lastInteractionType: "test",
                            lastInteractionTime: "2023-01-01T00:00:00Z",
                        },
                        retrievedMemories: [{
                            content: "test",
                            similarity: 0.8,
                        }],
                        warmStartContext: null,
                        ragForPrompt: "test prompt",
                        recentActivities: [],
                        activityContext: "test context",
                    }),
                buildDailyReflectionContext: () =>
                    Promise.resolve({
                        dossier: { userName: "Test User" },
                        retrievedMemories: [],
                    }),
                buildDreamAnalysisContext: () =>
                    Promise.resolve({
                        userDossier: "Test dossier",
                        ragContext: "Test rag context",
                    }),
            };

            const mockLogRagInvocation: MockLogRagInvocation = (): Promise<
                void
            > => Promise.resolve();

            const mockAssertAndConsumeQuota: MockAssertAndConsumeQuota =
                (): Promise<void> => Promise.resolve();

            const mockGetUserVault: MockGetUserVault = (): Promise<
                VaultData | null
            > => Promise.resolve({} as VaultData);

            const mockEventHandlers: MockEventHandlers = {
                dream_analysis: () =>
                    Promise.resolve({ eventId: "dream-analysis-result" }),
                daily_reflection: () =>
                    Promise.resolve({
                        aiResponse: "daily-reflection-result",
                        conversationTheme: "test theme",
                        decisionLogId: "test-log-id",
                        pendingSessionId: "test-session-id",
                    }),
                text_session: () =>
                    Promise.resolve({
                        aiResponse: "text-session-result",
                        usedMemory: null,
                    }),
                diary_entry: () =>
                    Promise.resolve({
                        aiResponse: "diary-entry-result",
                        isFinal: false,
                        conversationId: "test-conversation-id",
                    }),
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
                aiService:
                    mockAiService as unknown as typeof import("../_shared/services/ai.service.ts"),
                vaultService:
                    mockVaultService as unknown as typeof import("../_shared/services/vault.service.ts"),
                ragService:
                    mockRagService as unknown as typeof import("../_shared/services/rag.service.ts"),
                contextBuilder: mockContextBuilder as unknown as {
                    buildTextSessionContext:
                        typeof import("../_shared/contexts/session.context.builder.ts").buildTextSessionContext;
                    buildDailyReflectionContext:
                        typeof import("../_shared/contexts/dailyReflection.context.service.ts").buildDailyReflectionContext;
                    buildDreamAnalysisContext:
                        typeof import("../_shared/contexts/dream.context.service.ts").buildDreamAnalysisContext;
                },
                logRagInvocation: mockLogRagInvocation,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
                getUserVault: mockGetUserVault,
                eventHandlers:
                    mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
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
            } as SupabaseClient;

            const mockAiService: MockAiService = {
                invokeGemini: () => Promise.resolve("Daily reflection result"),
                generateElegantReport: () =>
                    Promise.resolve({
                        reportSections: {
                            mainTitle: "Test Title",
                            overview: "Test Overview",
                            goldenThread: "Test Golden Thread",
                            blindSpot: "Test Blind Spot",
                        },
                        reportAnalogy: {
                            title: "Test Analogy Title",
                            text: "Test Analogy Text",
                        },
                        derivedData: {
                            readMinutes: 2,
                            headingsCount: 4,
                        },
                    }),
                embedContent: () =>
                    Promise.resolve({ embedding: [1, 2, 3], error: undefined }),
                embedContentsBatch: () =>
                    Promise.resolve({
                        embeddings: [[1, 2, 3]],
                        error: undefined,
                    }),
            };

            const mockVaultService: MockVaultService = {
                getUserVault: () => Promise.resolve({} as VaultData),
                updateUserVault: () => Promise.resolve(),
            };

            const mockRagService: MockRagService = {
                retrieveContext: () =>
                    Promise.resolve([{
                        content: "Test content",
                        source_layer: "content" as SourceLayer,
                        similarity: 0.8,
                    }]),
            };

            const mockContextBuilder: MockContextBuilder = {
                buildTextSessionContext: () =>
                    Promise.resolve({
                        userDossier: {
                            nickname: "Test User",
                            dnaSummary: "Test DNA",
                            recentMood: "happy",
                            recentTopics: [],
                            lastInteractionType: "test",
                            lastInteractionTime: "2023-01-01T00:00:00Z",
                        },
                        retrievedMemories: [{
                            content: "test",
                            similarity: 0.8,
                        }],
                        warmStartContext: null,
                        ragForPrompt: "test prompt",
                        recentActivities: [],
                        activityContext: "test context",
                    }),
                buildDailyReflectionContext: () =>
                    Promise.resolve({
                        dossier: { userName: "Test User" },
                        retrievedMemories: [],
                    }),
                buildDreamAnalysisContext: () =>
                    Promise.resolve({
                        userDossier: "Test dossier",
                        ragContext: "Test rag context",
                    }),
            };

            const mockLogRagInvocation: MockLogRagInvocation = (): Promise<
                void
            > => Promise.resolve();

            const mockAssertAndConsumeQuota: MockAssertAndConsumeQuota =
                (): Promise<void> => Promise.resolve();

            const mockGetUserVault: MockGetUserVault = (): Promise<
                VaultData | null
            > => Promise.resolve({} as VaultData);

            const mockEventHandlers: MockEventHandlers = {
                dream_analysis: () =>
                    Promise.resolve({ eventId: "dream-analysis-result" }),
                daily_reflection: () =>
                    Promise.resolve({
                        aiResponse: "daily-reflection-result",
                        conversationTheme: "test theme",
                        decisionLogId: "test-log-id",
                        pendingSessionId: "test-session-id",
                    }),
                text_session: () =>
                    Promise.resolve({
                        aiResponse: "text-session-result",
                        usedMemory: null,
                    }),
                diary_entry: () =>
                    Promise.resolve({
                        aiResponse: "diary-entry-result",
                        isFinal: false,
                        conversationId: "test-conversation-id",
                    }),
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
                aiService:
                    mockAiService as unknown as typeof import("../_shared/services/ai.service.ts"),
                vaultService:
                    mockVaultService as unknown as typeof import("../_shared/services/vault.service.ts"),
                ragService:
                    mockRagService as unknown as typeof import("../_shared/services/rag.service.ts"),
                contextBuilder: mockContextBuilder as unknown as {
                    buildTextSessionContext:
                        typeof import("../_shared/contexts/session.context.builder.ts").buildTextSessionContext;
                    buildDailyReflectionContext:
                        typeof import("../_shared/contexts/dailyReflection.context.service.ts").buildDailyReflectionContext;
                    buildDreamAnalysisContext:
                        typeof import("../_shared/contexts/dream.context.service.ts").buildDreamAnalysisContext;
                },
                logRagInvocation: mockLogRagInvocation,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
                getUserVault: mockGetUserVault,
                eventHandlers:
                    mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody, {
                aiResponse: "daily-reflection-result",
                conversationTheme: "test theme",
                decisionLogId: "test-log-id",
                pendingSessionId: "test-session-id",
            });
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
                supabaseUrl: "http://localhost:54321",
                supabaseKey: "test-key",
                realtime: {} as unknown,
                storage: {} as unknown,
                from: () => ({} as unknown),
                rpc: () => ({} as unknown),
                functions: {
                    invoke: () => ({} as unknown),
                } as unknown,
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
        } as SupabaseClient;

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
        } as SupabaseClient;

        const mockAssertAndConsumeQuota = (): Promise<never> =>
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
            assertAndConsumeQuota: mockAssertAndConsumeQuota,
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
        } as SupabaseClient;

        const mockAssertAndConsumeQuota = (): Promise<never> =>
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
            assertAndConsumeQuota: mockAssertAndConsumeQuota,
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
            } as SupabaseClient;

            const mockEventHandlers: MockEventHandlers = {
                dream_analysis: () =>
                    Promise.resolve({ eventId: "dream-analysis-result" }),
                daily_reflection: () =>
                    Promise.resolve({
                        aiResponse: "daily-reflection-result",
                        conversationTheme: "test theme",
                        decisionLogId: "test-log-id",
                        pendingSessionId: "test-session-id",
                    }),
                text_session: () =>
                    Promise.resolve({
                        aiResponse: "text-session-result",
                        usedMemory: null,
                    }),
                diary_entry: () =>
                    Promise.resolve({
                        aiResponse: "diary-entry-result",
                        isFinal: false,
                        conversationId: "test-conversation-id",
                    }),
                default: () => Promise.resolve("default-handler-result"),
            };

            const mockGetUserVault: MockGetUserVault = (): Promise<
                VaultData | null
            > => Promise.resolve({} as VaultData);

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
                getUserVault: mockGetUserVault,
                eventHandlers:
                    mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
            });

            assertEquals(response.status, 200);
            const responseBody = await response.json();
            assertEquals(responseBody, {
                eventId: "default-handler-result",
            });

            // Verify default handler was called
            const mockDependencies = {
                supabaseClient: mockSupabaseClient,
                aiService:
                    {} as unknown as typeof import("../_shared/services/ai.service.ts"),
                vaultService:
                    {} as unknown as typeof import("../_shared/services/vault.service.ts"),
                ragService:
                    {} as unknown as typeof import("../_shared/services/rag.service.ts"),
                logRagInvocation: () => Promise.resolve(),
                contextBuilder: {} as unknown as {
                    buildTextSessionContext:
                        typeof import("../_shared/contexts/session.context.builder.ts").buildTextSessionContext;
                    buildDailyReflectionContext:
                        typeof import("../_shared/contexts/dailyReflection.context.service.ts").buildDailyReflectionContext;
                    buildDreamAnalysisContext:
                        typeof import("../_shared/contexts/dream.context.service.ts").buildDreamAnalysisContext;
                },
            };
            const mockContext = {
                transactionId: "test",
                userId: "test",
                initialVault: {} as VaultData,
                initialEvent: {
                    id: "test",
                    user_id: "test",
                    type: "test",
                    timestamp: 0,
                    created_at: "test",
                    data: {},
                },
                logger: {
                    info: () => {},
                    warn: () => {},
                    error: () => {},
                } as LoggingService,
                derivedData: {},
            };
            assertEquals(
                mockEventHandlers.default?.(mockDependencies, mockContext),
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
        } as SupabaseClient;

        const mockEventHandlers: MockEventHandlers = {
            dream_analysis: () =>
                Promise.resolve({ eventId: "dream-analysis-result" }),
            daily_reflection: () =>
                Promise.resolve({
                    aiResponse: "daily-reflection-result",
                    conversationTheme: "test theme",
                    decisionLogId: "test-log-id",
                    pendingSessionId: "test-session-id",
                }),
            text_session: () =>
                Promise.resolve({
                    aiResponse: "text-session-result",
                    usedMemory: null,
                }),
            diary_entry: () =>
                Promise.resolve({
                    aiResponse: "diary-entry-result",
                    isFinal: false,
                    conversationId: "test-conversation-id",
                }),
            // No default handler
        };

        const mockGetUserVault: MockGetUserVault = (): Promise<
            VaultData | null
        > => Promise.resolve({} as VaultData);

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
            getUserVault: mockGetUserVault,
            eventHandlers:
                mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
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
        } as SupabaseClient;

        const mockAssertAndConsumeQuota = (): Promise<void> =>
            Promise.resolve();
        const mockGetUserVault = (): Promise<VaultData | null> =>
            Promise.resolve({} as VaultData);
        const mockEventHandlers = {
            dream_analysis: () =>
                Promise.resolve({ eventId: "dream-analysis-result" }),
            daily_reflection: () =>
                Promise.resolve({
                    aiResponse: "daily-reflection-result",
                    conversationTheme: "test theme",
                    decisionLogId: "test-log-id",
                    pendingSessionId: "test-session-id",
                }),
            text_session: () =>
                Promise.resolve({
                    aiResponse: "text-session-result",
                    usedMemory: null,
                }),
            diary_entry: () =>
                Promise.resolve({
                    aiResponse: "diary-entry-result",
                    isFinal: false,
                    conversationId: "test-conversation-id",
                }),
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
            assertAndConsumeQuota: mockAssertAndConsumeQuota,
            getUserVault: mockGetUserVault,
            eventHandlers:
                mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
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
            } as SupabaseClient;

            const mockEventHandlers = {
                dream_analysis: () =>
                    Promise.reject(new Error("Handler execution failed")),
                daily_reflection: () =>
                    Promise.resolve({
                        aiResponse: "daily-reflection-result",
                        conversationTheme: "test theme",
                        decisionLogId: "test-log-id",
                        pendingSessionId: "test-session-id",
                    }),
                text_session: () =>
                    Promise.resolve({
                        aiResponse: "text-session-result",
                        usedMemory: null,
                    }),
                diary_entry: () =>
                    Promise.resolve({
                        aiResponse: "diary-entry-result",
                        isFinal: false,
                        conversationId: "test-conversation-id",
                    }),
                default: () => Promise.resolve("default-result"),
            };

            const mockGetUserVault = (): Promise<VaultData | null> =>
                Promise.resolve({} as VaultData);
            const mockAssertAndConsumeQuota = (): Promise<void> =>
                Promise.resolve();

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
                getUserVault: mockGetUserVault,
                assertAndConsumeQuota: mockAssertAndConsumeQuota,
                eventHandlers:
                    mockEventHandlers as unknown as typeof import("../_shared/services/orchestration.handlers.ts").eventHandlers,
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
