// app/register.tsx

import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import {
    LayoutAnimation,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { AuthInput } from "../../components/AuthInput.tsx";
import { AuthLayout } from "../../components/AuthLayout.tsx";
import { LoadingButton } from "../../components/LoadingButton.tsx";
import { useLoading } from "../../context/Loading.tsx";
import { useOnboardingStore, AppMode } from "../../store/onboardingStore";
import { authScreenStyles as styles } from "../../styles/auth";
import { signUpWithEmail } from "../../utils/auth";
import { logEvent } from "../../services/api.service";

export default function RegisterScreen() {
    const router = useRouter();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const setNickname = useOnboardingStore((s) => s.setNickname);
    const setGuest = useOnboardingStore((s) => s.setGuest);
    const setMode = useOnboardingStore((s) => s.setMode);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNicknameLocal] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState(0);

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
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        showLoading("Hesap oluşturuluyor...");
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const user = await signUpWithEmail(email, password);
            if (!user) throw new Error("Kullanıcı oluşturulamadı.");
            setNickname(nickname.trim());
            setGuest(false);
            setMode(AppMode.Summary);
            await logEvent({ type: "register_success", data: { source: "softwall" } }).catch(()=>{});
            router.replace("/analysis/instant-analysis");
        } catch (error: unknown) {
            const errorMessage = error instanceof Error
                ? error.message
                : "Beklenmedik bir hata oluştu";
            if (errorMessage.includes("already in use")) {
                setError("Bu e-posta adresi zaten kullanımda.");
                changeStep(0);
            } else {
                setError("Bir hata oluştu. Lütfen tekrar deneyin.");
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            hideLoading();
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.linkText}>
                Zaten bir hesabın var mı?{" "}
                <Text style={styles.linkTextBold}>Giriş yap.</Text>
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
