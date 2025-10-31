// supabase/functions/_shared/supabase-client.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { UserVault, UserVaultSchema } from "./zod-schemas.ts";
import type { VaultData } from "./types/context.ts";

/**
 * Request'ten tip güvenli bir Supabase istemcisi oluşturur.
 * Bu fonksiyon, her fonksiyon içinde yeniden kullanılabilir.
 */
export function createSupabaseClient(req: Request): SupabaseClient {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
        throw new Error(
            "SUPABASE_URL ve SUPABASE_ANON_KEY ortam değişkenleri gerekli",
        );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
        throw new Error("Authorization header gerekli");
    }

    return createClient(supabaseUrl, anonKey, {
        global: {
            headers: {
                Authorization: authHeader,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

/**
 * Kullanıcı vault verisini getirir ve Zod ile doğrular.
 * Mevcut getUserVault fonksiyonu ile uyumlu bir interface sağlar.
 */
export async function getUserVault(
    supabase: SupabaseClient,
    userId: string,
): Promise<VaultData | null> {
    try {
        const { data, error } = await supabase
            .from("user_vaults")
            .select("vault_data")
            .eq("user_id", userId)
            .single();

        if (error) {
            // PGRST116 = "not found" hatası, bu durumda null döndür
            if (error.code === "PGRST116") {
                return null;
            }
            console.error("Error fetching user vault:", error);
            throw error;
        }

        if (!data || !data.vault_data) {
            return null;
        }

        // Zod ile gelen verinin şemaya uygunluğunu doğrula
        const parseResult = UserVaultSchema.safeParse(data.vault_data);
        if (!parseResult.success) {
            console.error("User vault data is invalid:", parseResult.error);
            // Vault verisi geçersizse, en azından partial bir yapı döndür
            // Mevcut sistem için uyumluluk sağlamak amacıyla
            return data.vault_data as VaultData;
        }

        // Zod doğrulamasından geçen veriyi VaultData tipine cast et
        return parseResult.data as unknown as VaultData;
    } catch (error) {
        console.error("Error in getUserVault:", error);
        throw error;
    }
}
