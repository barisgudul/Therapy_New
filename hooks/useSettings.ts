// hooks/useSettings.ts
import { useState } from "react";
import { Alert } from "react-native";
import i18n from "../utils/i18n";
import { useRouter } from "expo-router/";
import { signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";

export const useSettings = () => {
    const router = useRouter();
    const [isResetting, setIsResetting] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            i18n.t("settings.security.alert_signOut_title"),
            i18n.t("settings.security.alert_signOut_body"),
            [
                {
                    text: i18n.t("settings.security.alert_cancel"),
                    style: "cancel",
                },
                {
                    text: i18n.t("settings.security.sign_out"),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace("/login");
                        } catch (error: unknown) {
                            const errorMessage = error instanceof Error
                                ? error.message
                                : i18n.t("settings.password.error_unexpected");
                            console.error(
                                "Sign out error:",
                                errorMessage,
                            );
                            Alert.alert(
                                i18n.t("settings.security.alert_error"),
                                errorMessage,
                            );
                        }
                    },
                },
            ],
        );
    };

    const executeDataReset = async () => {
        setIsResetting(true);
        try {
            const { error } = await supabase.functions.invoke(
                "reset-user-data",
            );
            if (error) throw error;

            Alert.alert(
                i18n.t("settings.main.dangerZone_title"),
                i18n.t("settings.profile.error_loading"),
            );
            await signOut();
            router.replace("/login");
        } catch (err: unknown) {
            console.error("Veri sıfırlama işlemi sırasında hata:", err);
            let errorMessage = i18n.t("settings.password.error_unexpected");

            if (err instanceof Error) {
                if (err.message === "Failed to fetch") {
                    errorMessage =
                        "İnternet bağlantınız kontrol edin. Sunucuya ulaşılamadı.";
                } else if (
                    "details" in err &&
                    typeof (err as { details?: string }).details === "string"
                ) {
                    errorMessage = (err as { details: string }).details;
                }
            }

            Alert.alert(
                i18n.t("settings.password.alert_error_title"),
                errorMessage,
            );
        } finally {
            setIsResetting(false);
        }
    };

    const handleResetData = () => {
        const confirmationText = "tüm verilerimi sil"; // TODO: çok dillendirme istenirse locale'e alınabilir
        Alert.alert(
            i18n.t("settings.main.dangerZone_title"),
            i18n.t("settings.profile.subtitle"),
            [
                {
                    text: i18n.t("settings.security.alert_cancel"),
                    style: "cancel",
                },
                {
                    text: i18n.t("common.continue"),
                    style: "destructive",
                    onPress: () => {
                        Alert.prompt(
                            i18n.t("settings.main.dangerZone_title"),
                            `Lütfen devam etmek için aşağıdaki kutucuğa "${confirmationText}" yazın.`,
                            [
                                {
                                    text: i18n.t(
                                        "settings.security.alert_cancel",
                                    ),
                                    style: "cancel",
                                },
                                {
                                    text: i18n.t(
                                        "settings.main.dangerZone_resetData",
                                    ),
                                    style: "destructive",
                                    onPress: async (inputText) => {
                                        if (
                                            inputText?.toLowerCase() !==
                                                confirmationText
                                        ) {
                                            Alert.alert(
                                                i18n.t(
                                                    "settings.profile.toast_error_title",
                                                ),
                                                i18n.t(
                                                    "settings.profile.toast_error_body",
                                                ),
                                            );
                                            return;
                                        }
                                        await executeDataReset();
                                    },
                                },
                            ],
                            "plain-text",
                        );
                    },
                },
            ],
        );
    };

    return {
        isResetting,
        handleSignOut,
        handleResetData,
    };
};
