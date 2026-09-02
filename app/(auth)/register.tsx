// app/(auth)/register.tsx
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons'; // Vektör ikonlar için
import Animated, { FadeIn } from 'react-native-reanimated'; // Animasyon için
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectTo } from "../../utils/authRedirect";
import { AuthInput } from "../../components/AuthInput";
import { AuthLayout } from "../../components/AuthLayout";
import { AuthButton } from "../../components/AuthButton";
import { useLoading } from "../../context/Loading";
import { useOnboardingStore } from "../../store/onboardingStore";
import { authScreenStyles as styles } from "../../styles/auth";
import { signUpWithOnboardingData } from "../../utils/auth";
import { logEvent } from "../../services/api.service";
import { supabase } from "../../utils/supabase";
import { LEGAL_VERSION } from "../../constants/legal";
import { useConsentStore } from "../../store/consentStore";

export default function RegisterScreen() {
    const router = useRouter();
    const { t, i18n } = useTranslation();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const acceptConsent = useConsentStore((s) => s.accept);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNicknameLocal] = useState("");
    const [consentChecked, setConsentChecked] = useState(false);

    // HATA STATE'İNİ AKILLANDIRIYORUZ
    const [error, setError] = useState<{ field: string; message: string } | null>(null);
    const [step, setStep] = useState(0);

    const answersArray = useOnboardingStore((s) => s.answersArray);

    const changeStep = (nextStep: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(nextStep);
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

    const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    const goToNextStep = () => {
        setError(null); // Her denemede hatayı sıfırla
        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
            setError({ field: 'email', message: t("auth.error_invalid_email") });
            return;
        }
        if (password.length < 6) {
            setError({ field: 'password', message: t("auth.error_password_length") });
            return;
        }
        if (!consentChecked) {
            setError({ field: 'consent', message: t("auth.error_consent_required") });
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
        showLoading(t('auth.creating_account'));

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
            // Kayıt formundaki onay kutusu işaretlendi (goToNextStep bunu zorunlu kılar);
            // kabul edilen sürümü kaydet ki giriş-sonrası onay kapısı tekrar çıkmasın.
            acceptConsent(LEGAL_VERSION, i18n.language);
            // resetOnboarding()'i BURADAN SİLİYORUZ.
            await logEvent({ type: "register_success", data: { source: "softwall" } });

            // hideLoading'i de buradan siliyoruz.
            // Bırakalım, ProcessingScreen bitene kadar dönmeye devam etsin.
            // Bu sayede kullanıcı çift yükleme ekranı görmez.

            router.replace("/(auth)/analysis");
        } else {
            // Beklenmedik bir durum, ne user var ne error.
            hideLoading();
            setError({ field: 'general', message: t('auth.unknown_error') });
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

            {step === 0 && (
              <View style={consentStyles.wrapper}>
                <Pressable
                  style={consentStyles.row}
                  onPress={() => setConsentChecked((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentChecked }}
                  testID="register-consent"
                >
                  <Ionicons
                    name={consentChecked ? "checkbox" : "square-outline"}
                    size={22}
                    color={consentChecked ? "#4338CA" : (error?.field === 'consent' ? "#DC2626" : "#94A3B8")}
                  />
                  <Text style={consentStyles.label}>{t("auth.consent_checkbox")}</Text>
                </Pressable>
                <View style={consentStyles.links}>
                  <TouchableOpacity onPress={() => router.push("/(legal)/privacy")}>
                    <Text style={consentStyles.link}>{t("legal.doc_title.privacy")}</Text>
                  </TouchableOpacity>
                  <Text style={consentStyles.linkSep}> · </Text>
                  <TouchableOpacity onPress={() => router.push("/(legal)/terms")}>
                    <Text style={consentStyles.link}>{t("legal.doc_title.terms")}</Text>
                  </TouchableOpacity>
                  <Text style={consentStyles.linkSep}> · </Text>
                  <TouchableOpacity onPress={() => router.push("/(legal)/disclaimer")}>
                    <Text style={consentStyles.link}>{t("legal.doc_title.disclaimer")}</Text>
                  </TouchableOpacity>
                </View>
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

const consentStyles = StyleSheet.create({
    wrapper: { marginTop: 4, marginBottom: 4 },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    label: { flex: 1, fontSize: 12, lineHeight: 17, color: "#64748B" },
    links: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginLeft: 30 },
    link: { fontSize: 12, fontWeight: "600", color: "#4338CA" },
    linkSep: { fontSize: 12, color: "#94A3B8" },
});
