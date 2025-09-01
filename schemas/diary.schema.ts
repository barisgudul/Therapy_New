// schemas/diary.schema.ts
import { z } from "zod";

export const MessageSchema = z.object({
    text: z.string(),
    isUser: z.boolean(),
    timestamp: z.union([z.string(), z.number()]).transform((val) => {
        // String ise number'a çevir, number ise olduğu gibi bırak
        return typeof val === "string" ? new Date(val).getTime() : val;
    }),
});

export const DiaryEventDataSchema = z.object({
    messages: z.array(MessageSchema),
}).nullable();

export const AppEventSchema = z.object({
    id: z.union([z.string(), z.number()]).transform((val) => String(val)),
    user_id: z.string(),
    type: z.string(),
    timestamp: z.union([z.string(), z.number()]).transform((val) => {
        // String ise number'a çevir, number ise olduğu gibi bırak
        return typeof val === "string" ? new Date(val).getTime() : val;
    }),
    created_at: z.string(),
    mood: z.string().optional().nullable(),
    data: DiaryEventDataSchema,
});

export const DiaryEventsArraySchema = z.array(AppEventSchema);
