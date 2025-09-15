// app/register.tsx - NİHAİ VERSİYON

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import { LayoutAnimation, Text, TouchableOpacity, View } from "react-native";
import { AuthInput } from "../../components/AuthInput.tsx";
import { AuthLayout } from "../../components/AuthLayout.tsx";
import { LoadingButton } from "../../components/LoadingButton.tsx";
import { useLoading } from "../../context/Loading.tsx";
import { AppMode, useOnboardingStore } from "../../store/onboardingStore";
import { authScreenStyles as styles } from "../../styles/auth";
import { logEvent } from "../../services/api.service";
import { signUpWithOnboardingData } from "../../utils/auth"; // YENİ FONKSİYONU İÇERİ AL

export default function RegisterScreen() {
    const router = useRouter();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNicknameLocal] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState(0);

    // Misafir verilerini Zustand store'dan al
    const answersArray = useOnboardingStore((s) => s.answersArray);
    const setGuest = useOnboardingStore((s) => s.setGuest);
    const setMode = useOnboardingStore((s) => s.setMode);
    const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

    const changeStep = (nextStep: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setStep(nextStep);
    };

    const goToNextStep = () => {
        setError("");
        if (password.length < 6) {
            setError("Şifreniz en az 6 karakter olmalıdır.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        changeStep(1);
    };

    const handleRegister = async () => {
        setError("");
        if (!nickname.trim()) {
            setError("Size nasıl hitap etmemizi istersiniz?");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        showLoading("Hesap oluşturuluyor...");

        // YENİ, GÜVENLİ KAYIT İŞLEMİ
        const { user, error: signUpError } = await signUpWithOnboardingData(
            email,
            password,
            nickname,
            answersArray
        );

        hideLoading();

        if (signUpError) {
            setError(signUpError); // Dostane hata mesajı doğrudan auth.ts'den gelecek
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            if (signUpError.includes("kullanılıyor")) {
                changeStep(0); // E-posta zaten kullanımdaysa ilk adıma dön
            }
        } else if (user) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Veri artık backend'de güvende. Cihazdaki misafir verilerini temizle.
            resetOnboarding();
            setGuest(false);
            setMode(AppMode.Home); // Doğrudan ana sayfaya yönlendir

            await logEvent({ type: "register_success", data: { source: "softwall" } });

            // AuthProvider'ın state'i güncellemesini beklemeden doğrudan yönlendir
            router.replace("/");
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.linkText}>
                Zaten bir hesabın var mı? <Text style={styles.linkTextBold}>Giriş yap.</Text>
            </Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout
            title={step === 0 ? "Hesap Oluştur" : "Neredeyse Bitti"}
            subtitle={step === 0
                ? "Yeni bir başlangıç için bilgilerini gir."
                : "Sana nasıl hitap etmemizi istersin?"}
            footer={FooterLink}
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.formContainer}>
                {step === 0 && (
                    <View style={styles.inputWrapper}>
                        <AuthInput
                            iconName="mail-outline"
                            placeholder="E-posta"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.inputSeparator} />
                        <AuthInput
                            iconName="lock-closed-outline"
                            placeholder="Şifre"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            onSubmitEditing={goToNextStep}
                        />
                    </View>
                )}

                {step === 1 && (
                    <View style={styles.inputWrapper}>
                        <AuthInput
                            iconName="person-outline"
                            placeholder="Tercih ettiğin isim"
                            value={nickname}
                            onChangeText={setNicknameLocal}
                            autoFocus
                            onSubmitEditing={handleRegister}
                        />
                    </View>
                )}

                {step === 0
                    ? (
                        <LoadingButton
                            isLoading={false}
                            text="Devam Et"
                            onPress={goToNextStep}
                        />
                    )
                    : (
                        <LoadingButton
                            isLoading={isLoading}
                            text="Hesabı Oluştur"
                            onPress={handleRegister}
                            style={styles.greenButton}
                        />
                    )}
            </View>
        </AuthLayout>
    );
}
