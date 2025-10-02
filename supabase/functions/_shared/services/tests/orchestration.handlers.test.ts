// supabase/functions/_shared/services/tests/orchestration.handlers.test.ts

import {
    assertEquals,
    assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    eventHandlers,
    handleDailyReflection,
    handleDefault,
    handleDiaryEntry,
    handleDreamAnalysis,
    type HandlerDependencies,
    handleTextSession,
} from "../orchestration.handlers.ts";
import { DatabaseError, ValidationError } from "../../errors.ts";

// --- KAPSAMLI MOCK'LAR ---
const createMockSupabaseClient = () => ({
    from: (_table: string) => ({
        upsert: (_data: unknown) => ({
            select: () => ({
                single: () =>
                    Promise.resolve({
                        data: {
                            id: "new-event-id",
                            created_at: new Date().toISOString(),
                        },
                        error: null,
                    }),
            }),
        }),
        insert: (_data: unknown) => ({
            select: () => ({
                single: () =>
                    Promise.resolve({
                        data: { id: "log-id" },
                        error: null,
                    }),
            }),
        }),
        update: (_data: unknown) => ({
            eq: (_field: string, _value: unknown) =>
                Promise.resolve({
                    data: null,
                    error: null,
                }),
        }),
    }),
    functions: {
        invoke: () => Promise.resolve({ error: null }),
    },
});

const createMockAiService = () => ({
    invokeGemini: () =>
        Promise.resolve(JSON.stringify({
            title: "Test Rüyası",
            summary: "Bu bir test rüyasıdır",
            themes: ["test", "analiz"],
            interpretation: "Test yorumu",
            crossConnections: [],
            questions: ["Soru 1?", "Soru 2?"],
        })),
    embedContent: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
});

const createMockVaultService = () => ({
    getUserVault: () =>
        Promise.resolve({
            profile: { nickname: "TestUser", therapyGoals: "Test goal" },
            themes: ["test"],
            keyInsights: ["insight 1"],
            moodHistory: [],
        }),
    updateUserVault: () => Promise.resolve(),
});

const createMockRagService = () => ({
    retrieveContext: () =>
        Promise.resolve([
            {
                content: "Test memory content",
                similarity: 0.8,
                source_layer: "content" as const,
            },
        ]),
});

const createMockContextBuilder = () => ({
    buildDreamAnalysisContext: () =>
        Promise.resolve({
            userDossier: { userName: "TestUser", recentMood: "happy" },
            ragContext: "Test RAG context",
        }),
    buildDailyReflectionContext: () =>
        Promise.resolve({
            dossier: {
                userName: "TestUser",
                yesterdayMood: null,
                yesterdayNote: null,
            },
            retrievedMemories: [],
        }),
    buildTextSessionContext: () =>
        Promise.resolve({
            userDossier: {
                nickname: "TestUser",
                dnaSummary: "Test DNA",
                recentMood: "happy",
                recentTopics: ["test"],
                lastInteractionType: "text_session",
                lastInteractionTime: new Date().toISOString(),
            },
            retrievedMemories: [],
            ragForPrompt: "Test prompt",
            activityContext: "Test activity",
            recentActivities: [],
            warmStartContext: null,
        }),
});

const createMockDependencies = (): HandlerDependencies => ({
    supabaseClient:
        createMockSupabaseClient() as unknown as HandlerDependencies[
            "supabaseClient"
        ],
    aiService:
        createMockAiService() as unknown as HandlerDependencies["aiService"],
    vaultService: createMockVaultService() as unknown as HandlerDependencies[
        "vaultService"
    ],
    ragService:
        createMockRagService() as unknown as HandlerDependencies["ragService"],
    logRagInvocation: () => Promise.resolve(),
    contextBuilder:
        createMockContextBuilder() as unknown as HandlerDependencies[
            "contextBuilder"
        ],
});

const createMockContext = (data: Record<string, unknown>) => ({
    transactionId: "test-tx-123",
    userId: "test-user-123",
    initialEvent: {
        data,
        type: "test_event",
        timestamp: Date.now(),
        id: "test-event-id",
        user_id: "test-user-123",
        created_at: new Date().toISOString(),
    },
    initialVault: {
        profile: { nickname: "TestUser" },
        themes: [],
        keyInsights: [],
    },
    logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
    },
    derivedData: {},
} as unknown as Parameters<typeof handleDreamAnalysis>[1]);

// --- DREAM ANALYSIS TESTS ---

Deno.test("handleDreamAnalysis - Happy Path", async () => {
    // 1. HAZIRLIK
    const dependencies = createMockDependencies();
    const context = createMockContext({
        dreamText: "Uçtuğum bir rüya gördüm. Çok güzeldi.",
        language: "tr",
    });

    // 2. EYLEM
    const result = await handleDreamAnalysis(dependencies, context);

    // 3. DOĞRULAMA
    assertEquals(result.eventId, "new-event-id");
});

Deno.test("handleDreamAnalysis - should throw ValidationError for short dream text", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({ dreamText: "kısa" });

    await assertRejects(
        async () => {
            await handleDreamAnalysis(dependencies, context);
        },
        ValidationError,
        "Analiz için yetersiz rüya metni.",
    );
});

Deno.test("handleDreamAnalysis - should throw ValidationError for missing dream text", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({});

    await assertRejects(
        async () => {
            await handleDreamAnalysis(dependencies, context);
        },
        ValidationError,
        "Analiz için yetersiz rüya metni.",
    );
});

Deno.test("handleDreamAnalysis - should handle database error", async () => {
    const dependencies = createMockDependencies();
    dependencies.supabaseClient.from = () => ({
        upsert: () => ({
            select: () => ({
                single: () =>
                    Promise.resolve({
                        data: null,
                        error: { message: "Database error" },
                    }),
            }),
        }),
    } as unknown as ReturnType<HandlerDependencies["supabaseClient"]["from"]>);

    const context = createMockContext({
        dreamText: "Uçtuğum bir rüya gördüm. Çok güzeldi.",
    });

    await assertRejects(
        async () => {
            await handleDreamAnalysis(dependencies, context);
        },
        DatabaseError,
        "Event kaydedilemedi: Database error",
    );
});

// --- DAILY REFLECTION TESTS ---

Deno.test("handleDailyReflection - Happy Path", async () => {
    const dependencies = createMockDependencies();
    dependencies.aiService.invokeGemini = () =>
        Promise.resolve(JSON.stringify({
            reflectionText: "Test reflection text",
            conversationTheme: "Test theme",
        }));

    const context = createMockContext({
        todayNote: "Bugün güzel bir gündü",
        todayMood: "happy",
        language: "tr",
    });

    const result = await handleDailyReflection(dependencies, context);

    assertEquals(result.aiResponse, "Test reflection text");
    assertEquals(result.conversationTheme, "Test theme");
    assertEquals(result.decisionLogId, "log-id");
    assertEquals(result.pendingSessionId, "new-event-id");
});

Deno.test("handleDailyReflection - should throw ValidationError for missing note", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({
        todayMood: "happy",
    });

    await assertRejects(
        async () => {
            await handleDailyReflection(dependencies, context);
        },
        ValidationError,
        "Yansıma için not ve duygu durumu gereklidir.",
    );
});

Deno.test("handleDailyReflection - should throw ValidationError for missing mood", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({
        todayNote: "Bugün güzel bir gündü",
    });

    await assertRejects(
        async () => {
            await handleDailyReflection(dependencies, context);
        },
        ValidationError,
        "Yansıma için not ve duygu durumu gereklidir.",
    );
});

Deno.test("handleDailyReflection - should handle invalid AI response", async () => {
    const dependencies = createMockDependencies();
    dependencies.aiService.invokeGemini = () => Promise.resolve("invalid json");

    const context = createMockContext({
        todayNote: "Bugün güzel bir gündü",
        todayMood: "happy",
    });

    await assertRejects(
        async () => {
            await handleDailyReflection(dependencies, context);
        },
        ValidationError,
        "AI cevabı geçersiz formatta.",
    );
});

// --- DIARY ENTRY TESTS ---

Deno.test("handleDiaryEntry - Happy Path First Turn", async () => {
    const dependencies = createMockDependencies();
    dependencies.aiService.invokeGemini = () =>
        Promise.resolve(JSON.stringify({
            mood: "happy",
            questions: ["Soru 1?", "Soru 2?", "Soru 3?"],
        }));

    const context = createMockContext({
        userInput: "Bugün çok güzel bir gün geçirdim",
        language: "tr",
    });

    const result = await handleDiaryEntry(dependencies, context);

    assertEquals(result.aiResponse, "Hazırım. Şunlardan biriyle devam edelim:");
    assertEquals(result.nextQuestions?.length, 3);
    assertEquals(result.isFinal, false);
    assertEquals(result.conversationId, "test-tx-123");
});

Deno.test("handleDiaryEntry - should throw ValidationError for missing user input", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({});

    await assertRejects(
        async () => {
            await handleDiaryEntry(dependencies, context);
        },
        ValidationError,
        "Günlük için metin gerekli.",
    );
});

Deno.test("handleDiaryEntry - should use default questions when AI fails", async () => {
    const dependencies = createMockDependencies();
    dependencies.aiService.invokeGemini = () =>
        Promise.resolve(JSON.stringify({
            mood: "happy",
            questions: [], // AI couldn't generate questions
        }));

    const context = createMockContext({
        userInput: "Bugün çok güzel bir gün geçirdim",
        language: "tr",
    });

    const result = await handleDiaryEntry(dependencies, context);

    assertEquals(result.nextQuestions?.length, 3);
    assertEquals(
        result.nextQuestions?.[0],
        "Şu an içinden geçen baskın duygu ne?",
    );
});

Deno.test("handleDiaryEntry - should finalize after 3 turns", async () => {
    const dependencies = createMockDependencies();
    dependencies.aiService.invokeGemini = () =>
        Promise.resolve(JSON.stringify({
            questions: ["Soru 1?"],
        }));

    const context = createMockContext({
        userInput: "Devam ediyorum",
        conversationId: "test-conv",
        turn: 3,
        language: "tr",
    });

    const result = await handleDiaryEntry(dependencies, context);

    assertEquals(result.isFinal, true);
    assertEquals(result.nextQuestions?.length, 0);
});

// --- TEXT SESSION TESTS ---

Deno.test("handleTextSession - Happy Path Warm Start", async () => {
    const dependencies = createMockDependencies();
    dependencies.contextBuilder.buildTextSessionContext = () =>
        Promise.resolve({
            userDossier: {
                nickname: "TestUser",
                dnaSummary: "Test DNA",
                recentMood: "happy",
                recentTopics: ["test"],
                lastInteractionType: "text_session",
                lastInteractionTime: new Date().toISOString(),
            },
            retrievedMemories: [],
            ragForPrompt: "",
            activityContext: "",
            recentActivities: [],
            warmStartContext: {
                originalNote: "Test note",
                aiReflection: "Test reflection",
                theme: "Test theme",
                source: "daily_reflection",
            },
        });

    dependencies.aiService.invokeGemini = () =>
        Promise.resolve("Test warm start response");

    const context = createMockContext({
        messages: [],
        pendingSessionId: "test-session-id",
        language: "tr",
    });

    const result = await handleTextSession(dependencies, context);

    assertEquals(result.aiResponse, "Test warm start response");
    assertEquals(result.usedMemory, null);
});

Deno.test("handleTextSession - should throw ValidationError for missing warm start context", async () => {
    const dependencies = createMockDependencies();
    dependencies.contextBuilder.buildTextSessionContext = () =>
        Promise.resolve({
            userDossier: {
                nickname: "TestUser",
                dnaSummary: "Test DNA",
                recentMood: "happy",
                recentTopics: ["test"],
                lastInteractionType: "text_session",
                lastInteractionTime: new Date().toISOString(),
            },
            retrievedMemories: [],
            ragForPrompt: "",
            activityContext: "",
            recentActivities: [],
            warmStartContext: null, // No warm start context
        });

    const context = createMockContext({
        messages: [],
        pendingSessionId: "test-session-id",
    });

    await assertRejects(
        async () => {
            await handleTextSession(dependencies, context);
        },
        ValidationError,
        "Geçici oturum bulunamadı veya süresi doldu.",
    );
});

Deno.test("handleTextSession - Happy Path Normal Conversation", async () => {
    const dependencies = createMockDependencies();
    dependencies.contextBuilder.buildTextSessionContext = () =>
        Promise.resolve({
            userDossier: {
                nickname: "TestUser",
                dnaSummary: "Test DNA",
                recentMood: "happy",
                recentTopics: ["test"],
                lastInteractionType: "text_session",
                lastInteractionTime: new Date().toISOString(),
            },
            retrievedMemories: [
                { content: "Test memory", similarity: 0.9 },
            ],
            ragForPrompt: "Test RAG prompt",
            activityContext: "Test activity context",
            recentActivities: [],
            warmStartContext: null,
        });

    dependencies.aiService.invokeGemini = () =>
        Promise.resolve("Test conversation response");

    const context = createMockContext({
        messages: [
            { sender: "user", text: "Merhaba, nasılsın?" },
        ],
        language: "tr",
    });

    const result = await handleTextSession(dependencies, context);

    assertEquals(result.aiResponse, "Test conversation response");
    assertEquals(result.usedMemory, null); // No memories used due to greeting detection
});

Deno.test("handleTextSession - should throw ValidationError for missing messages", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({});

    await assertRejects(
        async () => {
            await handleTextSession(dependencies, context);
        },
        ValidationError,
        "Sohbet için mesaj gerekli.",
    );
});

Deno.test("handleTextSession - should use fallback when AI fails", async () => {
    const dependencies = createMockDependencies();
    dependencies.contextBuilder.buildTextSessionContext = () =>
        Promise.resolve({
            userDossier: {
                nickname: "TestUser",
                dnaSummary: "Test DNA",
                recentMood: "happy",
                recentTopics: ["test"],
                lastInteractionType: "text_session",
                lastInteractionTime: new Date().toISOString(),
            },
            retrievedMemories: [],
            ragForPrompt: "",
            activityContext: "",
            recentActivities: [],
            warmStartContext: null,
        });

    dependencies.aiService.invokeGemini = () =>
        Promise.reject(new Error("AI failed"));

    const context = createMockContext({
        messages: [
            { sender: "user", text: "Merhaba, nasılsın?" },
        ],
        language: "tr",
    });

    const result = await handleTextSession(dependencies, context);

    // Should use fallback response
    assertEquals(typeof result.aiResponse, "string");
    assertEquals(result.aiResponse.length > 0, true);
});

// --- DEFAULT HANDLER TESTS ---

Deno.test("handleDefault - Happy Path", async () => {
    const dependencies = createMockDependencies();
    const context = createMockContext({});

    const result = await handleDefault(dependencies, context);

    assertEquals(typeof result, "string");
    assertEquals(result.includes("test_event"), true);
});

// --- EVENT HANDLERS MAP TESTS ---

Deno.test("eventHandlers - should contain all expected handlers", () => {
    const expectedHandlers = [
        "dream_analysis",
        "daily_reflection",
        "text_session",
        "session_end",
        "voice_session",
        "video_session",
        "ai_analysis",
        "diary_entry",
        "onboarding_completed",
        "default",
    ];

    for (const handlerName of expectedHandlers) {
        assertEquals(typeof eventHandlers[handlerName], "function");
    }
});

Deno.test("eventHandlers - should have correct function signatures", () => {
    const _dependencies = createMockDependencies();
    const _context = createMockContext({});

    // Test that handlers accept the correct parameters
    for (const [name, handler] of Object.entries(eventHandlers)) {
        if (name === "ai_analysis") continue; // Skip this one as it has different signature

        assertEquals(typeof handler, "function");

        // Should be callable with dependencies and context
        assertEquals(handler.length, 2);
    }
});
