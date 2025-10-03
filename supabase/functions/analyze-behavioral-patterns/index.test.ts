// supabase/functions/analyze-behavioral-patterns/index.test.ts

import "../_shared/test_setup.ts";
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handleAnalyzeBehavioralPatterns } from "./index.ts";
import { BehavioralPatternAnalyzer } from "../_shared/services/behavioral-pattern-analyzer.service.ts";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test("Analyze Behavioral Patterns - Full Suite", async (t) => {
    await t.step(
        "should return 200 and analysis on successful request",
        async () => {
            const mockAnalysisResult = {
                user_id: "user-123",
                analysis_period_days: 14,
                total_patterns_found: 2,
                patterns: [
                    {
                        pattern_id: "pattern-1",
                        pattern_name: "Test Pattern",
                        pattern_type: "communication" as const,
                        description: "Test pattern description",
                        frequency: 5,
                        confidence_score: 0.8,
                        first_observed: "2024-01-01T00:00:00Z",
                        last_observed: "2024-01-14T00:00:00Z",
                        examples: ["Example 1", "Example 2"],
                        potential_triggers: ["Trigger 1"],
                        suggested_insights: [
                            "Test insight 1",
                            "Test insight 2",
                        ],
                    },
                ],
                overall_trends: {
                    communication_trend: "improving" as const,
                    mood_stability: "high" as const,
                    engagement_level: "high" as const,
                },
                data_quality_score: 0.9,
                analysis_confidence: 0.8,
                generated_at: "2024-01-14T12:00:00Z",
            };

            // 1. SAHTE SUPABASE CLIENT'INI OLUŞTUR
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
            };

            // 2. ANALİZ SERVİSİNİ STUB'LA
            const analyzeStub = stub(
                BehavioralPatternAnalyzer,
                "analyzePatterns",
                () => Promise.resolve(mockAnalysisResult),
            );

            try {
                const request = new Request("http://localhost/analyze", {
                    method: "POST",
                    headers: { Authorization: "Bearer valid-jwt" },
                    body: JSON.stringify({ days: 14 }),
                });

                // 3. SAHTE CLIENT'I FONKSİYONA PARAMETRE OLARAK VER
                const response = await handleAnalyzeBehavioralPatterns(
                    request,
                    mockSupabaseClient as any,
                );

                assertEquals(response.status, 200);
                assertEquals(await response.json(), mockAnalysisResult);
            } finally {
                analyzeStub.restore();
            }
        },
    );

    await t.step("should return 400 when JWT is invalid", async () => {
        // SAHTE CLIENT'IN GETUSER METODUNU NULL USER DÖNDÜRECEK ŞEKİLDE AYARLA
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({ data: { user: null }, error: null }),
            },
        };

        const request = new Request("http://localhost/analyze", {
            method: "POST",
            headers: { Authorization: "Bearer invalid-jwt" },
            body: JSON.stringify({ days: 14 }),
        });

        const response = await handleAnalyzeBehavioralPatterns(
            request,
            mockSupabaseClient as any,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Kullanıcı doğrulanamadı.");
    });

    await t.step("should return 401 when no Authorization header", async () => {
        const request = new Request("http://localhost/analyze", {
            method: "POST",
            body: JSON.stringify({ days: 14 }),
        });

        const response = await handleAnalyzeBehavioralPatterns(request);

        assertEquals(response.status, 401);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Unauthorized");
    });

    await t.step("should return 400 when invalid days parameter", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        };

        const request = new Request("http://localhost/analyze", {
            method: "POST",
            headers: { Authorization: "Bearer valid-jwt" },
            body: JSON.stringify({ days: -1 }),
        });

        const response = await handleAnalyzeBehavioralPatterns(
            request,
            mockSupabaseClient as any,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Geçerli bir 'periodDays' veya 'days' parametresi gerekli.",
        );
    });

    await t.step("should return 200 for OPTIONS request", async () => {
        const request = new Request("http://localhost/analyze", {
            method: "OPTIONS",
        });

        const response = await handleAnalyzeBehavioralPatterns(request);

        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step(
        "should handle analysis service failure gracefully",
        async () => {
            const mockSupabaseClient = {
                auth: {
                    getUser: () =>
                        Promise.resolve({
                            data: { user: { id: "user-123" } },
                            error: null,
                        }),
                },
            };

            // ANALİZ SERVİSİNİ HATA FIRLATACAK ŞEKİLDE STUB'LA
            const analyzeStub = stub(
                BehavioralPatternAnalyzer,
                "analyzePatterns",
                () => Promise.reject(new Error("Analiz servisi hatası")),
            );

            try {
                const request = new Request("http://localhost/analyze", {
                    method: "POST",
                    headers: { Authorization: "Bearer valid-jwt" },
                    body: JSON.stringify({ days: 14 }),
                });

                const response = await handleAnalyzeBehavioralPatterns(
                    request,
                    mockSupabaseClient as any,
                );

                assertEquals(response.status, 400);
                const responseBody = await response.json();
                assertEquals(responseBody.error, "Analiz servisi hatası");
            } finally {
                analyzeStub.restore();
            }
        },
    );
});
