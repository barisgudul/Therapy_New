// app/login.tsx

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { authScreenStyles as styles } from '../styles/auth';
import { supabase } from '../utils/supabase';

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // login.tsx içindeki handleSignIn fonksiyonunun YENİ ve EN YALIN HALİ

const handleSignIn = async () => {
    // 1. Arayüzü temizle ve yükleme moduna al.
    setError('');
    setLoading(true);
    console.log("======================================");
    console.log("[KESİN TEST] Eylem Başladı. En temel Supabase komutu test ediliyor.");

    try {
        // 2. DOĞRUDAN VE EN TEMEL Supabase komutunu çağır.
        // Arada hiçbir kendi fonksiyonumuz yok.
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        // 3. Supabase'den gelen cevabı analiz et.
        if (error) {
            // Eğer Supabase'den bir HATA geldiyse, bu bizim için en değerli bilgidir.
            console.error("[KESİN TEST] HATA: Supabase doğrudan hata döndürdü!");
            console.error("HATA MESAJI:", error.message);
            console.error("HATA DETAYI:", error);
            setError(`Supabase Hatası: ${error.message}`);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else if (data.session) {
            // Eğer bir OTURUM geldiyse, bu BAŞARIDIR.
            console.log("[KESİN TEST] BAŞARI: Supabase geçerli bir OTURUM döndürdü!");
            console.log("OTURUM KULLANICI ID:", data.session.user.id);
            // Başarılı olduğuna göre, yönlendirme yapabiliriz.
            router.replace('/');
        } else {
            // Hem hata hem de oturum yoksa, bu beklenmedik bir durumdur.
            console.warn("[KESİN TEST] UYARI: Supabase'den ne hata ne de oturum döndü. Bu garip bir durum.");
            setError("Bilinmeyen bir sorun oluştu.");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }

    } catch (e: any) {
        // 4. Eğer yukarıdaki kodun kendisi çökerse (network vs.), burada yakalarız.
        console.error("[KESİN TEST] KRİTİK HATA: 'try' bloğu tamamen çöktü!");
        console.error("Yakalanan Kritik Hata:", e);
        setError("Uygulama Hatası: Sunucuya bağlanılamadı.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
        // 5. Yüklemeyi durdur.
        setLoading(false);
        console.log("[KESİN TEST] Eylem Bitti.");
        console.log("======================================");
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