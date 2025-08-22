// hooks/useTextSessionReducer.ts - Advanced state management with useReducer
import { useCallback, useEffect, useReducer } from "react";
import { Alert, BackHandler } from "react-native";
import { supabase } from "../utils/supabase";

export interface TextMessage {
    sender: "user" | "ai";
    text: string;
    memory?: { content: string; source_layer: string }; // YENİ: AI mesajları için hafıza bilgisi
    isInsight?: boolean; // YENİ: İçgörü mesajı mı?
}

// State interface
interface TextSessionState {
    messages: TextMessage[];
    transcript: string; // YENİ: Performans için transcript string'i
    input: string;
    isTyping: boolean;
    isEnding: boolean;
    currentMood: string;
    error: string | null;
    // status'e yeni durumlar ekliyoruz: 'initializing', 'welcoming'
    status:
        | "initializing"
        | "welcoming"
        | "idle"
        | "loading"
        | "error"
        | "success";
    // YENİ: Hafıza modal için state
    isMemoryModalVisible: boolean;
    selectedMemory: TextMessage["memory"] | null;
    turnCount: number; // YENİ: Konuşma döngüsünü takip etmek için
}

// Action types
type TextSessionAction =
    | { type: "SET_INPUT"; payload: string }
    | { type: "ADD_MESSAGE"; payload: TextMessage }
    | { type: "SET_TYPING"; payload: boolean }
    | { type: "SET_ENDING"; payload: boolean }
    | { type: "SET_MOOD"; payload: string }
    | { type: "SET_ERROR"; payload: string | null }
    | { type: "SET_STATUS"; payload: TextSessionState["status"] }
    | { type: "RESET_SESSION" }
    | { type: "SEND_MESSAGE_START" }
    | {
        type: "SEND_MESSAGE_SUCCESS";
        payload: {
            aiResponse: string;
            usedMemory: { content: string; source_layer: string } | null;
        };
    }
    | { type: "SEND_MESSAGE_ERROR"; payload: string }
    | { type: "END_SESSION_START" }
    | { type: "END_SESSION_SUCCESS" }
    | { type: "END_SESSION_ERROR"; payload: string }
    // YENİ EYLEMLER EKLE
    | { type: "INITIALIZE_NEW_SESSION" }
    | {
        type: "INITIALIZE_FROM_HISTORY";
        payload: { messages: TextMessage[]; transcript: string };
    }
    | { type: "INITIALIZATION_ERROR"; payload: string }
    // YENİ: Hafıza modal için eylemler
    | { type: "OPEN_MEMORY_MODAL"; payload: TextMessage["memory"] }
    | { type: "CLOSE_MEMORY_MODAL" };

// Initial state
const initialState: TextSessionState = {
    messages: [], // Boş başlasın
    transcript: "", // Boş başlasın
    input: "",
    isTyping: false,
    isEnding: false,
    currentMood: "",
    error: null,
    status: "initializing", // Başlangıç durumu
    // YENİ: Hafıza modal için başlangıç değerleri
    isMemoryModalVisible: false,
    selectedMemory: null,
    turnCount: 0, // YENİ: Konuşma döngüsünü takip etmek için
};

// Reducer function
function textSessionReducer(
    state: TextSessionState,
    action: TextSessionAction,
): TextSessionState {
    switch (action.type) {
        case "SET_INPUT":
            return { ...state, input: action.payload };

        case "ADD_MESSAGE":
            const isUserMessage = action.payload.sender === "user";
            return {
                ...state,
                messages: [...state.messages, action.payload],
                turnCount: isUserMessage
                    ? state.turnCount + 1
                    : state.turnCount, // Sadece kullanıcı mesajında artır
                error: null,
            };

        case "SET_TYPING":
            return { ...state, isTyping: action.payload };

        case "SET_ENDING":
            return { ...state, isEnding: action.payload };

        case "SET_MOOD":
            return { ...state, currentMood: action.payload };

        case "SET_ERROR":
            return { ...state, error: action.payload };

        case "SET_STATUS":
            return { ...state, status: action.payload };

        case "RESET_SESSION":
            return {
                ...initialState,
                currentMood: state.currentMood,
                transcript: initialState.transcript, // YENİ: Transcript'i de sıfırla
                // YENİ: Hafıza modal state'ini de sıfırla
                isMemoryModalVisible: false,
                selectedMemory: null,
            };

        // YENİ CASE'LER
        case "INITIALIZE_NEW_SESSION":
            return {
                ...state,
                messages: [], // MESAJ LİSTESİ BOMBOŞ BAŞLAYACAK!
                transcript: "", // Transcript de boş başlasın
                status: "welcoming", // YENİ STATUS'U AYARLA!
            };
        case "INITIALIZE_FROM_HISTORY":
            return {
                ...state,
                messages: action.payload.messages,
                transcript: action.payload.transcript,
                status: "idle",
            };
        case "INITIALIZATION_ERROR":
            return {
                ...state,
                status: "error",
                error: action.payload,
            };

        case "SEND_MESSAGE_START":
            // --- YENİ: GÜVENLİK KİLİDİ ---
            // Eğer zaten bir mesaj gönderiliyorsa, bu eylemi görmezden gel.
            if (state.isTyping) {
                return state;
            }
            // --- KİLİT SONU ---
            return {
                ...state,
                isTyping: true,
                status: "loading",
                error: null,
            };

        case "SEND_MESSAGE_SUCCESS":
            return {
                ...state,
                isTyping: false,
                status: "idle", // Sohbet devam ediyor, idle'a dön
                input: "",
                error: null,
                // YENİ: AI mesajını memory bilgisiyle birlikte ekle
                messages: [...state.messages, {
                    sender: "ai",
                    text: action.payload.aiResponse,
                    memory: action.payload.usedMemory || undefined,
                }],
            };

        case "SEND_MESSAGE_ERROR":
            return {
                ...state,
                isTyping: false,
                status: "error",
                error: action.payload,
            };

        case "END_SESSION_START":
            return {
                ...state,
                isEnding: true,
                status: "loading",
            };

        case "END_SESSION_SUCCESS":
            return {
                ...state,
                isEnding: false,
                status: "success",
            };

        case "END_SESSION_ERROR":
            return {
                ...state,
                isEnding: false,
                status: "error",
                error: action.payload,
            };

        default:
            return state;
    }
}

interface UseTextSessionReducerProps {
    initialMood?: string;
    eventId?: string; // eventId artık opsiyonel bir prop
    onSessionEnd: () => void;
}

interface UseTextSessionReducerReturn {
    // State
    state: TextSessionState;

    // Actions
    handleInputChange: (text: string) => void;
    sendMessage: () => Promise<void>;
    endSession: () => void;
    handleBackPress: () => boolean;
    // YENİ: Hafıza modal fonksiyonları
    openMemoryModal: (memory: TextMessage["memory"]) => void;
    closeMemoryModal: () => void;
}

export function useTextSessionReducer({
    initialMood,
    eventId,
    onSessionEnd,
}: UseTextSessionReducerProps): UseTextSessionReducerReturn {
    // Use reducer for state management
    const [state, dispatch] = useReducer(textSessionReducer, initialState);

    // Ana Başlatma Mantığı
    useEffect(() => {
        const initializeSession = async () => {
            if (eventId) {
                try {
                    // TODO: SessionService yerine yeni backend function kullanılacak
                    // Şimdilik basit bir mock data
                    const sessionData = null;

                    // GÜVENLİ BLOK BAŞLANGICI
                    if (
                        sessionData &&
                        typeof sessionData.data === "object" &&
                        sessionData.data !== null &&
                        "messages" in sessionData.data &&
                        Array.isArray(sessionData.data.messages)
                    ) {
                        // Artık 'messages'ın bir dizi olduğundan eminiz.
                        const messages = sessionData.data
                            .messages as unknown as TextMessage[];
                        const transcript = messages
                            .map((m) =>
                                `${
                                    m.sender === "user"
                                        ? "Danışan"
                                        : "Terapist"
                                }: ${m.text}\n`
                            )
                            .join("");
                        dispatch({
                            type: "INITIALIZE_FROM_HISTORY",
                            payload: { messages, transcript },
                        });
                    } else {
                        // Veri beklediğimiz gibi değilse, hatayı fırlat.
                        throw new Error(
                            "Geçmiş seans verisi bulunamadı veya bozuk.",
                        );
                    }
                    // GÜVENLİ BLOK SONU
                } catch (_e) {
                    dispatch({
                        type: "INITIALIZATION_ERROR",
                        payload: "Geçmiş seans yüklenemedi.",
                    });
                }
            } else {
                // eventId yoksa, yeni seans başlat
                dispatch({ type: "INITIALIZE_NEW_SESSION" });
            }

            if (initialMood) {
                dispatch({ type: "SET_MOOD", payload: initialMood });
            }
        };

        initializeSession();
    }, [eventId, initialMood]); // Bu effect sadece bir kere çalışmalı

    // Handle input changes
    const handleInputChange = useCallback((text: string) => {
        dispatch({ type: "SET_INPUT", payload: text });
    }, []);

    // Send message logic with reducer
    const sendMessage = useCallback(async () => {
        const trimmedInput = state.input.trim();
        if (!trimmedInput || state.isTyping) return;

        dispatch({ type: "SEND_MESSAGE_START" });
        const userMessage: TextMessage = { sender: "user", text: trimmedInput };
        dispatch({ type: "ADD_MESSAGE", payload: userMessage });

        try {
            // YENİ VE TEK GÖREVİ BU!
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                throw new Error("User not authenticated");
            }

            const { data: aiReply, error } = await supabase.functions.invoke(
                "text-session",
                {
                    body: {
                        messages: [...state.messages, userMessage], // Tüm sohbet geçmişini yolla
                    },
                    headers: {
                        Authorization: `Bearer ${
                            (await supabase.auth.getSession()).data.session
                                ?.access_token
                        }`,
                    },
                },
            );

            if (error) {
                // Burada hatayı düzgün yakala
                throw new Error(error.message);
            }

            // Gelen cevabı reducer'a pasla, o da state'e bassın.
            dispatch({ type: "SEND_MESSAGE_SUCCESS", payload: aiReply });
        } catch (error) {
            console.error("[sendMessage] Critical Function Error:", error);
            // Hata yönetimi için dispatch'lerini burada yaparsın.
            dispatch({
                type: "SEND_MESSAGE_ERROR",
                payload: "Mesaj gönderilemedi",
            });
        }
    }, [state.input, state.isTyping, state.messages]);

    // End session logic with reducer
    const endSession = useCallback(async () => {
        if (state.isEnding) return;

        dispatch({ type: "END_SESSION_START" });

        try {
            if (state.messages.length >= 2) {
                // 1. Önce bu biten seans için bir 'olay' kaydı oluştur.
                // Önce kullanıcıyı almamız lazım.
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    throw new Error(
                        "Kullanıcı bulunamadı, seans sonlandırılamıyor.",
                    );
                }

                const { data: event, error: eventError } = await supabase
                    .from("events")
                    .insert({
                        user_id: user.id, // BU SATIRI EKLE
                        type: "session_end",
                        data: { messageCount: state.messages.length },
                        timestamp: new Date().toISOString(), // BU SATIRI EKLE
                    })
                    .select("id")
                    .single();

                if (eventError) throw eventError;

                // 2. Şimdi bu olayın ID'si ile birlikte hafıza işleme function'ını çağır.
                // Bu "ateşle ve unut" çağrısıdır. Kullanıcı, işlemin bitmesini beklemez.
                supabase.functions.invoke("process-session-memory", {
                    body: {
                        messages: state.messages,
                        eventId: event.id, // Olayın ID'sini yolluyoruz ki kaynak belli olsun.
                    },
                }).catch((err) => {
                    // Bu hata kritik değil, sadece UI'ı etkilemez. Konsola logla.
                    console.error("Arka plan hafıza işleme hatası:", err);
                });
            }

            dispatch({ type: "END_SESSION_SUCCESS" });
            onSessionEnd(); // Kullanıcıyı hemen ekrandan çıkar.
        } catch (error) {
            console.error("[endSession] Error:", error);
            dispatch({
                type: "END_SESSION_ERROR",
                payload: "Seans sonlandırılamadı",
            });
            onSessionEnd();
        }
    }, [state.isEnding, state.messages, onSessionEnd]);

    // Handle back press
    const handleBackPress = useCallback(() => {
        if (state.isEnding) return true;

        Alert.alert(
            "Seansı Sonlandır",
            "Seansı sonlandırmak istediğinizden emin misiniz? Sohbetiniz kaydedilecek.",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sonlandır",
                    style: "destructive",
                    onPress: endSession,
                },
            ],
        );
        return true;
    }, [state.isEnding, endSession]);

    // YENİ: Hafıza modal fonksiyonları
    const openMemoryModal = useCallback((memory: TextMessage["memory"]) => {
        dispatch({ type: "OPEN_MEMORY_MODAL", payload: memory });
    }, []);

    const closeMemoryModal = useCallback(() => {
        dispatch({ type: "CLOSE_MEMORY_MODAL" });
    }, []);

    // BackHandler effect
    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            handleBackPress,
        );
        return () => {
            subscription.remove();
        };
    }, [handleBackPress]);

    return {
        // State
        state,

        // Actions
        handleInputChange,
        sendMessage,
        endSession,
        handleBackPress,
        // YENİ: Hafıza modal fonksiyonları
        openMemoryModal,
        closeMemoryModal,
    };
}
