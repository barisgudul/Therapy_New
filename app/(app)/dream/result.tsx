// app/dream/result.tsx
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router/";
import { MotiView } from "moti";
import React, { useRef, useLayoutEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
} from "react-native";
import Toast from "react-native-toast-message";
import CrossConnectionsCard from "../../../components/dream/CrossConnectionsCard.tsx";
import ErrorState from "../../../components/dream/ErrorState.tsx";
import InterpretationCard from "../../../components/dream/InterpretationCard.tsx";
import ResultSkeleton from "../../../components/dream/ResultSkeleton.tsx";
import SummaryCard from "../../../components/dream/SummaryCard.tsx";
import ThemesCard from "../../../components/dream/ThemesCard.tsx";
import FeedbackCard from "../../../components/dream/FeedbackCard.tsx";
import Oracle from "../../../components/dream/Oracle.tsx";
// NOTE: _Moti alias kaldırıldı; tek import kullanacağız
import { COSMIC_COLORS } from "../../../constants/Colors";
import { getLatestAnalysisReport } from "../../../services/api.service";
import { AppEvent, getEventById } from "../../../services/event.service";
import { supabase } from "../../../utils/supabase";
// SimulationCard kaldırıldı

// Diyalog kartı kaldırıldı

type OracleOutput = { f1: string; f2: string; f3: string };

export default function DreamResultScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const queryClient = useQueryClient(); // Query Client'a erişim
    const scrollRef = useRef<ScrollView | null>(null);
    const isInitialLoad = useRef(true);

    // YENİ: TanStack Query ile birleşik veri (event + latest report)
    type CombinedDreamResult = {
        event: AppEvent;
        report: import("../../../types/analysis").AnalysisReport | null;
    };

    const {
        data, // { event, report }
        isLoading,
        isError,
        error,
    } = useQuery<CombinedDreamResult>({
        queryKey: ["dreamResult", id],
        queryFn: async () => {
            if (!id) throw new Error("Analiz ID eksik.");

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Kullanıcı bulunamadı!");

            // İki isteği aynı anda at, daha hızlı olsun.
            const [fetchedEvent, latestReportResp] = await Promise.all([
                getEventById(id),
                getLatestAnalysisReport(),
            ]);

            if (!fetchedEvent) {
                throw new Error("Analiz bulunamadı veya bu analize erişim yetkiniz yok.");
            }

            return {
                event: fetchedEvent,
                report: latestReportResp?.data ?? null,
            };
        },
        enabled: !!id,
    });

    // Diyalog mekanizması kaldırıldı

    // Veri ilk kez yüklendiğinde en tepeye kaydır; sonradan değişimlerde yerinde kal
    useLayoutEffect(() => {
        if (!isLoading && data && isInitialLoad.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: 0, animated: false });
            }, 0);
            isInitialLoad.current = false;
        }
    }, [isLoading, data]);

    // Geri bildirim RPC mutasyonu (YAZMA: her zaman veritabanından gelen gerçek UUID - event.id)
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

    // Oracle sonucunu kaydetmek için RPC mutasyonu (YAZMA: her zaman veritabanından gelen gerçek UUID - event.id)
    const oracleMutation = useMutation({
        mutationFn: async ({ eventId, oracleData }: { eventId: string; oracleData: OracleOutput }) => {
            const { error } = await supabase.rpc('submit_oracle_result', {
                event_id_to_update: eventId,
                oracle_data: oracleData,
            });
            if (error) throw new Error(`Oracle sonucu kaydedilemedi: ${error.message}`);
            return { oracleData };
        },
        onSuccess: ({ oracleData }) => {
            // Cache'i anında güncelle (tek doğru anahtar: id)
            queryClient.setQueryData(
                ["dreamResult", id],
                (oldData: { event: AppEvent; report: import("../../../types/analysis").AnalysisReport | null } | undefined) => {
                    if (!oldData) return oldData;
                    return {
                        ...oldData,
                        event: {
                            ...oldData.event,
                            data: {
                                ...oldData.event.data,
                                oracle_result: oracleData,
                            },
                        },
                    };
                }
            );
            queryClient.invalidateQueries({ queryKey: ["dreamResult", id] });
        },
        onError: (e: Error) => {
            console.error("Oracle kaydetme hatası:", e);
            Toast.show({ type: 'error', text1: 'Hata', text2: 'Derin analiz sonucu kaydedilemedi.' });
        },
    });

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

    if (!data) {
        return <ErrorState message="Analiz bulunamadı." />;
    }

    const { event, report } = data;



    const analysis = event.data.analysis as {
        title?: string;
        summary?: string;
        themes?: string[];
        interpretation?: string;
        crossConnections?: { connection: string; evidence: string }[];
    };
    // Veritabanından gelen oracle sonucu (varsa)
    const oracleResult = (event.data as { oracle_result?: OracleOutput })
        ?.oracle_result as OracleOutput | undefined;

    // Veri yüklendiğinde en tepeye kaydır (ikinci kez güvenli kullanım kaldırıldı)

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
                    ref={scrollRef}
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

                    {/* 🔥🔥🔥 Geçmiş bağlantılar */}
                    <CrossConnectionsCard
                        connections={analysis?.crossConnections}
                    />

                    {/* YENİ YER: SESSİZ KÂHİN, GERİ BİLDİRİMDEN HEMEN ÖNCE */}
                    <Oracle
                        dreamTheme={analysis?.themes?.[0] || "Kontrol Kaybı"}
                        pastLink={analysis?.crossConnections?.[0] ? `${analysis.crossConnections[0].connection}: ${analysis.crossConnections[0].evidence}` : (report?.content?.reportSections.goldenThread || analysis?.summary || analysis?.interpretation || "Geçmiş bir bağ")}
                        blindSpot={report?.content?.reportSections.blindSpot || analysis?.interpretation || "zor konuşmadan kaçınma"}
                        goldenThread={report?.content?.reportSections.goldenThread || analysis?.summary || analysis?.interpretation || "tekrar eden yönelim"}
                        initialData={oracleResult}
                        onSaveResult={(oracleData) => {
                            const writeId = event?.id;
                            if (!writeId) {
                                Toast.show({ type: 'error', text1: 'Kayıt hatası', text2: 'Geçerli bir analiz ID bulunamadı.' });
                                return;
                            }
                            oracleMutation.mutate({ eventId: writeId, oracleData });
                        }}
                    />

                    {/* YENİ FEEDBACK KARTI */}
                    <FeedbackCard
                        isSubmitting={feedbackMutation.isPending}
                        feedbackSent={!!(event as AppEvent).data?.feedback}
                        onSubmitFeedback={(score) => {
                            const writeId = event?.id;
                            if (!writeId) {
                                Toast.show({ type: 'error', text1: 'Kayıt hatası', text2: 'Geçerli bir analiz ID bulunamadı.' });
                                return;
                            }
                            feedbackMutation.mutate({ eventId: writeId, score });
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
