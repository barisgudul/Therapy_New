// hooks/useSettings.ts
import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "../utils/auth";
import { supabase } from "../utils/supabase";

export const useSettings = () => {
    const router = useRouter();
    const [isResetting, setIsResetting] = useState(false);

    const handleSignOut = () => {
        Alert.alert(
            "Çıkış Yap",
            "Hesabınızdan çıkış yapmak istediğinizden emin misiniz?",
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Çıkış Yap",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await signOut();
                            router.replace("/login");
                        } catch (error: unknown) {
                            const errorMessage = error instanceof Error
                                ? error.message
                                : "Beklenmedik bir hata oluştu";
                            console.error(
                                "Çıkış yapılırken bir hata oluştu:",
                                errorMessage,
                            );
                            Alert.alert("Hata", errorMessage);
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
                "İşlem Başlatıldı",
                "Hesabınız 7 gün içinde kalıcı olarak silinmek üzere sıraya alındı. Bu süre zarfında fikrinizi değiştirirseniz, tekrar giriş yaparak işlemi iptal edebilirsiniz.",
            );
            await signOut();
            router.replace("/login");
        } catch (err: unknown) {
            console.error("Veri sıfırlama işlemi sırasında hata:", err);
            let errorMessage =
                "Beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.";

            if (err instanceof Error) {
                if (err.message === "Failed to fetch") {
                    errorMessage =
                        "İnternet bağlantınız kontrol edin. Sunucuya ulaşılamadı.";
                } else if (
                    "details" in err &&
                    typeof (err as { details?: string }).details === "string"
                ) {
                    errorMessage = `Sunucu Hatası: ${
                        (err as { details: string }).details
                    }`;
                }
            }

            Alert.alert("Başarısız Oldu", errorMessage);
        } finally {
            setIsResetting(false);
        }
    };

    const handleResetData = () => {
        const confirmationText = "tüm verilerimi sil";
        Alert.alert(
            "Emin misiniz?",
            `Bu işlem GERİ ALINAMAZ! Tüm uygulama verileriniz kalıcı olarak silinecektir.`,
            [
                { text: "Vazgeç", style: "cancel" },
                {
                    text: "Devam Et",
                    style: "destructive",
                    onPress: () => {
                        Alert.prompt(
                            "Son Onay",
                            `Lütfen devam etmek için aşağıdaki kutucuğa "${confirmationText}" yazın.`,
                            [
                                { text: "Vazgeç", style: "cancel" },
                                {
                                    text: "ONAYLIYORUM, SİL",
                                    style: "destructive",
                                    onPress: async (inputText) => {
                                        if (
                                            inputText?.toLowerCase() !==
                                                confirmationText
                                        ) {
                                            Alert.alert(
                                                "Hata",
                                                "Yazdığınız metin eşleşmedi. İşlem iptal edildi.",
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
