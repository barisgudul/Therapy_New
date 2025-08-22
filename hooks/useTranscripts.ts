// hooks/useTranscripts.ts
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router/";
import { useCallback, useReducer } from "react";
import { Alert } from "react-native";
import {
    AppEvent,
    deleteEventById,
    EventType,
    getEventsForLast,
} from "../services/event.service";

export type ViewMode = "menu" | "summaryList";

export interface SessionSpecificData {
    messages: { sender: string; text: string }[];
}

export interface SessionEvent extends Omit<AppEvent, "data"> {
    mood?: "happy" | "neutral" | "sad";
    data: AppEvent["data"] & SessionSpecificData;
}

// State interface
interface TranscriptsState {
    isLoading: boolean;
    viewMode: ViewMode;
    allEvents: AppEvent[];
    selectedSessionType: EventType | null;
    error: string | null; // YENİ: Hata durumu için
}

// Action types
type TranscriptsAction =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_VIEW_MODE"; payload: ViewMode }
    | { type: "SET_ALL_EVENTS"; payload: AppEvent[] }
    | { type: "SET_SELECTED_SESSION_TYPE"; payload: EventType | null }
    | { type: "FETCH_START" }
    | { type: "FETCH_SUCCESS"; payload: AppEvent[] }
    | { type: "FETCH_ERROR" }
    | { type: "SELECT_SESSION_TYPE"; payload: EventType }
    | { type: "DELETE_EVENT"; payload: string }
    | { type: "DELETE_EVENT_ERROR"; payload: string } // YENİ: Silme hatası için
    | { type: "RESET_STATE" };

// Initial state
const initialState: TranscriptsState = {
    isLoading: true,
    viewMode: "menu",
    allEvents: [],
    selectedSessionType: null,
    error: null, // YENİ: Hata durumu için başlangıç değeri
};

// Reducer function
function transcriptsReducer(
    state: TranscriptsState,
    action: TranscriptsAction,
): TranscriptsState {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, isLoading: action.payload };

        case "SET_VIEW_MODE":
            return { ...state, viewMode: action.payload };

        case "SET_ALL_EVENTS":
            return { ...state, allEvents: action.payload };

        case "SET_SELECTED_SESSION_TYPE":
            return { ...state, selectedSessionType: action.payload };

        case "FETCH_START":
            return {
                ...state,
                isLoading: true,
                viewMode: "menu",
            };

        case "FETCH_SUCCESS":
            return {
                ...state,
                isLoading: false,
                allEvents: action.payload,
                error: null, // Başarılı fetch'te hatayı temizle
            };

        case "FETCH_ERROR":
            return {
                ...state,
                isLoading: false,
                error: "Veriler yüklenirken bir sorun oluştu.", // Hata mesajını kaydet
            };

        case "SELECT_SESSION_TYPE":
            return {
                ...state,
                selectedSessionType: action.payload,
                viewMode: "summaryList",
            };

        case "DELETE_EVENT":
            return {
                ...state,
                allEvents: state.allEvents.filter(
                    (event) => event.id !== action.payload,
                ),
                error: null, // Başarılı silme işleminde hatayı temizle
            };

        case "DELETE_EVENT_ERROR":
            return {
                ...state,
                error: action.payload, // Hata mesajını state'e kaydet
            };

        case "RESET_STATE":
            return initialState;

        default:
            return state;
    }
}

export function useTranscripts() {
    const navigation = useNavigation();
    const router = useRouter();
    const [state, dispatch] = useReducer(transcriptsReducer, initialState);

    // Navigation ve router fonksiyonlarını da döndür
    const goBack = useCallback(() => navigation.goBack(), [navigation]);
    const navigateToSession = useCallback((eventId: string, mood?: string) => {
        router.push(
            `/sessions/text_session?eventId=${eventId}&mood=${mood || ""}`,
        );
    }, [router]);
    const setViewModeToMenu = useCallback(
        () => dispatch({ type: "SET_VIEW_MODE", payload: "menu" }),
        [],
    );

    useFocusEffect(
        useCallback(() => {
            const loadAllEvents = async () => {
                dispatch({ type: "FETCH_START" });
                try {
                    const eventsFromStorage = await getEventsForLast(365);
                    dispatch({
                        type: "FETCH_SUCCESS",
                        payload: eventsFromStorage,
                    });
                } catch (error) {
                    dispatch({ type: "FETCH_ERROR" });
                }
            };
            loadAllEvents();
        }, []),
    );

    const handleSelectSessionType = (type: EventType) => {
        dispatch({ type: "SELECT_SESSION_TYPE", payload: type });
    };

    const handleNavigateToPremium = () => {
        console.log("Navigating to Therapy Options...");
        router.replace("/therapy/therapy_options");
    };

    const handleDeleteEvent = (eventId: string) => {
        Alert.alert(
            "Seansı Sil",
            "Bu seans kaydını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
            [
                {
                    text: "Vazgeç",
                    style: "cancel",
                },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteEventById(eventId);
                            dispatch({
                                type: "DELETE_EVENT",
                                payload: eventId,
                            });
                        } catch (_error) {
                            // YENİ: Hata durumunu reducer'a bildir
                            dispatch({
                                type: "DELETE_EVENT_ERROR",
                                payload: "Seans silinirken bir sorun oluştu.",
                            });
                            Alert.alert(
                                "Hata",
                                "Seans silinirken bir sorun oluştu.",
                            );
                        }
                    },
                },
            ],
        );
    };

    return {
        state: {
            isLoading: state.isLoading,
            viewMode: state.viewMode,
            allEvents: state.allEvents,
            selectedSessionType: state.selectedSessionType,
            error: state.error, // YENİ: Hata durumunu da döndür
        },
        actions: {
            handleSelectSessionType,
            handleDeleteEvent,
            handleNavigateToPremium,
            goBack,
            navigateToSession,
            setViewModeToMenu,
        },
    };
}
