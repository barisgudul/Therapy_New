// supabase/functions/_shared/zod-schemas.ts
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// JsonValue tipini Zod ile tanımlama
const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
    z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null(),
        z.array(JsonValueSchema),
        z.record(JsonValueSchema),
    ])
);

// Profile şeması - VaultData.profile'ı yansıtır
const ProfileSchema = z.object({
    nickname: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(),
    expectation: z.string().optional().nullable(),
    therapyGoals: z.string().optional().nullable(),
    previousTherapy: z.string().optional().nullable(),
    relationshipStatus: z.enum([
        "single",
        "in_relationship",
        "married",
        "complicated",
        "",
    ]).optional(),
    gender: z.enum(["male", "female", "other", ""]).optional(),
}).passthrough(); // Ek alanları da kabul et

// Memory şeması - VaultData.memories içindeki objeler
const MemorySchema = z.object({
    id: z.string().optional(),
    content: JsonValueSchema,
    timestamp: z.string().optional(),
    source_layer: z.string().optional(),
}).passthrough();

// MoodHistory şeması
const MoodHistorySchema = z.object({
    mood: z.string(),
    timestamp: z.string(),
}).passthrough();

// VaultData şeması - Mevcut VaultData tipini tam olarak yansıtır
export const UserVaultSchema = z.object({
    traits: z.record(z.union([z.number(), z.string()])).optional(),
    memories: z.array(MemorySchema).optional(),
    themes: z.array(z.string()).optional(),
    keyInsights: z.array(z.string()).optional(),
    coreBeliefs: z.record(z.string()).optional(),
    onboarding: z.record(JsonValueSchema).optional(),
    profile: ProfileSchema.optional(),
    metadata: z.record(JsonValueSchema).optional(),
    moodHistory: z.array(MoodHistorySchema).optional(),
}).passthrough(); // Ek alanları da kabul et

export type UserVault = z.infer<typeof UserVaultSchema>;

// Gateway'in dahili olarak kullanacağı standart istek formatı
export const InternalRequestSchema = z.object({
    intent: z.string(),
    payload: z.any(), // Her intent'in kendi payload yapısı olabilir
    mood: z.string().optional().nullable(),
    language: z.string().optional().nullable(),
});

export type InternalRequest = z.infer<typeof InternalRequestSchema>;

// Gateway'e gelen isteklerin gövde (body) yapısını tanımlar
export const GatewayRequestSchema = z.object({
    intent: z.string(), // Örn: 'DREAM_ANALYSIS', 'DAILY_REFLECTION'
    payload: z.any(), // Her niyetin kendi payload yapısı olabilir.
});

export type GatewayRequest = z.infer<typeof GatewayRequestSchema>;
