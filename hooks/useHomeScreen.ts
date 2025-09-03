// hooks/useHomeScreen.ts
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router/";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useVault } from "./useVault";
import { supabase } from "../utils/supabase";

export type ActiveModal = null | "dailyMessage" | "report";

const todayISO = () => new Date().toISOString().split("T")[0];

export const useHomeScreen = () => {
    const router = useRouter();
    const { data: vault, isLoading: isVaultLoading } = useVault();
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const queryClient = useQueryClient();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Bildirim yönetimi
    useEffect(() => {
        if (!isVaultLoading && vault) {
            (async () => {
                await Notifications.cancelAllScheduledNotificationsAsync();
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Günaydın!",
                        body: "Bugün kendine iyi bakmayı unutma.",
                        data: { route: "/daily_reflection" },
                    },
                    trigger: {
                        hour: 8,
                        minute: 0,
                        repeats: true,
                    } as Notifications.NotificationTriggerInput,
                });
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Bugün nasılsın?",
                        body: "1 cümleyle kendini ifade etmek ister misin?",
                        data: { route: "/daily_reflection" },
                    },
                    trigger: {
                        hour: 20,
                        minute: 0,
                        repeats: true,
                    } as Notifications.NotificationTriggerInput,
                });
            })();
        }
    }, [isVaultLoading, vault]);

    const animateBg = (open: boolean) =>
        Animated.timing(scaleAnim, {
            toValue: open ? 0.9 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();

    const handleModalClose = () => {
        setActiveModal(null);
        animateBg(false);
    };

    const handleDailyPress = () => {
        if (vault?.metadata?.lastDailyReflectionDate === todayISO()) {
            setActiveModal("dailyMessage");
            animateBg(true);
        } else {
            router.push("/daily_reflection" as const);
        }
    };

    const handleReportPress = () => setActiveModal("report");

    const handleSettingsPress = () => router.push("/settings");

    const dailyMessage =
        (!isVaultLoading && vault?.metadata?.dailyMessageContent)
            ? String(vault.metadata.dailyMessageContent)
            : "Bugün için mesajın burada görünecek.";

    const dailyTheme = vault?.metadata?.dailyMessageTheme as string | null;
    const decisionLogId = vault?.metadata?.dailyMessageDecisionLogId as
        | string
        | null;

    const handleNavigateToTherapy = () => {
        if (!dailyTheme) return;
        setActiveModal(null); // Modalı kapat
        animateBg(false); // Arka plan animasyonunu geri al
        router.push({
            pathname: "/therapy/therapy_options",
            params: { startConversationWith: dailyTheme },
        });
    };

    const handleSatisfaction = async (score: number) => {
        if (!decisionLogId) return;
        // Supabase RPC yerine Edge Function kullan
        const { error } = await supabase.functions.invoke(
            "update-satisfaction-score",
            {
                body: { log_id: decisionLogId, score: score },
            },
        );

        if (error) {
            console.error("[Satisfaction] Skor güncelleme hatası:", error);
        } else {
            // Başarılı mesaj göster
        }
    };

    return {
        activeModal,
        scaleAnim,
        dailyMessage,
        dailyTheme,
        decisionLogId,
        isVaultLoading,
        handleDailyPress,
        handleReportPress,
        handleSettingsPress,
        handleModalClose,
        handleNavigateToTherapy,
        handleSatisfaction,
        invalidateLatestReport: () =>
            queryClient.invalidateQueries({ queryKey: ["latestReport"] }),
    };
};
