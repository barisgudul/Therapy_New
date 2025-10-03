// supabase/functions/create-analysis-report/index.test.ts

import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

// ORTAM DEĞİŞKENLERİNİ TÜM IMPORT'LARDAN SONRA, EN TEPEDE AYARLA!
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

Deno.test("Create Analysis Report - Basic Tests", async (t) => {
    await t.step(
        "should reject requests without authorization header",
        async () => {
            const { handleCreateAnalysisReport } = await import("./index.ts");

            const request = new Request(
                "http://localhost/create-analysis-report",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ days: 7 }),
                },
            );

            const response = await handleCreateAnalysisReport(request);

            // Should fail due to missing auth header
            assertEquals(response.status, 500);
            const body = await response.json();
            assert(body.error);
        },
    );

    await t.step("should handle OPTIONS request for CORS", async () => {
        const { handleCreateAnalysisReport } = await import("./index.ts");

        const request = new Request(
            "http://localhost/create-analysis-report",
            {
                method: "OPTIONS",
            },
        );

        const response = await handleCreateAnalysisReport(request);

        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step("should handle malformed JSON", async () => {
        const { handleCreateAnalysisReport } = await import("./index.ts");

        const request = new Request(
            "http://localhost/create-analysis-report",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer test-token",
                    "Content-Type": "application/json",
                },
                body: "{ invalid json }",
            },
        );

        const response = await handleCreateAnalysisReport(request);

        // Should handle malformed JSON gracefully
        assertEquals(response.status, 500);
        const body = await response.json();
        assert(body.error);
    });
});
