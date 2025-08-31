// hooks/useVoiceSessionReducer.ts
import { useCallback, useEffect, useReducer } from "react";
import { Alert, BackHandler } from "react-native";
import { supabase } from "../utils/supabase";
import { useVoiceSession } from "./useVoice"; // Mevcut ses hook'unu kullanacağız

// 1. State ve Action Tiplerini Tanımla
export interface VoiceMessage {
    id: string;
    sender: "user" | "ai";
    text: string;
    memory?: { content: string; source_layer: string };
}

type VoiceSessionStatus =
    | "idle" // Boşta, kayıt bekleniyor
    | "recording" // Kullanıcı konuşuyor
    | "processing" // Ses yazıya çevriliyor
    | "thinking" // AI cevap düşünüyor
    | "speaking" // AI konuşuyor
    | "error"; // Hata oluştu

interface VoiceSessionState {
    status: VoiceSessionStatus;
    messages: VoiceMessage[];
    error: string | null;
    lastSpokenMessageId: string | null; // <-- YENİ BAYRAK
}

type VoiceSessionAction =
    | { type: "START_RECORDING" }
    | { type: "STOP_RECORDING" }
    | { type: "TRANSCRIPT_RECEIVED"; payload: string }
    | { type: "SEND_TO_AI_START" }
    | {
        type: "AI_RESPONSE_SUCCESS";
        payload: {
            aiResponse: string;
            usedMemory: VoiceMessage["memory"] | null;
        };
    }
    | { type: "AI_RESPONSE_ERROR"; payload: string }
    | { type: "SPEAKING_STATUS_CHANGED"; payload: boolean }
    | { type: "SESSION_END_REQUEST" }
    | { type: "RESET" };

// 2. Initial State ve Reducer'ı Yaz
const initialState: VoiceSessionState = {
    status: "idle",
    messages: [],
    error: null,
    lastSpokenMessageId: null, // <-- BAŞLANGIÇ DEĞERİ
};

function voiceSessionReducer(
    state: VoiceSessionState,
    action: VoiceSessionAction,
): VoiceSessionState {
    switch (action.type) {
        case "START_RECORDING":
            return { ...state, status: "recording", error: null };
        case "STOP_RECORDING":
            return { ...state, status: "processing" };
        case "TRANSCRIPT_RECEIVED":
            if (!action.payload.trim()) { // Boş transkript geldiyse
                return { ...state, status: "idle" };
            }
            const userMessage: VoiceMessage = {
                id: `user-${Date.now()}`,
                sender: "user",
                text: action.payload,
            };
            return { ...state, messages: [...state.messages, userMessage] };
        case "SEND_TO_AI_START":
            return { ...state, status: "thinking" };
        case "AI_RESPONSE_SUCCESS":
            const aiMessage: VoiceMessage = {
                id: `ai-${Date.now()}`,
                sender: "ai",
                text: action.payload.aiResponse,
                memory: action.payload.usedMemory || undefined,
            };
            return {
                ...state,
                messages: [...state.messages, aiMessage],
                status: "speaking",
                lastSpokenMessageId: aiMessage.id, // <-- MESAJ SESLENDİRİLMEK ÜZERE İŞARETLENDİ
            };
        case "AI_RESPONSE_ERROR":
            return { ...state, status: "error", error: action.payload };
        case "SPEAKING_STATUS_CHANGED":
            // Eğer konuşma bittiyse (payload = false) idle'a dön
            return { ...state, status: action.payload ? "speaking" : "idle" };
        case "RESET":
            return initialState;
        default:
            return state;
    }
}

// 3. Ana Hook Fonksiyonu
interface UseVoiceSessionReducerProps {
    onSessionEnd: () => void;
    therapistId?: string;
}

export function useVoiceSessionReducer(
    { onSessionEnd, therapistId }: UseVoiceSessionReducerProps,
) {
    const [state, dispatch] = useReducer(voiceSessionReducer, initialState);

    const { startRecording, stopRecording, speakText } = useVoiceSession({
        onTranscriptReceived: (transcript) => {
            dispatch({ type: "TRANSCRIPT_RECEIVED", payload: transcript });
        },
        onSpeechPlaybackStatusUpdate: (status) => {
            dispatch({
                type: "SPEAKING_STATUS_CHANGED",
                payload: status.isPlaying,
            });
        },
        therapistId,
    });

    // AI'a gönderme işlemi için useEffect
    useEffect(() => {
        // Ne zaman AI'a göndereceğiz? Transkript alınıp mesajlara eklendiğinde.
        // Yani, son mesaj kullanıcıdan geldiyse ve durum 'processing' ise.
        const lastMessage = state.messages[state.messages.length - 1];
        if (state.status === "processing" && lastMessage?.sender === "user") {
            const send = async () => {
                dispatch({ type: "SEND_TO_AI_START" });
                try {
                    const { data, error } = await supabase.functions.invoke(
                        "voice-session",
                        {
                            body: { messages: state.messages },
                        },
                    );

                    if (error) throw new Error(error.message);
                    if (!data.aiResponse) {
                        throw new Error("AI'dan boş cevap geldi.");
                    }

                    dispatch({ type: "AI_RESPONSE_SUCCESS", payload: data });
                } catch (err) {
                    dispatch({
                        type: "AI_RESPONSE_ERROR",
                        payload: (err as Error).message,
                    });
                }
            };
            send();
        }
    }, [state.messages, state.status]);

    // AI cevabı geldiğinde onu seslendir
    useEffect(() => {
        const lastMessage = state.messages[state.messages.length - 1];

        // ZIRH: Sadece durumu 'speaking' olan VE
        // son mesaj AI'dan gelen VE
        // bu mesaj DAHA ÖNCE seslendirilmemiş olan durumlarda çalış.
        if (
            state.status === "speaking" &&
            lastMessage?.sender === "ai" &&
            lastMessage.id !== state.lastSpokenMessageId // <-- EN KRİTİK KONTROL BU!
        ) {
            speakText(lastMessage.text, therapistId);
            // Bu useEffect'in yeniden tetiklenmesi için state'i güncellemeye GEREK YOK.
            // `lastSpokenMessageId` zaten reducer'da set edildi.
        }
    }, [
        state.status,
        state.messages,
        state.lastSpokenMessageId, // <-- dependency array'e ekle
        speakText,
        therapistId,
    ]);

    // Dışarıya verilecek aksiyonlar
    const handleStartRecording = useCallback(() => {
        startRecording();
        dispatch({ type: "START_RECORDING" });
    }, [startRecording]);

    const handleStopRecording = useCallback(() => {
        stopRecording();
        dispatch({ type: "STOP_RECORDING" });
    }, [stopRecording]);

    // Session sonlandırma işlemi
    const endSession = useCallback(async () => {
        if (state.messages.length > 1) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const sessionEndPayload = {
                        type: "voice_session",
                        data: {
                            isSessionEnd: true,
                            therapistId,
                            messages: state.messages.map((msg) => ({
                                id: msg.id,
                                sender: msg.sender,
                                text: msg.text,
                                memory: msg.memory,
                            })),
                            transcript: state.messages.map((m) =>
                                `${m.sender}: ${m.text}`
                            ).join("\n"),
                        },
                    };

                    await supabase.functions.invoke("orchestrator", {
                        body: { eventPayload: sessionEndPayload },
                    });
                }
            } catch (err) {
                console.error("Session end error:", err);
            }
        }
        onSessionEnd();
    }, [state.messages, therapistId, onSessionEnd]);

    // Back press handler
    const handleBackPress = useCallback(() => {
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
    }, [endSession]);

    // Hardware back button handler
    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            handleBackPress,
        );
        return () => subscription.remove();
    }, [handleBackPress]);

    // Son olarak, hook'tan state ve aksiyonları dön
    return {
        state,
        actions: {
            startRecording: handleStartRecording,
            stopRecording: handleStopRecording,
            endSession,
            handleBackPress,
        },
    };
}
