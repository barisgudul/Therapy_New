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
import { useTranslation } from "react-i18next";
import { supabase } from "../../utils/supabase";



const PasswordInputField = ({
    label,
    value,
    onChangeText,
    placeholderKey,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholderKey: string;
}) => {
    const { t } = useTranslation();
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
                    placeholder={t(placeholderKey)}
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
    const { t } = useTranslation();
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
                t('settings.password.alert_missing_fields_title'),
                t('settings.password.alert_missing_fields_body'),
            );
        }
        if (newPassword !== confirmNewPassword) {
            return Alert.alert(
                t('settings.password.alert_mismatch_title'),
                t('settings.password.alert_mismatch_body'),
            );
        }
        if (!isPasswordStrong(newPassword)) {
            return Alert.alert(
                t('settings.password.alert_weak_title'),
                t('settings.password.alert_weak_body'),
            );
        }
        if (currentPassword === newPassword) {
            return Alert.alert(
                t('settings.password.alert_same_title'),
                t('settings.password.alert_same_body'),
            );
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                throw new Error(t('settings.password.error_auth'));
            }

            // HATA DEĞİŞKENLERİ DÜZELTİLDİ: Artık 'e1', 'e2' gibi saçmalıklar yok.
            const { error: signInError } = await supabase.auth
                .signInWithPassword({
                    email: user.email,
                    password: currentPassword,
                });
            if (signInError) {
                throw new Error(
                    t('settings.password.error_wrong_password'),
                );
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (updateError) throw updateError; // Supabase'den gelen hatayı direkt fırlat.

            Alert.alert(t('settings.password.alert_success_title'), t('settings.password.alert_success_body'), [{
                text: t('settings.password.alert_success_button'),
                onPress: () => router.back(),
            }]);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : t('settings.password.error_unexpected');
            Alert.alert(t('settings.password.alert_error_title'), errorMessage);
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
                        <Text style={styles.title}>{t('settings.password.title')}</Text>
                        <Text style={styles.subtitle}>
                            {t('settings.password.subtitle')}
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        <PasswordInputField
                            label={t('settings.password.current_password_label')}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholderKey="settings.password.placeholder_current"
                        />
                        <PasswordInputField
                            label={t('settings.password.new_password_label')}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholderKey="settings.password.placeholder_new"
                        />
                        <PasswordInputField
                            label={t('settings.password.confirm_password_label')}
                            value={confirmNewPassword}
                            onChangeText={setConfirmNewPassword}
                            placeholderKey="settings.password.placeholder_confirm"
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
                                        {t('settings.password.submit_button')}
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
