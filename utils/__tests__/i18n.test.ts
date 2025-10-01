// utils/__tests__/i18n.test.ts
// i18n.ts Temel Test Kapsamı

import i18n, {
    changeLanguage,
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
} from "../i18n";
import AsyncStorage from "@react-native-async-storage/async-storage";

// AsyncStorage mock'u
jest.mock("@react-native-async-storage/async-storage", () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
}));

// expo-localization mock'u
jest.mock("expo-localization", () => ({
    getLocales: jest.fn(() => [{ languageCode: "en" }]),
}));

// Console.warn mock'u
const mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

describe("i18n.ts - Dil Yönetimi", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockConsoleWarn.mockClear();
    });

    afterAll(() => {
        mockConsoleWarn.mockRestore();
    });

    describe("Sabitler", () => {
        it("✅ SUPPORTED_LANGUAGES doğru dilleri içermeli", () => {
            expect(SUPPORTED_LANGUAGES).toEqual(["tr", "en", "de"]);
            expect(SUPPORTED_LANGUAGES).toHaveLength(3);
        });

        it("✅ DEFAULT_LANGUAGE 'en' olmalı", () => {
            expect(DEFAULT_LANGUAGE).toBe("en");
        });
    });

    describe("i18n Objesi", () => {
        it("✅ i18n objesi başarıyla export edilmeli", () => {
            expect(i18n).toBeDefined();
            expect(i18n.language).toBeDefined();
        });

        it("✅ i18n objesinin t (translate) fonksiyonu mevcut olmalı", () => {
            expect(i18n.t).toBeDefined();
            expect(typeof i18n.t).toBe("function");
        });

        it("✅ i18n objesi desteklenen dillerden birini aktif dil olarak ayarlamış olmalı", () => {
            const currentLang = i18n.language;
            // Language ISO code formatında gelir (tr, en, de)
            const langCode = currentLang.split("-")[0].toLowerCase();
            expect(SUPPORTED_LANGUAGES).toContain(langCode);
        });
    });

    describe("changeLanguage Fonksiyonu", () => {
        it("✅ desteklenen bir dile geçiş yapabilmeli", async () => {
            const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<
                typeof AsyncStorage.setItem
            >;
            mockSetItem.mockResolvedValue();

            await changeLanguage("de");

            expect(mockSetItem).toHaveBeenCalledWith("user-language", "de");
            expect(i18n.language).toBe("de");
        });

        it("❌ desteklenmeyen bir dil için warning vermeli", async () => {
            const initialLanguage = i18n.language;

            await changeLanguage("fr"); // Desteklenmeyen dil

            expect(mockConsoleWarn).toHaveBeenCalledWith(
                "[i18n] Desteklenmeyen dil seçimi denendi: fr",
            );

            // Dil değişmemeli
            expect(i18n.language).toBe(initialLanguage);
        });

        it("❌ AsyncStorage hatası durumunda console.error göstermeli", async () => {
            const mockConsoleError = jest.spyOn(console, "error")
                .mockImplementation();
            const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<
                typeof AsyncStorage.setItem
            >;
            const storageError = new Error("Storage write failed");
            mockSetItem.mockRejectedValue(storageError);

            await changeLanguage("tr");

            expect(mockConsoleError).toHaveBeenCalledWith(
                "[i18n] Dil seçimi kaydedilemedi:",
                storageError,
            );

            mockConsoleError.mockRestore();
        });
    });

    describe("Çeviri Kaynakları", () => {
        it("✅ tüm desteklenen diller için çeviri kaynakları yüklenmiş olmalı", () => {
            SUPPORTED_LANGUAGES.forEach((lang) => {
                const hasResource = i18n.hasResourceBundle(lang, "translation");
                expect(hasResource).toBe(true);
            });
        });
    });

    describe("i18n Konfigürasyonu", () => {
        it("✅ missingKeyHandler eksik anahtarlar için console.warn çağırmalı", () => {
            // i18n config'indeki missingKeyHandler'ı test et
            const missingKeyHandler = i18n.options.missingKeyHandler;

            expect(missingKeyHandler).toBeDefined();

            // Handler'ı çağır
            if (missingKeyHandler) {
                missingKeyHandler(
                    ["tr"],
                    "translation",
                    "nonexistent.key",
                    "",
                    false,
                    {},
                );
            }

            // console.warn çağrıldığını kontrol et
            expect(mockConsoleWarn).toHaveBeenCalledWith(
                '[i18n] Eksik anahtar: "nonexistent.key" | Dil: "tr"',
            );
        });

        it("✅ interpolation format function uppercase formatını desteklemeli", () => {
            const formatFn = i18n.options.interpolation?.format;

            expect(formatFn).toBeDefined();

            if (formatFn) {
                const result = formatFn("test", "uppercase", "en");
                expect(result).toBe("TEST");
            }
        });

        it("✅ interpolation format function diğer formatlar için değeri olduğu gibi döndürmeli", () => {
            const formatFn = i18n.options.interpolation?.format;

            expect(formatFn).toBeDefined();

            if (formatFn) {
                const result = formatFn("test", "lowercase", "en");
                expect(result).toBe("test");
            }
        });
    });
});
