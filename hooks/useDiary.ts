// hooks/useDiary.ts

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import i18n from "../utils/i18n";
import type { DiaryAppEvent } from "../services/event.service";
import type { TextMessage } from "./useTextSessionReducer";
import {
    deleteEventById,
    getDiaryEventsForUser,
    getEventById,
    logEvent,
} from "../services/event.service";
import { incrementFeatureUsage } from "../services/api.service";
import { getErrorMessage } from "../utils/errors";
import type { JsonValue } from "../types/json";
import { useDiaryConversation } from "./useDiaryConversation";
import type { DiaryMode } from "../types/diary.types";
import { useAuth } from "../context/Auth";

export function useDiary() {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const [mode, setMode] = useState<DiaryMode>("list");
    const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);

    // User name'i hesapla
    const userName = user?.user_metadata?.nickname ?? "Sen";

    // Konuşma mantığını ayrı hook'tan al
    const conversation = useDiaryConversation();

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

    // --- SAVE VE DELETE MUTASYONLARI ---

    const saveDiaryMutation = useMutation({
        mutationFn: (newDiaryData: { messages: TextMessage[] }) =>
            logEvent({
                type: "diary_entry",
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
                data: { messages: conversation.messages },
                mood: null,
            } as DiaryAppEvent;

            queryClient.setQueryData<DiaryAppEvent[]>(
                ["diaryEvents"],
                (old = []) => [optimisticDiary, ...old],
            );

            setMode("list");
            conversation.resetConversation();

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
            Toast.show({
                type: "info",
                text1: i18n.t("diary.toasts.delete_success"),
            });
            queryClient.invalidateQueries({ queryKey: ["diaryEvents"] });
            setMode("list");
        },
        onError: (e: Error) =>
            Toast.show({
                type: "error",
                text1: i18n.t("diary.toasts.delete_error_title"),
                text2: getErrorMessage(e),
            }),
    });

    // --- HANDLERS ---

    const handleStartNewDiary = useCallback(() => {
        conversation.resetConversation();
        setMode("write");
    }, [conversation]);

    const handleViewDiary = useCallback((event: DiaryAppEvent) => {
        setSelectedDiaryId(event.id);
        setMode("view");
    }, []);

    const handleExitView = useCallback(() => {
        setMode("list");
        setSelectedDiaryId(null);
    }, []);

    const handleSaveDiary = useCallback(() => {
        saveDiaryMutation.mutate({
            messages: conversation.messages as unknown as TextMessage[],
        });
    }, [conversation.messages, saveDiaryMutation]);

    const handleDeleteDiary = useCallback((id: string) => {
        deleteDiaryMutation.mutate(id);
    }, [deleteDiaryMutation]);

    return {
        state: {
            mode,
            isLoadingDiaries,
            diaryEvents,
            selectedDiary,
            userName,
            // Konuşma state'ini conversation hook'tan al
            messages: conversation.messages,
            isSubmitting: conversation.isSubmitting,
            currentQuestions: conversation.currentQuestions,
            isModalVisible: conversation.isModalVisible,
            currentInput: conversation.currentInput,
            activeQuestion: conversation.activeQuestion,
            isConversationDone: conversation.isConversationDone,
        },
        handlers: {
            startNewDiary: handleStartNewDiary,
            viewDiary: handleViewDiary,
            exitView: handleExitView,
            openModal: () => conversation.setIsModalVisible(true),
            closeModal: () => {
                conversation.setIsModalVisible(false);
                conversation.setActiveQuestion(null);
            },
            changeInput: conversation.setCurrentInput,
            selectQuestion: (q: string) => {
                conversation.setActiveQuestion(q);
                conversation.setIsModalVisible(true);
            },
            submitAnswer: conversation.submitAnswer,
            saveDiary: handleSaveDiary,
            deleteDiary: handleDeleteDiary,
        },
    };
}
