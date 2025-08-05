// app/forgot-password.tsx

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Alert, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { useLoading } from '../context/Loading';
import { authScreenStyles as styles } from '../styles/auth';
import { supabase } from '../utils/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { showLoading, hideLoading } = useLoading();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);

    const handlePasswordReset = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin.');
            return;
        }
        showLoading('Link gönderiliyor...');
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'therapy://reset-password',
        });
        if (error) {
            Alert.alert('Hata', 'Bir sorun oluştu: ' + error.message);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
            setSent(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        hideLoading();
    };

    if (sent) {
        return (
            <View style={[styles.background, { justifyContent: 'center', padding: 24 }]}>
                <Text style={styles.title}>E-postanı Kontrol Et</Text>
                <Text style={styles.subtitle}>
                    <Text style={{ fontWeight: 'bold' }}>{email}</Text> adresine bir şifre sıfırlama bağlantısı gönderildi.
                </Text>
                <Pressable onPress={() => router.replace('/login')} style={[styles.button, { marginTop: 32 }]}>
                    <Text style={styles.buttonText}>Giriş Ekranına Dön</Text>
                </Pressable>
            </View>
        );
    }

    const FooterLink = (
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Giriş ekranına <Text style={styles.linkTextBold}>geri dön.</Text></Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout
            title="Şifre Sıfırlama"
            subtitle="Hesabına ait e-postayı gir, sana bir kurtarma linki gönderelim."
            footer={FooterLink}
        >
            <View style={{ height: 20 }} /> 

            <View style={styles.inputWrapper}>
                <AuthInput
                    iconName="mail-outline"
                    placeholder="E-posta Adresin"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onSubmitEditing={handlePasswordReset}
                    autoFocus={true}
                />
            </View>

            <Pressable
                onPress={handlePasswordReset}
                style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]}
            >
                <Text style={styles.buttonText}>Kurtarma Linki Gönder</Text>
            </Pressable>
        </AuthLayout>
    );
}