// app/(auth)/register.tsx
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import { LayoutAnimation, Text, View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons'; // Vektör ikonlar için
import Animated, { FadeIn } from 'react-native-reanimated'; // Animasyon için
import { AuthInput } from "../../components/AuthInput";
import { AuthLayout } from "../../components/AuthLayout";
import { AuthButton } from "../../components/AuthButton";
import { useLoading } from "../../context/Loading";
import { useOnboardingStore } from "../../store/onboardingStore";
import { authScreenStyles as styles } from "../../styles/auth";
import { signUpWithOnboardingData } from "../../utils/auth";
import { logEvent } from "../../services/api.service";
import { supabase } from "../../utils/supabase";

export default function RegisterScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNicknameLocal] = useState("");

    // HATA STATE'İNİ AKILLANDIRIYORUZ
    const [error, setError] = useState<{ field: string; message: string } | null>(null);
    const [step, setStep] = useState(0);

    const answersArray = useOnboardingStore((s) => s.answersArray);

    const changeStep = (nextStep: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(nextStep);
    };

    // YENİ: Sosyal Medya Giriş Fonksiyonları
    const handleSignInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) {
            setError({ field: 'social', message: error.message });
        }
    };

    const handleSignInWithApple = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
        });
        if (error) {
            setError({ field: 'social', message: error.message });
        }
    };

    const goToNextStep = () => {
        setError(null); // Her denemede hatayı sıfırla
        if (password.length < 6) {
            setError({ field: 'password', message: t("auth.error_password_length") });
            return;
        }
        changeStep(1);
    };

    const handleRegister = async () => {
        setError(null);
        if (!nickname.trim()) {
            setError({ field: 'nickname', message: t("auth.error_nickname_required") });
            return;
        }
        showLoading("Hesap oluşturuluyor...");

        const { user, error: signUpError } = await signUpWithOnboardingData(email, password, nickname, answersArray);

        if (signUpError) {
            hideLoading(); // Hata varsa hemen durdur
            // Hatanın kaynağını belirleyip doğru alanı işaretle
            if (signUpError.includes("email")) {
                setError({ field: 'email', message: signUpError });
                changeStep(0);
            } else {
                setError({ field: 'general', message: signUpError });
            }
        } else if (user) {
            // resetOnboarding()'i BURADAN SİLİYORUZ.
            await logEvent({ type: "register_success", data: { source: "softwall" } });

            // hideLoading'i de buradan siliyoruz.
            // Bırakalım, ProcessingScreen bitene kadar dönmeye devam etsin.
            // Bu sayede kullanıcı çift yükleme ekranı görmez.

            router.replace("/(auth)/analysis");
        } else {
            // Beklenmedik bir durum, ne user var ne error.
            hideLoading();
            setError({ field: 'general', message: 'Bilinmeyen bir hata oluştu.' });
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.linkText}>
                {t("auth.have_account")}
                <Text style={styles.linkTextBold}>{t("auth.login_link")}</Text>
            </Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout
            title={step === 0 ? t("auth.create_account") : t("auth.almost_done")}
            subtitle={step === 0 ? t("auth.enter_info_register") : t("auth.how_should_we_call_you")}
            footer={FooterLink}
        >
          {/* YENİ VE ZARİF HATA GÖSTERİMİ */}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorMessage}>{error.message}</Text>
            </Animated.View>
          )}

          <View style={styles.formContainer}>
            {step === 0 ? (
              <View style={[styles.inputWrapper, (error?.field === 'email' || error?.field === 'password') && styles.inputWrapperError]}>
                <AuthInput iconName="mail-outline" placeholder={t("auth.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <View style={styles.inputSeparator} />
                {/* ARTIK GEREKSİZ VIEW YOK! */}
                <AuthInput iconName="lock-closed-outline" placeholder={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={goToNextStep} />
              </View>
            ) : (
              <View style={[styles.inputWrapper, error?.field === 'nickname' && styles.inputWrapperError]}>
                <AuthInput iconName="person-outline" placeholder={t("auth.nickname")} value={nickname} onChangeText={setNicknameLocal} autoFocus onSubmitEditing={handleRegister} />
              </View>
            )}

                {/* YENİ VE MARKAYA UYGUN BUTON */}
                <AuthButton
                    text={t(step === 0 ? 'auth.continue' : 'auth.create_account_cta')}
                    onPress={step === 0 ? goToNextStep : handleRegister}
                    isLoading={isLoading}
                />

                {/* === İŞTE YENİ BÖLÜM BURADA BAŞLIYOR === */}
                {step === 0 && ( // Sosyal medya girişini sadece ilk adımda göster
                    <>
                        {/* === ESKİSİNİ SİLİP BUNU KOY === */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>{t('auth.or')}</Text>
                            <View style={styles.dividerLine} />
                        </View>
                        {/* === DEĞİŞİKLİK SONU === */}

                        <View style={styles.socialContainer}>
                            {/* Google Butonu - ARTIK IONICONS KULLANIYOR */}
                            <TouchableOpacity style={styles.socialButton} onPress={handleSignInWithGoogle}>
                                <Ionicons
                                    name="logo-google"
                                    style={styles.socialIconVector}
                                />
                            </TouchableOpacity>

                            {/* Apple Butonu - ARTIK IONICONS KULLANIYOR */}
                            <TouchableOpacity style={styles.socialButton} onPress={handleSignInWithApple}>
                                <Ionicons
                                    name="logo-apple"
                                    style={styles.socialIconVector}
                                />
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>
        </AuthLayout>
    );
}
