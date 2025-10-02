// supabase/functions/_shared/utils/tests/event-helpers.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { extractContentFromEvent } from "../event-helpers.ts";

Deno.test("extractContentFromEvent - should extract from dream_analysis", () => {
    const event = {
        type: "dream_analysis",
        data: { dreamText: "A dream about flying." },
    };
    assertEquals(extractContentFromEvent(event), "A dream about flying.");
});

Deno.test("extractContentFromEvent - should extract from daily_reflection", () => {
    const event = {
        type: "daily_reflection",
        data: { todayNote: "Feeling tired." },
    };
    assertEquals(extractContentFromEvent(event), "Feeling tired.");
});

Deno.test("extractContentFromEvent - should extract and join user messages from text_session", () => {
    const event = {
        type: "text_session",
        data: {
            messages: [
                { isUser: false, text: "Hello" },
                { isUser: true, text: "My first message." },
                { sender: "ai", text: "How can I help?" },
                { sender: "user", text: "My second message." },
            ],
        },
    };
    assertEquals(
        extractContentFromEvent(event),
        "My first message.\n\nMy second message.",
    );
});

Deno.test("extractContentFromEvent - should return null if no user messages", () => {
    const event = {
        type: "text_session",
        data: {
            messages: [{ isUser: false, text: "Only AI messages." }],
        },
    };
    assertEquals(extractContentFromEvent(event), null);
});

Deno.test("extractContentFromEvent - should fall back to common keys for default types", () => {
    assertEquals(
        extractContentFromEvent({
            type: "unknown",
            data: { content: "default content" },
        }),
        "default content",
    );
    assertEquals(
        extractContentFromEvent({
            type: "unknown",
            data: { text: "default text" },
        }),
        "default text",
    );
    assertEquals(
        extractContentFromEvent({
            type: "unknown",
            data: { userMessage: "default userMessage" },
        }),
        "default userMessage",
    );
});

Deno.test("extractContentFromEvent - should return null for empty or invalid data", () => {
    assertEquals(
        extractContentFromEvent({ type: "dream_analysis", data: null }),
        null,
    );
    assertEquals(
        extractContentFromEvent({
            type: "dream_analysis",
            data: { wrongKey: "value" },
        }),
        null,
    );
});
