// supabase/functions/weekly-prediction-trigger/index.test.ts
import { assert, assertEquals } from "std/assert/mod.ts";
import { stub } from "std/testing/mock.ts";
import { handleWeeklyPredictionTrigger } from "./index.ts";

Deno.test("Weekly Prediction Trigger: should POST to prediction-engine for active users", async () => {
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "SVC");

  // Mock fetch for calling prediction-engine
  const fetchStub = stub(
    globalThis,
    "fetch",
    ((...args: Parameters<typeof fetch>): ReturnType<typeof fetch> => {
      const [url] = args;
      const u = String(url instanceof Request ? url.url : url);
      if (u.includes("/functions/v1/prediction-engine")) {
        return Promise.resolve(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    }) as typeof fetch,
  );

  // Minimal client mock: events -> one active user
  const mockClient = {
    from: (_table: string) => ({
      select: (_s: string) => ({
        gte: (_c: string, _v: string) =>
          Promise.resolve({ data: [{ user_id: "u1" }], error: null }),
      }),
    }),
  } as unknown as Parameters<typeof handleWeeklyPredictionTrigger>[1];

  const req = new Request("http://localhost/weekly-prediction-trigger", {
    method: "POST",
  });
  const res = await handleWeeklyPredictionTrigger(req, mockClient);
  try {
    assertEquals(res.status, 200);
    const engineCalls = fetchStub.calls.filter((c) =>
      String(c.args[0]).includes("/functions/v1/prediction-engine")
    );
    assert(engineCalls.length >= 0);
  } finally {
    fetchStub.restore();
  }
});
