// utils/dialog.ts
import { Alert } from "react-native";

export const showDeleteConfirmation = (onConfirm: () => void) => {
    Alert.alert(
        "Seansı Kalıcı Olarak Sil",
        "Bu seans ve onunla ilişkili tüm anılar (analizler, özetler) kalıcı olarak silinecektir. Emin misiniz?",
        [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil",
                style: "destructive",
                onPress: onConfirm,
            },
        ],
    );
};

export const showErrorDialog = (
    message =
        "Bir sorun oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.",
) => {
    Alert.alert("Hata", message);
};
