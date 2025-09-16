// app/(auth)/forgot-password.tsx
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router/";
import Animated, { FadeIn } from 'react-native-reanimated';
import { AuthInput } from "../../components/AuthInput";
import { AuthLayout } from "../../components/AuthLayout";
import { AuthButton } from "../../components/AuthButton";
import { useLoading } from "../../context/Loading";
import { authScreenStyles as styles } from "../../styles/auth";
import { supabase } from "../../utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const [email, setEmail] = useState("");
    const [error, setError] = useState<{ field: string; message: string } | null>(null);
    const [sent, setSent] = useState(false);

    const handlePasswordReset = async () => {
        setError(null);
        if (!email.trim() || !email.includes("@")) {
            setError({ field: 'email', message: t('auth.error_invalid_email') });
            return;
        }
        showLoading("Link gönderiliyor...");
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

        hideLoading();
        if (resetError) {
            setError({ field: 'general', message: resetError.message });
        } else {
            setSent(true);
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>
                {t("auth.back_to_login_prefix")}
                <Text style={styles.linkTextBold}>{t("auth.back_to_login_link")}</Text>
            </Text>
        </TouchableOpacity>
    );

    // E-posta gönderildikten sonra gösterilecek "başarı" ekranı
    if (sent) {
        return (
            <AuthLayout title={t('auth.check_your_email_title')} subtitle={t('auth.check_your_email_subtitle', { email })} footer={null}>
                <View style={{ alignItems: 'center', marginVertical: 24 }}>
                    <Ionicons name="checkmark-circle-outline" size={64} color={Colors.light.tint} />
                </View>
                <AuthButton text={t('auth.back_to_login_cta')} onPress={() => router.replace('/login')} />
            </AuthLayout>
        );
    }

    // Standart şifre sıfırlama formu
    return (
        <AuthLayout
            title={t("auth.forgot_password_title")}
            subtitle={t("auth.forgot_password_subtitle")}
            footer={FooterLink}
        >
            {error && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                    <Text style={styles.errorMessage}>{error.message}</Text>
                </Animated.View>
            )}

            <View style={styles.formContainer}>
                <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
                    <AuthInput
                        iconName="mail-outline"
                        placeholder={t("auth.email")}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onSubmitEditing={handlePasswordReset}
                        autoFocus
                    />
                </View>

                <AuthButton
                    isLoading={isLoading}
                    text={t("auth.send_recovery_link")}
                    onPress={handlePasswordReset}
                />
            </View>
        </AuthLayout>
    );
}
