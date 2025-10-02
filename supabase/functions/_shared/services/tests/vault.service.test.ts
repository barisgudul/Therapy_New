// supabase/functions/_shared/services/tests/vault.service.test.ts

import {
    assertEquals,
    assertRejects,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getUserVault, updateUserVault } from "../vault.service.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { VaultData } from "../../types/context.ts";

// --- Mock'lar ---

type UpsertData = {
    user_id: string;
    vault_data: VaultData;
    updated_at: string;
};

type QueryBuilder = {
    select: () => QueryBuilder;
    eq: () => QueryBuilder;
    single: () => Promise<
        {
            data: { vault_data: VaultData } | null | undefined;
            error: (Error & { code?: string }) | null | undefined;
        }
    >;
    upsert: (data: UpsertData) => Promise<{ error: Error | null }>;
};

let capturedUpsertData: UpsertData | null = null; // upsert edilen veriyi yakalamak için

function createMockSupabaseClient(
    selectData?: { vault_data: VaultData } | null,
    selectError?: Error & { code?: string },
    upsertError?: Error,
) {
    capturedUpsertData = null; // Her testten önce sıfırla

    const queryBuilder: QueryBuilder = {
        select: () => queryBuilder,
        eq: () => queryBuilder,
        single: () => Promise.resolve({ data: selectData, error: selectError }),
        upsert: (data: UpsertData) => {
            capturedUpsertData = data;
            return Promise.resolve({ error: upsertError ?? null });
        },
    };

    return {
        from: (_tableName: string) => queryBuilder,
    } as unknown as SupabaseClient;
}

// --- getUserVault Testleri ---

Deno.test("getUserVault - should return vault data when user exists", async () => {
    // 1. HAZIRLIK
    const mockVault: VaultData = { profile: { nickname: "TestUser" } };
    const mockClient = createMockSupabaseClient({ vault_data: mockVault });

    // 2. EYLEM
    const vault = await getUserVault("user-123", mockClient);

    // 3. DOĞRULAMA
    assertEquals(vault, mockVault);
});

Deno.test("getUserVault - should return null if user does not exist (PGRST116 error)", async () => {
    // 1. HAZIRLIK: Supabase, kullanıcı bulunamadığında bu özel kodu döner.
    const notFoundError = new Error("No rows found") as Error & {
        code: string;
    };
    notFoundError.code = "PGRST116";
    const mockClient = createMockSupabaseClient(null, notFoundError);

    // 2. EYLEM
    const vault = await getUserVault("non-existent-user", mockClient);

    // 3. DOĞRULAMA
    assertEquals(vault, null);
});

Deno.test("getUserVault - should re-throw other database errors", async () => {
    // 1. HAZIRLIK: PGRST116 olmayan genel bir veritabanı hatası
    const dbError = new Error("Connection failed");
    const mockClient = createMockSupabaseClient(null, dbError);

    // 2. EYLEM & 3. DOĞRULAMA
    await assertRejects(
        async () => {
            await getUserVault("user-123", mockClient);
        },
        Error,
        "Connection failed",
    );
});

Deno.test("getUserVault - should return null if userId is empty or null", async () => {
    const mockClient = createMockSupabaseClient();

    const result1 = await getUserVault("", mockClient);
    const result2 = await getUserVault(null as unknown as string, mockClient);

    assertEquals(result1, null);
    assertEquals(result2, null);
});

// --- updateUserVault Testleri ---

Deno.test("updateUserVault - should call upsert with correct data", async () => {
    // 1. HAZIRLIK
    const mockClient = createMockSupabaseClient();
    const newVaultData: VaultData = {
        themes: ["test"],
        keyInsights: ["insight"],
    };

    // 2. EYLEM
    await updateUserVault("user-123", newVaultData, mockClient);

    // 3. DOĞRULAMA
    assertEquals(capturedUpsertData?.user_id, "user-123");
    assertEquals(capturedUpsertData?.vault_data, newVaultData);
    // updated_at alanının varlığını ve bir ISO stringi olduğunu kontrol et
    assertEquals(typeof capturedUpsertData?.updated_at, "string");
    // Valid date string kontrolü
    const dateObj = new Date(capturedUpsertData?.updated_at || "");
    assertEquals(isNaN(dateObj.getTime()), false);
});

Deno.test("updateUserVault - should throw an error if upsert fails", async () => {
    // 1. HAZIRLIK
    const dbError = new Error("Update failed");
    const mockClient = createMockSupabaseClient(null, undefined, dbError);
    const newVaultData: VaultData = { profile: { nickname: "NewName" } };

    // 2. EYLEM & 3. DOĞRULAMA
    await assertRejects(
        async () => {
            await updateUserVault("user-123", newVaultData, mockClient);
        },
        Error,
        "Update failed",
    );
});

Deno.test("updateUserVault - should do nothing if userId is empty", async () => {
    // 1. HAZIRLIK
    const mockClient = createMockSupabaseClient();
    const newVaultData: VaultData = { themes: ["test"] };

    // 2. EYLEM
    await updateUserVault("", newVaultData, mockClient);

    // 3. DOĞRULAMA: upsert hiç çağrılmamalı
    assertEquals(capturedUpsertData, null);
});
