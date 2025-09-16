// app/(auth)/register.tsx
import { useRouter } from "expo-router/";
import React, { useState } from "react";
import { LayoutAnimation, Text, View, TouchableOpacity } from "react-native";
import { useTranslation } from "react-i18next";
import { AuthInput } from "../../components/AuthInput";
import { AuthLayout } from "../../components/AuthLayout";
import { AuthButton } from "../../components/AuthButton";
import { useLoading } from "../../context/Loading";
import { useOnboardingStore } from "../../store/onboardingStore";
import { authScreenStyles as styles } from "../../styles/auth";
import { signUpWithOnboardingData } from "../../utils/auth";
import { logEvent } from "../../services/api.service";

export default function RegisterScreen() {
    const router = useRouter();
    const { t } = useTranslation();
    const { showLoading, hideLoading, isLoading } = useLoading();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNicknameLocal] = useState("");
    const [error, setError] = useState("");
    const [step, setStep] = useState(0);

    const answersArray = useOnboardingStore((s) => s.answersArray);
    const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

    const changeStep = (nextStep: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setStep(nextStep);
    };

    const goToNextStep = () => {
        setError("");
        if (password.length < 6) {
            setError(t("auth.error_password_length"));
            return;
        }
        changeStep(1);
    };

    const handleRegister = async () => {
        setError("");
        if (!nickname.trim()) {
            setError(t("auth.error_nickname_required"));
            return;
        }
        showLoading("Hesap oluşturuluyor...");

        const { user, error: signUpError } = await signUpWithOnboardingData(email, password, nickname, answersArray);
        hideLoading();

        if (signUpError) {
            setError(signUpError);
            if (signUpError.includes("kullanılıyor")) changeStep(0);
        } else if (user) {
            resetOnboarding();
            await logEvent({ type: "register_success", data: { source: "softwall" } });
            router.replace("/(auth)/analysis");
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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.formContainer}>
                {step === 0 ? (
                    <View style={styles.inputWrapper}>
                        <AuthInput iconName="mail-outline" placeholder={t("auth.email")} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <View style={styles.inputSeparator} />
                        <AuthInput iconName="lock-closed-outline" placeholder={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={goToNextStep} />
                    </View>
                ) : (
                    <View style={styles.inputWrapper}>
                        <AuthInput iconName="person-outline" placeholder={t("auth.nickname")} value={nickname} onChangeText={setNicknameLocal} autoFocus onSubmitEditing={handleRegister} />
                    </View>
                )}

                {/* YENİ VE MARKAYA UYGUN BUTON */}
                <AuthButton
                    text={t(step === 0 ? 'auth.continue' : 'auth.create_account_cta')}
                    onPress={step === 0 ? goToNextStep : handleRegister}
                    isLoading={isLoading}
                />
            </View>
        </AuthLayout>
    );
}
