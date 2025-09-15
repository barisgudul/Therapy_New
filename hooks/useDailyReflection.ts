// hooks/useDailyReflection.ts - RAG destekli hızlı günlük yansıma

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router/";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing } from "react-native";
import Toast from "react-native-toast-message";
import { MOOD_LEVELS } from "../constants/dailyWrite.constants";
import { useAuth } from "../context/Auth";
import {
    ApiError,
    getErrorMessage,
    isAppError,
    ValidationError,
} from "../utils/errors";
import { useFeatureAccess } from "./useSubscription";
import { useUpdateVault, useVault } from "./useVault";
import { supabase } from "../utils/supabase";

const { width, height } = Dimensions.get("window");

export function useDailyReflection() {
    const router = useRouter();
    const { user } = useAuth();

    const { data: vault } = useVault();
    const { mutate: updateVault } = useUpdateVault();

    const [moodValue, setMoodValue] = useState(3);
    const [note, setNote] = useState("");
    const [inputVisible, setInputVisible] = useState(false);
    const [feedbackVisible, setFeedbackVisible] = useState(false);

    const [aiMessage, setAiMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [decisionLogId, setDecisionLogId] = useState<string>("");
    const [satisfactionScore, setSatisfactionScore] = useState<number | null>(
        null,
    );
    const [conversationTheme, setConversationTheme] = useState<string | null>(
        null,
    );
    const [pendingSessionId, setPendingSessionId] = useState<string | null>(
        null,
    ); // <-- YENİ STATE EKLE

    const entryAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const light1 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const light2 = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    const { can_use, loading, used_count, limit_count, refresh } =
        useFeatureAccess("daily_write");

    useEffect(() => {
        if (user?.id) {
            refresh();
        }
    }, [user?.id, refresh]);

    useEffect(() => {
        const createDriftLoop = (
            animValue: Animated.ValueXY,
            toX: number,
            toY: number,
            durationGo: number,
            durationBack: number,
        ) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(animValue, {
                        toValue: { x: toX, y: toY },
                        duration: durationGo,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(animValue, {
                        toValue: { x: 0, y: 0 },
                        duration: durationBack,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        createDriftLoop(light1, -width / 3, height / 4, 15000, 18000).start();
        const timer = setTimeout(() => {
            createDriftLoop(light2, width / 3.5, -height / 3, 13000, 16000)
                .start();
        }, 4000);

        Animated.timing(entryAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
        }).start();

        return () => clearTimeout(timer);
    }, [light1, light2, entryAnim]);

    const animatePress = () => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.96,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
    };

    async function saveSession() {
        if (!note || saving) return;
        setSaving(true);
        setAiMessage("Size özel bir yansıma hazırlanıyor...");
        setFeedbackVisible(true);

        try {
            // ADIM 2: Ana işlemi (orchestrator'ı çağırmak) yap.
            const todayMood = MOOD_LEVELS[Math.round(moodValue)].label;
            const { data, error } = await supabase.functions.invoke(
                "orchestrator",
                {
                    body: {
                        eventPayload: {
                            type: "daily_reflection",
                            mood: todayMood,
                            data: { todayNote: note, todayMood },
                        },
                    },
                },
            );

            // Supabase'den gelen yapısal hatayı DÜZGÜN YÖNET
            if (error) {
                // error.message içinde JSON string'i olabilir ama garanti değil
                let parsedError;
                try {
                    // Önce message'ın string olup olmadığını kontrol et
                    if (typeof error.message === "string") {
                        parsedError = JSON.parse(error.message);
                    } else {
                        // Message string değilse, error objesinin kendisinden al
                        parsedError = {
                            error: error.message || "Bilinmeyen hata",
                            code: "UNKNOWN_ERROR",
                        };
                    }
                } catch (_parseError) {
                    // JSON parse başarısız olursa, alternatif format kullan
                    parsedError = {
                        error: typeof error.message === "string"
                            ? error.message
                            : "API hatası",
                        code: "API_ERROR",
                    };
                }

                // Artık parsedError'ın bir nesne olduğunu biliyoruz.
                if (parsedError.code === "VALIDATION_ERROR") {
                    throw new ValidationError(parsedError.error);
                } else {
                    throw new ApiError(
                        parsedError.error,
                        parsedError.code || "API_ERROR",
                    );
                }
            }

            // Başarılı durum
            const aiResponse = data?.aiResponse || "Yansımanız hazırlandı.";
            setAiMessage(aiResponse);

            if (data?.decisionLogId) {
                setDecisionLogId(data.decisionLogId);
                setSatisfactionScore(null);
            }

            if (data?.conversationTheme) {
                setConversationTheme(data.conversationTheme);
            }

            if (data?.pendingSessionId) {
                setPendingSessionId(data.pendingSessionId); // <-- GELEN PENDING SESSION ID'Yİ STATE'E KAYDET
            }
        } catch (err) { // Bu catch artık HEM supabase hatasını HEM de ağ hatasını yakalar.
            // Hata mesajını ve UI'ı güncelle.
            setAiMessage("Yansıma oluşturulamadı. Lütfen tekrar deneyin.");

            // Hata türüne göre kullanıcıya farklı mesajlar göster.
            if (err instanceof ValidationError) {
                Toast.show({
                    type: "error",
                    text1: "Eksik Bilgi",
                    text2: err.message,
                });
            } else if (err instanceof ApiError) {
                Toast.show({
                    type: "error",
                    text1: "Bir Sorun Oluştu",
                    text2: err.message,
                });
            } else {
                Toast.show({
                    type: "error",
                    text1: "Beklenmedik Hata",
                    text2: "Lütfen internet bağlantınızı kontrol edin.",
                });
            }

            // Hata sonrası modalı hemen kapatma, kullanıcının mesajı görmesine izin ver.
            setTimeout(() => setFeedbackVisible(false), 2500);

            // Hata loglama
            console.error("Günlük kaydetme hatası:", {
                message: getErrorMessage(err),
                code: isAppError(err) ? err.code : "CLIENT_UNHANDLED",
                originalError: err,
            });
        } finally {
            setSaving(false);
        }
    }

    async function handleSatisfaction(score: number) {
        if (!decisionLogId || satisfactionScore !== null) return; // Zaten skorlanmış veya log yok

        try {
            // DOĞRUSU: Bu bir RPC değil, bir Edge Function çağrısı.
            const { error } = await supabase.functions.invoke(
                "update-satisfaction-score",
                {
                    body: { log_id: decisionLogId, score: score },
                },
            );

            if (error) throw error; // Hatayı yakalamak için fırlat

            setSatisfactionScore(score);
            Toast.show({
                type: "success",
                text1: "Geri bildiriminiz için teşekkürler!",
                text2: "Yanıtımız giderek iyileşiyor.",
                position: "bottom",
            });
        } catch (error: unknown) {
            console.error("[Satisfaction] Skor güncelleme hatası:", error);
            Toast.show({
                type: "error",
                text1: "Geri Bildirim Gönderilemedi",
                text2: getErrorMessage(error), // Kullanıcıya anlamlı hata göster
                position: "bottom",
            });
        }
    }

    function closeFeedback() {
        setFeedbackVisible(false);
        const todayString = new Date().toISOString().split("T")[0];

        try {
            // Orchestrator zaten event'i ve hafızayı işledi. Sadece vault güncelle.
            if (vault) {
                const newVault = {
                    ...vault,
                    metadata: {
                        ...vault.metadata,
                        lastDailyReflectionDate: todayString,
                        dailyMessageContent: aiMessage,
                    },
                };
                updateVault(newVault);
            }

            setNote("");
            setAiMessage("");
            setDecisionLogId("");
            setSatisfactionScore(null);
            setConversationTheme(null);
            setPendingSessionId(null);

            // Kullanıcıyı index.tsx'e yönlendir
            router.push("/");
        } catch (err) {
            Toast.show({
                type: "error",
                text1: "Bağlantı Hatası",
                text2:
                    "Bir hata oldu ama yazdıklarını kaybetmedin, sonra tekrar dene.",
            });
            console.error("Vault/Log hatası:", getErrorMessage(err));
        }
    }

    const fadeIn = {
        opacity: entryAnim,
        transform: [{
            scale: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.95, 1],
            }),
        }],
    };

    return {
        state: {
            moodValue,
            note,
            inputVisible,
            feedbackVisible,
            aiMessage,
            saving,
            decisionLogId,
            satisfactionScore,
            conversationTheme,
            pendingSessionId,
            freemium: { can_use, loading, used_count, limit_count },
            light1,
            light2,
            fadeIn,
            scaleAnim,
        },
        handlers: {
            setMoodValue,
            setNote,
            setInputVisible,
            setAiMessage,
            setFeedbackVisible,
            animatePress,
            saveSession,
            closeFeedback,
            handleSatisfaction,
            router,
            onSlidingComplete: (v: number) => {
                const roundedValue = Math.round(v);
                setMoodValue(roundedValue);
                Haptics.selectionAsync();
            },
        },
    };
}
