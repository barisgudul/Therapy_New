// supabase/functions/_shared/prompts/tests/dailyReflection.prompt.test.ts

import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateDailyReflectionPrompt } from "../dailyReflection.prompt.ts";

Deno.test("Daily Reflection Prompts: generateDailyReflectionPrompt", async (t) => {
    // 1. HAZIRLIK (Arrange): Sahte DailyReflectionPromptData objesi
    const mockDailyReflectionData = {
        userName: "Çömez",
        todayMood: "Yorgun ama umutlu",
        todayNote: "Bugün işte çok yoruldum ama yeni bir proje başlattım",
        retrievedMemories: [
            { content: "Geçen hafta da benzer bir yorgunluk yaşamıştı" },
            { content: "Proje konusunda daha önce endişeleri vardı" },
        ],
    };

    await t.step("should generate a Turkish prompt", () => {
        // 2. EYLEM (Act)
        const prompt = generateDailyReflectionPrompt(
            mockDailyReflectionData,
            "tr",
        );

        // 3. DOĞRULAMA (Assert)
        assertStringIncludes(prompt, "### KESİN KURALLAR ###"); // Türkçe'ye özgü
        assertStringIncludes(prompt, "GEÇMİŞTEN ALAKALI ANILAR"); // Türkçe'ye özgü
        assertStringIncludes(prompt, "Zihin Aynası"); // Türkçe'ye özgü
        assertStringIncludes(prompt, mockDailyReflectionData.userName); // Dinamik veri
        assertStringIncludes(prompt, mockDailyReflectionData.todayMood); // Dinamik veri
        assertStringIncludes(prompt, mockDailyReflectionData.todayNote); // Dinamik veri
    });

    await t.step("should generate an English prompt", () => {
        const prompt = generateDailyReflectionPrompt(
            mockDailyReflectionData,
            "en",
        );
        assertStringIncludes(prompt, "### HARD RULES ###"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "RELEVANT PAST MEMORIES"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "Mind Mirror"); // İngilizce'ye özgü
    });

    await t.step("should generate a German prompt", () => {
        const prompt = generateDailyReflectionPrompt(
            mockDailyReflectionData,
            "de",
        );
        assertStringIncludes(prompt, "### FESTE REGELN ###"); // Almanca'ya özgü
        assertStringIncludes(prompt, "RELEVANTE VERGANGENE ERINNERUNGEN"); // Almanca'ya özgü
        assertStringIncludes(prompt, "Geist-Spiegel"); // Almanca'ya özgü
    });

    await t.step(
        "should fall back to English for unsupported languages",
        () => {
            const prompt = generateDailyReflectionPrompt(
                mockDailyReflectionData,
                "fr",
            );
            assertStringIncludes(prompt, "### HARD RULES ###"); // Fallback İngilizce
        },
    );

    await t.step("should include all dynamic data in the prompt", () => {
        const prompt = generateDailyReflectionPrompt(
            mockDailyReflectionData,
            "tr",
        );

        // Kullanıcı adının dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockDailyReflectionData.userName);

        // Ruh halinin dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockDailyReflectionData.todayMood);

        // Notun dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockDailyReflectionData.todayNote);

        // Anıların dahil edildiğini kontrol et
        mockDailyReflectionData.retrievedMemories.forEach((memory) => {
            assertStringIncludes(prompt, memory.content);
        });
    });

    await t.step("should handle empty memories correctly", () => {
        const dataWithoutMemories = {
            ...mockDailyReflectionData,
            retrievedMemories: [],
        };

        const prompt = generateDailyReflectionPrompt(dataWithoutMemories, "tr");
        assertStringIncludes(
            prompt,
            "Bugünkü konuyla ilgili geçmişten özel bir anı bulunamadı",
        );
    });

    await t.step("should handle null userName correctly", () => {
        const dataWithoutName = {
            ...mockDailyReflectionData,
            userName: null,
        };

        const prompt = generateDailyReflectionPrompt(dataWithoutName, "tr");
        assertStringIncludes(prompt, "Kullanıcı adı bilinmiyor");
    });
});
