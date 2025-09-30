// services/__tests__/api.service.test.ts

import {
    apiCall,
    generateOnboardingInsight,
    getAllPlans,
    getLatestAnalysisReport,
    incrementFeatureUsage,
    logEvent,
    triggerBehavioralAnalysis,
    updateUserVault,
} from "../api.service";

// Diğer servislerden import edilen fonksiyonları mock'la
import { logEvent as _logEvent } from "../event.service";
import { updateUserVault as _updateUserVault } from "../vault.service";
import { getAllPlans as _getAllPlans } from "../subscription.service";
import { getErrorMessage } from "../../utils/errors";
import { supabase } from "../../utils/supabase";
import { getMockedSupabaseQuery } from "./supabase.mock";

// ---- BAĞIMLILIK MOCK'LARI ----
jest.mock("../event.service", () => ({
    logEvent: jest.fn(),
}));
jest.mock("../vault.service", () => ({
    updateUserVault: jest.fn(),
}));
jest.mock("../subscription.service", () => ({
    getAllPlans: jest.fn(),
}));
jest.mock("../../utils/errors", () => ({
    getErrorMessage: jest.fn((
        e,
    ) => (e instanceof Error ? e.message : String(e))),
}));
jest.mock("../../utils/i18n", () => ({
    language: "tr", // Testler için varsayılan dil
}));

// Mock'lanmış fonksiyonlara tip güvenli erişim
const mocked_logEvent = _logEvent as jest.Mock;
const mocked_updateUserVault = _updateUserVault as jest.Mock;
const mocked_getAllPlans = _getAllPlans as jest.Mock;
const mockedGetErrorMessage = getErrorMessage as jest.Mock;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("api.service", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeAll(() => {
        // Test sırasında konsolu kirleten console.error'ları yakala
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(
            () => {},
        );
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Supabase için temel iskeleti kur
        (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
        });
        mockedSupabase.rpc.mockResolvedValue({
            data: null,
            error: null,
            count: null,
            status: 200,
            statusText: "OK",
        });
        (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
            data: { success: true },
            error: null,
        });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            single: jest.fn(),
            maybeSingle: jest.fn(),
        });
    });

    describe("apiCall", () => {
        it("Başarılı bir promise'i { data, error: null } olarak sarmalamalı", async () => {
            const successfulPromise = Promise.resolve("başarılı veri");
            const result = await apiCall(successfulPromise);
            expect(result).toEqual({ data: "başarılı veri", error: null });
            expect(consoleErrorSpy).not.toHaveBeenCalled();
        });

        it('Başarısız bir promise\'i { data: null, error: "mesaj" } olarak sarmalamalı ve log atmalı', async () => {
            const failingPromise = Promise.reject(
                new Error("Bir şeyler patladı"),
            );
            mockedGetErrorMessage.mockReturnValue("Bir şeyler patladı");

            const result = await apiCall(failingPromise);

            expect(result).toEqual({ data: null, error: "Bir şeyler patladı" });
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "API call failed:",
                "Bir şeyler patladı",
            );
            expect(mockedGetErrorMessage).toHaveBeenCalledWith(
                new Error("Bir şeyler patladı"),
            );
        });

        it("String olmayan hataları da doğru işlemeli", async () => {
            const failingPromise = Promise.reject("String hata");
            mockedGetErrorMessage.mockReturnValue("String hata");

            const result = await apiCall(failingPromise);

            expect(result).toEqual({ data: null, error: "String hata" });
            expect(mockedGetErrorMessage).toHaveBeenCalledWith("String hata");
        });
    });

    describe("incrementFeatureUsage", () => {
        it("Kullanıcı login ise doğru parametrelerle rpc çağırmalı", async () => {
            await incrementFeatureUsage("dream_analysis");

            expect(mockedSupabase.rpc).toHaveBeenCalledWith(
                "increment_feature_usage",
                {
                    user_uuid: "test-user-id",
                    feature_name: "dream_analysis",
                    increment_val: 1,
                },
            );
        });

        it("Kullanıcı login değilse rpc çağırmamalı", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            await incrementFeatureUsage("dream_analysis");

            expect(mockedSupabase.rpc).not.toHaveBeenCalled();
        });

        it("RPC hata döndürürse console.error çağırmalı", async () => {
            (mockedSupabase.rpc as jest.Mock).mockResolvedValueOnce({
                data: null,
                error: { message: "Policy hatası", code: "500" },
                count: null,
                status: 500,
                statusText: "Internal Server Error",
            });

            await incrementFeatureUsage("dream_analysis");

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "[USAGE] dream_analysis kullanımı artırılırken hata:",
                "Policy hatası",
            );
        });

        it("Farklı feature türleriyle çalışmalı", async () => {
            await incrementFeatureUsage("voice_minutes");

            expect(mockedSupabase.rpc).toHaveBeenCalledWith(
                "increment_feature_usage",
                {
                    user_uuid: "test-user-id",
                    feature_name: "voice_minutes",
                    increment_val: 1,
                },
            );
        });
    });

    describe("Wrapper Fonksiyonlar", () => {
        it("logEvent, _logEvent'i çağırmalı ve sonucunu apiCall'a göndermeli", async () => {
            const fakeEvent = { type: "diary_entry", data: { text: "test" } };
            mocked_logEvent.mockResolvedValue("event-id-123");

            const result = await logEvent(fakeEvent as any);

            expect(mocked_logEvent).toHaveBeenCalledWith(fakeEvent);
            expect(result).toEqual({ data: "event-id-123", error: null });
        });

        it("logEvent hata durumunda apiCall'a hata geçirmeli", async () => {
            const fakeEvent = { type: "diary_entry", data: { text: "test" } };
            const error = new Error("Event log hatası");
            mocked_logEvent.mockRejectedValue(error);
            mockedGetErrorMessage.mockReturnValue("Event log hatası");

            const result = await logEvent(fakeEvent as any);

            expect(mocked_logEvent).toHaveBeenCalledWith(fakeEvent);
            expect(result).toEqual({ data: null, error: "Event log hatası" });
        });

        it("updateUserVault, _updateUserVault'u çağırmalı ve sonucunu apiCall'a göndermeli", async () => {
            const fakeVaultData = { profile: { nickname: "test" } };
            mocked_updateUserVault.mockResolvedValue(undefined);

            const result = await updateUserVault(fakeVaultData);

            expect(mocked_updateUserVault).toHaveBeenCalledWith(fakeVaultData);
            expect(result).toEqual({ data: undefined, error: null });
        });

        it("updateUserVault hata durumunda apiCall'a hata geçirmeli", async () => {
            const fakeVaultData = { profile: { nickname: "test" } };
            const error = new Error("Vault update hatası");
            mocked_updateUserVault.mockRejectedValue(error);
            mockedGetErrorMessage.mockReturnValue("Vault update hatası");

            const result = await updateUserVault(fakeVaultData);

            expect(mocked_updateUserVault).toHaveBeenCalledWith(fakeVaultData);
            expect(result).toEqual({
                data: null,
                error: "Vault update hatası",
            });
        });

        it("getAllPlans, _getAllPlans'i çağırmalı ve sonucunu apiCall'a göndermeli", async () => {
            const fakePlans = [{ id: "plan1", name: "Basic" }];
            mocked_getAllPlans.mockResolvedValue(fakePlans);

            const result = await getAllPlans();

            expect(mocked_getAllPlans).toHaveBeenCalledWith();
            expect(result).toEqual({ data: fakePlans, error: null });
        });
    });

    describe("getLatestAnalysisReport", () => {
        it("Kullanıcının son raporunu getirmeli", async () => {
            const mockReport = {
                id: "report-1",
                report_title: "Test Raporu",
                user_id: "test-user-id",
                created_at: "2024-01-01T00:00:00Z",
            };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: mockReport,
                error: null,
            });

            const result = await getLatestAnalysisReport();

            expect(result.data).toEqual(mockReport);
            expect(result.error).toBeNull();
            expect(mockedSupabase.from).toHaveBeenCalledWith(
                "analysis_reports",
            );
            expect(fromMock.eq).toHaveBeenCalledWith("user_id", "test-user-id");
            expect(fromMock.order).toHaveBeenCalledWith("created_at", {
                ascending: false,
            });
            expect(fromMock.limit).toHaveBeenCalledWith(1);
        });

        it("Kullanıcı login değilse null dönmeli", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            const result = await getLatestAnalysisReport();

            expect(result.data).toBeNull();
            expect(result.error).toBeNull();
            expect(mockedSupabase.from).not.toHaveBeenCalled();
        });

        it("Veritabanı hatası durumunda apiCall'a hata geçirmeli", async () => {
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: null,
                error: { message: "Database hatası" },
            });
            mockedGetErrorMessage.mockReturnValue("Database hatası");

            const result = await getLatestAnalysisReport();

            expect(result.data).toBeNull();
            expect(result.error).toBe("Database hatası");
        });

        it("Rapor bulunamazsa null dönmeli", async () => {
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            const result = await getLatestAnalysisReport();

            expect(result.data).toBeNull();
            expect(result.error).toBeNull();
        });
    });

    describe("triggerBehavioralAnalysis", () => {
        it("Doğru parametrelerle Supabase Function'ı invoke etmeli", async () => {
            const mockData = { analysis: "completed", patterns: [] };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockData,
                error: null,
            });

            const result = await triggerBehavioralAnalysis(7);

            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "analyze-behavioral-patterns",
                {
                    body: { periodDays: 7 },
                },
            );
            expect(result.data).toEqual(mockData);
            expect(result.error).toBeNull();
        });

        it("Function hatası durumunda apiCall'a hata geçirmeli", async () => {
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: null,
                error: { message: "Function hatası" },
            });
            mockedGetErrorMessage.mockReturnValue("Function hatası");

            const result = await triggerBehavioralAnalysis(7);

            expect(result.data).toBeNull();
            expect(result.error).toBe("Function hatası");
        });

        it("Farklı period değerleriyle çalışmalı", async () => {
            const mockData = { analysis: "completed" };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockData,
                error: null,
            });

            await triggerBehavioralAnalysis(30);

            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "analyze-behavioral-patterns",
                {
                    body: { periodDays: 30 },
                },
            );
        });
    });

    describe("generateOnboardingInsight", () => {
        it("Doğru parametrelerle Supabase Function'ı invoke etmeli", async () => {
            const mockInsight = { insight: "Sen bir testsin." };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockInsight,
                error: null,
            });

            const result = await generateOnboardingInsight(
                "cevap1",
                "cevap2",
                "cevap3",
            );

            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "generate-onboarding-insight",
                {
                    body: {
                        answer1: "cevap1",
                        answer2: "cevap2",
                        answer3: "cevap3",
                        language: "tr", // Mock'ladığımız i18n'den gelmeli
                    },
                },
            );
            expect(result.data).toEqual(mockInsight);
            expect(result.error).toBeNull();
        });

        it("String data döndürürse JSON parse etmeli", async () => {
            const mockInsight = { insight: "Sen bir testsin." };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: JSON.stringify(mockInsight),
                error: null,
            });

            const result = await generateOnboardingInsight(
                "cevap1",
                "cevap2",
                "cevap3",
            );

            expect(result.data).toEqual(mockInsight);
            expect(result.error).toBeNull();
        });

        it("Function hatası durumunda apiCall'a hata geçirmeli", async () => {
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: null,
                error: { message: "Insight hatası" },
            });
            mockedGetErrorMessage.mockReturnValue("Insight hatası");

            const result = await generateOnboardingInsight(
                "cevap1",
                "cevap2",
                "cevap3",
            );

            expect(result.data).toBeNull();
            expect(result.error).toBe("Insight hatası");
        });

        it("Farklı cevaplarla çalışmalı", async () => {
            const mockInsight = { insight: "Farklı test" };
            (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
                data: mockInsight,
                error: null,
            });

            await generateOnboardingInsight("farklı1", "farklı2", "farklı3");

            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "generate-onboarding-insight",
                {
                    body: {
                        answer1: "farklı1",
                        answer2: "farklı2",
                        answer3: "farklı3",
                        language: "tr",
                    },
                },
            );
        });
    });
});
