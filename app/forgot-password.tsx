// app/forgot-password.tsx (KİMLİĞİNE KAVUŞMUŞ, FARKLI BİR SAYFA)

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../utils/supabase';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handlePasswordReset = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Geçersiz E-posta', 'Lütfen geçerli bir e-posta adresi girin.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'therapy://reset-password', // Kendi deep-link şemanla değiştir
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

    if (sent) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
                    <View style={[styles.iconContainer, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={48} color="#059669" />
                    </View>
                    <Text style={styles.title}>E-postanı Kontrol Et</Text>
                    <Text style={styles.subtitle}>
                        <Text style={{ fontWeight: 'bold' }}>{email}</Text> adresine bir şifre sıfırlama bağlantısı gönderildi.
                    </Text>
                    <Pressable onPress={() => router.replace('/login')} style={[styles.button, { marginTop: 32 }]}>
                        <Text style={styles.buttonText}>Giriş Ekranına Dön</Text>
                    </Pressable>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={28} color="#4B5563" />
                </Pressable>

                <View style={styles.header}>
                    <Text style={styles.title}>Şifre Sıfırlama</Text>
                    <Text style={styles.subtitle}>Hesabına ait e-posta adresini gir, sana bir kurtarma linki gönderelim.</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Kayıtlı E-posta Adresin</Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="eposta@adresin.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onSubmitEditing={handlePasswordReset}
                            placeholderTextColor="#9CA3AF"
                            autoFocus={true}
                        />
                    </View>
                </View>

                <Pressable
                    onPress={handlePasswordReset}
                    disabled={loading}
                    style={({ pressed }) => [styles.button, (loading || pressed) && { opacity: 0.7 }]}
                >
                    {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Kurtarma Linki Gönder</Text>}
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

// BU SAYFANIN KENDİNE AİT, FARKLI BİR STİLİ VAR.
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { flex: 1, padding: 24, paddingTop: 60 },
    backButton: { position: 'absolute', top: 50, left: 24, zIndex: 10, padding: 8 },
    header: { marginBottom: 40 },
    iconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 12 },
    subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
    form: { marginBottom: 24 },
    label: { fontSize: 15, fontWeight: '500', color: '#374151', marginBottom: 8 },
    inputWrapper: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 16 },
    input: { paddingVertical: 14, fontSize: 16, color: '#111827' },
    button: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});