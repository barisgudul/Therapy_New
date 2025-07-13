// app/login.tsx

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { authScreenStyles as styles } from '../styles/auth';
import { signInWithEmail } from '../utils/auth';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignIn = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Lütfen tüm alanları doldurun.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await signInWithEmail(email, password);
            router.replace('/');
        } catch (e) {
            setError('E-posta veya şifre hatalı.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    const FooterLink = (
        <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.linkText}>Hesabın yok mu? <Text style={styles.linkTextBold}>Kayıt ol.</Text></Text>
        </TouchableOpacity>
    );

    return (
        <AuthLayout 
            title="Tekrar Hoş Geldin" 
            subtitle="Hesabına giriş yapmak için bilgilerini gir."
            footer={FooterLink}
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Temiz, gruplanmış inputlar */}
            <View style={styles.inputWrapper}>
                <AuthInput iconName="mail-outline" placeholder="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <View style={styles.inputSeparator} />
                <AuthInput iconName="lock-closed-outline" placeholder="Şifre" value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={handleSignIn} />
            </View>

            <Pressable onPress={handleSignIn} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </Pressable>
        </AuthLayout>
    );
}