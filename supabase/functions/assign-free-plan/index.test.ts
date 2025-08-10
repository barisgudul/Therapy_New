// supabase/functions/assign-free-plan/index.test.ts

import { assertEquals } from "assert/mod.ts";
import { stub } from "mock";
import { handleAssignFreePlan } from "./index.ts"; // Ana mantığı export ediyoruz

type InsertPayload = { user_id: string; plan_id: string; status: string };
function assertIsInsertPayload(x: unknown): asserts x is InsertPayload {
  if (!x || typeof x !== "object") {
    throw new Error("Insert payload object bekleniyor");
  }
  const rec = x as Record<string, unknown>;
  if (typeof rec.user_id !== "string") throw new Error("user_id string olmalı");
  if (typeof rec.plan_id !== "string") throw new Error("plan_id string olmalı");
  if (typeof rec.status !== "string") throw new Error("status string olmalı");
}

Deno.test("Assign Free Plan: Should assign plan to a user without one", async () => {
  // 1. TAKLİTÇİLERİ HAZIRLA
  const mockSupabaseAdmin = {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: "user-123" } }, error: null }),
    },
    from() {
      return this;
    },
    select() {
      return this;
    },
    eq() {
      return this;
    },
    insert: (_vals: unknown) => Promise.resolve({ error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () =>
      Promise.resolve({ data: { id: "plan-free-456" }, error: null }),
  };

  const insertStub = stub(mockSupabaseAdmin, "insert");

  const fakeRequest = new Request("http://localhost/assign-free-plan", {
    headers: { "Authorization": "Bearer FAKE_JWT" },
  });

  await handleAssignFreePlan(fakeRequest, mockSupabaseAdmin);

  try {
    // Güvenli kontrol: en az bir çağrı olmalı
    if (insertStub.calls.length < 1) {
      throw new Error("insert çağrısı bulunamadı");
    }
    const firstCall = insertStub.calls[0]!;
    const maybeInserted = firstCall.args[0];
    if (maybeInserted === undefined) {
      throw new Error("insert argümanı bulunamadı");
    }
    const insertedData = maybeInserted as unknown;
    assertIsInsertPayload(insertedData);
    assertEquals(insertedData.user_id, "user-123");
    assertEquals(insertedData.plan_id, "plan-free-456");
    assertEquals(insertedData.status, "active");
    // İsteğe bağlı kesin doğrulama
    assertEquals(insertStub.calls.length, 1);
  } finally {
    insertStub.restore();
  }
});

Deno.test("Assign Free Plan: Should not insert if user already has a plan", async () => {
  const mockSupabaseAdmin = {
    auth: {
      getUser: () =>
        Promise.resolve({ data: { user: { id: "user-123" } }, error: null }),
    },
    from() {
      return this;
    },
    select() {
      return this;
    },
    eq() {
      return this;
    },
    insert: (_vals: unknown) => Promise.resolve({ error: null }),
    maybeSingle: () =>
      Promise.resolve({ data: { id: "existing-sub" }, error: null }),
    single: () =>
      Promise.resolve({ data: { id: "plan-free-456" }, error: null }),
  };

  const insertStub = stub(mockSupabaseAdmin, "insert");

  const fakeRequest = new Request("http://localhost/assign-free-plan", {
    headers: { "Authorization": "Bearer FAKE_JWT" },
  });

  await handleAssignFreePlan(fakeRequest, mockSupabaseAdmin);

  try {
    assertEquals(insertStub.calls.length, 0);
  } finally {
    insertStub.restore();
  }
});
