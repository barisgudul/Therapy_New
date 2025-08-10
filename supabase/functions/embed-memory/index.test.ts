// DÜZELTME: Import yolları güncellendi.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { handleEmbedMemory } from "./index.ts";

Deno.test("Embed Memory: should call embedding API and insert vectors", async () => {
  Deno.env.set("GEMINI_API_KEY", "GEM");

  // DÜZELTME: Tip imzasına tam uyum.
  const fetchStub = stub(
    globalThis,
    "fetch",
    ((..._args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      return Promise.resolve(
        new Response(JSON.stringify({ embedding: { values: [0.1, 0.2] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as typeof fetch,
  );

  const req = new Request("http://localhost/embed-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: "u1",
      content: "Metin",
      metadata: {},
      event: { id: 1, created_at: new Date().toISOString() },
      _vault: {},
    }),
  });

  const insertSpy = stub(
    { insert: () => Promise.resolve({ error: null }) },
    "insert",
  );
  const mockClient = { from: (_table: string) => ({ insert: insertSpy }) };

  await handleEmbedMemory(req, mockClient);

  try {
    const call = fetchStub.calls.find((c) =>
      String(c.args[0]).includes("embedding-001:embedContent")
    );
    assert(call, "Embedding endpoint çağrısı yapılmalı");
    assertEquals(insertSpy.calls.length, 1); // Insert'ün çağrıldığını doğrula
  } finally {
    fetchStub.restore();
  }
});
