// app/(settings)/change-password.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../../utils/supabase";

// --- BÖLÜM 1: DOĞRU YERDE, DOĞRU İSİMLERLE TANIMLANMIŞ COMPONENT ---
// BU COMPONENT, ANA FONKSİYONUN DIŞINDA. HER RENDER'DA YENİDEN YARATILMIYOR.
// KENDİ GÖRÜNÜRLÜK STATE'İNİ KENDİSİ YÖNETİYOR. TEMİZ. MODÜLER.

const PasswordInputField = ({
    label,
    value,
    onChangeText,
    placeholder,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
}) => {
    // KULLANICININ HAYATINI KOLAYLAŞTIRAN O ÖZELLİK GERİ GELDİ.
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    return (
        <View style={styles.fieldContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputWrapper}>
                <TextInput
                    style={styles.input}
                    secureTextEntry={!isPasswordVisible}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                />
                {/* O GÖZ İKONU, OLMASI GEREKEN YERDE. */}
                <Pressable
                    onPress={() => setIsPasswordVisible((prev) => !prev)}
                    hitSlop={10}
                >
                    <Ionicons
                        name={isPasswordVisible
                            ? "eye-off-outline"
                            : "eye-outline"}
                        size={22}
                        color="#6B7280"
                    />
                </Pressable>
            </View>
        </View>
    );
};

// --- BÖLÜM 2: ANA SAYFA - ANLAŞILIR İSİMLER, TEMİZ YAPI ---

export default function ChangePasswordScreen() {
    const router = useRouter();

    // İSİMLER DÜZELTİLDİ: Artık neyin ne olduğu belli.
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // İSİM DÜZELTİLDİ: Fonksiyon artık ne yaptığını söylüyor.
    const isPasswordStrong = (password: string) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

    // İSİM DÜZELTİLDİ: Fonksiyon artık neyi "handle" ettiğini söylüyor.
    const handleUpdatePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            return Alert.alert(
                "Eksik Alanlar",
                "Lütfen tüm alanları doldurun.",
            );
        }
        if (newPassword !== confirmNewPassword) {
            return Alert.alert(
                "Şifreler Uyuşmuyor",
                "Girdiğiniz yeni şifreler eşleşmiyor.",
            );
        }
        if (!isPasswordStrong(newPassword)) {
            return Alert.alert(
                "Zayıf Şifre",
                "Şifre en az 8 karakter olmalı, büyük/küçük harf ve rakam içermelidir.",
            );
        }
        if (currentPassword === newPassword) {
            return Alert.alert(
                "Aynı Şifre",
                "Yeni şifreniz, mevcut şifrenizle aynı olamaz.",
            );
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                throw new Error("Kullanıcı kimliği doğrulanamadı.");
            }

            // HATA DEĞİŞKENLERİ DÜZELTİLDİ: Artık 'e1', 'e2' gibi saçmalıklar yok.
            const { error: signInError } = await supabase.auth
                .signInWithPassword({
                    email: user.email,
                    password: currentPassword,
                });
            if (signInError) {
                throw new Error(
                    "Mevcut şifreniz yanlış. Lütfen kontrol ediniz.",
                );
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (updateError) throw updateError; // Supabase'den gelen hatayı direkt fırlat.

            Alert.alert("Başarılı", "Şifreniz güvenle değiştirildi.", [{
                text: "Harika",
                onPress: () => router.back(),
            }]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Beklenmedik bir hata oluştu";
            Alert.alert("Bir Hata Oluştu", errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.contentContainer}
                    keyboardShouldPersistTaps="handled"
                >
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.closeButton}
                    >
                        <Ionicons
                            name="close-outline"
                            size={28}
                            color="#4B5563"
                        />
                    </Pressable>

                    <View style={styles.headerContainer}>
                        <View style={styles.iconBackground}>
                            <Ionicons
                                name="shield-checkmark-outline"
                                size={32}
                                color="#1E3A8A"
                            />
                        </View>
                        <Text style={styles.title}>Şifre Güncelleme</Text>
                        <Text style={styles.subtitle}>
                            Hesap güvenliğinizi en üst düzeyde tutun.
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        <PasswordInputField
                            label="Mevcut Şifre"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="••••••••"
                        />
                        <PasswordInputField
                            label="Yeni Şifre"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="En az 8 güçlü karakter"
                        />
                        <PasswordInputField
                            label="Yeni Şifre (Tekrar)"
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            placeholder="Yeni şifrenizi onaylayın"
                        />

                        <Pressable
                            style={(
                                { pressed },
                            ) => [
                                styles.submitButton,
                                (isLoading || pressed) && styles.buttonDisabled,
                            ]}
                            onPress={handleUpdatePassword}
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <ActivityIndicator color="#FFFFFF" />
                                : (
                                    <Text style={styles.submitButtonText}>
                                        Şifreyi Güvenle Değiştir
                                    </Text>
                                )}
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- BÖLÜM 3: PROFESYONEL, CİDDİ VE OKUNAKLI STİLLER ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    contentContainer: { flexGrow: 1, justifyContent: "center", padding: 24 },
    closeButton: { position: "absolute", top: 20, right: 20, zIndex: 10 },
    headerContainer: { alignItems: "center", marginBottom: 32 },
    iconBackground: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#DBEAFE", // Açık Mavi
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#1F2937",
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: "#4B5563",
        marginTop: 8,
        textAlign: "center",
        maxWidth: "90%",
    },
    formContainer: { width: "100%" },
    fieldContainer: { marginBottom: 20 },
    label: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#D1D5DB",
        borderRadius: 12,
        paddingHorizontal: 16,
    },
    input: { flex: 1, paddingVertical: 14, fontSize: 16, color: "#111827" },
    submitButton: {
        backgroundColor: "#1E40AF", // Kurumsal Mavi
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: "center",
        marginTop: 10,
    },
    buttonDisabled: { opacity: 0.6 },
    submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});
