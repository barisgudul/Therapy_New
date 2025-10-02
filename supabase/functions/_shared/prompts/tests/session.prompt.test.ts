// supabase/functions/_shared/prompts/tests/session.prompt.test.ts

import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateTextSessionPrompt } from "../session.prompt.ts";

Deno.test("Session Prompts: generateTextSessionPrompt", async (t) => {
    // 1. HAZIRLIK (Arrange): Sahte PromptData objesi
    const mockPromptData = {
        userDossier: {
            nickname: "Çömez",
            dnaSummary: "Yaratıcı ve analitik düşünen bir kişilik",
            recentMood: "Yorgun ama umutlu",
            recentTopics: ["iş", "kariyer", "stres"],
            lastInteractionTime: "2 saat önce",
            lastInteractionType: "chat",
            therapyGoals: "Kendimi daha iyi tanımak",
            personalityTraits: {
                confidence: "0.7",
                anxiety_level: "0.4",
                motivation: "0.8",
            },
        },
        pastContext: "Geçmişte iş stresi yaşamıştı",
        shortTermMemory: "AI: Nasılsın?\nUser: İyiyim, teşekkürler.",
        userMessage: "Bugün işte çok yoruldum",
        lastAiEndedWithQuestion: false,
        userLooksBored: false,
        styleMode: 1,
        activityContext: "Son zamanlarda iş konularında çok konuşuyor",
        continuityHints: ["Geçen hafta da benzer yorgunluk yaşamıştı"],
    };

    await t.step("should generate a Turkish prompt", () => {
        // 2. EYLEM (Act)
        const prompt = generateTextSessionPrompt(mockPromptData, "tr");

        // 3. DOĞRULAMA (Assert)
        assertStringIncludes(prompt, "<ROLE>"); // Ana başlık
        assertStringIncludes(prompt, "<CONTEXT>"); // Ana başlık
        assertStringIncludes(prompt, "<RULES>"); // Ana başlık
        assertStringIncludes(prompt, "Kullanıcı"); // Türkçe'ye özgü
        assertStringIncludes(prompt, "Son ruh hali"); // Türkçe'ye özgü
        assertStringIncludes(prompt, mockPromptData.userMessage); // Dinamik veri
        assertStringIncludes(prompt, mockPromptData.userDossier.recentMood); // Dinamik veri
    });

    await t.step("should generate an English prompt", () => {
        const prompt = generateTextSessionPrompt(mockPromptData, "en");
        assertStringIncludes(prompt, "<ROLE>"); // Ana başlık
        assertStringIncludes(prompt, "<CONTEXT>"); // Ana başlık
        assertStringIncludes(prompt, "<RULES>"); // Ana başlık
        assertStringIncludes(prompt, "User"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "Recent mood"); // İngilizce'ye özgü
    });

    await t.step("should generate a German prompt", () => {
        const prompt = generateTextSessionPrompt(mockPromptData, "de");
        assertStringIncludes(prompt, "<ROLE>"); // Ana başlık
        assertStringIncludes(prompt, "<CONTEXT>"); // Ana başlık
        assertStringIncludes(prompt, "<RULES>"); // Ana başlık
        assertStringIncludes(prompt, "Nutzer"); // Almanca'ya özgü
        assertStringIncludes(prompt, "Jüngste Stimmung"); // Almanca'ya özgü
    });

    await t.step(
        "should fall back to English for unsupported languages",
        () => {
            const prompt = generateTextSessionPrompt(mockPromptData, "fr");
            assertStringIncludes(prompt, "User"); // Fallback İngilizce
        },
    );

    await t.step("should include all dynamic data in the prompt", () => {
        const prompt = generateTextSessionPrompt(mockPromptData, "tr");

        // Kullanıcı mesajının dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockPromptData.userMessage);

        // Ruh halinin dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockPromptData.userDossier.recentMood);

        // Konuların dahil edildiğini kontrol et
        mockPromptData.userDossier.recentTopics.forEach((topic) => {
            assertStringIncludes(prompt, topic);
        });

        // Geçmiş bağlamın dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockPromptData.pastContext);

        // Kısa süreli hafızanın dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockPromptData.shortTermMemory);
    });

    await t.step("should handle optional fields correctly", () => {
        const minimalData = {
            userDossier: {
                nickname: null,
                dnaSummary: null,
                recentMood: "Normal",
                recentTopics: [],
                lastInteractionTime: "1 saat önce",
                lastInteractionType: "chat",
                therapyGoals: "Genel gelişim",
                personalityTraits: {
                    confidence: "0.5",
                    anxiety_level: "0.3",
                    motivation: "0.6",
                },
            },
            pastContext: "Genel bağlam",
            shortTermMemory: "AI: Merhaba\nUser: Selam",
            userMessage: "Test mesajı",
        };

        const prompt = generateTextSessionPrompt(minimalData, "tr");
        assertStringIncludes(prompt, minimalData.userMessage);
        assertStringIncludes(prompt, minimalData.userDossier.recentMood);
    });
});
