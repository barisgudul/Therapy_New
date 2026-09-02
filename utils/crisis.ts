// utils/crisis.ts
//
// Kriz (level_3_high_alert) tespiti istemci tarafı.
//
// Backend (safety-guard / api-gateway) kriz durumunda 400 status ile ZENGİN bir
// gövde döner; bkz. supabase/functions/_shared/crisis-resources.ts:
//   { error, code: "SECURITY_VIOLATION_HIGH_RISK", crisis: true, title, message,
//     resources: [{ label, phone, note? }] }
//
// supabase-js v2'de `invoke` non-2xx aldığında `error` bir FunctionsHttpError olur
// ve gerçek gövde `error.context` (okunmamış bir Response) içindedir. `error.message`
// yalnızca jenerik "Edge Function returned a non-2xx status code" metnidir — bu yüzden
// kriz gövdesine ulaşmanın güvenilir tek yolu `error.context`'i okumaktır.
//
// Tüm AI gateway akışları (text_session, daily_reflection, diary, dream, voice)
// ortak olarak `maybeShowCrisis(error)` çağırır; kriz ise true döner ve çağıran
// normal hata toast'unu bastırır.

import { useCrisisStore } from "../store/crisisStore";

export interface CrisisResource {
    label: string;
    phone: string;
    note?: string;
}

export interface CrisisPayload {
    title: string;
    message: string;
    resources: CrisisResource[];
}

interface RawCrisisBody {
    error?: string;
    code?: string;
    crisis?: boolean;
    title?: string;
    message?: string;
    resources?: CrisisResource[];
}

function isCrisisBody(body: unknown): body is RawCrisisBody {
    if (!body || typeof body !== "object") return false;
    const b = body as RawCrisisBody;
    return b.code === "SECURITY_VIOLATION_HIGH_RISK" || b.crisis === true;
}

// Supabase hata nesnesinden ham JSON gövdesini çıkar (varsa).
async function readErrorBody(error: unknown): Promise<unknown | null> {
    const ctx = (error as { context?: unknown })?.context;

    // FunctionsHttpError.context === Response (okunmamış)
    if (ctx && typeof (ctx as Response).json === "function") {
        try {
            return await (ctx as Response).json();
        } catch {
            // Gövde JSON değilse text olarak dene
            try {
                const text = await (ctx as Response).text();
                return text ? JSON.parse(text) : null;
            } catch {
                return null;
            }
        }
    }

    // Yedek: bazı çağrı yolları message içinde JSON string taşıyabilir
    const message = (error as { message?: unknown })?.message;
    if (typeof message === "string") {
        try {
            return JSON.parse(message);
        } catch {
            // string JSON değil — yoksay
        }
    }

    // Yedek: hata zaten düz bir kriz objesi olabilir
    if (
        error && typeof error === "object" &&
        ("code" in error || "crisis" in error)
    ) {
        return error;
    }

    return null;
}

// tel: linki için telefon string'ini çevirilebilir hale getir.
// Backend bazen "112 / 911" gibi birden çok numara verir; ilkini çeviririz.
export function toDialNumber(phone: string): string {
    return phone.split("/")[0].replace(/[^0-9+*#]/g, "");
}

// Hatadan kriz payload'ı çıkar; kriz değilse null.
export async function extractCrisisPayload(
    error: unknown,
): Promise<CrisisPayload | null> {
    const body = await readErrorBody(error);
    if (!isCrisisBody(body)) return null;

    return {
        title: body.title ?? "",
        message: body.message ?? body.error ?? "",
        resources: Array.isArray(body.resources) ? body.resources : [],
    };
}

// AI gateway hatasını kontrol et: kriz ise ortak kriz ekranını aç ve true dön.
// Çağıran true alırsa normal hata toast'unu GÖSTERMEMELİDİR.
export async function maybeShowCrisis(error: unknown): Promise<boolean> {
    try {
        const payload = await extractCrisisPayload(error);
        if (payload) {
            useCrisisStore.getState().showCrisis(payload);
            return true;
        }
    } catch (e) {
        // Kriz tespiti hiçbir koşulda asıl hata akışını bozmamalı.
        console.error("[crisis] tespit sırasında beklenmeyen hata:", e);
    }
    return false;
}
