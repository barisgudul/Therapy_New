// supabase/functions/cancel-deletion/index.test.ts

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handleCancelDeletion } from "./index.ts";

// ORTAM DEĞİŞKENLERİNİ TÜM IMPORT'LARDAN SONRA, EN TEPEDE AYARLA!
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-key");

type UpdateUserArgs = { user_metadata: Record<string, unknown> };

Deno.test("Cancel Deletion: should update user metadata to active and clear deletion_scheduled_at", async () => {
  const calls: { method: string; args?: unknown }[] = [];

  const mockSupabase = {
    auth: {
      getUser: (_jwt: string) =>
        Promise.resolve({
          data: {
            user: {
              id: "user-abc",
              user_metadata: {
                status: "pending_deletion",
                deletion_scheduled_at: "2024-01-01",
              },
            },
          },
        }),
      admin: {
        updateUserById: (userId: string, params: UpdateUserArgs) => {
          calls.push({ method: "updateUserById", args: { userId, params } });
          return Promise.resolve({ error: null });
        },
      },
    },
  } as unknown as Parameters<typeof handleCancelDeletion>[1];

  const req = new Request("http://localhost/cancel-deletion", {
    headers: { Authorization: "Bearer FAKE" },
  });

  const res = await handleCancelDeletion(req, mockSupabase);
  assertEquals(res.status, 200);

  // Doğru parametrelerle updateUserById çağrıldı mı?
  const call = calls.find((c) => c.method === "updateUserById")!;
  const { userId, params } = call.args as {
    userId: string;
    params: UpdateUserArgs;
  };
  assertEquals(userId, "user-abc");
  const meta = params.user_metadata as Record<string, unknown>;
  assertEquals(meta.status, "active");
  assertEquals(meta.deletion_scheduled_at, null);
});
