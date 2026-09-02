// hooks/useHomeScreen.ts
import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { useRouter } from "expo-router/";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateVault, useVault } from "./useVault";
import { supabase } from "../utils/supabase";
import { useOnboardingStore } from "../store/onboardingStore";
import { getEffectiveStreak, isMilestone } from "../utils/streak";
import { syncDailyReminders } from "../utils/notifications";

export type ActiveModal =
    | null
    | "dailyMessage"
    | "report"
    | "onboardingInsight";

const todayISO = () => new Date().toISOString().split("T")[0];

export const useHomeScreen = () => {
    const router = useRouter();
    const { data: vault, isLoading: isVaultLoading } = useVault();
    const { mutate: updateVault } = useUpdateVault();
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    const queryClient = useQueryClient();

    // --- SERİ (STREAK) HESABI ---
    const today = todayISO();
    const lastReflectionDate = vault?.metadata?.lastDailyReflectionDate as
        | string
        | undefined;
    const storedStreak = Number(vault?.metadata?.dailyReflectionStreak ?? 0);
    const streak = getEffectiveStreak(lastReflectionDate, today, storedStreak);
    const reflectedToday = lastReflectionDate === today;

    // Milestone (3,7,14...) bugün ulaşıldıysa ve daha önce kutlanmadıysa konfeti tetikle
    const lastCelebrated = Number(vault?.metadata?.lastCelebratedStreak ?? 0);
    const shouldCelebrate = reflectedToday && isMilestone(streak) &&
        lastCelebrated !== streak;

    const markCelebrated = () => {
        if (!vault) return;
        updateVault({
            ...vault,
            metadata: { ...vault.metadata, lastCelebratedStreak: streak },
        });
    };
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [profileInsight, setProfileInsight] = useState<
        Record<string, string> | null
    >(null);

    const storeInsight = useOnboardingStore((s) => s.onboardingInsight);
    const setOnboardingInsight = useOnboardingStore((s) =>
        s.setOnboardingInsight
    );

    // Store'da insight varsa onu kullan, yoksa profiles'tan çek
    const onboardingInsight = storeInsight || profileInsight;

    // user_vaults tablosundan analizi çek (vault içinden)
    useEffect(() => {
        if (vault?.onboardingInsight && !storeInsight) {
            // Vault'ta analiz varsa ve store'da yoksa, store'a kaydet
            setProfileInsight(
                vault.onboardingInsight as Record<string, string>,
            );
            setOnboardingInsight(
                vault.onboardingInsight as Record<string, string>,
            );
            console.log("Vault'tan analiz yüklendi:", vault.onboardingInsight);
        }
    }, [vault, storeInsight, setOnboardingInsight]);

    // Bildirim yönetimi: vault hazır olduğunda izni iste ve günlük
    // hatırlatıcıları (yeniden) kur. İzin reddedilirse sessizce hiçbir şey yapmaz.
    useEffect(() => {
        if (!isVaultLoading && vault) {
            syncDailyReminders();
        }
    }, [isVaultLoading, vault]);

    const animateBg = (open: boolean) =>
        Animated.timing(scaleAnim, {
            toValue: open ? 0.9 : 1,
            duration: 250,
            useNativeDriver: true,
        }).start();

    const handleModalClose = () => {
        // Artık onboarding insight'ı silmiyoruz, sadece modalı kapatıyoruz
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

    const handleStreakPress = () => {
        // Bugün yapılmadıysa seriyi korumaya teşvik et; yapıldıysa günün mesajını göster
        if (reflectedToday) {
            setActiveModal("dailyMessage");
            animateBg(true);
        } else {
            router.push("/daily_reflection" as const);
        }
    };

    const handleReportPress = () => setActiveModal("report");

    const handleOnboardingInsightPress = () => {
        setActiveModal("onboardingInsight");
        animateBg(true);
    };

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
        onboardingInsight,
        streak,
        reflectedToday,
        shouldCelebrate,
        markCelebrated,
        handleStreakPress,
        handleDailyPress,
        handleReportPress,
        handleSettingsPress,
        handleModalClose,
        handleNavigateToTherapy,
        handleSatisfaction,
        handleOnboardingInsightPress,
        invalidateLatestReport: () =>
            queryClient.invalidateQueries({ queryKey: ["latestReport"] }),
    };
};
