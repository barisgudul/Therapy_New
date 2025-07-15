// app/register.tsx (STEVE JOBS'UN GÖZLERİ YAŞARDI)

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { useOnboardingStore } from '../store/onboardingStore';
import { authScreenStyles as styles } from '../styles/auth';
import { signUpWithEmail } from '../utils/auth';

export default function RegisterScreen() {
    const router = useRouter();
    const setNickname = useOnboardingStore((s) => s.setNickname);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNicknameLocal] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(0);

    const changeStep = (nextStep: number) => {
        // İŞTE GERÇEK LÜKS BUDUR. FİZİKSEL BİR GEÇİŞ.
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setStep(nextStep);
    };

    const goToNextStep = () => {
        setError('');
        if (password.length < 6) { 
            setError("Şifreniz en az 6 karakter olmalıdır."); 
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return; 
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        changeStep(1);
    };

    const handleRegister = async () => {
        setError('');
        if (!nickname.trim()) { 
            setError('Size nasıl hitap etmemizi istersiniz?');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return; 
        }
        setLoading(true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const user = await signUpWithEmail(email, password);
            if (!user) throw new Error("Kullanıcı oluşturulamadı.");
            // Nickname'i onboarding store'una kaydet
            setNickname(nickname.trim());
            // const initialVault: VaultData = { profile: { nickname: nickname.trim() } };
            // await updateUserVault(initialVault); // ARTIK GEREKSİZ
            router.replace('/(onboarding)/step1');
        } catch (error: any) {
            if (error.message && error.message.includes('already in use')) {
                setError('Bu e-posta adresi zaten kullanımda.');
                changeStep(0); // Hata durumunda zarifçe geri dön.
            } else { 
                setError('Bir hata oluştu. Lütfen tekrar deneyin.'); 
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally { 
            setLoading(false); 
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={styles.linkText}>Zaten bir hesabın var mı? <Text style={styles.linkTextBold}>Giriş yap.</Text></Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout 
            title={step === 0 ? "Hesap Oluştur" : "Neredeyse Bitti"}
            subtitle={step === 0 ? "Yeni bir başlangıç için bilgilerini gir." : "Sana nasıl hitap etmemizi istersin?"}
            footer={FooterLink}
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.formContainer}>
                {/* ADIM 1: E-posta ve Şifre */}
                {step === 0 && (
                    <View style={styles.inputWrapper}>
                        <AuthInput iconName="mail-outline" placeholder="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        <View style={styles.inputSeparator} />
                        <AuthInput iconName="lock-closed-outline" placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={goToNextStep} />
                    </View>
                )}

                {/* ADIM 2: Kullanıcı Adı */}
                {step === 1 && (
                     <View style={styles.inputWrapper}>
                        <AuthInput iconName="person-outline" placeholder="Tercih ettiğin isim" value={nickname} onChangeText={setNicknameLocal} autoFocus={true} onSubmitEditing={handleRegister} />
                    </View>
                )}

                {/* Butonlar adım'a göre değişiyor */}
                {step === 0 ? (
                    <Pressable onPress={goToNextStep} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
                        <Text style={styles.buttonText}>Devam Et</Text>
                    </Pressable>
                ) : (
                    <Pressable onPress={handleRegister} style={({ pressed }) => [styles.button, styles.greenButton, { opacity: pressed ? 0.8 : 1 }]} disabled={loading}>
                        {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Hesabı Oluştur</Text>}
                    </Pressable>
                )}
            </View>
        </AuthLayout>
    );
}