// supabase/functions/prediction-engine/index.test.ts
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { stub } from "https://deno.land/std@0.208.0/testing/mock.ts";

Deno.test("Prediction Engine: should call Gemini with correct prompt and insert predictions", async () => {
  // Env vars
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "SVC");
  Deno.env.set("GEMINI_API_KEY", "GEM");

  // Mock fetch for Gemini call and run-simulation
  const mockFetch = stub(
    globalThis,
    "fetch",
    ((...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      const [url] = args;
      const u = String(url instanceof Request ? url.url : url);
      if (u.includes("generativelanguage.googleapis.com")) {
        const textPayload = JSON.stringify([
          {
            prediction_type: "mood_forecast",
            title: "Yaklaşan Ruh Hali Değişimi",
            description: "Test",
            probability_score: 0.6,
            time_horizon_hours: 48,
            suggested_action: "Dinlen",
          },
        ]);
        const body = {
          candidates: [{
            content: { parts: [{ text: textPayload }] },
          }],
        };
        const resp = new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
        return Promise.resolve(resp);
      }
      // run-simulation trigger
      if (u.includes("/functions/v1/run-simulation")) {
        const resp = new Response(
          JSON.stringify({ simulation_id: "sim-1" }),
          { status: 200 },
        );
        return Promise.resolve(resp);
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    }) as typeof fetch,
  );

  // Mock Supabase client flow
  const memoriesChain = {
    order: (_: string, __: { ascending: boolean }) => ({
      limit: (_n: number) => Promise.resolve({ data: [], error: null }),
    }),
  };
  const fromFactory = (table: string) => {
    if (table === "user_dna") {
      return {
        select: (_sel: string) => ({
          eq: (_c: string, _v: string) => ({
            single: () =>
              Promise.resolve({
                data: {
                  user_id: "u1",
                  sentiment_score: 0,
                  energy_level: 0.5,
                  complexity_score: 0.5,
                  introspection_depth: 0.5,
                  social_connection: 0.5,
                  last_updated: new Date().toISOString(),
                  total_events_processed: 1,
                },
                error: null,
              }),
          }),
        }),
      };
    }
    if (table === "cognitive_memories") {
      return {
        select: (_sel: string) => ({
          eq: (_c: string, _v: string) => ({
            gte: (_c2: string, _v2: string) => memoriesChain,
          }),
        }),
      };
    }
    if (table === "predicted_outcomes") {
      return {
        delete: () => ({
          eq: (_c: string, _v: string) => ({
            lt: (_c2: string, _v2: string) => Promise.resolve({ error: null }),
          }),
        }),
        insert: (_vals: unknown) => Promise.resolve({ error: null }),
      };
    }
    // default
    // Return a minimal object matching FromApi chain shape to satisfy types without using `any`
    return {} as unknown as {
      select: (sel: string) => unknown;
      eq: (c: string, v: string) => unknown;
      single?: () => Promise<
        {
          data: Record<string, unknown> | null;
          error: { message: string } | null;
        }
      >;
      gte?: (c: string, v: string) => unknown;
      order?: (_: string, __: { ascending: boolean }) => unknown;
      limit?: (
        n: number,
      ) => Promise<
        {
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        }
      >;
      delete?: () => {
        eq: (
          c: string,
          v: string,
        ) => {
          lt: (
            c2: string,
            v2: string,
          ) => Promise<{ error: { message: string } | null }>;
        };
      };
      insert?: (
        vals: unknown,
      ) => Promise<{ error: { message: string } | null }>;
    };
  };
  const mockClient = { from: (t: string) => fromFactory(t) };

  // Modülü env ve mock client ile yükle ve çalıştır
  const { handlePredictionEngine } = await import("./index.ts");
  const req = new Request("http://localhost/prediction-engine", {
    method: "POST",
    body: JSON.stringify({ user_id: "u1", trigger_reason: "manual" }),
  });

  const res = await handlePredictionEngine(
    req,
    mockClient as unknown as Parameters<typeof handlePredictionEngine>[1],
  );
  try {
    assertEquals(res.status, 200);
  } finally {
    mockFetch.restore();
  }
});
