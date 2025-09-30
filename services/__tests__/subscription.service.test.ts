// services/__tests__/subscription.service.test.ts

import {
    ALL_FEATURES,
    getAllPlans,
    getCurrentSubscription,
    getUsageStats,
    updateUserPlan,
} from "../subscription.service";
import { supabase } from "../../utils/supabase";
import { getMockedSupabaseQuery } from "./supabase.mock";

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("subscription.service", () => {
    let consoleErrorSpy: jest.SpyInstance;

    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(
            () => {},
        );
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
        });
        (mockedSupabase.rpc as jest.Mock).mockResolvedValue({
            data: [],
            error: null,
        });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [], error: null }),
        });
    });

    describe("getAllPlans", () => {
        it("Tüm planları getirmeli ve price_usd'yi price'a dönüştürmeli", async () => {
            const mockPlans = [
                { id: "1", name: "Free", price_usd: 0 },
                { id: "2", name: "+Plus", price_usd: 10 },
            ];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            (fromMock.select as jest.Mock).mockResolvedValue({
                data: mockPlans,
                error: null,
            });

            const result = await getAllPlans();

            expect(result).toEqual([
                { id: "1", name: "Free", price: 0 },
                { id: "2", name: "+Plus", price: 10 },
            ]);
            expect(mockedSupabase.from).toHaveBeenCalledWith(
                "subscription_plans",
            );
            expect(fromMock.select).toHaveBeenCalledWith("id, name, price_usd");
        });

        it("Veritabanı hatası durumunda hata fırlatmalı", async () => {
            const dbError = new Error("DB error");
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            (fromMock.select as jest.Mock).mockResolvedValue({
                data: null,
                error: dbError,
            });

            await expect(getAllPlans()).rejects.toThrow(dbError);
        });
    });

    describe("getCurrentSubscription", () => {
        it("Kullanıcı login ise abonelik bilgisini getirmeli", async () => {
            const mockSubscription = { plan_id: "2", name: "+Plus" };
            (mockedSupabase.rpc as jest.Mock).mockResolvedValue({
                data: [mockSubscription],
                error: null,
            });

            const result = await getCurrentSubscription();

            expect(result).toEqual(mockSubscription);
            expect(mockedSupabase.rpc).toHaveBeenCalledWith(
                "get_user_current_subscription",
                { user_uuid: "test-user-id" },
            );
        });

        it("Kullanıcı login değilse null dönmeli", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            const result = await getCurrentSubscription();

            expect(result).toBeNull();
            expect(mockedSupabase.rpc).not.toHaveBeenCalled();
        });

        it("RPC hatası durumunda null dönmeli ve hata loglamalı", async () => {
            const rpcError = { message: "RPC error" };
            (mockedSupabase.rpc as jest.Mock).mockResolvedValue({
                data: null,
                error: rpcError,
            });

            const result = await getCurrentSubscription();

            expect(result).toBeNull();
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "Kullanıcı aboneliği alınamadı:",
                "RPC error",
            );
        });
    });

    describe("getUsageStats", () => {
        it("Tüm feature'lar için RPC çağırmalı ve başarılı sonuçları birleştirmeli", async () => {
            const dreamAnalysisUsage = {
                used_count: 1,
                limit_count: 5,
                can_use: true,
                period: "month",
            };
            const diaryWriteUsage = {
                used_count: 10,
                limit_count: 10,
                can_use: false,
                period: "day",
            };

            // Hangi RPC çağrısının ne döndüreceğini belirliyoruz
            (mockedSupabase.rpc as jest.Mock)
                .mockImplementation(async (name, params) => {
                    if (params.feature_name === "dream_analysis") {
                        return { data: [dreamAnalysisUsage], error: null };
                    }
                    if (params.feature_name === "diary_write") {
                        return { data: [diaryWriteUsage], error: null };
                    }
                    // Diğerleri için varsayılan boş sonuç
                    return {
                        data: [{
                            used_count: 0,
                            limit_count: -1,
                            can_use: true,
                            period: "month",
                        }],
                        error: null,
                    };
                });

            const result = await getUsageStats();

            expect(mockedSupabase.rpc).toHaveBeenCalledTimes(
                ALL_FEATURES.length,
            );
            expect(result.dream_analysis).toEqual(dreamAnalysisUsage);
            expect(result.diary_write).toEqual(diaryWriteUsage);
            expect(result.text_sessions.can_use).toBe(true); // Varsayılan değer
        });

        it("Bir feature için RPC hatası olursa, o feature için fallback kullanmalı", async () => {
            (mockedSupabase.rpc as jest.Mock)
                .mockImplementation(async (name, params) => {
                    if (params.feature_name === "ai_reports") {
                        return { data: null, error: { message: "Hata!" } }; // Bu feature hata versin
                    }
                    return {
                        data: [{
                            used_count: 0,
                            limit_count: -1,
                            can_use: true,
                            period: "month",
                        }],
                        error: null,
                    };
                });

            const result = await getUsageStats();

            expect(result.ai_reports).toEqual({
                used_count: 0,
                limit_count: 0,
                can_use: false,
                period: "month",
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "ai_reports için kullanım istatistiği hatası:",
                "Hata!",
            );
            expect(result.text_sessions.can_use).toBe(true); // Diğerleri etkilenmemeli
        });

        it("Kullanıcı login değilse null dönmeli", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            const result = await getUsageStats();

            expect(result).toBeNull();
        });
    });

    describe("updateUserPlan", () => {
        it("Kullanıcı login ise doğru RPC'yi çağırmalı ve success dönmeli", async () => {
            (mockedSupabase.rpc as jest.Mock).mockResolvedValue({
                error: null,
            });

            const result = await updateUserPlan("Premium");

            expect(result).toEqual({ success: true });
            expect(mockedSupabase.rpc).toHaveBeenCalledWith(
                "assign_plan_to_user",
                {
                    p_user_id: "test-user-id",
                    p_plan_name: "Premium",
                },
            );
        });

        it("Kullanıcı login değilse hata fırlatmalı", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            await expect(updateUserPlan("Premium")).rejects.toThrow(
                "Kullanıcı bulunamadı.",
            );
        });

        it("RPC hata verirse, o hatayı yukarı fırlatmalı", async () => {
            const rpcError = new Error("Plan değiştirilemedi");
            (mockedSupabase.rpc as jest.Mock).mockResolvedValue({
                error: rpcError,
            });

            await expect(updateUserPlan("Premium")).rejects.toThrow(rpcError);
        });
    });
});
