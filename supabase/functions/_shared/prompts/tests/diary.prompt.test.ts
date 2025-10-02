// supabase/functions/_shared/prompts/tests/diary.prompt.test.ts

import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
    getDiaryConclusionPrompt,
    getDiaryNextQuestionsPrompt,
    getDiaryStartPrompt,
} from "../diary.prompt.ts";

Deno.test("Diary Prompts: getDiaryStartPrompt", async (t) => {
    // 1. HAZIRLIK (Arrange): Tüm testler için ortak sahte veri
    const initialEntry = "Bugün işte çok yoruldum.";
    const userName = "Çömez";
    const vaultContext = "Geçmişte iş stresi yaşamıştı.";

    await t.step("should generate a Turkish prompt", () => {
        // 2. EYLEM (Act)
        const prompt = getDiaryStartPrompt(
            initialEntry,
            userName,
            vaultContext,
            "tr",
        );

        // 3. DOĞRULAMA (Assert)
        assertStringIncludes(prompt, "### ROL ###"); // Türkçe'ye özgü anahtar kelime
        assertStringIncludes(prompt, "BUGÜNKÜ GÜNLÜK GİRDİSİ"); // Türkçe'ye özgü anahtar kelime
        assertStringIncludes(prompt, `'${userName}'`); // Dinamik veri doğru enjekte edilmiş mi?
        assertStringIncludes(prompt, initialEntry); // Dinamik veri doğru enjekte edilmiş mi?
    });

    await t.step("should generate an English prompt", () => {
        const prompt = getDiaryStartPrompt(
            initialEntry,
            userName,
            vaultContext,
            "en",
        );
        assertStringIncludes(prompt, "### ROLE ###"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "TODAY'S DIARY ENTRY");
    });

    await t.step("should generate a German prompt", () => {
        const prompt = getDiaryStartPrompt(
            initialEntry,
            userName,
            vaultContext,
            "de",
        );
        assertStringIncludes(prompt, "### ROLLE ###"); // Almanca'ya özgü
        assertStringIncludes(prompt, "HEUTIGER TAGEBUCHEINTRAG");
    });

    await t.step(
        "should fall back to English for unsupported languages",
        () => {
            // Desteklenmeyen bir dil kodu veriyoruz ('fr')
            const prompt = getDiaryStartPrompt(
                initialEntry,
                userName,
                vaultContext,
                "fr",
            );
            // Sonucun İngilizce olmasını bekliyoruz
            assertStringIncludes(prompt, "### ROLE ###");
        },
    );
});

// Diğer fonksiyonlar için de aynı mantıkla testler yazıyoruz
Deno.test("Diary Prompts: getDiaryNextQuestionsPrompt", async (t) => {
    const history = "AI: Nasılsın?\nUser: İyiyim.";
    await t.step("should generate a Turkish prompt", () => {
        const prompt = getDiaryNextQuestionsPrompt(history, "Çömez", "tr");
        assertStringIncludes(prompt, "ROL: Yakın bir arkadaş");
    });
    await t.step("should generate an English prompt", () => {
        const prompt = getDiaryNextQuestionsPrompt(history, "Çömez", "en");
        assertStringIncludes(prompt, "ROLE: You are a warm AI friend");
    });
});

Deno.test("Diary Prompts: getDiaryConclusionPrompt", async (t) => {
    const history = "User: Günüm bitti.";
    const pastContext = "Daha önce de yorgun olduğunu söylemişti.";
    await t.step("should generate a Turkish prompt", () => {
        const prompt = getDiaryConclusionPrompt(
            history,
            "Çömez",
            pastContext,
            "tr",
        );
        assertStringIncludes(prompt, "bilge bir arkadaşsın");
    });
    await t.step("should generate an English prompt", () => {
        const prompt = getDiaryConclusionPrompt(
            history,
            "Çömez",
            pastContext,
            "en",
        );
        assertStringIncludes(prompt, "valuable closing reflection");
    });
});
