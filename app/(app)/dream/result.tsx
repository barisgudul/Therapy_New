// app/dream/result.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router/";
import { MotiView } from "moti";
import React, { useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import CrossConnectionsCard from "../../../components/dream/CrossConnectionsCard.tsx";
import DialogueCard from "../../../components/dream/DialogueCard.tsx";
import ErrorState from "../../../components/dream/ErrorState.tsx";
import InterpretationCard from "../../../components/dream/InterpretationCard.tsx";
import ResultSkeleton from "../../../components/dream/ResultSkeleton.tsx";
import SummaryCard from "../../../components/dream/SummaryCard.tsx";
import ThemesCard from "../../../components/dream/ThemesCard.tsx";
import FeedbackCard from "../../../components/dream/FeedbackCard.tsx";
import { COSMIC_COLORS } from "../../../constants/Colors";
import { getUsageStatsForUser } from "../../../services/api.service";
import { AppEvent, getEventById, type EventPayload } from "../../../services/event.service";
import { processUserMessage } from "../../../services/orchestration.service";
import type { JsonValue } from "../../../types/json";
import { supabase } from "../../../utils/supabase";

// Diyalog mesaj tipi
interface DialogueMessage {
    text: string;
    role: "user" | "model";
}

export default function DreamResultScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const queryClient = useQueryClient(); // Query Client'a erişim

    // YENİ: TanStack Query ile veri çekme - useState ve useEffect çöplüğünü temizledik!
    const {
        data: event, // Gelen verinin adını 'event' yap
        isLoading, // Yükleniyor durumu hazır
        isError, // Hata durumu hazır
        error, // Hatanın kendisi hazır
    } = useQuery({
        // 1. Sorgu anahtarı: ID'ye özel olmalı
        queryKey: ["dreamResult", id],
        // 2. Veri çekme fonksiyonu
        queryFn: async () => {
            if (!id) throw new Error("Analiz ID eksik.");

            // İki isteği aynı anda at, daha hızlı olsun.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Kullanıcı bulunamadı!");

            const [fetchedEvent, usage] = await Promise.all([
                getEventById(id),
                getUsageStatsForUser(user.id, "dream_dialogue"),
            ]);

            if (!fetchedEvent) {
                throw new Error(
                    "Analiz bulunamadı veya bu analize erişim yetkiniz yok.",
                );
            }

            // Kullanım limitini event'e ekle
            const eventWithLimit = {
                ...fetchedEvent,
                dialogueLimit: usage?.data?.limit_count || 3,
            };

            return eventWithLimit;
        },
        // 3. Ne zaman çalışsın? Sadece 'id' varsa.
        enabled: !!id,
    });

    // ŞİMDİ O SİLDİĞİN useState'lerin yerine bu gelecek:
    const [userInput, setUserInput] = useState("");

    const sendMessageMutation = useMutation({
        mutationFn: (
            payload: {
                userId: string;
                dialoguePayload: EventPayload;
                userMessage: string;
            },
        ) => processUserMessage(payload.userId, payload.dialoguePayload),

        // İYİMSER GÜNCELLEME BURADA BAŞLIYOR
        onMutate: async (newMessage) => {
            // 1. Devam eden sorguyu iptal et ki bizim değişikliğimizin üzerine yazmasın.
            await queryClient.cancelQueries({ queryKey: ["dreamResult", id] });

            // 2. Önceki verinin yedeğini al (hata olursa geri dönmek için).
            const previousEvent = queryClient.getQueryData(["dreamResult", id]);

            // 3. Cache'i yeni mesajla anında güncelle.
            queryClient.setQueryData(
                ["dreamResult", id],
                (
                    old: { data: { dialogue: DialogueMessage[] } } | undefined,
                ) => {
                    if (!old) return old;
                    const userMessage: DialogueMessage = {
                        text: newMessage.userMessage,
                        role: "user",
                    };
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            dialogue: [...old.data.dialogue, userMessage],
                        },
                    };
                },
            );

            // 4. Yedeği geri döndür.
            return { previousEvent };
        },
        onError: (_err, _newMessage, context) => {
            // Hata olursa, yedeği geri yükle.
            queryClient.setQueryData(
                ["dreamResult", id],
                context?.previousEvent,
            );
            Toast.show({
                type: "error",
                text1: "Hata",
                text2: "Mesaj gönderilemedi.",
            });
        },
        onSuccess: (aiReplyText, _variables) => {
            // Başarılı olursa, AI'ın cevabıyla cache'i tekrar güncelle.
            queryClient.setQueryData(
                ["dreamResult", id],
                (
                    old: { data: { dialogue: DialogueMessage[] } } | undefined,
                ) => {
                    if (!old) return old;
                    const aiMessage: DialogueMessage = {
                        text: aiReplyText as string,
                        role: "model",
                    };
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            dialogue: [...old.data.dialogue, aiMessage],
                        },
                    };
                },
            );
        },
        onSettled: () => {
            // Başarılı veya hatalı, her durumda sonunda veriyi sunucuyla senkronize et.
            queryClient.invalidateQueries({ queryKey: ["dreamResult", id] });
        },
    });

    // Geri bildirim RPC mutasyonu
    const feedbackMutation = useMutation({
        mutationFn: async ({ eventId, score }: { eventId: string; score: 1 | -1 }) => {
            const { error } = await supabase.rpc('submit_dream_feedback', {
                event_id_to_update: eventId,
                feedback_score: score,
            });
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            Toast.show({ type: 'success', text1: 'Geri bildiriminiz kaydedildi!' });
            queryClient.invalidateQueries({ queryKey: ["dreamResult", id] });
        },
        onError: (e: Error) => {
            Toast.show({ type: 'error', text1: 'Hata', text2: e.message });
        },
    });

    // --- YENİ FONKSİYON ---
    const handleSendMessage = async () => {
        if (!userInput.trim() || !event || sendMessageMutation.isPending) {
            return;
        }

        const dialogueLimit = event.dialogueLimit || 3;
        if (
            dialogueLimit > 0 &&
            ((event.data.dialogue as unknown) as DialogueMessage[]).filter((
                    m: DialogueMessage,
                ) => m.role === "user"
                ).length >= dialogueLimit
        ) {
            Toast.show({
                type: "info",
                text1: "Diyalog Tamamlandı",
                text2: "Bu rüya için maksimum soru hakkını kullandın",
            });
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const payloadData: Record<string, JsonValue> = {
            isFollowUp: true,
            event_id: event.id,
            dreamAnalysisResult: event.data as Record<string, JsonValue>,
            fullDialogue: [
                ...(event.data.dialogue as unknown as DialogueMessage[]),
                { text: userInput.trim(), role: "user" as const },
            ] as unknown as JsonValue,
        };
        const dialoguePayload: EventPayload = {
            type: "dream_analysis",
            data: payloadData,
        };

        // Bütün o eski kod yerine SADECE BU SATIR:
        sendMessageMutation.mutate({
            userId: user.id,
            dialoguePayload,
            userMessage: userInput.trim(),
        });
        setUserInput(""); // Input'u temizle
    };

    if (isLoading) {
        return (
            <LinearGradient
                colors={COSMIC_COLORS.background}
                style={styles.container}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name="close-outline"
                            size={30}
                            color={COSMIC_COLORS.textPrimary}
                        />
                    </TouchableOpacity>
                    <ScrollView contentContainerStyle={styles.scrollContainer}>
                        <ResultSkeleton />
                    </ScrollView>
                </SafeAreaView>
            </LinearGradient>
        );
    }

    if (isError) {
        return <ErrorState message={error?.message || "Analiz yüklenemedi."} />;
    }

    if (!event) {
        return <ErrorState message="Analiz bulunamadı." />;
    }

    const analysis = event.data.analysis as {
        title?: string;
        summary?: string;
        themes?: string[];
        interpretation?: string;
        crossConnections?: { connection: string; evidence: string }[];
    };

    return (
        <LinearGradient
            colors={COSMIC_COLORS.background}
            style={styles.container}
        >
            <SafeAreaView style={{ flex: 1 }}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <Ionicons
                        name="close-outline"
                        size={30}
                        color={COSMIC_COLORS.textPrimary}
                    />
                </TouchableOpacity>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <MotiView
                        from={{ opacity: 0, translateY: -10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                    >
                        <Text style={styles.headerDate}>
                            {new Date(event.timestamp).toLocaleDateString(
                                "tr-TR",
                                {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                },
                            )}
                        </Text>
                        <Text style={styles.headerTitle}>
                            {analysis?.title || "Başlıksız Analiz"}
                        </Text>
                    </MotiView>

                    {/* GENEL ÖZET KARTI - YENİ COMPONENT */}
                    <SummaryCard summary={analysis?.summary} />

                    {/* ANA TEMALAR KARTI - YENİ COMPONENT */}
                    <ThemesCard themes={analysis?.themes} />

                    {/* DERİNLEMESİNE YORUM KARTI - YENİ COMPONENT */}
                    <InterpretationCard
                        interpretation={analysis?.interpretation}
                    />

                    {/* 🔥🔥🔥 YENİ KARTIMIZ BURAYA MONTE EDİLİYOR 🔥🔥🔥 */}
                    <CrossConnectionsCard
                        connections={analysis?.crossConnections}
                    />

                    {/* DİYALOG KARTI - YENİ COMPONENT */}
                    <DialogueCard
                        dialogue={((event.data
                            .dialogue as unknown) as DialogueMessage[]) || []} // Doğrudan query'den gelen veri
                        userInput={userInput}
                        isReplying={sendMessageMutation.isPending} // Doğrudan mutasyonun durumu
                        onInputChange={setUserInput}
                        onSendMessage={handleSendMessage}
                        maxInteractions={event.dialogueLimit || 3}
                    />

                    {/* YENİ FEEDBACK KARTI */}
                    <FeedbackCard
                        isSubmitting={feedbackMutation.isPending}
                        feedbackSent={!!(event as AppEvent).data?.feedback}
                        onSubmitFeedback={(score) => {
                            if (event?.id) {
                                feedbackMutation.mutate({ eventId: event.id, score });
                            }
                        }}
                    />
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backButton: {
        position: "absolute",
        top: 60,
        right: 20,
        zIndex: 10,
        padding: 8,
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 20,
    },
    scrollContainer: {
        paddingTop: 100,
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    headerDate: {
        color: COSMIC_COLORS.textSecondary,
        textAlign: "center",
        marginBottom: 4,
    },
    headerTitle: {
        color: COSMIC_COLORS.textPrimary,
        fontSize: 28,
        fontWeight: "bold",
        textAlign: "center",
        marginBottom: 30,
        paddingHorizontal: 10,
    },
});
