// hooks/useTextSessionReducer.ts - Advanced state management with useReducer
import { useCallback, useEffect, useReducer } from "react";
import { Alert, BackHandler } from "react-native";
import { supabase } from "../utils/supabase";

export interface TextMessage {
    id?: string; // YENİ: Mesaj ID'si (benzersiz)
    sender: "user" | "ai";
    text: string;
    status?: "sending" | "sent" | "failed"; // YENİ: Mesaj durumu
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
    | { type: "CLOSE_MEMORY_MODAL" }
    // YENİ: Tema ile sohbet başlatma
    | { type: "INITIALIZE_WITH_THEME"; payload: string }
    // YENİ: Mesaj durumu için eylemler
    | { type: "MESSAGE_SENT_SUCCESS"; payload: { messageId: string } }
    | {
        type: "MESSAGE_SENT_FAILURE";
        payload: { messageId: string; error: string };
    };

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

        case "MESSAGE_SENT_SUCCESS":
            return {
                ...state,
                messages: state.messages.map((msg) =>
                    msg.id === action.payload.messageId
                        ? { ...msg, status: "sent" as const }
                        : msg
                ),
            };

        case "MESSAGE_SENT_FAILURE":
            return {
                ...state,
                messages: state.messages.map((msg) =>
                    msg.id === action.payload.messageId
                        ? { ...msg, status: "failed" as const }
                        : msg
                ),
                error: action.payload.error,
            };

        case "OPEN_MEMORY_MODAL":
            return {
                ...state,
                isMemoryModalVisible: true,
                selectedMemory: action.payload,
            };

        case "CLOSE_MEMORY_MODAL":
            return {
                ...state,
                isMemoryModalVisible: false,
                selectedMemory: null,
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
        case "INITIALIZE_WITH_THEME":
            // Tema ile AI'ın ilk mesajını ekle
            const aiWelcomeMessage: TextMessage = {
                sender: "ai",
                text:
                    `${action.payload} hakkında biraz daha konuşalım mı? Bu konuda ne düşünüyorsun?`,
                isInsight: false,
            };
            return {
                ...state,
                messages: [aiWelcomeMessage], // AI'ın ilk mesajıyla başla
                transcript: `AI: ${aiWelcomeMessage.text}\n`,
                status: "idle", // Direkt sohbet moduna geç
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
                input: "", // <-- INPUT'U BURADA TEMİZLE (BASİT ÇÖZÜM)
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
    pendingSessionId?: string; // Yeni parametre
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
    pendingSessionId,
    onSessionEnd,
}: UseTextSessionReducerProps): UseTextSessionReducerReturn {
    // Use reducer for state management
    const [state, dispatch] = useReducer(textSessionReducer, initialState);

    // Ana Başlatma Mantığı
    useEffect(() => {
        const initializeSession = async () => {
            dispatch({ type: "SET_STATUS", payload: "initializing" });

            if (pendingSessionId) {
                try {
                    dispatch({ type: "SET_TYPING", payload: true }); // AI yazıyor...

                    const { data: aiReply, error } = await supabase.functions
                        .invoke(
                            "orchestrator",
                            {
                                body: {
                                    eventPayload: {
                                        type: "text_session",
                                        data: {
                                            messages: [],
                                            pendingSessionId: pendingSessionId,
                                        },
                                    },
                                },
                            },
                        );

                    if (error) throw new Error(error.message);

                    dispatch({
                        type: "ADD_MESSAGE",
                        payload: { sender: "ai", text: aiReply.aiResponse },
                    });
                    dispatch({ type: "SET_STATUS", payload: "idle" });
                } catch (_e) {
                    dispatch({
                        type: "INITIALIZATION_ERROR",
                        payload: "Sohbet başlatılamadı.",
                    });
                } finally {
                    dispatch({ type: "SET_TYPING", payload: false });
                }
            } else {
                // NORMAL, SOĞUK BAŞLANGIÇ
                dispatch({ type: "INITIALIZE_NEW_SESSION" });
                dispatch({ type: "SET_STATUS", payload: "idle" });
            }

            if (initialMood) {
                dispatch({ type: "SET_MOOD", payload: initialMood });
            }
        };

        initializeSession();
    }, [pendingSessionId, eventId, initialMood]); // Dependency'leri güncelle

    // Handle input changes
    const handleInputChange = useCallback((text: string) => {
        dispatch({ type: "SET_INPUT", payload: text });
    }, []);

    // Send message logic with reducer
    const sendMessage = useCallback(async () => {
        const trimmedInput = state.input.trim();

        // Gönderecek bir şey yoksa veya AI yazıyorsa çık
        if (!trimmedInput || state.isTyping) return;

        // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---
        // 1. Gönderilecek mesajı ve ID'sini hazırla.
        const messageId = `msg_${Date.now()}_${
            Math.random().toString(36).substr(2, 9)
        }`; // Benzersiz ID oluştur
        const userMessage: TextMessage = {
            id: messageId, // <-- YENİ
            sender: "user",
            text: trimmedInput,
            status: "sending", // <-- YENİ
        };

        // 2. Mesajı state'e ekle VE INPUT'U HEMEN TEMİZLE.
        dispatch({ type: "ADD_MESSAGE", payload: userMessage });
        dispatch({ type: "SET_INPUT", payload: "" });
        dispatch({ type: "SET_TYPING", payload: true });

        // ÖNEMLİ: dispatch'ten hemen sonra state güncellenmez.
        // Bu yüzden backend'e gönderirken en güncel halini elle oluşturmalıyız.
        const updatedMessages = [...state.messages, userMessage];

        try {
            // ... auth ve user kontrolü aynı ...

            const requestBody = {
                messages: updatedMessages, // State'in eski hali yerine güncel diziyi yolla
                pendingSessionId: null, // Yeni serbest sohbetlerde temiz başlat
            };

            const { data: aiReply, error } = await supabase.functions.invoke(
                "orchestrator",
                {
                    body: {
                        eventPayload: {
                            type: "text_session",
                            data: requestBody, // Güncellenmiş body'yi kullan
                        },
                    },
                    // ... headers aynı ...
                },
            );

            if (error) {
                // Burada hatayı düzgün yakala
                throw new Error(error.message);
            }

            // 3. Başarılı olursa, AI'ın cevabını ekle ve gönderilen mesajın durumunu güncelle.
            dispatch({ type: "MESSAGE_SENT_SUCCESS", payload: { messageId } }); // <-- YENİ ACTION
            dispatch({ type: "SEND_MESSAGE_SUCCESS", payload: aiReply });
        } catch (error) {
            console.error("[sendMessage] Critical Function Error:", error);
            // 4. BAŞARISIZ OLURSA, İLGİLİ MESAJI "FAILED" OLARAK İŞARETLE.
            dispatch({
                type: "MESSAGE_SENT_FAILURE",
                payload: { messageId, error: "Mesaj gönderilemedi" },
            }); // <-- YENİ ACTION
        } finally {
            dispatch({ type: "SET_TYPING", payload: false });
        }
    }, [state.input, state.isTyping, state.messages]); // <-- DOĞRU DEPENDENCY'LER BUNLAR

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
    }, [state.isEnding, state.messages, onSessionEnd]); // <-- DOĞRU DEPENDENCY'LER

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
    }, [state.isEnding, endSession]); // <-- DOĞRU DEPENDENCY'LER

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
