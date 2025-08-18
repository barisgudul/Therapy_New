// hooks/useDiary.ts

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import type { DiaryAppEvent } from "../services/event.service";
import {
    deleteEventById,
    getDiaryEventsForUser,
    getEventById,
    logEvent,
} from "../services/event.service";
import {
    type ConversationResponse,
    processUserEvent,
} from "../services/orchestration.service"; // TEK BEYİN BAĞLANTISI
import { incrementFeatureUsage } from "../services/api.service";
import { getErrorMessage } from "../utils/errors";
import type { JsonValue } from "../types/json";

export interface Message {
    text: string;
    isUser: boolean;
    timestamp: number;
    isQuestionContext?: boolean;
}
export type DiaryMode = "list" | "view" | "write";

export function useDiary() {
    const queryClient = useQueryClient();

    const [mode, setMode] = useState<DiaryMode>("list");
    const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
    const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);
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

    const {
        data: diaryEvents = [],
        isLoading: isLoadingDiaries,
    } = useQuery<DiaryAppEvent[]>({
        queryKey: ["diaryEvents"],
        queryFn: getDiaryEventsForUser,
    });

    const { data: selectedDiary } = useQuery<DiaryAppEvent | null>({
        queryKey: ["diary", selectedDiaryId],
        queryFn: () => getEventById(selectedDiaryId!),
        enabled: !!selectedDiaryId,
    });

    // --- BEYNE BAĞLANAN MUTASYONLAR ---

    const conversationMutation = useMutation({
        mutationFn: (
            payload: { text: string; convoId: string | null; turn: number },
        ) => processUserEvent({
            type: "diary_entry",
            data: {
                userInput: payload.text,
                conversationId: payload.convoId,
                turn: payload.turn,
            },
        }),
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
                text1: "AI Asistan Bağlanamadı",
                text2: getErrorMessage(e),
            }),
    });

    const saveDiaryMutation = useMutation({
        mutationFn: (newDiaryData: { messages: Message[] }) =>
            logEvent({
                type: "diary_entry",
                // Message[]'ı JsonValue ile uyumlu hale getiriyoruz.
                data: {
                    messages: newDiaryData.messages as unknown as JsonValue,
                },
            }).then(() => incrementFeatureUsage("diary_write")),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ["diaryEvents"] });
            const previousDiaries = queryClient.getQueryData<DiaryAppEvent[]>([
                "diaryEvents",
            ]);

            const optimisticDiary: DiaryAppEvent = {
                id: `temp-${Date.now()}`,
                user_id: "optimistic-user",
                type: "diary_entry",
                timestamp: Date.now(),
                created_at: new Date().toISOString(),
                data: { messages },
                mood: null,
            } as DiaryAppEvent;

            queryClient.setQueryData<DiaryAppEvent[]>(
                ["diaryEvents"],
                (old = []) => [optimisticDiary, ...old],
            );

            setMode("list");
            resetWritingState();

            return { previousDiaries } as { previousDiaries?: DiaryAppEvent[] };
        },
        onError: (err, _variables, context) => {
            if (context?.previousDiaries) {
                queryClient.setQueryData(
                    ["diaryEvents"],
                    context.previousDiaries,
                );
            }
            Toast.show({
                type: "error",
                text1: "Kayıt Hatası",
                text2: getErrorMessage(err as Error),
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["diaryEvents"] });
        },
    });

    const deleteDiaryMutation = useMutation({
        mutationFn: (eventId: string) => deleteEventById(eventId),
        onSuccess: () => {
            Toast.show({ type: "info", text1: "Günlük silindi" });
            queryClient.invalidateQueries({ queryKey: ["diaryEvents"] });
            setMode("list");
        },
        onError: (e: Error) =>
            Toast.show({
                type: "error",
                text1: "Silme Hatası",
                text2: getErrorMessage(e),
            }),
    });

    // --- KONTROL MERKEZİ (Handlers) ---
    const resetWritingState = useCallback(() => {
        setMessages([]);
        setCurrentQuestions([]);
        setCurrentInput("");
        setSelectedDiaryId(null);
        setConversationState({ id: null, turn: 0 });
        setIsConversationDone(false);
        setActiveQuestion(null);
    }, []);

    const handleStartNewDiary = useCallback(() => {
        resetWritingState();
        setMode("write");
    }, [resetWritingState]);
    const addMessage = (
        text: string,
        isUser: boolean,
        options?: { isQuestionContext?: boolean },
    ) => setMessages(
        (
            prev,
        ) => [...prev, { text, isUser, timestamp: Date.now(), ...options }],
    );

    const handleSubmitAnswer = () => {
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
    };

    return {
        state: {
            mode,
            isLoadingDiaries,
            diaryEvents,
            selectedDiary,
            messages,
            isSubmitting: conversationMutation.isPending,

            currentQuestions,
            isModalVisible,
            currentInput,
            activeQuestion,
            isConversationDone,
        },
        handlers: {
            startNewDiary: handleStartNewDiary,
            viewDiary: (event: DiaryAppEvent) => {
                setSelectedDiaryId(event.id);
                setMode("view");
            },
            exitView: () => {
                setMode("list");
                setSelectedDiaryId(null);
            },
            openModal: () => setIsModalVisible(true),
            closeModal: () => {
                setIsModalVisible(false);
                setActiveQuestion(null);
            },
            changeInput: setCurrentInput,
            selectQuestion: (q: string) => {
                setActiveQuestion(q);
                setIsModalVisible(true);
            },
            submitAnswer: handleSubmitAnswer,
            saveDiary: () => {
                saveDiaryMutation.mutate({ messages });
            },
            deleteDiary: (id: string) => deleteDiaryMutation.mutate(id),
        },
    };
}
