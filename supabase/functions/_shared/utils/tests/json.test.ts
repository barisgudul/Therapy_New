// supabase/functions/_shared/utils/tests/json.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { safeParseJsonBlock, safeParseJsonWithDefault } from "../json.ts";

Deno.test("safeParseJsonBlock - should parse clean JSON", () => {
    const raw = '{"a": 1, "b": "test"}';
    const result = safeParseJsonBlock(raw);
    assertEquals(result, { a: 1, b: "test" });
});

Deno.test("safeParseJsonBlock - should extract JSON from surrounding text", () => {
    const raw = 'Here is the JSON: {"a": 1}. Thanks!';
    const result = safeParseJsonBlock(raw);
    assertEquals(result, { a: 1 });
});

Deno.test("safeParseJsonBlock - should handle malformed JSON and return null", () => {
    const raw = '{"a": 1, b: "test"}'; // Malformed: b is not quoted
    const result = safeParseJsonBlock(raw);
    assertEquals(result, null);
});

Deno.test("safeParseJsonWithDefault - should return parsed JSON on success", () => {
    const raw = '{"value": 42}';
    const result = safeParseJsonWithDefault(raw, { value: 0 });
    assertEquals(result.value, 42);
});

Deno.test("safeParseJsonWithDefault - should return default value on failure", () => {
    const raw = "this is not json";
    const defaultValue = { status: "failed" };
    const result = safeParseJsonWithDefault(raw, defaultValue);
    assertEquals(result, defaultValue);
});
