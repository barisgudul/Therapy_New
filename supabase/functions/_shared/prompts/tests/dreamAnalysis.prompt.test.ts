// supabase/functions/_shared/prompts/tests/dreamAnalysis.prompt.test.ts

import { assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateDreamAnalysisPrompt } from "../dreamAnalysis.prompt.ts";

Deno.test("Dream Analysis Prompts: generateDreamAnalysisPrompt", async (t) => {
    // 1. HAZIRLIK (Arrange): Sahte DreamAnalysisPromptData objesi
    const mockDreamAnalysisData = {
        userDossier: {
            traits: {
                confidence: "0.8",
                anxiety_level: "0.3",
                motivation: "0.7",
                openness: "0.9",
                neuroticism: "0.2",
            },
            therapyGoals: "Kendimi daha iyi tanımak",
            recentEvents: "therapy_session, diary",
            predictions: "Pozitif değişim, Yeni fırsatlar",
            journeyLogs: "İlk adım atıldı, Başarı kaydedildi",
        },
        ragContext: "Geçmişte benzer rüyalar görülmüş",
        dreamText: "Korkunç bir rüyaydı, yalnız başıma kalmıştım",
    };

    await t.step("should generate a Turkish prompt", () => {
        // 2. EYLEM (Act)
        const prompt = generateDreamAnalysisPrompt(mockDreamAnalysisData, "tr");

        // 3. DOĞRULAMA (Assert)
        assertStringIncludes(prompt, "### ROL & KİŞİLİK ###"); // Türkçe'ye özgü
        assertStringIncludes(prompt, "KURAL 3 (Dil):"); // Türkçe'ye özgü
        assertStringIncludes(prompt, "Bilinç Arkeoloğu"); // Türkçe'ye özgü
        assertStringIncludes(prompt, mockDreamAnalysisData.dreamText); // Dinamik veri
        assertStringIncludes(
            prompt,
            mockDreamAnalysisData.userDossier.therapyGoals,
        ); // Dinamik veri
    });

    await t.step("should generate an English prompt", () => {
        const prompt = generateDreamAnalysisPrompt(mockDreamAnalysisData, "en");
        assertStringIncludes(prompt, "### ROLE & PERSONA ###"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "Consciousness Archaeologist"); // İngilizce'ye özgü
        assertStringIncludes(prompt, "Language: Output must be in English"); // İngilizce'ye özgü
    });

    await t.step("should generate a German prompt", () => {
        const prompt = generateDreamAnalysisPrompt(mockDreamAnalysisData, "de");
        assertStringIncludes(prompt, "### ROLLE & PERSONA ###"); // Almanca'ya özgü
        assertStringIncludes(prompt, "Bewusstseinsarchäologe"); // Almanca'ya özgü
        assertStringIncludes(prompt, "Sprache: Ausgabe muss Deutsch sein"); // Almanca'ya özgü
    });

    await t.step(
        "should fall back to English for unsupported languages",
        () => {
            const prompt = generateDreamAnalysisPrompt(
                mockDreamAnalysisData,
                "fr",
            );
            assertStringIncludes(prompt, "### ROLE & PERSONA ###"); // Fallback İngilizce
        },
    );

    await t.step("should include all dynamic data in the prompt", () => {
        const prompt = generateDreamAnalysisPrompt(mockDreamAnalysisData, "tr");

        // Kullanıcı dosyası verilerinin dahil edildiğini kontrol et
        assertStringIncludes(
            prompt,
            mockDreamAnalysisData.userDossier.therapyGoals,
        );
        assertStringIncludes(
            prompt,
            mockDreamAnalysisData.userDossier.recentEvents,
        );
        assertStringIncludes(
            prompt,
            mockDreamAnalysisData.userDossier.predictions,
        );
        assertStringIncludes(
            prompt,
            mockDreamAnalysisData.userDossier.journeyLogs,
        );

        // RAG context'in dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockDreamAnalysisData.ragContext);

        // Rüya metninin dahil edildiğini kontrol et
        assertStringIncludes(prompt, mockDreamAnalysisData.dreamText);
    });
});
