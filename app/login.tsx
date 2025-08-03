// app/login.tsx

import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { AuthInput } from '../components/AuthInput';
import { AuthLayout } from '../components/AuthLayout';
import { authScreenStyles as styles } from '../styles/auth';
import { supabase } from '../utils/supabase';

// Hata mesajları zaten kullanıcı dostu, bunlara dokunmuyoruz.
const getFriendlyError = (raw: string): string => {
    const msg = raw.toLowerCase();
    if (msg.includes("invalid login credentials"))
        return "E-posta veya şifre hatalı. Lütfen tekrar kontrol edin.";
    if (msg.includes("network") || msg.includes("fetch"))
        return "İnternet bağlantınızı kontrol edin.";
    if (msg.includes("user not found"))
        return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.";
    if (msg.includes("email not confirmed"))
        return "Lütfen e-posta adresinizi onaylayın.";
    return "Beklenmedik bir hata oluştu. Daha sonra tekrar deneyin.";
};

export default function LoginScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // BU TEST FONKSİYONU, ASIL SORUNU ÇÖZENE KADAR BİZİM RÖNTGEN MAKİNEMİZ.
    // DOKUNMUYORUZ.
    const handleSignIn = async () => {
        setError('');
        setLoading(true);
        console.log("======================================");
        console.log("[KESİN TEST] Eylem Başladı: Giriş yapılıyor...");
        try {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (signInError) {
                console.error("[KESİN TEST] HATA: Giriş yapılamadı.", signInError.message);
                setError(getFriendlyError(signInError.message));
                setLoading(false); return;
            }

            const user = signInData.user;
            if (!user) {
                console.error("[KESİN TEST] HATA: Giriş başarılı ama kullanıcı bilgisi alınamadı.");
                setError("Giriş sonrası kullanıcı bilgisi alınamadı.");
                setLoading(false); return;
            }

            console.log("[KESİN TEST] BAŞARI: Giriş yapıldı. Kullanıcı ID:", user.id);
            console.log("[KESİN TEST] Şimdi veritabanı testi başlıyor...");

            const { data: vaultData, error: vaultError } = await supabase
                .from('user_vaults')
                .select('user_id').eq('user_id', user.id).limit(1).single();

            if (vaultError) {
                console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.error("[KESİN TEST] KRİTİK HATA: Veritabanı sorgusu başarısız!", vaultError);
                console.error("BU HATA, RLS POLİTİKASININ BU SORGUMUZU ENGELLEDİĞİ ANLAMINA GELİR.");
                console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                setError("Veritabanına erişim engellendi. Lütfen destekle iletişime geçin.");
                await supabase.auth.signOut();
                setLoading(false); return;
            }

            if (vaultData) {
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                console.log("[KESİN TEST] ZAFER: Veritabanından veri başarıyla okundu!");
                console.log("TEORİ ÇÖKTÜ: user_id doğru, RLS çalışıyor. Sorun state management'ta.");
                console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                router.replace('/');
            } else {
                console.warn("[KESİN TEST] UYARI: Sorgu başarılı ama veri bulunamadı.");
                setError("Giriş başarılı ama profil veriniz bulunamadı.");
                await supabase.auth.signOut();
            }
        } catch (e: any) {
            console.error("[KESİN TEST] KRİTİK HATA: Bütün 'try' bloğu çöktü!", e.message);
            setError("Beklenmedik bir uygulama hatası.");
        } finally {
            setLoading(false);
            console.log("[KESİN TEST] Eylem Bitti.");
            console.log("======================================");
        }
    };

    // Footer linkleri de standart ve iyi. Dokunmuyoruz.
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

    // Bütün değişiklikler burada.
    return (
        <AuthLayout 
            title="Oturum Aç" 
            subtitle="Kayıtlı e-posta ve şifrenle hesabına eriş."
            // O render hatasını engellemek için footer'ı güvenli bir View'e alıyoruz.
            footer={
                <View>
                    {ForgotPasswordLink}
                    {FooterLink}
                </View>
            }
        >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputWrapper}>
                <AuthInput 
                    iconName="mail-outline" 
                    placeholder="E-posta Adresiniz" // Daha profesyonel
                    value={email} 
                    onChangeText={setEmail} 
                    keyboardType="email-address" 
                    autoCapitalize="none" 
                />
                <View style={styles.inputSeparator} />
                <AuthInput 
                    iconName="lock-closed-outline" 
                    placeholder="Şifreniz" // Daha profesyonel
                    value={password} 
                    onChangeText={setPassword} 
                    secureTextEntry 
                    onSubmitEditing={handleSignIn} 
                />
            </View>

            <Pressable onPress={handleSignIn} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
            </Pressable>
        </AuthLayout>
    );
}