// hooks/__tests__/index.test.ts
import { useTextSessionReducer } from "../useTextSessionReducer";
import { useVoiceSessionReducer } from "../useVoiceSessionReducer";
import { useTranscripts } from "../useTranscripts";
import { useDiary } from "../useDiary";
import { useDailyReflection } from "../useDailyReflection";
import { useSubscription } from "../useSubscription";
import { useVault } from "../useVault";
import { useVoiceSession } from "../useVoice";
import { useProtectedRoute } from "../useProtectedRoute";
import { useGlobalLoading } from "../useGlobalLoading";
import { useColorScheme } from "../useColorScheme";
import { useThemeColor } from "../useThemeColor";

describe("hooks index exports", () => {
    it("useTextSessionReducer export edilmelidir", () => {
        expect(useTextSessionReducer).toBeDefined();
        expect(typeof useTextSessionReducer).toBe("function");
    });

    it("useVoiceSessionReducer export edilmelidir", () => {
        expect(useVoiceSessionReducer).toBeDefined();
        expect(typeof useVoiceSessionReducer).toBe("function");
    });

    it("useTranscripts export edilmelidir", () => {
        expect(useTranscripts).toBeDefined();
        expect(typeof useTranscripts).toBe("function");
    });

    it("useDiary export edilmelidir", () => {
        expect(useDiary).toBeDefined();
        expect(typeof useDiary).toBe("function");
    });

    it("useDailyReflection export edilmelidir", () => {
        expect(useDailyReflection).toBeDefined();
        expect(typeof useDailyReflection).toBe("function");
    });

    it("useSubscription export edilmelidir", () => {
        expect(useSubscription).toBeDefined();
        expect(typeof useSubscription).toBe("function");
    });

    it("useVault export edilmelidir", () => {
        expect(useVault).toBeDefined();
        expect(typeof useVault).toBe("function");
    });

    it("useVoiceSession export edilmelidir", () => {
        expect(useVoiceSession).toBeDefined();
        expect(typeof useVoiceSession).toBe("function");
    });

    it("useProtectedRoute export edilmelidir", () => {
        expect(useProtectedRoute).toBeDefined();
        expect(typeof useProtectedRoute).toBe("function");
    });

    it("useGlobalLoading export edilmelidir", () => {
        expect(useGlobalLoading).toBeDefined();
        expect(typeof useGlobalLoading).toBe("function");
    });

    it("useColorScheme export edilmelidir", () => {
        expect(useColorScheme).toBeDefined();
        expect(typeof useColorScheme).toBe("function");
    });

    it("useThemeColor export edilmelidir", () => {
        expect(useThemeColor).toBeDefined();
        expect(typeof useThemeColor).toBe("function");
    });
});
