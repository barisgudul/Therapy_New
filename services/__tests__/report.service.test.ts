// services/__tests__/report.service.test.ts

import { getLatestUserReport, markReportAsRead } from "../report.service";
import { supabase } from "../../utils/supabase";
import { getMockedSupabaseQuery } from "./supabase.mock";

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("report.service", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeAll(() => {
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
        (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
        });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn(),
        });
    });

    describe("getLatestUserReport", () => {
        it("Kullanıcının son raporunu başarıyla getirmeli", async () => {
            const mockReport = { id: "rep-1", report_title: "Aylık Rapor" };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: mockReport,
                error: null,
            });

            const result = await getLatestUserReport();

            expect(result).toEqual(mockReport);
            expect(mockedSupabase.from).toHaveBeenCalledWith("user_reports");
            expect(fromMock.eq).toHaveBeenCalledWith("user_id", "test-user-id");
            expect(fromMock.order).toHaveBeenCalledWith("generated_at", {
                ascending: false,
            });
            expect(fromMock.limit).toHaveBeenCalledWith(1);
        });

        it("Kullanıcı login değilse null dönmeli", async () => {
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            const result = await getLatestUserReport();

            expect(result).toBeNull();
            expect(mockedSupabase.from).not.toHaveBeenCalled();
        });

        it("Hiç rapor yoksa null dönmeli", async () => {
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({ data: null, error: null });

            const result = await getLatestUserReport();

            expect(result).toBeNull();
        });

        it("Veritabanı hatası durumunda hata fırlatmalı", async () => {
            const dbError = new Error("DB Select Failed");
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: null,
                error: dbError,
            });

            await expect(getLatestUserReport()).rejects.toThrow(dbError);
        });
    });

    describe("markReportAsRead", () => {
        it("Doğru rapor ID'si ile update çağırmalı", async () => {
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            // Zincir: update() -> eq()
            const mockEq = jest.fn().mockResolvedValue({ error: null });
            fromMock.update.mockReturnValue({ eq: mockEq } as any);

            await markReportAsRead("rep-123");

            expect(fromMock.update).toHaveBeenCalledWith({
                read_at: expect.any(String),
            });
            expect(mockEq).toHaveBeenCalledWith("id", "rep-123");
            expect(consoleLogSpy).toHaveBeenCalledWith(
                "✅ Rapor rep-123 okundu olarak işaretlendi.",
            );
        });

        it("Update hatası durumunda hata fırlatmamalı, sadece log atmalı", async () => {
            const updateError = { message: "Update failed" };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            const mockEq = jest.fn().mockResolvedValue({ error: updateError });
            fromMock.update.mockReturnValue({ eq: mockEq } as any);

            // Fonksiyonun hata fırlatmadığını doğrulamak için `resolves.not.toThrow()` kullanırız.
            await expect(markReportAsRead("rep-123")).resolves.not.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "⛔️ Rapor 'okundu' olarak işaretlenirken hata:",
                { message: "Update failed" },
            );
            expect(consoleLogSpy).not.toHaveBeenCalled(); // Başarı logu atılmamalı
        });
    });
});
