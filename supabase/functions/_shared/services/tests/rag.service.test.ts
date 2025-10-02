// supabase/functions/_shared/services/tests/rag.service.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { retrieveContext } from "../rag.service.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type * as AiService from "../ai.service.ts";

// --- Mock'lar ---

type MockMatch = {
    id: string;
    content: string;
    event_time: string;
    similarity: number;
};

const createMockDependencies = (
    { embedding, embedError }: {
        embedding: number[] | null;
        embedError?: Error;
    },
    { matches, rpcError }: { matches?: MockMatch[]; rpcError?: Error },
) => {
    const mockAiService = {
        embedContent: () =>
            Promise.resolve({ embedding, error: embedError?.message }),
    };

    const mockSupabaseClient = {
        rpc: () => Promise.resolve({ data: matches, error: rpcError }),
    } as unknown as SupabaseClient;

    return {
        supabaseClient: mockSupabaseClient,
        aiService: mockAiService as unknown as {
            embedContent: typeof AiService.embedContent;
        },
    };
};

// --- Testler ---

Deno.test("retrieveContext - should return matching memories on full success", async () => {
    // 1. HAZIRLIK
    const mockMatches = [
        { id: "1", content: "İlk anı.", event_time: "...", similarity: 0.9 },
        { id: "2", content: "İkinci anı.", event_time: "...", similarity: 0.8 },
    ];
    const dependencies = createMockDependencies(
        { embedding: [0.1, 0.2] },
        { matches: mockMatches },
    );

    // 2. EYLEM
    const results = await retrieveContext(
        dependencies,
        "test-user",
        "test query",
        { threshold: 0.7, count: 5 },
    );

    // 3. DOĞRULAMA
    assertEquals(results.length, 2);
    assertEquals(results[0].content, "İlk anı.");
    assertEquals(results[1].similarity, 0.8);
    assertEquals(results[0].source_layer, "content");
});

Deno.test("retrieveContext - should return an empty array if embedding fails", async () => {
    // 1. HAZIRLIK: embedContent hata döndürecek
    const dependencies = createMockDependencies(
        { embedding: null, embedError: new Error("Embedding API down") },
        { matches: [] },
    );

    // 2. EYLEM
    const results = await retrieveContext(
        dependencies,
        "test-user",
        "test query",
        { threshold: 0.7, count: 5 },
    );

    // 3. DOĞRULAMA
    assertEquals(results.length, 0);
});

Deno.test("retrieveContext - should return an empty array if RPC call fails", async () => {
    // 1. HAZIRLIK: rpc('match_memories') hata döndürecek
    const dependencies = createMockDependencies(
        { embedding: [0.1, 0.2] },
        { rpcError: new Error("Database connection failed") },
    );

    // 2. EYLEM
    const results = await retrieveContext(
        dependencies,
        "test-user",
        "test query",
        { threshold: 0.7, count: 5 },
    );

    // 3. DOĞRULAMA
    assertEquals(results.length, 0);
});

Deno.test("retrieveContext - should return an empty array if no matches are found", async () => {
    // 1. HAZIRLIK: Her şey başarılı ama sonuç boş
    const dependencies = createMockDependencies(
        { embedding: [0.1, 0.2] },
        { matches: [] },
    );

    // 2. EYLEM
    const results = await retrieveContext(
        dependencies,
        "test-user",
        "test query",
        { threshold: 0.7, count: 5 },
    );

    // 3. DOĞRULAMA
    assertEquals(results.length, 0);
});
