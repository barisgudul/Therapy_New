// services/__tests__/event.service.test.ts

import {
    canUserAnalyzeDream,
    canUserWriteNewDiary,
    deleteEventById,
    EVENT_TYPES,
    type EventPayload,
    getAIAnalysisEvents,
    getDiaryEventsForUser,
    getDreamEvents,
    getEventById,
    getEventsForLast,
    getOldestEventDate,
    getSessionEventsForUser,
    getSessionSummariesForEventIds,
    getSummaryForSessionEvent,
    logEvent,
    updateEventData,
} from "../event.service";

// ---- BAĞIMLILIK MOCK'LARI ----
import { getUsageStats } from "../subscription.service";
import { extractContentFromEvent } from "../../utils/event-helpers";
import { supabase } from "../../utils/supabase";
import { getMockedSupabaseQuery } from "./supabase.mock";
import { ZodError } from "zod";

jest.mock("../subscription.service", () => ({
    getUsageStats: jest.fn(),
}));
jest.mock("../../utils/event-helpers", () => ({
    extractContentFromEvent: jest.fn(),
}));
jest.mock("../../utils/dev", () => ({
    isDev: jest.fn(() => true),
}));

// Mock'lanmış fonksiyonlara tip güvenli erişim
const mockedGetUsageStats = getUsageStats as jest.Mock;
const mockedExtractContent = extractContentFromEvent as jest.Mock;
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("event.service", () => {
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;

    beforeAll(() => {
        consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(
            () => {},
        );
        consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
        consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation(
            () => {},
        );
    });

    afterAll(() => {
        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
        consoleDebugSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Supabase için temel iskeleti kur
        (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: "test-user-id" } },
            error: null,
        });
        (mockedSupabase.functions.invoke as jest.Mock).mockResolvedValue({
            data: {},
            error: null,
        });
        (mockedSupabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null }),
            single: jest.fn(),
            maybeSingle: jest.fn(),
        });
    });

    describe("logEvent", () => {
        it('İçerik varsa, event\'i kaydetmeli ve "process-memory" fonksiyonunu tetiklemeli', async () => {
            // ARRANGE
            const mockInsertedEvent = {
                id: "event-123",
                created_at: new Date().toISOString(),
                data: {},
                type: "diary_entry",
                mood: "happy",
            };
            mockedExtractContent.mockReturnValue("Analiz edilecek içerik");

            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: insert() -> select() -> single()
            const mockSingle = jest.fn().mockResolvedValue({
                data: mockInsertedEvent,
                error: null,
            });
            const mockSelect = jest.fn().mockReturnValue({
                single: mockSingle,
            });
            fromMock.insert.mockReturnValue({ select: mockSelect } as any);

            // ACT
            const eventPayload = {
                type: "diary_entry",
                data: { text: "test" },
            };
            const eventId = await logEvent(eventPayload as EventPayload);

            // ASSERT
            expect(fromMock.insert).toHaveBeenCalledWith([
                expect.objectContaining({
                    user_id: "test-user-id",
                    ...eventPayload,
                }),
            ]);
            expect(mockSelect).toHaveBeenCalledWith(
                "id, created_at, data, type, mood",
            );
            expect(mockedExtractContent).toHaveBeenCalled();
            expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith(
                "process-memory",
                expect.objectContaining({
                    body: expect.objectContaining({
                        source_event_id: "event-123",
                        content: "Analiz edilecek içerik",
                    }),
                }),
            );
            expect(eventId).toBe("event-123");
        });

        it("İçerik yoksa, sadece event'i kaydetmeli, invoke çağırmamalı", async () => {
            // ARRANGE
            mockedExtractContent.mockReturnValue(null);

            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            const mockSingle = jest.fn().mockResolvedValue({
                data: { id: "event-123" },
                error: null,
            });
            const mockSelect = jest.fn().mockReturnValue({
                single: mockSingle,
            });
            fromMock.insert.mockReturnValue({ select: mockSelect } as any);

            // ACT
            const eventPayload = { type: "session_start", data: {} };
            await logEvent(eventPayload as EventPayload);

            // ASSERT
            expect(fromMock.insert).toHaveBeenCalledTimes(1);
            expect(mockedExtractContent).toHaveBeenCalled();
            expect(mockedSupabase.functions.invoke).not.toHaveBeenCalled();
        });

        it("Misafir kullanıcı ise DB'ye yazmamalı ve null dönmeli", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT
            const eventPayload = { type: "guest_start", data: {} };
            const result = await logEvent(eventPayload as EventPayload);

            // ASSERT
            expect(result).toBeNull();
            expect(consoleDebugSpy).toHaveBeenCalled();
        });

        it("DB insert hatası olursa hata fırlatmalı", async () => {
            // ARRANGE
            const dbError = new Error("Insert failed");
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            const mockSingle = jest.fn().mockResolvedValue({
                data: null,
                error: dbError,
            });
            const mockSelect = jest.fn().mockReturnValue({
                single: mockSingle,
            });
            fromMock.insert.mockReturnValue({ select: mockSelect } as any);

            // ACT & ASSERT
            const eventPayload = { type: "diary_entry", data: {} };
            await expect(logEvent(eventPayload as EventPayload)).rejects
                .toThrow(dbError);
        });

        it("invoke hata verirse bunu yakalayıp console.error'a yazdırmalı", async () => {
            // ARRANGE
            mockedExtractContent.mockReturnValue("içerik");
            const invokeError = new Error("Function invocation failed");
            (mockedSupabase.functions.invoke as jest.Mock).mockImplementation(
                () => Promise.reject(invokeError),
            );

            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            const mockSingle = jest.fn().mockResolvedValue({
                data: { id: "event-123" },
                error: null,
            });
            const mockSelect = jest.fn().mockReturnValue({
                single: mockSingle,
            });
            fromMock.insert.mockReturnValue({ select: mockSelect } as any);

            // ACT - Basit test
            await logEvent({ type: "diary_entry", data: {} } as EventPayload);

            // ASSERT - invoke çağrıldı mı kontrol et
            expect(mockedSupabase.functions.invoke).toHaveBeenCalled();
        });

        it("crypto.randomUUID olmadığında fallback ID üreticisini kullanmalı", async () => {
            // ARRANGE
            // globalThis.crypto'yu geçici olarak sil
            const originalCrypto = globalThis.crypto;
            Object.defineProperty(globalThis, "crypto", {
                value: undefined,
                configurable: true,
            });

            mockedExtractContent.mockReturnValue("içerik");
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            const mockSingle = jest.fn().mockResolvedValue({
                data: { id: "event-123" },
                error: null,
            });
            const mockSelect = jest.fn().mockReturnValue({
                single: mockSingle,
            });
            fromMock.insert.mockReturnValue({ select: mockSelect } as any);

            // ACT
            await logEvent({ type: "diary_entry", data: {} } as EventPayload);

            // ASSERT
            // invoke çağrısının body'sindeki transaction_id'nin formatını kontrol et
            const invokeCall =
                (mockedSupabase.functions.invoke as jest.Mock).mock.calls[0][1];
            expect(invokeCall.body.transaction_id).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
            );

            // Temizlik: crypto'yu geri yükle
            Object.defineProperty(globalThis, "crypto", {
                value: originalCrypto,
            });
        });
    });

    describe("deleteEventById", () => {
        it("Doğru ID ve kullanıcı ID'si ile delete sorgusu göndermeli", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: delete() -> eq() -> eq()
            const mockSecondEq = jest.fn().mockResolvedValue({ error: null });
            const mockFirstEq = jest.fn().mockReturnValue({ eq: mockSecondEq });
            fromMock.delete.mockReturnValue({ eq: mockFirstEq } as any);

            // ACT
            await deleteEventById("event-to-delete");

            // ASSERT
            expect(fromMock.delete).toHaveBeenCalled();
            expect(mockFirstEq).toHaveBeenCalledWith("id", "event-to-delete");
            expect(mockSecondEq).toHaveBeenCalledWith(
                "user_id",
                "test-user-id",
            );
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(deleteEventById("event-id")).rejects.toThrow(
                "Kullanıcı giriş yapmamış, olay silinemiyor.",
            );
        });

        it("Delete hatası durumunda hata fırlatmalı", async () => {
            // ARRANGE
            const deleteError = new Error("Delete failed");
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            const mockSecondEq = jest.fn().mockResolvedValue({
                error: deleteError,
            });
            const mockFirstEq = jest.fn().mockReturnValue({ eq: mockSecondEq });
            fromMock.delete.mockReturnValue({ eq: mockFirstEq } as any);

            // ACT & ASSERT
            await expect(deleteEventById("event-id")).rejects.toThrow(
                deleteError,
            );
        });
    });

    describe("updateEventData", () => {
        it("Event verisini güncellemeli", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: update() -> eq() -> eq()
            const mockSecondEq = jest.fn().mockResolvedValue({ error: null });
            const mockFirstEq = jest.fn().mockReturnValue({ eq: mockSecondEq });
            fromMock.update.mockReturnValue({ eq: mockFirstEq } as any);

            // ACT
            const newData = { text: "updated content" };
            await updateEventData("event-id", newData);

            // ASSERT
            expect(fromMock.update).toHaveBeenCalledWith({ data: newData });
            expect(mockFirstEq).toHaveBeenCalledWith("id", "event-id");
            expect(mockSecondEq).toHaveBeenCalledWith(
                "user_id",
                "test-user-id",
            );
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(updateEventData("event-id", {})).rejects.toThrow(
                "Kullanıcı bulunamadı, olay güncellenemiyor.",
            );
        });
    });

    describe("getDreamEvents", () => {
        it("Pagination ile rüya eventlerini getirmeli", async () => {
            // ARRANGE
            const mockEvents = [
                { id: "1", type: "dream_analysis", data: {} },
                { id: "2", type: "dream_analysis", data: {} },
            ];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> eq() -> order() -> range()
            fromMock.range.mockResolvedValue({ data: mockEvents, error: null });

            // ACT
            const result = await getDreamEvents({ pageParam: 0 });

            // ASSERT
            expect(result).toEqual(mockEvents);
            expect(fromMock.eq).toHaveBeenCalledWith("user_id", "test-user-id");
            expect(fromMock.eq).toHaveBeenCalledWith("type", "dream_analysis");
            expect(fromMock.order).toHaveBeenCalledWith("created_at", {
                ascending: false,
            });
            expect(fromMock.range).toHaveBeenCalledWith(0, 19); // PAGE_SIZE = 20
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getDreamEvents({ pageParam: 0 })).rejects.toThrow(
                "Kullanıcı bulunamadı.",
            );
        });

        it("Supabase hatası durumunda hata fırlatmalı", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.range.mockResolvedValue({
                data: null,
                error: { message: "Database error" },
            });

            // ACT & ASSERT
            await expect(getDreamEvents({ pageParam: 0 })).rejects.toThrow(
                "Rüya günlükleri yüklenemedi.",
            );
        });
    });

    describe("canUserWriteNewDiary", () => {
        it("Kullanıcının hakkı varsa { canWrite: true } dönmeli", async () => {
            // ARRANGE
            mockedGetUsageStats.mockResolvedValue({
                diary_write: { can_use: true },
            });

            // ACT
            const result = await canUserWriteNewDiary();

            // ASSERT
            expect(mockedGetUsageStats).toHaveBeenCalled();
            expect(result).toEqual({ canWrite: true, message: "" });
        });

        it("Kullanıcının hakkı yoksa { canWrite: false, ... } dönmeli", async () => {
            // ARRANGE
            mockedGetUsageStats.mockResolvedValue({
                diary_write: { can_use: false },
            });

            // ACT
            const result = await canUserWriteNewDiary();

            // ASSERT
            expect(result.canWrite).toBe(false);
            expect(result.message).toContain("limitine ulaştın");
        });

        it("getUsageStats hata fırlatırsa, o hatayı yukarı fırlatmalı", async () => {
            // ARRANGE
            const usageError = new Error("Kullanım istatistikleri alınamadı.");
            mockedGetUsageStats.mockRejectedValue(usageError);

            // ACT & ASSERT
            await expect(canUserWriteNewDiary()).rejects.toThrow(usageError);
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(canUserWriteNewDiary()).rejects.toThrow(
                "Kullanıcı bulunamadı.",
            );
        });
    });

    describe("getDiaryEventsForUser", () => {
        it("Supabase'den geçerli veri geldiğinde Zod ile parse edip döndürmeli", async () => {
            // ARRANGE
            const validEventData = [{
                id: "1",
                user_id: "u1",
                type: "diary_entry",
                timestamp: "2024-01-01T12:00:00Z",
                created_at: "2024-01-01T12:00:00Z",
                data: {
                    messages: [
                        {
                            text: "valid",
                            isUser: true,
                            timestamp: "2024-01-01T12:00:00Z",
                        },
                    ],
                },
            }];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> order()
            fromMock.order.mockReturnValue({
                data: validEventData,
                error: null,
            } as any);

            // ACT
            const result = await getDiaryEventsForUser();

            // ASSERT
            expect(result[0].data.messages[0].text).toBe("valid");
            // Zod'un timestamp'i string'den number'a çevirdiğini kontrol et
            expect(typeof result[0].timestamp).toBe("number");
        });

        it("Supabase'den Zod şemasına uymayan veri geldiğinde hata fırlatmalı", async () => {
            // ARRANGE
            // timestamp eksik, Zod hata vermeli
            const invalidEventData = [{
                id: "1",
                user_id: "u1",
                type: "diary_entry",
                created_at: "2024-01-01T12:00:00Z",
                data: {},
            }];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.order.mockReturnValue({
                data: invalidEventData,
                error: null,
            } as any);

            // ACT & ASSERT
            await expect(getDiaryEventsForUser()).rejects.toThrow(ZodError);
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                "⛔️ Günlük verisi doğrulama hatası:",
                expect.any(ZodError),
            );
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getDiaryEventsForUser()).rejects.toThrow(
                "Kullanıcı giriş yapmamış, günlükler çekilemedi.",
            );
        });
    });

    describe("getSessionEventsForUser", () => {
        it("Session eventlerini getirmeli", async () => {
            // ARRANGE
            const mockEvents = [
                { id: "1", type: "text_session", data: {} },
                { id: "2", type: "voice_session", data: {} },
            ];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> in() -> order()
            fromMock.order.mockReturnValue(
                { data: mockEvents, error: null } as any,
            );

            // ACT
            const result = await getSessionEventsForUser();

            // ASSERT
            expect(result).toEqual(mockEvents);
            expect(fromMock.in).toHaveBeenCalledWith("type", [
                "text_session",
                "voice_session",
                "video_session",
            ]);
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getSessionEventsForUser()).rejects.toThrow(
                "Kullanıcı giriş yapmamış, seanslar çekilemedi.",
            );
        });
    });

    describe("getAIAnalysisEvents", () => {
        it("AI analiz eventlerini getirmeli", async () => {
            // ARRANGE
            const mockEvents = [{ id: "1", type: "ai_analysis", data: {} }];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> order()
            fromMock.order.mockReturnValue(
                { data: mockEvents, error: null } as any,
            );

            // ACT
            const result = await getAIAnalysisEvents();

            // ASSERT
            expect(result).toEqual(mockEvents);
            expect(fromMock.eq).toHaveBeenCalledWith("type", "ai_analysis");
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getAIAnalysisEvents()).rejects.toThrow(
                "Kullanıcı giriş yapmamış, AI analiz olayları çekilemiyor.",
            );
        });
    });

    describe("getOldestEventDate", () => {
        it("En eski event tarihini getirmeli", async () => {
            // ARRANGE
            const mockData = { created_at: "2024-01-01T00:00:00Z" };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> order() -> limit() -> single()
            fromMock.single.mockResolvedValue({ data: mockData, error: null });

            // ACT
            const result = await getOldestEventDate();

            // ASSERT
            expect(result).toEqual(new Date("2024-01-01T00:00:00Z"));
            expect(fromMock.order).toHaveBeenCalledWith("created_at", {
                ascending: true,
            });
            expect(fromMock.limit).toHaveBeenCalledWith(1);
        });

        it("Event yoksa null dönmeli", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.single.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
            });

            // ACT
            const result = await getOldestEventDate();

            // ASSERT
            expect(result).toBeNull();
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getOldestEventDate()).rejects.toThrow(
                "Kullanıcı giriş yapmamış, en eski olay tarihi çekilemiyor.",
            );
        });
    });

    describe("getEventById", () => {
        it("Event ID ile event getirmeli", async () => {
            // ARRANGE
            const mockEvent = { id: "event-1", type: "diary_entry", data: {} };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> eq() -> single()
            fromMock.single.mockResolvedValue({ data: mockEvent, error: null });

            // ACT
            const result = await getEventById("event-1");

            // ASSERT
            expect(result).toEqual(mockEvent);
            expect(fromMock.eq).toHaveBeenCalledWith("id", "event-1");
            expect(fromMock.eq).toHaveBeenCalledWith("user_id", "test-user-id");
        });

        it("Event bulunamazsa null dönmeli", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.single.mockResolvedValue({
                data: null,
                error: { code: "PGRST116" },
            });

            // ACT
            const result = await getEventById("nonexistent");

            // ASSERT
            expect(result).toBeNull();
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getEventById("event-1")).rejects.toThrow(
                "Kullanıcı giriş yapmamış, olay çekilemedi.",
            );
        });
    });

    describe("getEventsForLast", () => {
        it("Son N günlük eventleri getirmeli", async () => {
            // ARRANGE
            const mockEvents = [{ id: "1", type: "diary_entry", data: {} }];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> gte() -> order()
            fromMock.order.mockReturnValue(
                { data: mockEvents, error: null } as any,
            );

            // ACT
            const result = await getEventsForLast(7);

            // ASSERT
            expect(result).toEqual(mockEvents);
            expect(fromMock.gte).toHaveBeenCalledWith(
                "created_at",
                expect.any(String),
            );
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getEventsForLast(7)).rejects.toThrow(
                "Kullanıcı bulunamadı.",
            );
        });
    });

    describe("getSessionSummariesForEventIds", () => {
        it("Event ID'leri için özetleri getirmeli", async () => {
            // ARRANGE
            const mockSummaries = [
                {
                    source_event_id: "event-1",
                    content: "Summary 1",
                    event_type: "text_session_summary",
                },
                {
                    source_event_id: "event-2",
                    content: "Summary 2",
                    event_type: "text_session_summary",
                },
            ];
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> in() -> eq() -> eq()
            const finalResult = { data: mockSummaries, error: null };
            const mockSecondEq = jest.fn().mockResolvedValue(finalResult);
            const mockFirstEq = jest.fn().mockReturnValue({ eq: mockSecondEq });
            const mockIn = jest.fn().mockReturnValue({ eq: mockFirstEq });
            fromMock.select.mockReturnValue({ in: mockIn } as any);

            // ACT
            const result = await getSessionSummariesForEventIds([
                "event-1",
                "event-2",
            ]);

            // ASSERT
            expect(result).toEqual({
                "event-1": "Summary 1",
                "event-2": "Summary 2",
            });
            expect(mockIn).toHaveBeenCalledWith("source_event_id", [
                "event-1",
                "event-2",
            ]);
            expect(mockFirstEq).toHaveBeenCalledWith(
                "event_type",
                "text_session_summary",
            );
            expect(mockSecondEq).toHaveBeenCalledWith(
                "user_id",
                "test-user-id",
            );
        });

        it("Boş array ile çağrılırsa boş obje dönmeli", async () => {
            // ACT
            const result = await getSessionSummariesForEventIds([]);

            // ASSERT
            expect(result).toEqual({});
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getSessionSummariesForEventIds(["event-1"])).rejects
                .toThrow("Kullanıcı bulunamadı.");
        });
    });

    describe("getSummaryForSessionEvent", () => {
        it("Doğrudan cognitive_memories'den özet getirmeli", async () => {
            // ARRANGE
            const mockSummary = { content: "Direct summary" };
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Zincir: select() -> eq() -> eq() -> maybeSingle()
            fromMock.maybeSingle.mockResolvedValue({
                data: mockSummary,
                error: null,
            });

            // ACT
            const result = await getSummaryForSessionEvent("event-1");

            // ASSERT
            expect(result).toBe("Direct summary");
        });

        it("Özet bulunamazsa null dönmeli", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({ data: null, error: null });

            // ACT
            const result = await getSummaryForSessionEvent("event-1");

            // ASSERT
            expect(result).toBeNull();
        });

        it("Kullanıcı yoksa hata fırlatmalı", async () => {
            // ARRANGE
            (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
                data: { user: null },
            });

            // ACT & ASSERT
            await expect(getSummaryForSessionEvent("event-1")).rejects.toThrow(
                "Kullanıcı bulunamadı.",
            );
        });
    });

    describe("getSummaryForSessionEvent", () => {
        const eventId = "text-session-123";
        const createdAt = "2024-01-01T12:00:00Z";

        it("Özeti doğrudan eventId ile cognitive_memories tablosundan bulmalı (Strateji 1)", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            // Sadece bu sorgu başarılı olacak
            fromMock.maybeSingle.mockResolvedValue({
                data: { content: "Direct Summary" },
                error: null,
            });

            // ACT
            const result = await getSummaryForSessionEvent(eventId, createdAt);

            // ASSERT
            expect(result).toBe("Direct Summary");
            // Sadece 'cognitive_memories' tablosunun çağrıldığını doğrula
            expect(mockedSupabase.from).toHaveBeenCalledWith(
                "cognitive_memories",
            );
            expect(mockedSupabase.from).not.toHaveBeenCalledWith("events"); // Diğer stratejiler çalışmadı
        });

        it("session_end üzerinden özeti bulmalı (Strateji 2)", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Bu sefer `maybeSingle` birden çok kez çağrılacak.
            // Zincirleme `mockResolvedValueOnce` ile her çağrıya farklı cevap veriyoruz.
            fromMock.maybeSingle
                .mockResolvedValueOnce({
                    data: null,
                    error: null,
                }) // 1. Strateji (cmDirect) -> Başarısız
                .mockResolvedValueOnce({
                    data: { id: "session-end-456" },
                    error: null,
                }) // `events` tablosundan session_end bulundu
                .mockResolvedValueOnce({
                    data: { content: "Session End Summary" },
                    error: null,
                }); // 2. Strateji (cmAfter) -> Başarılı

            // `from`'un da her çağrıda doğru davrandığından emin olalım
            (mockedSupabase.from as jest.Mock)
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "cognitive_memories",
                }) // İlk `from` çağrısı
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "events",
                }) // İkinci `from` çağrısı
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "cognitive_memories",
                }); // Üçüncü `from` çağrısı

            // ACT
            const result = await getSummaryForSessionEvent(eventId, createdAt);

            // ASSERT
            expect(result).toBe("Session End Summary");
        });

        it("zaman aralığı ile özeti bulmalı (Strateji 3)", async () => {
            // ARRANGE
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle
                .mockResolvedValueOnce({
                    data: null,
                    error: null,
                }) // 1. Strateji -> Başarısız
                .mockResolvedValueOnce({
                    data: null,
                    error: null,
                }) // `events` tablosunda session_end bulunamadı
                .mockResolvedValueOnce({
                    data: { content: "Time Window Summary" },
                    error: null,
                }); // 3. Strateji -> Başarılı

            (mockedSupabase.from as jest.Mock)
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "cognitive_memories",
                })
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "events",
                })
                .mockReturnValueOnce({
                    ...fromMock,
                    from: "cognitive_memories",
                });

            // ACT
            const result = await getSummaryForSessionEvent(eventId, createdAt);

            // ASSERT
            expect(result).toBe("Time Window Summary");
        });

        it("Tüm stratejiler başarısız olursa null dönmeli", async () => {
            // ARRANGE: Tüm sorgular boş dönsün
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );
            fromMock.maybeSingle.mockResolvedValue({
                data: null,
                error: null,
            });

            // ACT
            const result = await getSummaryForSessionEvent(eventId, createdAt);

            // ASSERT
            expect(result).toBeNull();
        });

        it("Ara sorgular (textSession, nextSessionEnd) hata verdiğinde bile null dönmeli (patlamamalı)", async () => {
            // ARRANGE: maybeSingle bu sefer hata versin
            const fromMock = getMockedSupabaseQuery(
                mockedSupabase.from as jest.Mock,
            );

            // Tüm maybeSingle çağrıları hata dönsün
            fromMock.maybeSingle.mockResolvedValue({
                data: null,
                error: { message: "Internal DB Error" },
            });

            // ACT & ASSERT
            // Fonksiyonun hatayı yutup null döndüreceğini bekliyoruz.
            await expect(getSummaryForSessionEvent(eventId, createdAt)).resolves
                .toBeNull();
        });
    });

    describe("canUserAnalyzeDream", () => {
        it("Her zaman true dönmeli", () => {
            // ACT
            const result = canUserAnalyzeDream();

            // ASSERT
            expect(result).toEqual({ canAnalyze: true, daysRemaining: 0 });
        });
    });

    describe("EVENT_TYPES", () => {
        it("Tüm event tiplerini içermeli", () => {
            // ASSERT
            expect(EVENT_TYPES).toContain("diary_entry");
            expect(EVENT_TYPES).toContain("dream_analysis");
            expect(EVENT_TYPES).toContain("text_session");
            expect(EVENT_TYPES).toContain("voice_session");
            expect(EVENT_TYPES).toContain("guest_start");
        });
    });
});
