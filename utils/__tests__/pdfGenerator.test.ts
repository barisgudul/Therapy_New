// utils/__tests__/pdfGenerator.test.ts
// PDF Generator - Native Modül Testleri
import { __clearIconCache, generatePdf } from "../pdfGenerator";
import { Platform } from "react-native";
// Mock fonksiyonlarını global scope'da tanımla
const mockConvert = jest.fn();
const mockShareAsync = jest.fn();
const mockToastShow = jest.fn();

// Global'e ata ki mock'lar içinden erişilebilsin
(global as any).mockConvert = mockConvert;
(global as any).mockShareAsync = mockShareAsync;
(global as any).mockToastShow = mockToastShow;

jest.mock("react-native-html-to-pdf", () => ({
    __esModule: true,
    default: {
        convert: (...args: any[]) => (global as any).mockConvert(...args),
    },
}));

jest.mock("expo-sharing", () => ({
    shareAsync: (...args: any[]) => (global as any).mockShareAsync(...args),
}));

jest.mock("react-native-toast-message", () => ({
    __esModule: true,
    default: {
        show: (...args: any[]) => (global as any).mockToastShow(...args),
    },
}));

// YERİNE BUNU KOY:
jest.mock("react-native", () => {
    let currentOS = "ios";
    const mockPlatform = {
        get OS() {
            return currentOS;
        },
        set OS(value) {
            currentOS = value;
        },
        select: jest.fn((dict) => dict[currentOS]),
    };
    return { Platform: mockPlatform };
});

jest.mock("js-base64", () => ({
    encode: jest.fn((str: string) => Buffer.from(str).toString("base64")),
}));

jest.mock("../../constants/Colors", () => ({
    Colors: {
        light: {
            tint: "#6366F1",
            softText: "#6B7280",
            card: "#FFFFFF",
        },
    },
}));

// Global fetch'i mock'la
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Console.error'u mock'la
const mockConsoleError = jest.spyOn(console, "error").mockImplementation();

describe("pdfGenerator.ts - PDF Oluşturma Sistemi", () => {
    // Mock insight verisi
    const mockInsight = {
        pattern: "Test Düşünce Kalıbı",
        reframe: "Test Yeniden Çerçeve",
        potential: "Test Potansiyel",
        first_step: "Test İlk Adım",
        micro_habit: "Test Mikro Alışkanlık",
        success_metric: "Test Başarı Metriği",
        roadblock: "Test Engel",
        support_system: "Test Destek Sistemi",
    };

    const mockNickname = "Test Kullanıcısı";

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsoleError.mockClear();

        // Icon cache'ini temizle (module-level state)
        __clearIconCache();

        // Platform OS'u default'a çevir
        (Platform as any).OS = "ios";

        // Default başarılı fetch yanıtı
        (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
            ok: true,
            text: jest.fn().mockResolvedValue("<svg></svg>"),
        } as any);

        // Default başarılı PDF convert
        mockConvert.mockResolvedValue({
            filePath: "/fake/path/to/report.pdf",
        });

        // Default başarılı share
        mockShareAsync.mockResolvedValue(undefined);
    });

    afterAll(() => {
        mockConsoleError.mockRestore();
    });

    it("✅ tüm ikonları fetch etmeli, HTML'i oluşturmalı ve PDF'e çevirmeli", async () => {
        await generatePdf(mockInsight, mockNickname);

        // 1. İlk toast (info) gösterilmeli
        expect(mockToastShow).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "info",
                text1: "PDF Raporu Hazırlanıyor...",
            }),
        );

        // 2. Gerekli tüm ikonlar için fetch çağrılmalı (10 ikon)
        const expectedIcons = [
            "bulb-outline",
            "key-outline",
            "sparkles-outline",
            "rocket-outline",
            "leaf-outline",
            "trophy-outline",
            "close-circle-outline",
            "people-outline",
            "shield-checkmark-outline",
            "calendar-outline",
        ];

        expectedIcons.forEach((iconName) => {
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining(`${iconName}.svg`),
            );
        });

        expect(global.fetch).toHaveBeenCalledTimes(10);

        // 3. RNHTMLtoPDF.convert'in doğru HTML içeriğiyle çağrılmalı
        expect(mockConvert).toHaveBeenCalledTimes(1);
        const convertCall = mockConvert.mock.calls[0][0];

        expect(convertCall.html).toContain("Test Kullanıcısı");
        expect(convertCall.html).toContain("Test Düşünce Kalıbı");
        expect(convertCall.html).toContain("Test Yeniden Çerçeve");
        expect(convertCall.html).toContain("Test Potansiyel");
        expect(convertCall.fileName).toContain("Gisbel_kisisel_rapor_");

        // 4. Sharing.shareAsync'in oluşturulan dosya yoluyla çağrılmalı
        expect(mockShareAsync).toHaveBeenCalledWith(
            "/fake/path/to/report.pdf", // iOS için file:// eklenmez
            expect.objectContaining({
                mimeType: "application/pdf",
                dialogTitle: "Raporunu Paylaş",
            }),
        );
    });

    it("✅ Android'de file:// prefix'i eklemeli", async () => {
        // Platform.OS'u 'android' olarak ayarla
        (Platform as any).OS = "android";

        // Mock'u temizle ki yeni çağrıyı görebilelim
        mockShareAsync.mockClear();

        await generatePdf(mockInsight, mockNickname);

        // Sharing'in "file://" ile çağrıldığını onayla
        expect(mockShareAsync).toHaveBeenCalledWith(
            "file:///fake/path/to/report.pdf",
            expect.objectContaining({
                mimeType: "application/pdf",
                dialogTitle: "Raporunu Paylaş",
            }),
        );

        // Test sonrası eski haline getir (diğer testleri etkilememek için önemli)
        (Platform as any).OS = "ios";
    });

    it("❌ PDF oluşturma sırasında hata olursa Toast ile hata göstermeli", async () => {
        const pdfError = new Error("PDF could not be created");
        mockConvert.mockRejectedValueOnce(pdfError);

        await generatePdf(mockInsight, mockNickname);

        // Paylaşım fonksiyonunun hiç çağrılmadığından emin ol
        expect(mockShareAsync).not.toHaveBeenCalled();

        // Toast.show'un hata mesajıyla çağrıldığını kontrol et
        expect(mockToastShow).toHaveBeenCalledWith({
            type: "error",
            text1: "PDF Oluşturulamadı",
            text2: "PDF could not be created",
        });

        // Console.error çağrılmalı
        expect(mockConsoleError).toHaveBeenCalledWith(
            "PDF oluşturma hatası:",
            pdfError,
        );
    });

    it("❌ ikon indirme sırasında hata olursa hatayı yakalamalı", async () => {
        const fetchError = new Error("Network failed");
        // İlk fetch'i reject et
        (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
            fetchError,
        );

        await generatePdf(mockInsight, mockNickname);

        // Toast'un iki kez çağrıldığını ve son çağrının bir 'error' olduğunu kontrol et
        expect(mockToastShow).toHaveBeenCalledTimes(2);
        expect(mockToastShow).toHaveBeenLastCalledWith(
            expect.objectContaining({
                type: "error",
                text1: "PDF Oluşturulamadı",
            }),
        );
    });

    it("❌ fetch başarısız yanıt döndürürse (ok: false) hatayı işlemeli", async () => {
        (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
            ok: false,
            statusText: "Not Found",
        } as any);

        await generatePdf(mockInsight, mockNickname);

        // Yine, son çağrının error olduğundan emin ol
        expect(mockToastShow).toHaveBeenLastCalledWith(
            expect.objectContaining({
                type: "error",
                text1: "PDF Oluşturulamadı",
            }),
        );

        // Console.error çağrılmalı
        expect(mockConsoleError).toHaveBeenCalled();
    });

    it("❌ filePath olmadığında hata fırlatmalı", async () => {
        mockConvert.mockResolvedValueOnce({
            filePath: null,
        });

        await generatePdf(mockInsight, mockNickname);

        expect(mockShareAsync).not.toHaveBeenCalled();

        expect(mockToastShow).toHaveBeenCalledWith({
            type: "error",
            text1: "PDF Oluşturulamadı",
            text2: "PDF dosya yolu oluşturulamadı.",
        });
    });

    it("❌ sharing hatası durumunda error toast göstermeli", async () => {
        const shareError = new Error("Sharing failed");
        mockShareAsync.mockRejectedValueOnce(shareError);

        await generatePdf(mockInsight, mockNickname);

        expect(mockToastShow).toHaveBeenCalledWith({
            type: "error",
            text1: "PDF Oluşturulamadı",
            text2: "Sharing failed",
        });
    });

    it("❌ insight null ise 'Analiz verisi bulunamadı' HTML'i oluşturmalı", async () => {
        await generatePdf(null, mockNickname);

        const convertCall = mockConvert.mock.calls[0][0];
        expect(convertCall.html).toContain("Analiz verisi bulunamadı");
    });

    it("✅ ikon cache'i çalışmalı - aynı ikon ikinci kez fetch edilmemeli", async () => {
        // Önce cache'i temizle ve fetch mock'unu sıfırla
        __clearIconCache();
        (global.fetch as jest.Mock).mockClear();

        // İlk PDF oluşturma (10 ikon için 10 fetch çağrısı yapmalı)
        await generatePdf(mockInsight, mockNickname);
        expect(global.fetch).toHaveBeenCalledTimes(10);

        // fetch mock'unu tekrar sıfırla ama cache'i temizleme
        (global.fetch as jest.Mock).mockClear();

        // İkinci PDF oluşturma - ikonlar cache'den gelmeli, fetch SIFIR olmalı
        await generatePdf(mockInsight, mockNickname);

        // Fetch hiç çağrılmamalı çünkü tüm ikonlar cache'den geldi
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it("✅ tüm insight alanları HTML'de bulunmalı", async () => {
        // Yeni bir insight oluştur ki cache etkileşimi olmasın
        const freshInsight = {
            pattern: "Unique Pattern",
            reframe: "Unique Reframe",
            potential: "Unique Potential",
            first_step: "Unique First Step",
            micro_habit: "Unique Micro Habit",
            success_metric: "Unique Success Metric",
            roadblock: "Unique Roadblock",
            support_system: "Unique Support System",
        };

        await generatePdf(freshInsight, mockNickname);

        const convertCall =
            mockConvert.mock.calls[mockConvert.mock.calls.length - 1][0];
        const html = convertCall.html;

        expect(html).toContain("Unique Pattern");
        expect(html).toContain("Unique Reframe");
        expect(html).toContain("Unique Potential");
        expect(html).toContain("Unique First Step");
        expect(html).toContain("Unique Micro Habit");
        expect(html).toContain("Unique Success Metric");
        expect(html).toContain("Unique Roadblock");
        expect(html).toContain("Unique Support System");
    });

    it("✅ HTML'de brand renkleri kullanılmalı", async () => {
        await generatePdf(mockInsight, mockNickname);

        const convertCall = mockConvert.mock.calls[0][0];
        const html = convertCall.html;

        expect(html).toContain("#6366F1"); // tint
        expect(html).toContain("#6B7280"); // softText
        expect(html).toContain("#FFFFFF"); // card
    });

    it("✅ dosya adı tarih içermeli", async () => {
        const today = new Date().toISOString().split("T")[0];

        await generatePdf(mockInsight, mockNickname);

        const convertCall = mockConvert.mock.calls[0][0];
        expect(convertCall.fileName).toContain(today);
        expect(convertCall.fileName).toContain("Gisbel_kisisel_rapor_");
    });

    it("❌ Error olmayan hata durumunda varsayılan mesaj kullanmalı", async () => {
        mockConvert.mockRejectedValueOnce("String error");

        await generatePdf(mockInsight, mockNickname);

        expect(mockToastShow).toHaveBeenCalledWith({
            type: "error",
            text1: "PDF Oluşturulamadı",
            text2: "Bilinmeyen bir hata oluştu.",
        });
    });
});
