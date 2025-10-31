// supabase/functions/_shared/utils.ts
import { InternalRequestSchema } from "./zod-schemas.ts";
import type { InternalRequest } from "./zod-schemas.ts";

/**
 * Frontend'den gelen eventPayload'ı (örn: { type, data })
 * Gateway'in anlayacağı dahili formata ({ intent, payload }) dönüştürür.
 *
 * @param requestBody Frontend'den gelen orijinal istek gövdesi.
 * @returns Zod ile doğrulanmış dahili istek formatı.
 */
export function transformRequest(requestBody: unknown): InternalRequest {
    // Önce requestBody'nin yapısını kontrol et
    if (!requestBody || typeof requestBody !== "object") {
        throw new Error("Invalid request body: must be an object");
    }

    const body = requestBody as Record<string, unknown>;

    // Eski format: { eventPayload: { type, data, mood?, language? } }
    if (
        "eventPayload" in body && body.eventPayload &&
        typeof body.eventPayload === "object"
    ) {
        const eventPayload = body.eventPayload as Record<string, unknown>;
        const { type, data, mood, language } = eventPayload;

        if (!type || typeof type !== "string") {
            throw new Error(
                'Invalid legacy request format. "eventPayload.type" is required and must be a string.',
            );
        }

        if (data === undefined || data === null) {
            throw new Error(
                'Invalid legacy request format. "eventPayload.data" is required.',
            );
        }

        const transformed = {
            intent: type, // 'type' alanını 'intent' olarak haritala
            payload: data, // 'data' alanını 'payload' olarak haritala
            mood: mood && typeof mood === "string" ? mood : null,
            language: language && typeof language === "string"
                ? language
                : null,
        };

        // Dönüştürülmüş verinin dahili şemamıza uygunluğunu doğrula
        return InternalRequestSchema.parse(transformed);
    }

    // Yeni format: doğrudan { intent, payload, mood?, language? }
    if ("intent" in body || "type" in body) {
        const intent = (body.intent || body.type) as string;
        const payload = body.payload || body.data;

        if (!intent || typeof intent !== "string") {
            throw new Error(
                'Invalid request format. "intent" (or "type") is required and must be a string.',
            );
        }

        if (payload === undefined || payload === null) {
            throw new Error(
                'Invalid request format. "payload" (or "data") is required.',
            );
        }

        const transformed = {
            intent,
            payload,
            mood: (body.mood && typeof body.mood === "string")
                ? body.mood
                : null,
            language: (body.language && typeof body.language === "string")
                ? body.language
                : null,
        };

        return InternalRequestSchema.parse(transformed);
    }

    throw new Error(
        'Invalid request format. Must contain either "eventPayload" (legacy) or "intent"/"type" field.',
    );
}
