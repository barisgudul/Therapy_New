// utils/__tests__/event-helpers.test.ts
import { extractContentFromEvent } from "../event-helpers";

describe("event-helpers", () => {
    describe("extractContentFromEvent", () => {
        it("dream_analysis event'inden dreamText çıkarmalı", () => {
            const event = {
                type: "dream_analysis",
                data: { dreamText: "Rüyamda uçuyordum" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Rüyamda uçuyordum");
        });

        it("daily_reflection event'inden todayNote çıkarmalı", () => {
            const event = {
                type: "daily_reflection",
                data: { todayNote: "Bugün güzel bir gündü" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Bugün güzel bir gündü");
        });

        it("diary_entry event'inden kullanıcı mesajlarını çıkarmalı", () => {
            const event = {
                type: "diary_entry",
                data: {
                    messages: [
                        { sender: "user", text: "İlk mesaj" },
                        { sender: "ai", text: "AI cevabı" },
                        { sender: "user", text: "İkinci mesaj" },
                    ],
                },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("İlk mesaj\n\nİkinci mesaj");
        });

        it("text_session event'inden kullanıcı mesajlarını çıkarmalı (isUser format)", () => {
            const event = {
                type: "text_session",
                data: {
                    messages: [
                        { isUser: true, text: "Kullanıcı mesajı" },
                        { isUser: false, text: "AI cevabı" },
                        { isUser: true, text: "Başka kullanıcı mesajı" },
                    ],
                },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Kullanıcı mesajı\n\nBaşka kullanıcı mesajı");
        });

        it("voice_session event'inden kullanıcı mesajlarını çıkarmalı", () => {
            const event = {
                type: "voice_session",
                data: {
                    messages: [
                        { sender: "user", text: "Sesli mesaj" },
                    ],
                },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Sesli mesaj");
        });

        it("messages array'i yoksa null dönmeli", () => {
            const event = {
                type: "diary_entry",
                data: { otherField: "value" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });

        it("messages array'i boşsa null dönmeli", () => {
            const event = {
                type: "diary_entry",
                data: { messages: [] },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });

        it("kullanıcı mesajı yoksa null dönmeli", () => {
            const event = {
                type: "diary_entry",
                data: {
                    messages: [
                        { sender: "ai", text: "Sadece AI mesajı" },
                    ],
                },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });

        it("default case için text field'ını çıkarmalı", () => {
            const event = {
                type: "unknown_type",
                data: { text: "Genel metin" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Genel metin");
        });

        it("default case için content field'ını çıkarmalı", () => {
            const event = {
                type: "unknown_type",
                data: { content: "İçerik metni" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("İçerik metni");
        });

        it("default case için userMessage field'ını çıkarmalı", () => {
            const event = {
                type: "unknown_type",
                data: { userMessage: "Kullanıcı mesajı" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBe("Kullanıcı mesajı");
        });

        it("data null ise null dönmeli", () => {
            const event = {
                type: "diary_entry",
                data: null,
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });

        it("hiçbir field bulunamazsa null dönmeli", () => {
            const event = {
                type: "unknown_type",
                data: { otherField: "value" },
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });

        it("getStringField fonksiyonu string olmayan değerleri null döndürmeli", () => {
            const event = {
                type: "dream_analysis",
                data: { dreamText: 123 }, // number, string değil
            };

            const result = extractContentFromEvent(event);

            expect(result).toBeNull();
        });
    });
});
