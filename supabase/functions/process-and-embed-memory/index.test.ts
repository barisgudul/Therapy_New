// supabase/functions/process-and-embed-memory/index.test.ts
import { assertEquals } from "std/assert/mod.ts";
import { stub } from "std/testing/mock.ts";
import { handleProcessAndEmbedMemory } from "./index.ts";

Deno.test("Process and Embed Memory: should call Gemini endpoints and insert enriched memory", async () => {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "SVC");
  Deno.env.set("GEMINI_API_KEY", "GEM");

  const mockFetch = stub(
    globalThis,
    "fetch",
    ((...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      const [url] = args;
      const u = String(url instanceof Request ? url.url : url);
      if (u.includes("gemini-1.5-pro:generateContent")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              candidates: [{
                content: {
                  parts: [{
                    text: JSON.stringify({
                      sentiment_analysis: {
                        dominant_emotion: "mutlu",
                        intensity_score: 0.8,
                        valence: "pozitif",
                      },
                      stylometry_analysis: {
                        avg_sentence_length: 10,
                        lexical_density: 0.5,
                        pronoun_ratio: {
                          first_person_singular: 0.2,
                          first_person_plural: 0.1,
                        },
                      },
                    }),
                  }],
                },
              }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (u.includes("embedding-001:batchEmbedContents")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              embeddings: [
                { values: [0.1] },
                { values: [0.2] },
                { values: [0.3] },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    }) as typeof fetch,
  );

  const req = new Request("http://localhost/process-and-embed-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_event_id: 1,
      user_id: "u1",
      content: "Bugün mutluydum",
      event_time: new Date().toISOString(),
    }),
  });

  const mockClient = {
    from: (_table: string) => ({
      insert: (_vals: Record<string, unknown>) =>
        Promise.resolve({ error: null }),
    }),
  } as unknown as Parameters<typeof handleProcessAndEmbedMemory>[1];

  const res = await handleProcessAndEmbedMemory(req, mockClient);
  try {
    assertEquals(res.status, 200);
    const geminiCall = mockFetch.calls.find((c) =>
      String(c.args[0]).includes("gemini-1.5-pro:generateContent")
    );
    if (!geminiCall) throw new Error("Gemini analiz çağrısı bekleniyordu");
    const embedCall = mockFetch.calls.find((c) =>
      String(c.args[0]).includes("embedding-001:batchEmbedContents")
    );
    if (!embedCall) throw new Error("Embedding çağrısı bekleniyordu");
  } finally {
    mockFetch.restore();
  }
});
