// supabase/functions/delete-session-and-memories/index.test.ts

import {
    assert,
    assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("Delete Session and Memories - Basic Tests", async (t) => {
    // Set up environment variables for all tests
    Deno.env.set("SUPABASE_URL", "http://localhost:54321");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    await t.step(
        "should reject requests without authorization header",
        async () => {
            const { handleDeleteSessionAndMemories } = await import(
                "./index.ts"
            );

            const request = new Request(
                "http://localhost/delete-session-and-memories",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ event_id: "evt_123" }),
                },
            );

            const response = await handleDeleteSessionAndMemories(request);

            // Should fail due to missing auth header
            assertEquals(response.status, 500);
            const body = await response.json();
            assert(body.error);
        },
    );

    await t.step("should handle OPTIONS request for CORS", async () => {
        const { handleDeleteSessionAndMemories } = await import("./index.ts");

        const request = new Request(
            "http://localhost/delete-session-and-memories",
            {
                method: "OPTIONS",
            },
        );

        const response = await handleDeleteSessionAndMemories(request);

        assertEquals(response.status, 200);
        assertEquals(await response.text(), "ok");
    });

    await t.step("should handle malformed JSON", async () => {
        const { handleDeleteSessionAndMemories } = await import("./index.ts");

        const request = new Request(
            "http://localhost/delete-session-and-memories",
            {
                method: "POST",
                headers: {
                    "Authorization": "Bearer test-token",
                    "Content-Type": "application/json",
                },
                body: "{ invalid json }",
            },
        );

        const response = await handleDeleteSessionAndMemories(request);

        // Should handle malformed JSON gracefully
        assertEquals(response.status, 500);
        const body = await response.json();
        assert(body.error);
    });
});
