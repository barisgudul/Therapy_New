// app/login.tsx - ARTIK BİR BEYEFENDİ

import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../../components/AuthInput';
import { AuthLayout } from '../../components/AuthLayout';
import { useLoading } from '../../context/Loading';
import { authScreenStyles as styles } from '../../styles/auth';
// AĞIR İŞİ YAPAN FONKSİYONU İÇERİ ALIYORUZ
import { signInAndVerifyUser } from '../../utils/auth';

export default function LoginScreen() {
    const router = useRouter();
    const { showLoading, hideLoading } = useLoading();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        setError('');
        showLoading('Giriş yapılıyor...');

        try {
            // Bak ne kadar temiz. Tek satır.
            const result = await signInAndVerifyUser(email, password);

            if (result.success) {
                router.replace('/');
            } else {
                setError(result.error);
            }
        } catch (_error) { // ESLint hatan burada düzeldi. 'e' yerine '_' kullandık.
            setError("Uygulamada beklenmedik bir hata oluştu.");
        } finally {
            hideLoading();
        }
    };

    const ForgotPasswordLink = (
        <TouchableOpacity onPress={() => router.push('/forgot-password')} style={{ alignItems: 'center' }}>
            <Text style={[styles.linkText, { marginBottom: 12 }]}>Şifreni mi unuttun?</Text>
        </TouchableOpacity>
    );

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>Hesabın yok mu? <Text style={styles.linkTextBold}>Kayıt ol.</Text></Text>
        </TouchableOpacity>
    );

    // JSX KODUN AYNI KALIYOR, ONA LAFIM YOK.
    return (
        <AuthLayout 
            title="Oturum Aç" 
            subtitle="Kayıtlı e-posta ve şifrenle hesabına eriş."
            footer={<View>{ForgotPasswordLink}{FooterLink}</View>}
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.inputWrapper}>
                <AuthInput 
                    iconName="mail-outline" 
                    placeholder="E-posta Adresiniz"
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                />
                <View style={styles.inputSeparator} />
                <AuthInput 
                    iconName="lock-closed-outline" 
                    placeholder="Şifreniz"
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry 
                    onSubmitEditing={handleSignIn} 
                />
            </View>
            <Pressable onPress={handleSignIn} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
                <Text style={styles.buttonText}>Giriş Yap</Text>
            </Pressable>
        </AuthLayout>
    );
}