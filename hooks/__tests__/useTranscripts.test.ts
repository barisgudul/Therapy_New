// hooks/__tests__/useTranscripts.test.ts
import { act, renderHook, waitFor } from "@testing-library/react-native";
import * as DialogService from "../../utils/dialog";
import * as EventService from "../../services/event.service";
import { supabase } from "../../utils/supabase";
import { useTranscripts } from "../useTranscripts";

//----- LOKAL MOCK'LAR -----
jest.mock("../../utils/supabase", () => ({
    supabase: { functions: { invoke: jest.fn() } },
}));
jest.mock("../../services/event.service");
jest.mock("../../utils/dialog"); // YENİ: Dialog modülünü mock'la

//----- NAVİGASYON MOCK'LARI -----
jest.mock("@react-navigation/native", () => ({
    useNavigation: () => ({ goBack: jest.fn() }),
    useFocusEffect: (callback: () => void) => {
        const React = jest.requireActual("react");
        React.useEffect(callback);
    },
}));
jest.mock("expo-router", () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

//----- TEST KURULUMU -----
const mockedSupabaseInvoke = supabase.functions.invoke as jest.Mock;
const mockedGetEventsForLast = EventService.getEventsForLast as jest.Mock;
const mockedGetSessionSummariesForEventIds = EventService
    .getSessionSummariesForEventIds as jest.Mock;
const mockedShowDeleteConfirmation = DialogService
    .showDeleteConfirmation as jest.Mock;
const mockedShowErrorDialog = DialogService.showErrorDialog as jest.Mock;

describe("useTranscripts Hook - handleDeleteEvent", () => {
    const mockInitialEvents = [
        {
            id: "event-1",
            type: "session_end",
            created_at: "2025-09-26T10:00:00Z",
        },
        {
            id: "event-2",
            type: "session_end",
            created_at: "2025-09-25T10:00:00Z",
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetEventsForLast.mockResolvedValue(mockInitialEvents);
        mockedGetSessionSummariesForEventIds.mockResolvedValue({});
    });

    // Test 1: Başarılı Senaryo
    test("should optimistically remove an event and succeed if the API call is successful", async () => {
        // Arrange
        mockedSupabaseInvoke.mockResolvedValue({ error: null });
        mockedShowDeleteConfirmation.mockImplementation((onConfirm) =>
            onConfirm()
        );

        const { result } = renderHook(() => useTranscripts());
        await waitFor(() => expect(result.current.state.isLoading).toBe(false));

        // Act
        await act(() => {
            result.current.actions.handleDeleteEvent("event-1");
        });

        // Assert
        expect(result.current.state.allEvents).toHaveLength(1);
        expect(mockedSupabaseInvoke).toHaveBeenCalledWith(
            "delete-session-and-memories",
            {
                body: { event_id: "event-1" },
            },
        );
        expect(mockedShowErrorDialog).not.toHaveBeenCalled();
    });

    // Test 2: Hata Senaryosu (Rollback)
    test("should rollback the state if the API call fails", async () => {
        // Arrange
        mockedSupabaseInvoke.mockRejectedValue(new Error("API Error"));
        mockedShowDeleteConfirmation.mockImplementation((onConfirm) =>
            onConfirm()
        );

        const { result } = renderHook(() => useTranscripts());
        await waitFor(() => expect(result.current.state.isLoading).toBe(false));

        // Act
        await act(() => {
            result.current.actions.handleDeleteEvent("event-1");
        });

        // Assert
        await waitFor(() => {
            expect(result.current.state.allEvents).toHaveLength(2);
        });
        expect(mockedShowErrorDialog).toHaveBeenCalled();
    });

    // Test 3: Kenar Durum (Var olmayan ID)
    test("should do nothing if trying to delete a non-existent event", async () => {
        // Arrange
        mockedShowDeleteConfirmation.mockImplementation((onConfirm) =>
            onConfirm()
        );

        const { result } = renderHook(() => useTranscripts());
        await waitFor(() => expect(result.current.state.isLoading).toBe(false));

        // Act
        await act(() => {
            result.current.actions.handleDeleteEvent("non-existent-id");
        });

        // Assert
        expect(mockedSupabaseInvoke).not.toHaveBeenCalled();
        expect(result.current.state.allEvents).toHaveLength(2);
    });
});
