// utils/__tests__/gcpServices.test.ts
import * as FileSystem from "expo-file-system";
import { audioToBase64, textToSpeech, transcribeAudio } from "../gcpServices";
import { supabase } from "../supabase";

// Mock FileSystem
jest.mock("expo-file-system", () => ({
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    cacheDirectory: "file:///cache/",
    EncodingType: {
        Base64: "base64",
    },
}));
jest.mock("../supabase");

describe("gcpServices", () => {
    const mockFileSystem = jest.mocked(FileSystem);
    const mockSupabase = jest.mocked(supabase);

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, "log").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        (console.log as jest.Mock).mockRestore();
        (console.error as jest.Mock).mockRestore();
    });

    describe("audioToBase64", () => {
        it("file:// URI için FileSystem.readAsStringAsync çağırmalıdır", async () => {
            mockFileSystem.readAsStringAsync.mockResolvedValue("base64content");

            const result = await audioToBase64("file:///test/audio.mp3");

            expect(mockFileSystem.readAsStringAsync).toHaveBeenCalledWith(
                "file:///test/audio.mp3",
                { encoding: FileSystem.EncodingType.Base64 },
            );
            expect(result).toBe("base64content");
        });

        it("http URI için fetch kullanmalıdır", async () => {
            global.fetch = jest.fn().mockResolvedValue({
                blob: jest.fn().mockResolvedValue(
                    new Blob(["test"], { type: "audio/mp3" }),
                ),
            });

            global.FileReader = jest.fn().mockImplementation(function () {
                this.onloadend = null;
                this.onerror = null;
                this.readAsDataURL = jest.fn(function () {
                    this.result = "data:audio/mp3;base64,testbase64";
                    if (this.onloadend) this.onloadend();
                });
            }) as any;

            const result = await audioToBase64("http://example.com/audio.mp3");

            expect(global.fetch).toHaveBeenCalledWith(
                "http://example.com/audio.mp3",
            );
            expect(result).toBe("testbase64");
        });

        it("fetch error durumunda hata fırlatmalıdır", async () => {
            global.fetch = jest.fn().mockRejectedValue(
                new Error("Fetch error"),
            );

            await expect(audioToBase64("http://example.com/audio.mp3")).rejects
                .toThrow("Fetch error");
        });

        it("FileReader error durumunda hata fırlatmalıdır", async () => {
            global.fetch = jest.fn().mockResolvedValue({
                blob: jest.fn().mockResolvedValue(
                    new Blob(["test"], { type: "audio/mp3" }),
                ),
            });

            global.FileReader = jest.fn().mockImplementation(function () {
                this.onloadend = null;
                this.onerror = null;
                this.readAsDataURL = jest.fn(function () {
                    if (this.onerror) {
                        this.onerror(new Error("FileReader error"));
                    }
                });
            }) as any;

            await expect(audioToBase64("http://example.com/audio.mp3")).rejects
                .toThrow();
        });
    });

    describe("transcribeAudio", () => {
        it("başarılı transcription döndürmelidir", async () => {
            mockFileSystem.readAsStringAsync.mockResolvedValue("base64audio");
            mockSupabase.functions.invoke.mockResolvedValue({
                data: {
                    results: [{
                        alternatives: [{
                            transcript: "Test transkript metni",
                        }],
                    }],
                },
                error: null,
            });

            const result = await transcribeAudio("file:///test/audio.mp3");

            expect(result).toBe("Test transkript metni");
            expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
                "api-gateway",
                {
                    body: {
                        type: "speech-to-text",
                        payload: { audio: { content: "base64audio" } },
                    },
                },
            );
        });

        it("API error durumunda hata fırlatmalıdır", async () => {
            mockFileSystem.readAsStringAsync.mockResolvedValue("base64audio");
            mockSupabase.functions.invoke.mockResolvedValue({
                data: null,
                error: { message: "API error" },
            });

            await expect(transcribeAudio("file:///test/audio.mp3")).rejects
                .toEqual({
                    message: "API error",
                });
        });

        it("results boş olduğunda boş string döndürmelidir", async () => {
            mockFileSystem.readAsStringAsync.mockResolvedValue("base64audio");
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { results: [] },
                error: null,
            });

            const result = await transcribeAudio("file:///test/audio.mp3");

            expect(result).toBe("");
        });
    });

    describe("textToSpeech", () => {
        it("başarılı TTS audio URI döndürmelidir", async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { audioContent: "base64audiocontent" },
                error: null,
            });
            mockFileSystem.cacheDirectory = "file:///cache/";
            mockFileSystem.writeAsStringAsync.mockResolvedValue();

            const result = await textToSpeech("Test metni");

            expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
                "api-gateway",
                {
                    body: {
                        type: "text-to-speech",
                        payload: {
                            text: "Test metni",
                            therapistId: "therapist1",
                        },
                    },
                },
            );
            expect(mockFileSystem.writeAsStringAsync).toHaveBeenCalled();
            expect(result).toContain("temp_");
            expect(result).toContain(".mp3");
        });

        it("API error durumunda hata fırlatmalıdır", async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: null,
                error: { message: "TTS API error" },
            });

            await expect(textToSpeech("Test metni")).rejects.toEqual({
                message: "TTS API error",
            });
        });

        it("audioContent null olduğunda hata fırlatmalıdır", async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { audioContent: null },
                error: null,
            });

            await expect(textToSpeech("Test metni")).rejects.toThrow(
                "Ses içeriği alınamadı",
            );
        });

        it("audioContent undefined olduğunda hata fırlatmalıdır", async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: {},
                error: null,
            });

            await expect(textToSpeech("Test metni")).rejects.toThrow(
                "Ses içeriği alınamadı",
            );
        });

        it("FileSystem.writeAsStringAsync error durumunda hata fırlatmalıdır", async () => {
            mockSupabase.functions.invoke.mockResolvedValue({
                data: { audioContent: "base64audiocontent" },
                error: null,
            });
            mockFileSystem.cacheDirectory = "file:///cache/";
            mockFileSystem.writeAsStringAsync.mockRejectedValue(
                new Error("File write error"),
            );

            await expect(textToSpeech("Test metni")).rejects.toThrow(
                "File write error",
            );
        });
    });
});
