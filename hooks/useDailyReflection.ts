// hooks/useDailyReflection.ts - RAG destekli hızlı günlük yansıma

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router/";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing } from "react-native";
import Toast from "react-native-toast-message";
import { MOOD_LEVELS } from "../constants/dailyWrite.constants";
import { useAuth } from "../context/Auth";
import { incrementFeatureUsage } from "../services/api.service";
import { logEvent } from "../services/event.service";
import { getErrorMessage } from "../utils/errors";
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
            await incrementFeatureUsage("daily_write");

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

            if (error) throw error;

            const aiResponse = typeof data === "string"
                ? data
                : data?.aiResponse || "";

            setAiMessage(aiResponse);
        } catch (err) {
            setAiMessage("Yansıma oluşturulamadı. Lütfen tekrar dene.");
            Toast.show({
                type: "error",
                text1: "Hata",
                text2: getErrorMessage(err),
            });
            logEvent({
                type: "daily_write_error",
                data: { msg: getErrorMessage(err) },
            });
        } finally {
            setSaving(false);
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
            router.back();
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
            router,
            onSlidingComplete: (v: number) => {
                const roundedValue = Math.round(v);
                setMoodValue(roundedValue);
                Haptics.selectionAsync();
            },
        },
    };
}
