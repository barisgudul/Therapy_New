// hooks/useTranscripts.ts
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router/";
import { useCallback, useEffect, useReducer, useRef } from "react";
import {
    AppEvent,
    EventType,
    getEventsForLast,
    getSessionSummariesForEventIds,
    getSummaryForSessionEvent,
} from "../services/event.service";
import { supabase } from "../utils/supabase";
import { showDeleteConfirmation, showErrorDialog } from "../utils/dialog";

export type ViewMode = "menu" | "summaryList";

export interface SessionSpecificData {
    messages: { sender: string; text: string }[];
}

export interface SessionEvent extends Omit<AppEvent, "data"> {
    mood?: "happy" | "neutral" | "sad";
    data: AppEvent["data"] & SessionSpecificData;
    summary?: string | null; // YENİ: Session özeti
}

// State interface
interface TranscriptsState {
    isLoading: boolean;
    viewMode: ViewMode;
    allEvents: (AppEvent & { summary?: string | null })[];
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
    | { type: "ADD_EVENT_BACK"; payload: AppEvent }
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
                error: null,
            };

        case "ADD_EVENT_BACK": {
            const restoredEvents = [...state.allEvents, action.payload]
                .sort((a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
            return {
                ...state,
                allEvents: restoredEvents,
            };
        }

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
    const eventsRef = useRef<AppEvent[]>(initialState.allEvents);

    // Navigation ve router fonksiyonlarını da döndür
    const goBack = useCallback(() => navigation.goBack(), [navigation]);
    const navigateToSession = useCallback(
        (eventId: string, mood?: string, summary?: string | null) => {
            const params = new URLSearchParams({ eventId, mood: mood || "" });
            if (summary) params.set("summary", summary);
            router.push(`/sessions/text_session?${params.toString()}`);
        },
        [router],
    );
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

                    // 0) session_end'leri aynı gün içinde tek kayda indir (en yeni kalsın)
                    const sessionEndsDesc = [...eventsFromStorage]
                        .filter((e) => e.type === "session_end")
                        .sort((a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime()
                        );
                    const keepPerDay = new Set<string>();
                    const keepIds = new Set<string>();
                    for (const se of sessionEndsDesc) {
                        const day =
                            new Date(se.created_at).toISOString().split("T")[0];
                        if (!keepPerDay.has(day)) {
                            keepPerDay.add(day);
                            keepIds.add(se.id);
                        }
                    }
                    const dedupedEvents = eventsFromStorage.filter((e) =>
                        e.type !== "session_end" || keepIds.has(e.id)
                    );

                    // 1) session_end event'lerinin özetlerini al
                    const sessionEndEvents = dedupedEvents.filter(
                        (e) => e.type === "session_end",
                    );
                    const sessionEndIds = sessionEndEvents.map((e) => e.id);
                    const summariesById = await getSessionSummariesForEventIds(
                        sessionEndIds,
                    );

                    // 2) Hızlı arama için session_end'leri zamana göre sırala
                    const sessionEndsSorted = [...sessionEndEvents].sort(
                        (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime(),
                    );

                    // 3) Her text_session için, sonrasında gelen ilk session_end'in özetini bul
                    const withSummaries = dedupedEvents.map((e) => {
                        // Varsayılan: kendi ID'si bir session_end ise doğrudan onu kullan
                        let summary: string | null = summariesById[e.id] ||
                            null;

                        if (e.type === "text_session" && !summary) {
                            const eTime = new Date(e.created_at).getTime();
                            const nextEnd = sessionEndsSorted.find(
                                (se) =>
                                    new Date(se.created_at).getTime() >= eTime,
                            );
                            if (nextEnd) {
                                summary = summariesById[nextEnd.id] || null;
                            }
                        }

                        return { ...e, summary } as AppEvent & {
                            summary?: string | null;
                        };
                    });

                    // EK GÜÇLÜ FALLBACK: Her text_session için DB'den özeti paralel çek
                    // (ilk yüklemede "Merhaba" fallback'ini önlemek için)
                    const textSessions = withSummaries.filter(
                        (e) => e.type === "text_session",
                    );
                    const parallelFetches = textSessions.map(async (ts) => {
                        if (ts.summary && ts.summary.length > 0) {
                            return [
                                ts.id,
                                ts.summary,
                            ] as const;
                        }
                        try {
                            const fresh = await getSummaryForSessionEvent(
                                ts.id,
                                ts.created_at,
                            );
                            return [ts.id, fresh || null] as const;
                        } catch (_err) {
                            return [ts.id, null] as const;
                        }
                    });
                    const freshPairs = await Promise.all(parallelFetches);
                    const freshMap: Record<string, string | null> = {};
                    for (const [id, s] of freshPairs) freshMap[id] = s;

                    const finalEvents = withSummaries.map((e) => {
                        if (e.type === "text_session") {
                            const s = freshMap[e.id];
                            if (s && s.length > 0) {
                                return { ...e, summary: s } as AppEvent & {
                                    summary?: string | null;
                                };
                            }
                        }
                        return e;
                    });

                    dispatch({
                        type: "FETCH_SUCCESS",
                        payload: finalEvents,
                    });
                } catch (error) {
                    console.error("Events fetch error:", error);
                    dispatch({ type: "FETCH_ERROR" });
                }
            };
            loadAllEvents();
        }, []),
    );

    useEffect(() => {
        eventsRef.current = state.allEvents;
    }, [state.allEvents]);

    const handleSelectSessionType = useCallback((type: EventType) => {
        dispatch({ type: "SELECT_SESSION_TYPE", payload: type });
    }, []);

    const handleNavigateToPremium = () => {
        router.replace("/therapy/therapy_options");
    };

    const handleDeleteEvent = useCallback((eventId: string) => {
        const onConfirmDelete = async () => {
            const snapshot = eventsRef.current.find((event) =>
                event.id === eventId
            );
            if (!snapshot) return;

            // Optimistic UI: kartı anında kaldır
            dispatch({ type: "DELETE_EVENT", payload: eventId });

            try {
                const { error } = await supabase.functions.invoke(
                    "delete-session-and-memories",
                    {
                        body: { event_id: eventId },
                    },
                );

                if (error) throw error;
            } catch (error) {
                console.error(
                    "Seans silinirken sunucu hatası:",
                    error,
                );
                dispatch({
                    type: "ADD_EVENT_BACK",
                    payload: snapshot,
                });
                showErrorDialog(
                    "Seans silinirken bir sorun oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
                );
            }
        };

        showDeleteConfirmation(onConfirmDelete);
    }, []);

    return {
        state,
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
