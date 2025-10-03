// supabase/functions/update-satisfaction-score/index.test.ts

import "../_shared/test_setup.ts";
import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handleUpdateSatisfaction } from "./index.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ORTAM DEĞİŞKENLERİ EN TEPEDE
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test("Update Satisfaction Score - Full Suite", async (t) => {
    await t.step("should return 200 for OPTIONS request (CORS)", async () => {
        const request = new Request("http://localhost/update-satisfaction", {
            method: "OPTIONS",
        });
        const response = await handleUpdateSatisfaction(request);
        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step("should successfully update satisfaction score", async () => {
        // Mock Supabase client with successful update
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_decision_log") {
                    return {
                        update: (data: unknown) => ({
                            eq: (field: string, value: string) => ({
                                eq: (field2: string, value2: string) => ({
                                    select: (fields: string) => ({
                                        single: () =>
                                            Promise.resolve({
                                                data: { id: "log-123" },
                                                error: null,
                                            }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: "log-123",
                score: 1,
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 200);
        const responseBody = await response.json();
        assertEquals(responseBody.success, true);
        assertEquals(responseBody.message, "Skor başarıyla güncellendi");
    });

    await t.step("should return 400 when no Authorization header", async () => {
        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                log_id: "log-123",
                score: 1,
            }),
        });

        const response = await handleUpdateSatisfaction(request);

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Yetkilendirme başlığı eksik");
        assertEquals(responseBody.success, false);
    });

    await t.step(
        "should return 400 when user authentication fails",
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
                "http://localhost/update-satisfaction",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer invalid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        log_id: "log-123",
                        score: 1,
                    }),
                },
            );

            const response = await handleUpdateSatisfaction(
                request,
                mockSupabaseClient,
            );

            assertEquals(response.status, 400);
            const responseBody = await response.json();
            assertEquals(responseBody.error, "Kullanıcı doğrulanamadı");
            assertEquals(responseBody.success, false);
        },
    );

    await t.step("should return 400 when log_id is missing", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                // log_id eksik
                score: 1,
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Geçersiz log_id");
        assertEquals(responseBody.success, false);
    });

    await t.step("should return 400 when log_id is not a string", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: 123, // number instead of string
                score: 1,
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Geçersiz log_id");
        assertEquals(responseBody.success, false);
    });

    await t.step("should return 400 when score is not 1 or -1", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: "log-123",
                score: 0, // invalid score
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Geçersiz skor. Sadece 1 (thumbs up) veya -1 (thumbs down) kabul edilir",
        );
        assertEquals(responseBody.success, false);
    });

    await t.step("should return 400 when score is not a number", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: "log-123",
                score: "invalid", // string instead of number
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(
            responseBody.error,
            "Geçersiz skor. Sadece 1 (thumbs up) veya -1 (thumbs down) kabul edilir",
        );
        assertEquals(responseBody.success, false);
    });

    await t.step("should return 400 when database update fails", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_decision_log") {
                    return {
                        update: (data: unknown) => ({
                            eq: (field: string, value: string) => ({
                                eq: (field2: string, value2: string) => ({
                                    select: (fields: string) => ({
                                        single: () =>
                                            Promise.resolve({
                                                data: null,
                                                error: {
                                                    message:
                                                        "Database connection failed",
                                                    code: "DB_ERROR",
                                                },
                                            }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: "log-123",
                score: 1,
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 400);
        const responseBody = await response.json();
        assertEquals(responseBody.error, "Skor güncellenirken bir hata oluştu");
        assertEquals(responseBody.success, false);
    });

    await t.step(
        "should return 400 when log not found or unauthorized",
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
                    if (table === "ai_decision_log") {
                        return {
                            update: (data: unknown) => ({
                                eq: (field: string, value: string) => ({
                                    eq: (field2: string, value2: string) => ({
                                        select: (fields: string) => ({
                                            single: () =>
                                                Promise.resolve({
                                                    data: null, // log not found
                                                    error: null,
                                                }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                },
            } as unknown as SupabaseClient;

            const request = new Request(
                "http://localhost/update-satisfaction",
                {
                    method: "POST",
                    headers: {
                        Authorization: "Bearer valid-jwt",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        log_id: "log-123",
                        score: 1,
                    }),
                },
            );

            const response = await handleUpdateSatisfaction(
                request,
                mockSupabaseClient,
            );

            assertEquals(response.status, 400);
            const responseBody = await response.json();
            assertEquals(
                responseBody.error,
                "Log bulunamadı veya güncelleme yetkiniz yok",
            );
            assertEquals(responseBody.success, false);
        },
    );

    await t.step("should handle malformed JSON gracefully", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: "{invalid json",
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 500);
        const responseBody = await response.json();
        assert(
            responseBody.error.includes("JSON") ||
                responseBody.error.includes("Expected property name") ||
                responseBody.error.includes("Bir hata oluştu"),
        );
    });

    await t.step("should accept score -1 (thumbs down)", async () => {
        const mockSupabaseClient = {
            auth: {
                getUser: () =>
                    Promise.resolve({
                        data: { user: { id: "user-123" } },
                        error: null,
                    }),
            },
            from: (table: string) => {
                if (table === "ai_decision_log") {
                    return {
                        update: (data: unknown) => ({
                            eq: (field: string, value: string) => ({
                                eq: (field2: string, value2: string) => ({
                                    select: (fields: string) => ({
                                        single: () =>
                                            Promise.resolve({
                                                data: { id: "log-123" },
                                                error: null,
                                            }),
                                    }),
                                }),
                            }),
                        }),
                    };
                }
                return {};
            },
        } as unknown as SupabaseClient;

        const request = new Request("http://localhost/update-satisfaction", {
            method: "POST",
            headers: {
                Authorization: "Bearer valid-jwt",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                log_id: "log-123",
                score: -1, // thumbs down
            }),
        });

        const response = await handleUpdateSatisfaction(
            request,
            mockSupabaseClient,
        );

        assertEquals(response.status, 200);
        const responseBody = await response.json();
        assertEquals(responseBody.success, true);
        assertEquals(responseBody.message, "Skor başarıyla güncellendi");
    });
});
