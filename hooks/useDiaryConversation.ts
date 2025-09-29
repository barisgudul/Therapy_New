// hooks/useDiaryConversation.ts
import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import i18n from "../utils/i18n";
import type { Message } from "../types/diary.types";
import { getErrorMessage } from "../utils/errors";
import { supabase } from "../utils/supabase";

// ConversationResponse tipini burada tanımlayalım
interface ConversationResponse {
    aiResponse: string;
    nextQuestions?: string[];
    isFinal: boolean;
    conversationId: string;
}

export function useDiaryConversation() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
    const [currentInput, setCurrentInput] = useState("");
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [conversationState, setConversationState] = useState<
        { id: string | null; turn: number }
    >({ id: null, turn: 0 });
    const [isConversationDone, setIsConversationDone] = useState<boolean>(
        false,
    );
    const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

    // --- BEYNE BAĞLANAN MUTASYONLAR ---

    const conversationMutation = useMutation({
        mutationFn: async (
            payload: { text: string; convoId: string | null; turn: number },
        ) => {
            const { data, error } = await supabase.functions.invoke(
                "orchestrator",
                {
                    body: {
                        eventPayload: {
                            type: "diary_entry",
                            data: {
                                userInput: payload.text,
                                conversationId: payload.convoId,
                                turn: payload.turn,
                                language: i18n.language,
                            },
                        },
                    },
                },
            );

            if (error) throw error;
            return data as ConversationResponse;
        },
        onSuccess: (response: ConversationResponse) => {
            if (response.aiResponse) {
                addMessage(response.aiResponse, false);
            }
            setConversationState((prev) => ({
                id: response.conversationId,
                turn: prev.turn + 1,
            }));
            if (response.isFinal) {
                setIsConversationDone(true);
                setCurrentQuestions([]);
            } else {
                setCurrentQuestions(response.nextQuestions || []);
            }
        },
        onError: (e: Error) =>
            Toast.show({
                type: "error",
                text1: i18n.t("diary.toasts.ai_connect_error_title"),
                text2: getErrorMessage(e),
            }),
    });

    // --- KONTROL MERKEZİ (Handlers) ---

    const resetConversation = useCallback(() => {
        setMessages([]);
        setCurrentQuestions([]);
        setCurrentInput("");
        setIsModalVisible(false);
        setConversationState({ id: null, turn: 0 });
        setIsConversationDone(false);
        setActiveQuestion(null);
    }, []);

    const addMessage = useCallback((
        text: string,
        isUser: boolean,
        options?: { isQuestionContext?: boolean },
    ) => {
        setMessages((
            prev,
        ) => [...prev, { text, isUser, timestamp: Date.now(), ...options }]);
    }, []); // Boş dependency array, çünkü setMessages sabittir

    const submitAnswer = useCallback(() => {
        if (!currentInput.trim() || conversationMutation.isPending) return;

        const userInputText = currentInput.trim();
        let combinedInput: string;

        if (activeQuestion) {
            // Önce seçilen soruyu doğru aktörle (AI) ve özel işaretle kaydet, sonra cevabı ekle
            addMessage(activeQuestion, false, { isQuestionContext: true });
            addMessage(userInputText, true);
            combinedInput = `${activeQuestion}\n\n${userInputText}`;
        } else {
            addMessage(userInputText, true);
            combinedInput = userInputText;
        }

        conversationMutation.mutate({
            text: combinedInput,
            convoId: conversationState.id,
            turn: conversationState.turn,
        });

        // Temizlik
        setCurrentInput("");
        setActiveQuestion(null);
        setIsModalVisible(false);
        setCurrentQuestions([]);
    }, [
        currentInput,
        activeQuestion,
        conversationMutation,
        conversationState,
        addMessage,
    ]); // addMessage artık dependency array'de

    return {
        // State
        messages,
        currentQuestions,
        currentInput,
        isModalVisible,
        isConversationDone,
        activeQuestion,
        conversationState,
        isSubmitting: conversationMutation.isPending,

        // Handlers
        setCurrentInput,
        setIsModalVisible,
        setActiveQuestion,
        setCurrentQuestions,
        submitAnswer,
        resetConversation,
    };
}
