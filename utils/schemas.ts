// utils/schemas.ts
import { z } from "zod";
import { traitKeys } from "../services/trait.service.ts";

// -------------------
// TEMEL ŞEMALAR
// -------------------

// GENEL TRAITS ŞEMASI
const traitsSchemaCore = traitKeys.reduce((acc, key) => {
  // Tüm trait'ler opsiyoneldir, çünkü AI bazen hepsini bulamayabilir.
  acc[key] = z.union([z.number(), z.string()]).optional();
  return acc;
}, {} as Record<string, z.ZodTypeAny>);

export const TraitsSchema = z.object(traitsSchemaCore);

// GÜNLÜK AKIŞI ŞEMALARI
export const DiaryStartSchema = z.object({
  mood: z.string().min(1, { message: "Mood alanı boş olamaz." }),
  questions: z.array(z.string().min(1)).min(3, {
    message: "En az 3 soru olmalı.",
  }),
});

export const NextQuestionsSchema = z.object({
  questions: z.array(z.string().min(1)).min(1, {
    message: "Soru listesi boş olamaz.",
  }),
});

// RÜYA ANALİZİ ŞEMASI
export const DreamAnalysisSchema = z.object({
  title: z.string().min(1, { message: "Başlık gereklidir." }),
  summary: z.string().min(1, { message: "Özet gereklidir." }),
  themes: z.array(z.string()),
  interpretation: z.string().min(1, { message: "Yorumlama gereklidir." }),
  crossConnections: z.array(
    z.object({
      connection: z.string(),
      evidence: z.string(),
    }),
  ),
  questions: z.array(z.string()).min(1, {
    message: "En az 1 soru gereklidir.",
  }),
});

// CrossConnection için küçük bir şema tanımla
const CrossConnectionSchema = z.object({
  connection: z.string(),
  evidence: z.string(),
});

// Rüya Analizi'nden dönmesini BEKELDİĞİMİZ JSON objesinin şeması.
export const DreamAnalysisResultSchema = z.object({
  title: z.string().min(2, "Başlık en az 2 karakter olmalı."),
  summary: z.string().min(10, "Özet en az 10 karakter olmalı."),
  themes: z.array(z.string()).min(1, "En az bir tema belirtilmeli."),
  interpretation: z.string().min(20, "Yorumlama en az 20 karakter olmalı."),
  // YENİ ALANI BURAYA EKLE
  crossConnections: z.array(CrossConnectionSchema),
});

// Bu şemadan bir TypeScript tipi türetiyoruz.
export type DreamAnalysisResult = z.infer<typeof DreamAnalysisResultSchema>;

// SEANS HAFIZASI ŞEMASI
export const SessionMemorySchema = z.object({
  log: z.string().min(1, { message: "Log metni gereklidir." }),
  vaultUpdate: z.object({
    themes: z.array(z.string()).optional(),
    coreBeliefs: z.record(z.string()).optional(),
    keyInsights: z.array(z.string()).optional(),
  }),
});

// -------------------
// TÜRETİLMİŞ TİPLER (Tek yerden yönetilir)
// -------------------

export type SessionMemory = z.infer<typeof SessionMemorySchema>;
export type DiaryStart = z.infer<typeof DiaryStartSchema>;
