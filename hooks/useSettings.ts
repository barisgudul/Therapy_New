// hooks/useSettings.ts
import { useState } from "react";
import { Alert } from "react-native";
import i18n from "../utils/i18n";
import { useRouter } from "expo-router/";
import { signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";
import { useConsentStore } from "../store/consentStore";

export const useSettings = () => {
    const router = useRouter();
    const [isResetting, setIsResetting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
                            console.error("Sign out error:", errorMessage);
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

    const openDeleteModal = () => setIsDeleteModalOpen(true);
    const closeDeleteModal = () => {
        if (!isResetting) setIsDeleteModalOpen(false);
    };

    /** Called by ConfirmDeleteModal once the user has explicitly confirmed. */
    const confirmDelete = async () => {
        setIsResetting(true);
        try {
            const { error } = await supabase.functions.invoke("reset-user-data");
            if (error) throw error;

            // Local consent is per-device; clear it so a re-signup re-consents.
            useConsentStore.getState().reset();

            setIsDeleteModalOpen(false);
            Alert.alert(
                i18n.t("settings.account.delete_done_title"),
                i18n.t("settings.account.delete_done_body"),
            );
            await signOut();
            router.replace("/login");
        } catch (err: unknown) {
            console.error("Hesap silme işlemi sırasında hata:", err);
            let errorMessage = i18n.t("settings.password.error_unexpected");

            if (err instanceof Error) {
                if (err.message === "Failed to fetch") {
                    errorMessage = i18n.t("settings.account.delete_error_network");
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

    return {
        isResetting,
        isDeleteModalOpen,
        handleSignOut,
        openDeleteModal,
        closeDeleteModal,
        confirmDelete,
    };
};
