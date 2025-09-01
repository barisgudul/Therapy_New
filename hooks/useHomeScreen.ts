// hooks/useHomeScreen.ts
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useVault } from "./useVault";

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

    return {
        activeModal,
        scaleAnim,
        dailyMessage,
        isVaultLoading,
        handleDailyPress,
        handleReportPress,
        handleSettingsPress,
        handleModalClose,
        invalidateLatestReport: () =>
            queryClient.invalidateQueries({ queryKey: ["latestReport"] }),
    };
};
