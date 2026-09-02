// supabase/functions/_shared/services/tests/controlled-hybrid-pipeline.service.test.ts

import {
    assertEquals,
    assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { executeDeepAnalysis } from "../controlled-hybrid-pipeline.service.ts";
import type { InteractionContext } from "../../types/context.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Mock'lar ---

let capturedPrompt = ""; // Hangi prompt'un gönderildiğini yakalamak için
const mockAiService = {
    invokeGemini: (
        _supabase: SupabaseClient,
        prompt: string,
        _model: string,
        _config?: unknown,
        _transactionId?: string,
    ) => {
        capturedPrompt = prompt; // Prompt'u yakala
        return Promise.resolve('{ "insight": "Test içgörüsü." }');
    },
};

const mockSupabaseClient = {} as SupabaseClient; // Bu test için içeriği önemli değil

// Sahte bir InteractionContext objesi oluştur
const createMockContext = (): InteractionContext => ({
    transactionId: "test-tx-123",
    userId: "test-user-456",
    initialVault: {},
    initialEvent: {
        id: "evt-1",
        user_id: "test-user-456",
        type: "ai_analysis",
        timestamp: Date.now(),
        created_at: new Date().toISOString(),
        data: {},
    },
    logger: {
        // Logger'ı da mock'la, hataları görmezden gel
        info: () => {},
        warn: () => {},
        error: () => {},
    },
    derivedData: {},
});

// --- Testler ---

Deno.test("executeDeepAnalysis - should call AI service with the correct prompt and return the reply", async () => {
    // 1. HAZIRLIK
    const dependencies = {
        supabaseClient: mockSupabaseClient,
        aiService: mockAiService,
    };
    const context = createMockContext();
    capturedPrompt = ""; // Her testten önce sıfırla

    // 2. EYLEM
    const reply = await executeDeepAnalysis(dependencies, context);

    // 3. DOĞRULAMA
    assertStringIncludes(capturedPrompt, "kısa bir analiz özeti üret");
    assertEquals(reply, '{ "insight": "Test içgörüsü." }');
});

Deno.test("executeDeepAnalysis - should pass correct parameters to AI service", async () => {
    // 1. HAZIRLIK
    let capturedModel = "";
    let capturedConfig: unknown = {};
    let capturedTransactionId = "";

    const mockAiServiceWithCapture = {
        invokeGemini: (
            _supabase: SupabaseClient,
            prompt: string,
            model: string,
            config?: unknown,
            transactionId?: string,
        ) => {
            capturedPrompt = prompt;
            capturedModel = model;
            capturedConfig = config || {};
            capturedTransactionId = transactionId || "";
            return Promise.resolve('{ "insight": "Test içgörüsü." }');
        },
    };

    const dependencies = {
        supabaseClient: mockSupabaseClient,
        aiService: mockAiServiceWithCapture,
    };
    const context = createMockContext();

    // 2. EYLEM
    await executeDeepAnalysis(dependencies, context);

    // 3. DOĞRULAMA
    assertStringIncludes(capturedPrompt, "JSON döndür");
    assertEquals(capturedModel, "gemini-2.0-flash-lite"); // config.AI_MODELS.ADVANCED
    assertEquals(capturedTransactionId, "test-tx-123");
    assertEquals(capturedConfig, {
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 2048, // LLM_LIMITS.AI_ANALYSIS (before security limit)
    });
});

Deno.test("executeDeepAnalysis - should handle AI service errors", async () => {
    // 1. HAZIRLIK
    const errorAiService = {
        invokeGemini: () => {
            throw new Error("AI service failed");
        },
    };

    const dependencies = {
        supabaseClient: mockSupabaseClient,
        aiService: errorAiService,
    };
    const context = createMockContext();

    // 2. EYLEM & 3. DOĞRULAMA
    try {
        await executeDeepAnalysis(dependencies, context);
        assertEquals(true, false, "Should have thrown an error");
    } catch (error) {
        assertEquals((error as Error).message, "AI service failed");
    }
});

Deno.test("executeDeepAnalysis - should work with different context values", async () => {
    // 1. HAZIRLIK
    const dependencies = {
        supabaseClient: mockSupabaseClient,
        aiService: mockAiService,
    };

    const contextWithDifferentTx = {
        ...createMockContext(),
        transactionId: "different-tx-456",
    };

    // 2. EYLEM
    const reply = await executeDeepAnalysis(
        dependencies,
        contextWithDifferentTx,
    );

    // 3. DOĞRULAMA
    assertEquals(reply, '{ "insight": "Test içgörüsü." }');
    assertStringIncludes(capturedPrompt, "kısa bir analiz özeti üret");
});
