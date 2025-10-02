// supabase/functions/_shared/services/vault.service.ts

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { VaultData } from "../types/context.ts";

export async function getUserVault(
    userId: string,
    adminClient: SupabaseClient,
): Promise<VaultData | null> {
    try {
        // Artık o anki session'dan değil, doğrudan gelen userId ile sorguluyoruz.
        if (!userId) return null;
        const { data, error } = await adminClient
            .from("user_vaults")
            .select("vault_data")
            .eq("user_id", userId)
            .single();

        if (error && error.code !== "PGRST116") throw error;
        return data?.vault_data || null;
    } catch (error) {
        console.error(
            "⛔️ Vault getirme hatası (admin):",
            (error as Error).message,
        );
        throw error;
    }
}

export async function updateUserVault(
    userId: string,
    newVaultData: VaultData,
    adminClient: SupabaseClient,
): Promise<void> {
    try {
        if (!userId) return;
        const { error } = await adminClient
            .from("user_vaults")
            .upsert(
                {
                    user_id: userId,
                    vault_data: newVaultData,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "user_id" },
            );
        if (error) throw error;
        console.log("✅ [Vault] Güncellendi.");
    } catch (error) {
        console.error(
            "⛔️ Vault update hatası (admin):",
            (error as Error).message,
        );
        throw error;
    }
}
