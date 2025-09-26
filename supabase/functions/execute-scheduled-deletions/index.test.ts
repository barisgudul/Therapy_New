// supabase/functions/execute-scheduled-deletions/index.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import handler from "./handler.ts";

// Test ortamı için Supabase admin client'ı oluştur
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

// --- TEST YARDIMCI FONKSİYONLARI ---

// Test kullanıcılarını temizlemek için
const cleanupUsers = async (emails: string[]) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error("Kullanıcıları listelerken hata: " + error.message);
  }

  const usersToDelete = data.users.filter((u) => emails.includes(u.email!));
  for (const user of usersToDelete) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    // İlişkili profili de silelim (varsa)
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);
  }
};

Deno.test(
  {
    name: "Scheduled Deletion Function",
    sanitizeOps: false,
    sanitizeResources: false,
  },
  async (t) => {
    const testEmails = [
      "delete-me@test.com", // Silinmesi gereken kullanıcı
      "dont-delete-me@test.com", // Mühlet süresi dolmamış kullanıcı
      "active-user@test.com", // Aktif kullanıcı
    ];

    // Her test adımından önce ve sonra temizlik yap
    await t.step("Cleanup before test", async () => {
      await cleanupUsers(testEmails);
    });

    await t.step(
      "should delete only users whose grace period has expired",
      async () => {
        // --- ARRANGE (HAZIRLIK) ---

        // 1. Silinmesi gereken kullanıcıyı oluştur (8 gün önce işaretlenmiş)
        const eightDaysAgo = new Date();
        eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
        const { data: { user: userToDelete } } = await supabaseAdmin.auth.admin
          .createUser({
            email: testEmails[0],
            password: "password123",
            email_confirm: true,
            user_metadata: {
              status: "pending_deletion",
              deletion_scheduled_at: eightDaysAgo.toISOString(),
            },
          });
        assert(userToDelete, "Silinecek kullanıcı oluşturulamadı.");
        await supabaseAdmin.from("profiles").insert({
          id: userToDelete.id,
          nickname: "to_delete",
        });

        // 2. Mühlet süresi dolmamış kullanıcıyı oluştur (1 gün önce işaretlenmiş)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const { data: { user: userToKeep } } = await supabaseAdmin.auth.admin
          .createUser({
            email: testEmails[1],
            password: "password123",
            email_confirm: true,
            user_metadata: {
              status: "pending_deletion",
              deletion_scheduled_at: oneDayAgo.toISOString(),
            },
          });
        assert(userToKeep, "Korunacak kullanıcı oluşturulamadı.");
        await supabaseAdmin.from("profiles").insert({
          id: userToKeep.id,
          nickname: "to_keep",
        });

        // 3. Aktif kullanıcıyı oluştur
        const { data: { user: activeUser } } = await supabaseAdmin.auth.admin
          .createUser({
            email: testEmails[2],
            password: "password123",
            email_confirm: true,
          });
        assert(activeUser, "Aktif kullanıcı oluşturulamadı.");
        await supabaseAdmin.from("profiles").insert({
          id: activeUser.id,
          nickname: "active",
        });

        // --- ACT (EYLEM) ---
        // Fonksiyonu manuel olarak tetikle
        const req = new Request(
          "http://localhost/execute-scheduled-deletions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${
                Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
              }`,
            },
          },
        );
        const res = await handler(req);
        assertEquals(res.status, 200);
        const body = await res.json();
        assertEquals(body.message, "1 kullanıcı başarıyla silindi.");

        // --- ASSERT (DOĞRULAMA) ---

        // Veritabanının son durumunu kontrol et
        const { data: finalUsersData } = await supabaseAdmin.auth.admin
          .listUsers();
        const finalEmails = finalUsersData.users.map((u) => u.email);

        // 1. Silinen kullanıcı artık var olmamalı
        assertEquals(
          finalEmails.includes(testEmails[0]),
          false,
          "Silinmesi gereken kullanıcı hala var.",
        );

        // 2. Diğer iki kullanıcı hala var olmalı
        assertEquals(
          finalEmails.includes(testEmails[1]),
          true,
          "Mühleti dolmamış kullanıcı silindi.",
        );
        assertEquals(
          finalEmails.includes(testEmails[2]),
          true,
          "Aktif kullanıcı silindi.",
        );

        // 3. Silinen kullanıcının profili de silinmiş olmalı
        const { data: profile } = await supabaseAdmin.from("profiles").select()
          .eq("id", userToDelete.id).single();
        assertEquals(
          profile,
          null,
          "Silinen kullanıcının profili hala veritabanında.",
        );
      },
    );

    await t.step("Cleanup after test", async () => {
      await cleanupUsers(testEmails);
    });
  },
);
