// supabase/functions/delete-dream-memory/index.test.ts

import { assertEquals } from "std/assert/mod.ts";
import { handleDeleteDreamMemory } from "./index.ts";

Deno.test("Delete Dream Memory: Should delete memory and event by event_id", async () => {
  const calls: {
    table: string;
    ops: string[];
    filters: [string, string][];
  }[] = [];

  // Basit zincirlenebilir 'from' taklidi
  function makeFrom(table: string) {
    const record: {
      table: string;
      ops: string[];
      filters: [string, string][];
    } = { table, ops: [], filters: [] };
    const api = {
      delete() {
        record.ops.push("delete");
        return api;
      },
      eq(column: string, value: string) {
        record.filters.push([column, value]);
        return api;
      },
    };
    calls.push(record);
    return api;
  }

  const mockSupabaseAdmin: {
    auth: { getUser: () => Promise<{ data: { user: { id: string } } }> };
    from: (
      table: string,
    ) => { delete: () => unknown; eq: (col: string, val: string) => unknown };
  } = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "user-999" } } }),
    },
    from: (table: string) => makeFrom(table),
  };

  const fakeRequest = new Request("http://localhost/delete-dream-memory", {
    method: "POST",
    headers: {
      "Authorization": "Bearer FAKE_JWT",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_id: "evt-123" }),
  });

  await handleDeleteDreamMemory(
    fakeRequest,
    mockSupabaseAdmin as unknown as Parameters<
      typeof handleDeleteDreamMemory
    >[1],
  );

  // Doğrulama: iki tabloya delete atılmalı
  assertEquals(calls.length, 2);
  // memory_embeddings için doğru filtreler
  const memCall = calls.find((c) => c.table === "memory_embeddings")!;
  assertEquals(memCall.ops.includes("delete"), true);
  assertEquals(memCall.filters, [["source_event_id", "evt-123"], [
    "user_id",
    "user-999",
  ]]);

  // events için doğru filtreler
  const evtCall = calls.find((c) => c.table === "events")!;
  assertEquals(evtCall.ops.includes("delete"), true);
  assertEquals(evtCall.filters, [["id", "evt-123"], ["user_id", "user-999"]]);
});
