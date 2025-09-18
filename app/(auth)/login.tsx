// app/(auth)/login.tsx
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons'; // İKONLARI EKLE
import { supabase } from '../../utils/supabase'; // SUPABASE'İ EKLE
import { AuthInput } from '../../components/AuthInput';
import { AuthLayout } from '../../components/AuthLayout';
import { AuthButton } from '../../components/AuthButton'; // YENİ BUTON
import { useLoading } from '../../context/Loading';
import { authScreenStyles as styles } from '../../styles/auth';
import { signInAndVerifyUser } from '../../utils/auth';

export default function LoginScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<{ field: string; message: string } | null>(null);

    const handleSignIn = async () => {
        setError(null);
        showLoading(t('auth.logging_in'));

        try {
            const result = await signInAndVerifyUser(email, password);
            hideLoading();

            if (result.success) {
                router.replace('/');
            } else {
                setError({ field: 'general', message: result.error });
            }
        } catch (_error) {
            hideLoading();
            setError({ field: 'general', message: t('auth.unexpected_error') });
        }
    };

    // YENİ: Sosyal Medya Giriş Fonksiyonları (register'dan kopyala)
    const handleSignInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) setError({ field: 'social', message: error.message });
    };

    const handleSignInWithApple = async () => {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'apple' });
        if (error) setError({ field: 'social', message: error.message });
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>
                {t("auth.no_account")}
                <Text style={styles.linkTextBold}>{t("auth.register_link")}</Text>
            </Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout
            title={t("auth.login")}
            subtitle={t("auth.enter_info_login")}
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
                    />
                    <View style={styles.inputSeparator} />
                    <AuthInput
                        iconName="lock-closed-outline"
                        placeholder={t("auth.password")}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        onSubmitEditing={handleSignIn}
                    />
                </View>

                <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
                    <Text style={styles.linkTextBold}>{t('auth.forgot_password')}</Text>
                </TouchableOpacity>

                <AuthButton
                    isLoading={isLoading}
                    text={t("auth.login")}
                    onPress={handleSignIn}
                />

                {/* === İŞTE EKSİK PARÇA BURADA === */}
                <View style={styles.dividerContainer}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>{t('auth.or')}</Text>
                    <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity style={styles.socialButton} onPress={handleSignInWithGoogle}>
                        <Ionicons name="logo-google" style={styles.socialIconVector} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.socialButton} onPress={handleSignInWithApple}>
                        <Ionicons name="logo-apple" style={styles.socialIconVector} />
                    </TouchableOpacity>
                </View>
                {/* === EKLEME SONU === */}
            </View>
        </AuthLayout>
    );
}