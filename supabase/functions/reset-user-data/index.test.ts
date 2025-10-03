// supabase/functions/reset-user-data/index.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handleResetUserData } from "./index.ts";

// ORTAM DEĞİŞKENLERİNİ TÜM IMPORT'LARDAN SONRA, EN TEPEDE AYARLA!
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

type UpdateUserArgs = { user_metadata: Record<string, unknown> };

Deno.test("Reset User Data: should set status to pending_deletion and set deletion_scheduled_at", async () => {
  const calls: { method: string; args?: unknown }[] = [];

  const mockSupabase = {
    auth: {
      getUser: (_jwt: string) =>
        Promise.resolve({
          data: {
            user: { id: "user-xyz", user_metadata: { status: "active" } },
          },
        }),
      admin: {
        updateUserById: (userId: string, params: UpdateUserArgs) => {
          calls.push({ method: "updateUserById", args: { userId, params } });
          return Promise.resolve({ error: null });
        },
      },
    },
  } as unknown as Parameters<typeof handleResetUserData>[1];

  const req = new Request("http://localhost/reset-user-data", {
    headers: { Authorization: "Bearer FAKE" },
  });

  const res = await handleResetUserData(req, mockSupabase);
  assertEquals(res.status, 200);

  // Doğru parametrelerle updateUserById çağrıldı mı?
  const call = calls.find((c) => c.method === "updateUserById")!;
  const { userId, params } = call.args as {
    userId: string;
    params: UpdateUserArgs;
  };
  assertEquals(userId, "user-xyz");
  const meta = params.user_metadata as Record<string, unknown>;
  assertEquals(meta.status, "pending_deletion");
  // ISO string atandığını doğrulamak için string olmalı
  const deletionAt = meta.deletion_scheduled_at as string;
  assertEquals(typeof deletionAt, "string");
});
