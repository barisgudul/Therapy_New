// supabase/functions/_shared/services/tests/behavioral-pattern-analyzer.service.test.ts

import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    type BehavioralAnalysisResult,
    BehavioralPatternAnalyzer,
} from "../behavioral-pattern-analyzer.service.ts";
import type { AppEvent } from "../../types/context.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Mock'ları buraya kur ---
function createMockSupabaseClient(
    returnData: Record<string, { data?: unknown; error?: unknown }>,
): SupabaseClient {
    const mock = {
        from: (tableName: string) => {
            const result = {
                data: returnData[tableName]?.data,
                error: returnData[tableName]?.error,
            };

            const promiseLike = {
                select: () => promiseLike,
                eq: () => promiseLike,
                gte: () => promiseLike,
                order: () => promiseLike,
                single: () => Promise.resolve(result),
                then: (onFulfilled?: (value: unknown) => unknown) => {
                    return Promise.resolve(result).then(onFulfilled);
                },
            };

            return promiseLike;
        },
    } as unknown as SupabaseClient;
    return mock;
}

const mockAiService = {
    invokeGemini: (
        prompt: string,
        _model: string,
        _options?: { temperature?: number; maxOutputTokens?: number },
    ) => {
        // Test senaryosuna göre sahte bir AI cevabı döndür
        if (prompt.includes("davranış analisti")) {
            return Promise.resolve("İşte sana harika bir özet.");
        }
        return Promise.resolve("");
    },
};

// --- Testler Başlıyor ---

Deno.test("BehavioralPatternAnalyzer - Yetersiz Veri Durumu", async () => {
    const mockClient = createMockSupabaseClient({
        "events": { data: [] }, // Boş event listesi
        "user_vaults": { data: { vault_data: {} } },
    });
    const dependencies = {
        supabaseClient: mockClient,
        aiService: mockAiService,
    };

    const result = await BehavioralPatternAnalyzer.analyzePatterns(
        dependencies,
        "test-user",
        30,
    );

    assertEquals(result.total_patterns_found, 0);
    assertEquals(result.analysis_confidence, 0);
});

Deno.test("BehavioralPatternAnalyzer - İletişim Kalıbı Tespiti", () => {
    // 1. HAZIRLIK: Kısa mesajlar içeren sahte event'ler oluştur
    const mockEvents: AppEvent[] = [
        {
            id: "1",
            user_id: "test-user",
            type: "text_session",
            data: { userMessage: "evet" },
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "2",
            user_id: "test-user",
            type: "daily_reflection",
            data: { todayNote: "iyiyim" },
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "3",
            user_id: "test-user",
            type: "dream_analysis",
            data: { dreamText: "kısa rüya" },
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
    ];

    // 2. EYLEM: private metodu test etmek için bu hileyi kullanıyoruz
    // @ts-ignore: Accessing private method for testing
    const patterns = BehavioralPatternAnalyzer.detectCommunicationPatterns(
        mockEvents,
    );

    // 3. DOĞRULAMA
    assertEquals(patterns.length, 1);
    assertEquals(patterns[0].pattern_id, "short_messages");
    assert(patterns[0].confidence_score > 0.7);
});

Deno.test("BehavioralPatternAnalyzer - Mood Kalıbı Tespiti", () => {
    // 1. HAZIRLIK: Baskın bir mood içeren sahte event'ler oluştur
    const mockEvents: AppEvent[] = [
        {
            id: "1",
            user_id: "test-user",
            type: "mood_tracking",
            mood: "mutlu",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "2",
            user_id: "test-user",
            type: "mood_tracking",
            mood: "mutlu",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "3",
            user_id: "test-user",
            type: "mood_tracking",
            mood: "üzgün",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "4",
            user_id: "test-user",
            type: "mood_tracking",
            mood: "mutlu",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "5",
            user_id: "test-user",
            type: "mood_tracking",
            mood: "mutlu",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
    ];

    // 2. EYLEM
    // @ts-ignore: Accessing private method for testing
    const patterns = BehavioralPatternAnalyzer.detectMoodPatterns(mockEvents);

    // 3. DOĞRULAMA
    assertEquals(patterns.length, 1);
    assertEquals(patterns[0].pattern_id, "dominant_mood_mutlu");
});

Deno.test("BehavioralPatternAnalyzer - Aktivite Kalıbı Tespiti", () => {
    // 1. HAZIRLIK: Baskın bir aktivite tipi içeren sahte event'ler oluştur
    const mockEvents: AppEvent[] = [
        {
            id: "1",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "2",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "3",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "4",
            user_id: "test-user",
            type: "dream_analysis",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
        {
            id: "5",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
    ];

    // 2. EYLEM
    // @ts-ignore: Accessing private method for testing
    const patterns = BehavioralPatternAnalyzer.detectActivityPatterns(
        mockEvents,
    );

    // 3. DOĞRULAMA
    assertEquals(patterns.length, 1);
    assertEquals(patterns[0].pattern_id, "preferred_activity_text_session");
});

Deno.test("BehavioralPatternAnalyzer - Zaman Kalıbı Tespiti", () => {
    // 1. HAZIRLIK: Aynı saatte oluşturulan sahte event'ler
    const baseDate = new Date();
    baseDate.setHours(14, 0, 0, 0); // 14:00

    const mockEvents: AppEvent[] = [
        {
            id: "1",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date(baseDate.getTime() + 0).toISOString(),
            timestamp: baseDate.getTime() + 0,
        },
        {
            id: "2",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date(baseDate.getTime() + 1000).toISOString(),
            timestamp: baseDate.getTime() + 1000,
        },
        {
            id: "3",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date(baseDate.getTime() + 2000).toISOString(),
            timestamp: baseDate.getTime() + 2000,
        },
        {
            id: "4",
            user_id: "test-user",
            type: "dream_analysis",
            data: {},
            created_at: new Date(baseDate.getTime() + 3000).toISOString(),
            timestamp: baseDate.getTime() + 3000,
        },
        {
            id: "5",
            user_id: "test-user",
            type: "text_session",
            data: {},
            created_at: new Date(baseDate.getTime() + 4000).toISOString(),
            timestamp: baseDate.getTime() + 4000,
        },
    ];

    // 2. EYLEM
    // @ts-ignore: Accessing private method for testing
    const patterns = BehavioralPatternAnalyzer.detectTemporalPatterns(
        mockEvents,
    );

    // 3. DOĞRULAMA
    assertEquals(patterns.length, 1);
    assertEquals(patterns[0].pattern_id, "peak_time_14");
});

Deno.test("BehavioralPatternAnalyzer - Veri Kalitesi Değerlendirmesi", () => {
    // 1. HAZIRLIK: Yüksek kaliteli veri
    const mockEvents: AppEvent[] = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        user_id: "test-user",
        type: i % 2 === 0 ? "text_session" : "dream_analysis",
        mood: i % 3 === 0 ? "mutlu" : undefined,
        data: { userMessage: `Test message ${i}` },
        created_at: new Date(Date.now() - (25 - i) * 24 * 60 * 60 * 1000)
            .toISOString(),
        timestamp: Date.now() - (25 - i) * 24 * 60 * 60 * 1000,
    }));

    // 2. EYLEM
    // @ts-ignore: Accessing private method for testing
    const quality = BehavioralPatternAnalyzer.assessDataQuality({
        events: mockEvents,
    });

    // 3. DOĞRULAMA
    assert(quality > 0.5); // Yüksek kaliteli veri olmalı
});

Deno.test("BehavioralPatternAnalyzer - Tam Analiz Senaryosu", async () => {
    // 1. HAZIRLIK: Yeterli veri ile tam analiz
    const mockEvents: AppEvent[] = Array.from({ length: 15 }, (_, i) => ({
        id: String(i + 1),
        user_id: "test-user",
        type: i % 3 === 0
            ? "text_session"
            : i % 3 === 1
            ? "dream_analysis"
            : "daily_reflection",
        mood: i % 4 === 0 ? "mutlu" : i % 4 === 1 ? "üzgün" : undefined,
        data: Object.fromEntries([
            ...(i % 3 === 0 ? [["userMessage", "Kısa mesaj"]] : []),
            ...(i % 3 === 1 ? [["dreamText", "Rüya metni"]] : []),
            ...(i % 3 === 2 ? [["todayNote", "Günlük not"]] : []),
        ]),
        created_at: new Date(Date.now() - (15 - i) * 24 * 60 * 60 * 1000)
            .toISOString(),
        timestamp: Date.now() - (15 - i) * 24 * 60 * 60 * 1000,
    }));

    const mockClient = createMockSupabaseClient({
        "events": { data: mockEvents },
        "user_vaults": {
            data: { vault_data: { profile: { name: "Test User" } } },
        },
    });
    const dependencies = {
        supabaseClient: mockClient,
        aiService: mockAiService,
    };

    // 2. EYLEM
    const result = await BehavioralPatternAnalyzer.analyzePatterns(
        dependencies,
        "test-user",
        30,
    );

    // 3. DOĞRULAMA
    assert(result.total_patterns_found > 0);
    assert(result.analysis_confidence > 0);
    assert(result.data_quality_score > 0);
    assertEquals(result.user_id, "test-user");
    assertEquals(result.analysis_period_days, 30);
});

Deno.test("BehavioralPatternAnalyzer - gatherUserData Metodu", async () => {
    // 1. HAZIRLIK
    const mockEvents: AppEvent[] = [
        {
            id: "1",
            user_id: "test-user",
            type: "text_session",
            data: { userMessage: "Test" },
            created_at: new Date().toISOString(),
            timestamp: Date.now(),
        },
    ];

    const mockClient = createMockSupabaseClient({
        "events": { data: mockEvents },
        "user_vaults": {
            data: { vault_data: { profile: { name: "Test User" } } },
        },
    });

    // 2. EYLEM
    const result = await BehavioralPatternAnalyzer.gatherUserData(
        mockClient,
        "test-user",
        7,
    );

    // 3. DOĞRULAMA
    assertEquals(result.events.length, 1);
    assertEquals(
        (result.vault as { profile: { name: string } }).profile.name,
        "Test User",
    );
    assert(result.period_start < result.period_end);
});

Deno.test("BehavioralPatternAnalyzer - generatePatternSummary Metodu", async () => {
    // 1. HAZIRLIK
    const mockAnalysis = {
        total_patterns_found: 2,
        patterns: [
            {
                pattern_id: "test_pattern",
                pattern_name: "Test Pattern",
                pattern_type: "communication" as const,
                description: "Test description",
                frequency: 5,
                confidence_score: 0.8,
                first_observed: new Date().toISOString(),
                last_observed: new Date().toISOString(),
                examples: ["Example 1"],
                potential_triggers: ["Trigger 1"],
                suggested_insights: ["Insight 1"],
            },
        ],
        overall_trends: {
            communication_trend: "stable" as const,
            mood_stability: "high" as const,
            engagement_level: "high" as const,
        },
        data_quality_score: 0.8,
        analysis_confidence: 0.7,
    } as BehavioralAnalysisResult;

    // 2. EYLEM
    const result = await BehavioralPatternAnalyzer.generatePatternSummary(
        mockAiService,
        mockAnalysis,
    );

    // 3. DOĞRULAMA
    assert(result.length > 0);
    assert(result.includes("İşte sana harika bir özet"));
});
