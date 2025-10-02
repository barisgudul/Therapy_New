// supabase/functions/_shared/services/tests/orchestration.service.test.ts

import {
    assertEquals,
    assertRejects,
    assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    determinePipelineType,
    ensureHumanityReminder,
    processUserMessage,
} from "../orchestration.service.ts";
import type { EventPayload } from "../event.service.ts";
// SystemHealthMonitor, ControlledHybridPipeline ve LoggingService import'ları kaldırıldı - mock kullanıyoruz

// --- Mock'lar ---

const mockDependencies = {
    SystemHealthMonitor: {
        evaluateSystemHealth: () => Promise.resolve({ health_score: 100 }), // Varsayılan: Sistem sağlıklı
    },
    ControlledHybridPipeline: {
        executeComplexQuery: (_context: unknown, _pipelineType: string) =>
            Promise.resolve("Pipeline Başarılı"),
    },
    LoggingService: class MockLogger {
        // LoggingService bir class olduğu için onu da mock'la
        info() {}
        warn() {}
        error() {}
    },
    generateId: () => "mock-uuid-1234",
} as unknown as Parameters<typeof processUserMessage>[0];

// --- Testler ---

Deno.test("determinePipelineType - should return the correct pipeline type for each event", () => {
    assertEquals(determinePipelineType("text_session"), "therapy_session");
    assertEquals(determinePipelineType("voice_session"), "therapy_session");
    assertEquals(determinePipelineType("video_session"), "therapy_session");
    assertEquals(determinePipelineType("dream_analysis"), "dream_analysis");
    assertEquals(determinePipelineType("daily_reflection"), "daily_reflection");
    assertEquals(determinePipelineType("diary_entry"), "diary_management");
    assertEquals(determinePipelineType("ai_analysis"), "deep_analysis");
    assertEquals(
        determinePipelineType("onboarding_completed"),
        "insight_synthesis",
    );
    assertEquals(determinePipelineType("unknown_event"), "deep_analysis"); // Varsayılan durum
});

Deno.test("ensureHumanityReminder - should add reminder to a simple string", () => {
    const result = "AI cevabı.";
    const remindedResult = ensureHumanityReminder(result);
    assertStringIncludes(remindedResult, "Unutma:");
    assertEquals(remindedResult.startsWith(result), true);
});

Deno.test("ensureHumanityReminder - should NOT add reminder if it already exists", () => {
    const result = "AI cevabı. Unutma: ben bir aracım.";
    const remindedResult = ensureHumanityReminder(result);
    assertEquals(remindedResult, result); // Değişmemeli
});

Deno.test("ensureHumanityReminder - should handle non-string inputs", () => {
    const result = { message: "AI cevabı" };
    const remindedResult = ensureHumanityReminder(result as unknown as string);
    assertEquals(remindedResult, result as unknown as string); // Değişmemeli
});

Deno.test("processUserMessage - should execute pipeline and return result when system health is good", async () => {
    const dependencies = { ...mockDependencies }; // Sağlıklı sistem mock'u
    const payload: EventPayload = { type: "text_session", data: {} };

    const result = await processUserMessage(dependencies, "test-user", payload);

    assertStringIncludes(result, "Pipeline Başarılı");
    assertStringIncludes(result, "Unutma:"); // Reminder eklenmiş mi?
});

Deno.test("processUserMessage - should return a fallback message when system health is critical", async () => {
    // Sistemi bozuk olarak ayarla
    const unhealthyDependencies = {
        ...mockDependencies,
        SystemHealthMonitor: {
            evaluateSystemHealth: () => Promise.resolve({ health_score: 50 }), // Kritik seviye
        },
    } as unknown as Parameters<typeof processUserMessage>[0];
    const payload: EventPayload = { type: "text_session", data: {} };

    const result = await processUserMessage(
        unhealthyDependencies,
        "test-user",
        payload,
    );

    assertEquals(
        result,
        "Sistem şu an yoğun, lütfen daha sonra tekrar deneyin.",
    );
});

Deno.test("processUserMessage - should throw ApiError if pipeline fails", async () => {
    // Pipeline'ı hata verecek şekilde ayarla
    const failingDependencies = {
        ...mockDependencies,
        ControlledHybridPipeline: {
            executeComplexQuery: () =>
                Promise.reject(new Error("Pipeline çöktü")),
        },
    } as unknown as Parameters<typeof processUserMessage>[0];
    const payload: EventPayload = { type: "text_session", data: {} };

    await assertRejects(
        async () => {
            await processUserMessage(failingDependencies, "test-user", payload);
        },
        Error, // ApiError
        "İsteğiniz işlenirken bir sorun oluştu.",
    );
});

Deno.test("processUserMessage - should handle different event types correctly", async () => {
    const dependencies = { ...mockDependencies };

    // Test different event types
    const testCases: EventPayload[] = [
        { type: "dream_analysis", data: { dreamText: "Test dream" } },
        {
            type: "daily_reflection",
            data: { todayNote: "Test note", todayMood: "happy" },
        },
        { type: "diary_entry", data: { userInput: "Test input" } },
        { type: "ai_analysis", data: { analysisType: "pattern" } },
    ];

    for (const payload of testCases) {
        const result = await processUserMessage(
            dependencies,
            "test-user",
            payload,
        );
        assertStringIncludes(result, "Pipeline Başarılı");
        assertStringIncludes(result, "Unutma:");
    }
});

Deno.test("processUserMessage - should create proper context with all required fields", async () => {
    let capturedContext: unknown = null;

    const dependencies = {
        ...mockDependencies,
        ControlledHybridPipeline: {
            executeComplexQuery: (context: unknown, _pipelineType: string) => {
                capturedContext = context;
                return Promise.resolve("Success");
            },
        },
    } as unknown as Parameters<typeof processUserMessage>[0];

    const payload: EventPayload = {
        type: "text_session",
        data: { test: "data" },
    };

    await processUserMessage(dependencies, "test-user", payload);

    // Context'in doğru oluşturulduğunu kontrol et
    const context = capturedContext as Record<string, unknown>;
    assertEquals(context.userId, "test-user");
    assertEquals(context.transactionId, "mock-uuid-1234");
    assertEquals(
        (context.initialEvent as Record<string, unknown>).type,
        "text_session",
    );
    assertEquals((context.initialEvent as Record<string, unknown>).data, {
        test: "data",
    });
    assertEquals(
        (context.initialEvent as Record<string, unknown>).user_id,
        "test-user",
    );
    assertEquals(
        typeof (context.initialEvent as Record<string, unknown>).timestamp,
        "number",
    );
    assertEquals(
        typeof (context.initialEvent as Record<string, unknown>).created_at,
        "string",
    );
    assertEquals(
        context.logger instanceof dependencies.LoggingService,
        true,
    );
});

Deno.test("processUserMessage - should handle system health edge case (exactly 60)", async () => {
    // Sistem sağlığı tam 60 - sınır değeri
    const edgeCaseDependencies = {
        ...mockDependencies,
        SystemHealthMonitor: {
            evaluateSystemHealth: () => Promise.resolve({ health_score: 60 }),
        },
    } as unknown as Parameters<typeof processUserMessage>[0];
    const payload: EventPayload = { type: "text_session", data: {} };

    // 60 >= 60 olduğu için pipeline çalışmalı
    const result = await processUserMessage(
        edgeCaseDependencies,
        "test-user",
        payload,
    );
    assertStringIncludes(result, "Pipeline Başarılı");
});

Deno.test("processUserMessage - should handle system health edge case (59)", async () => {
    // Sistem sağlığı 59 - kritik seviye
    const criticalDependencies = {
        ...mockDependencies,
        SystemHealthMonitor: {
            evaluateSystemHealth: () => Promise.resolve({ health_score: 59 }),
        },
    } as unknown as Parameters<typeof processUserMessage>[0];
    const payload: EventPayload = { type: "text_session", data: {} };

    // 59 < 60 olduğu için fallback mesaj dönmeli
    const result = await processUserMessage(
        criticalDependencies,
        "test-user",
        payload,
    );
    assertEquals(
        result,
        "Sistem şu an yoğun, lütfen daha sonra tekrar deneyin.",
    );
});
