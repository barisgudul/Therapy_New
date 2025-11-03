// supabase/functions/_shared/auth.ts
import type {
    SupabaseClient,
    User,
} from "https://esm.sh/@supabase/supabase-js@2";
import { createSupabaseClient } from "./supabase-client.ts";

export type AuthContext = {
    supabase: SupabaseClient;
    user: User;
    userId: string;
};

/**
 * İstekten kimliği doğrulanmış kullanıcıyı çözer ve tip güvenli bağlam döner.
 * - Authorization header zorunludur (Bearer ...)
 * - Kullanıcı doğrulanamazsa 401 atar
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
    const supabase = createSupabaseClient(req);
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
        throw new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    return { supabase, user: data.user, userId: data.user.id };
}

/**
 * OPTIONS preflight isteklerini hızlıca yanıtlamak için yardımcı.
 */
export function isPreflight(req: Request): boolean {
    return req.method === "OPTIONS";
}
