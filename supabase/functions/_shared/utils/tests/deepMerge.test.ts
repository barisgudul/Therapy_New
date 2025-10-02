// supabase/functions/_shared/utils/tests/deepMerge.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { deepMerge } from "../deepMerge.ts";

Deno.test("deepMerge - should merge nested objects", () => {
    const base = { a: 1, b: { c: 2, d: 3 } };
    const patch = { b: { c: 99, e: 5 }, f: 6 } as Record<string, unknown>;
    const result = deepMerge(base, patch);

    assertEquals(
        result,
        { a: 1, b: { c: 99, d: 3, e: 5 }, f: 6 } as Record<string, unknown>,
    );
});

Deno.test("deepMerge - should overwrite primitive values", () => {
    const base = { a: 1, b: 2 };
    const patch = { b: 100 };
    const result = deepMerge(base, patch);

    assertEquals(result, { a: 1, b: 100 });
});

Deno.test("deepMerge - should handle null and undefined patches", () => {
    const base = { a: 1, b: { c: 2 } };
    assertEquals(deepMerge(base, {}), base);
    assertEquals(
        deepMerge(base, null as unknown as Partial<typeof base>),
        base,
    );
    assertEquals(
        deepMerge(base, undefined as unknown as Partial<typeof base>),
        base,
    );
});

Deno.test("deepMerge - patch should overwrite arrays completely", () => {
    const base = { a: [1, 2, 3] };
    const patch = { a: [4, 5] };
    const result = deepMerge(base, patch);

    assertEquals(result.a, [4, 5]);
});
