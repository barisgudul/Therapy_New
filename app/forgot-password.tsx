// app/forgot-password.tsx (ARTIK AİLENİN BİR PARÇASI)

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TouchableOpacity, View } from 'react-native';
// DOĞRU PARÇALARI İÇERİ ALIYORUZ
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { authScreenStyles as styles } from '../styles/auth'; // PAYLAŞILAN STİLLER
import { supabase } from '../utils/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    // Bu fonksiyonun mantığı aynı kalıyor, buna dokunmuyoruz.
    const handlePasswordReset = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin.');
            return;
        }
        setLoading(true);
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
        setLoading(false);
    };

    // Başarılı gönderim ekranı aynı kalabilir, o farklı bir amaca hizmet ediyor.
    if (sent) {
        // Bu UI kendine özgü olduğu için burada kalabilir.
        // Ama istersen bunu da bir AuthLayout içine koyabilirsin. Şimdilik kalsın.
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

    // Geri tuşu için footer
    const FooterLink = (
        <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Giriş ekranına <Text style={styles.linkTextBold}>geri dön.</Text></Text>
        </TouchableOpacity>
    );

    // ARTIK BÜTÜN SAYFAYI AUTH LAYOUT İLE OLUŞTURUYORUZ
    return (
        <AuthLayout
            title="Şifre Sıfırlama"
            subtitle="Hesabına ait e-postayı gir, sana bir kurtarma linki gönderelim."
            footer={FooterLink}
        >
            {/* Hata mesajı için yer */}
            <View style={{ height: 20 }} /> 

            <View style={styles.inputWrapper}>
                {/* PAYLAŞILAN AuthInput BİLEŞENİNİ KULLANIYORUZ */}
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
                disabled={loading}
                style={({ pressed }) => [styles.button, (loading || pressed) && { opacity: 0.7 }]}
            >
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Kurtarma Linki Gönder</Text>}
            </Pressable>
        </AuthLayout>
    );
}

// ARTIK BU SAYFANIN KENDİNE AİT BİR STİL DOSYASI YOK.
// ÇÜNKÜ PAYLAŞILANI KULLANIYOR.