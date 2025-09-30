// services/__tests__/prompt.service.test.ts

import {
    buildSilentOraclePrompt,
    generateSilentOracle,
    getActivePrompt,
    type OracleInputs,
} from "../prompt.service";

import { supabase } from "../../utils/supabase";

// prompt.service'in kendisindeki cache'i testler arasında temizlememiz gerekiyor.
// Bu, testlerin birbirini etkilemesini önlemek için KRİTİKTİR.
// Jest ile module'ü her test öncesi yeniden yükleyeceğiz.

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("prompt.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Her testten önce module'ü yeniden yükle ki cache temizlensin
        jest.resetModules();

        // Supabase için temel iskeleti kur
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            // Bu dosyada `from` kullanılmıyor ama standart olsun diye ekleyebiliriz.
        });
        (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
            data: {},
            error: null,
        });

        // RPC mock'unu düzgün şekilde ayarla
        const mockSingle = jest.fn().mockResolvedValue({
            data: null,
            error: null,
        });
        const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
        (mockedSupabase.rpc as jest.Mock) = mockRpc;
    });

    describe("buildSilentOraclePrompt", () => {
        const testInputs: OracleInputs = {
            dreamTheme: "Düşmek",
            pastLink: "Kontrol kaybı korkusu",
            blindSpot: "Yardım istememek",
            goldenThread: "Güvenmek",
        };

        it("Türkçe promptu doğru oluşturmalı ve verileri yerleştirmeli", () => {
            const prompt = buildSilentOraclePrompt(testInputs, "tr");
            expect(prompt).toContain("ÇIKTI DİLİ: Türkçe olmalı.");
            expect(prompt).toContain("[RÜYA_TEMASI]: Düşmek");
            expect(prompt).toContain("[KÖR_NOKTA]: Yardım istememek");
            expect(prompt).toContain(
                "[GEÇMİŞ_BAĞLANTISI]: Kontrol kaybı korkusu",
            );
            expect(prompt).toContain("[GOLDEN_THREAD]: Güvenmek");
        });

        it("İngilizce promptu doğru oluşturmalı", () => {
            const prompt = buildSilentOraclePrompt(testInputs, "en");
            expect(prompt).toContain("OUTPUT LANGUAGE: Must be English.");
            expect(prompt).toContain("[DREAM_THEME]: Düşmek");
            expect(prompt).toContain("[BLIND_SPOT]: Yardım istememek");
            expect(prompt).toContain("[PAST_LINK]: Kontrol kaybı korkusu");
            expect(prompt).toContain("[GOLDEN_THREAD]: Güvenmek");
        });

        it("Almanca promptu doğru oluşturmalı", () => {
            const prompt = buildSilentOraclePrompt(testInputs, "de");
            expect(prompt).toContain("AUSGABESPRACHE: Deutsch.");
            expect(prompt).toContain("[TRAUMTHEMA]: Düşmek");
            expect(prompt).toContain("[BLINDER_FLECK]: Yardım istememek");
            expect(prompt).toContain(
                "[VERGANGENHEITS-LINK]: Kontrol kaybı korkusu",
            );
            expect(prompt).toContain("[GOLDEN_THREAD]: Güvenmek");
        });

        it("Desteklenmeyen bir dil için varsayılan olarak İngilizce kullanmalı", () => {
            const prompt = buildSilentOraclePrompt(testInputs, "fr"); // Fransızca desteklenmiyor
            expect(prompt).toContain("OUTPUT LANGUAGE: Must be English.");
            expect(prompt).toContain("[DREAM_THEME]: Düşmek");
        });

        it("Boş string dil parametresi için varsayılan olarak İngilizce kullanmalı", () => {
            const prompt = buildSilentOraclePrompt(testInputs, "");
            expect(prompt).toContain("OUTPUT LANGUAGE: Must be English.");
        });

        it("Null dil parametresi için varsayılan olarak İngilizce kullanmalı", () => {
            const prompt = buildSilentOraclePrompt(
                testInputs,
                null as unknown as string,
            );
            expect(prompt).toContain("OUTPUT LANGUAGE: Must be English.");
        });
    });

    describe("generateSilentOracle", () => {
        const testInputs: OracleInputs = {
            dreamTheme: "Düşmek",
            pastLink: "Kontrol kaybı korkusu",
            blindSpot: "Yardım istememek",
            goldenThread: "Güvenmek",
        };

        it("Başarılı bir API cevabını doğru şekilde parse etmeli", async () => {
            const mockApiResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text:
                                '{"f1":"Bu his tanıdık... Güvenmek zor geldi.","f2":"Görmediğin şey şu: Bu düşmek, senin yardım istememek alışkanlığından besleniyor.","f3":"Atacağın adım: Bugün güvendiğin birine küçük bir sırrını anlat."}',
                        }],
                    },
                }],
            };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockApiResponse,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result).toEqual({
                f1: "Bu his tanıdık... Güvenmek zor geldi.",
                f2: "Görmediğin şey şu: Bu düşmek, senin yardım istememek alışkanlığından besleniyor.",
                f3: "Atacağın adım: Bugün güvendiğin birine küçük bir sırrını anlat.",
            });
            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "api-gateway",
                {
                    body: {
                        type: "gemini",
                        payload: {
                            model: "gemini-1.5-flash",
                            prompt: expect.stringContaining(
                                "[RÜYA_TEMASI]: Düşmek",
                            ),
                            config: {
                                responseMimeType: "application/json",
                                maxOutputTokens: 180,
                            },
                        },
                    },
                },
            );
        });

        it("API cevabı bozuk JSON ise varsayılan fallback değerlerini dönmeli", async () => {
            const mockApiResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text: '{"f1":"Bozuk JSON', // Eksik kapanış parantezi
                        }],
                    },
                }],
            };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockApiResponse,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result.f1).toBe("Bu his tanıdık...");
            expect(result.f2).toContain("kaçınma alışkanlığından besleniyor.");
            expect(result.f3).toContain("kontrolü bırak.");
        });

        it("API cevabında eksik anahtar varsa, o anahtar için fallback kullanmalı", async () => {
            const mockApiResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text: '{"f1":"Sadece F1 var"}', // f2 ve f3 eksik
                        }],
                    },
                }],
            };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockApiResponse,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result.f1).toBe("Sadece F1 var"); // Gelen veri
            expect(result.f2).toContain("kaçınma alışkanlığından besleniyor."); // Fallback
            expect(result.f3).toContain("kontrolü bırak."); // Fallback
        });

        it("API cevabı null ise fallback değerlerini dönmeli", async () => {
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result.f1).toBe("Bu his tanıdık...");
            expect(result.f2).toContain("kaçınma alışkanlığından besleniyor.");
            expect(result.f3).toContain("kontrolü bırak.");
        });

        it("API cevabı undefined ise fallback değerlerini dönmeli", async () => {
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: undefined,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result.f1).toBe("Bu his tanıdık...");
            expect(result.f2).toContain("kaçınma alışkanlığından besleniyor.");
            expect(result.f3).toContain("kontrolü bırak.");
        });

        it("API cevabında candidates array boş ise fallback değerlerini dönmeli", async () => {
            const mockApiResponse = {
                candidates: [],
            };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockApiResponse,
                error: null,
            });

            const result = await generateSilentOracle(testInputs, "tr");

            expect(result.f1).toBe("Bu his tanıdık...");
            expect(result.f2).toContain("kaçınma alışkanlığından besleniyor.");
            expect(result.f3).toContain("kontrolü bırak.");
        });

        it("Supabase invoke hatası olursa, hatayı yukarı fırlatmalı", async () => {
            const invokeError = new Error("Function invocation failed");
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: null,
                error: invokeError,
            });

            await expect(generateSilentOracle(testInputs, "tr")).rejects
                .toThrow(invokeError);
        });

        it("Farklı dillerde doğru prompt oluşturmalı", async () => {
            const mockApiResponse = {
                candidates: [{
                    content: {
                        parts: [{
                            text:
                                '{"f1":"Test response","f2":"Test response","f3":"Test response"}',
                        }],
                    },
                }],
            };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockApiResponse,
                error: null,
            });

            await generateSilentOracle(testInputs, "en");

            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "api-gateway",
                {
                    body: {
                        type: "gemini",
                        payload: {
                            model: "gemini-1.5-flash",
                            prompt: expect.stringContaining(
                                "OUTPUT LANGUAGE: Must be English.",
                            ),
                            config: {
                                responseMimeType: "application/json",
                                maxOutputTokens: 180,
                            },
                        },
                    },
                },
            );
        });
    });

    describe("getActivePrompt", () => {
        const mockPromptData = {
            content: "Test prompt içeriği",
            version: 1,
            metadata: { type: "test" },
        };

        it("Cache boşsa, Supabase RPC'yi çağırmalı, sonucu cache'lemeli ve döndürmeli", async () => {
            // ARRANGE
            const mockSingle = jest.fn().mockResolvedValue({
                data: mockPromptData,
                error: null,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT - İlk Çağrı
            const result1 = await getActivePrompt("test-prompt");

            // ASSERT - İlk Çağrı
            expect(result1).toEqual(mockPromptData);
            expect(mockedSupabase.rpc).toHaveBeenCalledWith(
                "get_active_prompt_by_name",
                { p_name: "test-prompt" },
            );
            expect(mockSingle).toHaveBeenCalledTimes(1);

            // ACT - İkinci Çağrı
            const result2 = await getActivePrompt("test-prompt");

            // ASSERT - İkinci Çağrı
            expect(result2).toEqual(mockPromptData);
            // RPC'nin tekrar çağrılmadığını doğrula (cache'den geldi)
            expect(mockSingle).toHaveBeenCalledTimes(1);
        });

        it("Cache doluysa, Supabase RPC'yi ÇAĞIRMAMALI ve cache'deki veriyi dönmeli", async () => {
            // ARRANGE - İlk çağrı ile cache'i doldur
            const mockSingle = jest.fn().mockResolvedValue({
                data: mockPromptData,
                error: null,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT - İlk çağrı (cache'i doldur)
            await getActivePrompt("cached-prompt");

            // Mock'u temizle ki ikinci çağrıda çağrılıp çağrılmadığını görebilelim
            jest.clearAllMocks();

            // ACT - İkinci çağrı (cache'den gelmeli)
            const result = await getActivePrompt("cached-prompt");

            // ASSERT
            expect(result).toEqual(mockPromptData);
            expect(mockedSupabase.rpc).not.toHaveBeenCalled();
        });

        it("Supabase RPC hata döndürürse, kritik bir hata fırlatmalı", async () => {
            // ARRANGE
            const rpcError = new Error("RPC failed");
            const mockSingle = jest.fn().mockResolvedValue({
                data: null,
                error: rpcError,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT & ASSERT
            await expect(getActivePrompt("error-prompt")).rejects.toThrow(
                "Kritik prompt alınamadı: error-prompt",
            );
        });

        it("Supabase RPC veri döndürmezse (data: null), kritik bir hata fırlatmalı", async () => {
            // ARRANGE
            const mockSingle = jest.fn().mockResolvedValue({
                data: null,
                error: null,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT & ASSERT
            await expect(getActivePrompt("no-data-prompt")).rejects.toThrow(
                "Kritik prompt alınamadı: no-data-prompt",
            );
        });

        it("Supabase RPC undefined veri döndürürse, kritik bir hata fırlatmalı", async () => {
            // ARRANGE
            const mockSingle = jest.fn().mockResolvedValue({
                data: undefined,
                error: null,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT & ASSERT
            await expect(getActivePrompt("undefined-data-prompt")).rejects
                .toThrow("Kritik prompt alınamadı: undefined-data-prompt");
        });

        it("Metadata eksikse, boş obje kullanmalı", async () => {
            // ARRANGE
            const promptDataWithoutMetadata = {
                content: "Test prompt içeriği",
                version: 1,
                // metadata eksik
            };
            const mockSingle = jest.fn().mockResolvedValue({
                data: promptDataWithoutMetadata,
                error: null,
            });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT
            const result = await getActivePrompt("no-metadata-prompt");

            // ASSERT
            expect(result).toEqual({
                content: "Test prompt içeriği",
                version: 1,
                metadata: {},
            });
        });

        it("Farklı prompt isimleri farklı cache anahtarları kullanmalı", async () => {
            // ARRANGE
            const prompt1 = { content: "Prompt 1", version: 1, metadata: {} };
            const prompt2 = { content: "Prompt 2", version: 2, metadata: {} };

            const mockSingle = jest.fn()
                .mockResolvedValueOnce({ data: prompt1, error: null })
                .mockResolvedValueOnce({ data: prompt2, error: null });
            const mockRpc = jest.fn().mockReturnValue({ single: mockSingle });
            (mockedSupabase.rpc as jest.Mock) = mockRpc;

            // ACT
            const result1 = await getActivePrompt("prompt-1");
            const result2 = await getActivePrompt("prompt-2");

            // ASSERT
            expect(result1).toEqual(prompt1);
            expect(result2).toEqual(prompt2);
            expect(mockedSupabase.rpc).toHaveBeenCalledTimes(2);
            expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
                1,
                "get_active_prompt_by_name",
                { p_name: "prompt-1" },
            );
            expect(mockedSupabase.rpc).toHaveBeenNthCalledWith(
                2,
                "get_active_prompt_by_name",
                { p_name: "prompt-2" },
            );
        });
    });
});
