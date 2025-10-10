// schemas/__tests__/diary.schema.test.ts
import {
    AppEventSchema,
    DiaryEventDataSchema,
    DiaryEventsArraySchema,
    MessageSchema,
} from "../diary.schema";

describe("diary.schema", () => {
    describe("MessageSchema", () => {
        it("geçerli bir mesaj objesini parse etmelidir", () => {
            const validMessage = {
                text: "Merhaba, bugün nasılsın?",
                isUser: true,
                timestamp: Date.now(),
            };

            const result = MessageSchema.parse(validMessage);
            expect(result.text).toBe(validMessage.text);
            expect(result.isUser).toBe(true);
            expect(typeof result.timestamp).toBe("number");
        });

        it("timestamp string ise number'a çevrilmelidir", () => {
            const message = {
                text: "Test",
                isUser: false,
                timestamp: "2024-01-01T00:00:00.000Z",
            };

            const result = MessageSchema.parse(message);
            expect(typeof result.timestamp).toBe("number");
            expect(result.timestamp).toBeGreaterThan(0);
        });

        it("timestamp number ise olduğu gibi kalmalıdır", () => {
            const timestamp = 1234567890;
            const message = {
                text: "Test",
                isUser: true,
                timestamp,
            };

            const result = MessageSchema.parse(message);
            expect(result.timestamp).toBe(timestamp);
        });

        it("geçersiz mesaj objesinde hata fırlatmalıdır", () => {
            const invalidMessage = {
                text: "Test",
                // isUser eksik
                timestamp: Date.now(),
            };

            expect(() => MessageSchema.parse(invalidMessage)).toThrow();
        });

        it("text boş string olabilmelidir", () => {
            const message = {
                text: "",
                isUser: true,
                timestamp: Date.now(),
            };

            const result = MessageSchema.parse(message);
            expect(result.text).toBe("");
        });
    });

    describe("DiaryEventDataSchema", () => {
        it("geçerli messages array'ini parse etmelidir", () => {
            const validData = {
                messages: [
                    { text: "Mesaj 1", isUser: true, timestamp: Date.now() },
                    { text: "Mesaj 2", isUser: false, timestamp: Date.now() },
                ],
            };

            const result = DiaryEventDataSchema.parse(validData);
            expect(result?.messages).toHaveLength(2);
        });

        it("null değerini kabul etmelidir", () => {
            const result = DiaryEventDataSchema.parse(null);
            expect(result).toBeNull();
        });

        it("boş messages array'ini parse etmelidir", () => {
            const data = { messages: [] };
            const result = DiaryEventDataSchema.parse(data);
            expect(result?.messages).toEqual([]);
        });

        it("messages içindeki her mesaj valid olmalıdır", () => {
            const invalidData = {
                messages: [
                    { text: "Valid", isUser: true, timestamp: Date.now() },
                    { text: "Invalid" }, // isUser ve timestamp eksik
                ],
            };

            expect(() => DiaryEventDataSchema.parse(invalidData)).toThrow();
        });
    });

    describe("AppEventSchema", () => {
        it("geçerli bir event objesini parse etmelidir", () => {
            const validEvent = {
                id: "123",
                user_id: "user-456",
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                mood: "happy",
                data: {
                    messages: [
                        { text: "Test", isUser: true, timestamp: Date.now() },
                    ],
                },
            };

            const result = AppEventSchema.parse(validEvent);
            expect(result.id).toBe("123");
            expect(result.user_id).toBe("user-456");
            expect(result.type).toBe("diary");
        });

        it("id number ise string'e çevrilmelidir", () => {
            const event = {
                id: 123,
                user_id: "user-456",
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                data: null,
            };

            const result = AppEventSchema.parse(event);
            expect(result.id).toBe("123");
            expect(typeof result.id).toBe("string");
        });

        it("timestamp string ise number'a çevrilmelidir", () => {
            const event = {
                id: "123",
                user_id: "user-456",
                type: "diary",
                timestamp: "2024-01-01T00:00:00.000Z",
                created_at: "2024-01-01T00:00:00.000Z",
                data: null,
            };

            const result = AppEventSchema.parse(event);
            expect(typeof result.timestamp).toBe("number");
        });

        it("mood optional olabilmelidir", () => {
            const event = {
                id: "123",
                user_id: "user-456",
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                data: null,
            };

            const result = AppEventSchema.parse(event);
            expect(result.mood).toBeUndefined();
        });

        it("mood null olabilmelidir", () => {
            const event = {
                id: "123",
                user_id: "user-456",
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                mood: null,
                data: null,
            };

            const result = AppEventSchema.parse(event);
            expect(result.mood).toBeNull();
        });

        it("data null olabilmelidir", () => {
            const event = {
                id: "123",
                user_id: "user-456",
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                data: null,
            };

            const result = AppEventSchema.parse(event);
            expect(result.data).toBeNull();
        });

        it("gerekli alanlar eksikse hata fırlatmalıdır", () => {
            const invalidEvent = {
                id: "123",
                // user_id eksik
                type: "diary",
                timestamp: Date.now(),
                created_at: "2024-01-01T00:00:00.000Z",
                data: null,
            };

            expect(() => AppEventSchema.parse(invalidEvent)).toThrow();
        });
    });

    describe("DiaryEventsArraySchema", () => {
        it("geçerli event array'ini parse etmelidir", () => {
            const events = [
                {
                    id: "1",
                    user_id: "user-123",
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: null,
                },
                {
                    id: "2",
                    user_id: "user-123",
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: { messages: [] },
                },
            ];

            const result = DiaryEventsArraySchema.parse(events);
            expect(result).toHaveLength(2);
        });

        it("boş array'i parse etmelidir", () => {
            const result = DiaryEventsArraySchema.parse([]);
            expect(result).toEqual([]);
        });

        it("array içindeki her event valid olmalıdır", () => {
            const events = [
                {
                    id: "1",
                    user_id: "user-123",
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: null,
                },
                {
                    id: "2",
                    // user_id eksik
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: null,
                },
            ];

            expect(() => DiaryEventsArraySchema.parse(events)).toThrow();
        });

        it("karışık id tiplerini handle etmelidir", () => {
            const events = [
                {
                    id: "1",
                    user_id: "user-123",
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: null,
                },
                {
                    id: 2,
                    user_id: "user-123",
                    type: "diary",
                    timestamp: Date.now(),
                    created_at: "2024-01-01T00:00:00.000Z",
                    data: null,
                },
            ];

            const result = DiaryEventsArraySchema.parse(events);
            expect(result[0].id).toBe("1");
            expect(result[1].id).toBe("2");
            expect(typeof result[0].id).toBe("string");
            expect(typeof result[1].id).toBe("string");
        });
    });
});
