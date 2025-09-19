// app/(auth)/login.tsx
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons'; // İKONLARI EKLE
import { supabase } from '../../utils/supabase'; // SUPABASE'İ EKLE
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectTo } from '../../utils/authRedirect';
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

    const handleSignInWithGoogle = async () => {
        try {
            const redirectTo = makeRedirectTo();
    
            // 2. Supabase'e komut veriliyor: "Rotayı hazırla ama arabayı sürme, direksiyon bende."
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true, // <-- EN KRİTİK ANAHTAR
                    scopes: 'email profile',
                },
            });
    
            if (error) {
                console.error("Supabase rotayı hazırlayamadı:", error.message);
                setError({ field: 'social', message: error.message });
                return;
            }
    
            // 3. Direksiyona geçiliyor: Supabase'in verdiği rotayı kullanarak tarayıcıyı biz açıyoruz.
            if (data?.url) {
                await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            } else {
                setError({ field: 'social', message: 'Google yönlendirme URL’i alınamadı.' });
            }
    
        } catch (err) {
            const message = err instanceof Error ? err.message : "Beklenmedik bir tarayıcı hatası.";
            console.error("Direksiyona geçerken hata:", message);
            setError({ field: 'social', message });
        }
    };
    
    const handleSignInWithApple = async () => {
        // Apple için de birebir aynı mantık.
        try {
            const redirectTo = makeRedirectTo();
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'apple',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                },
            });
    
            if (error) {
                console.error("Supabase (Apple) rotayı hazırlayamadı:", error.message);
                setError({ field: 'social', message: error.message });
                return;
            }
    
            if (data?.url) {
                await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
            } else {
                setError({ field: 'social', message: 'Apple yönlendirme URL’i alınamadı.' });
            }
    
        } catch (err) {
            const message = err instanceof Error ? err.message : "Beklenmedik bir tarayıcı hatası.";
            console.error("Direksiyona geçerken hata (Apple):", message);
            setError({ field: 'social', message });
        }
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