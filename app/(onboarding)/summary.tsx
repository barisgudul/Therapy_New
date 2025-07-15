// app/(onboarding)/summary.tsx (YENİ, TEMİZ VE APTAL HALİ)
import { useRouter } from 'expo-router/';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useOnboardingStore } from '../../store/onboardingStore';

export default function SummaryScreen() {
  const router = useRouter();
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  useEffect(() => {
    // Zustand store'unu temizle, artık işimiz bitti.
    resetOnboarding();
    
    // Kullanıcıyı ana sayfaya yönlendirmeden önce kısa bir bekleme süresi
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2500); // 2.5 saniye sonra ana sayfaya.

    return () => clearTimeout(timer); // Ekran terk edilirse zamanlayıcıyı temizle.
  }, [resetOnboarding, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.title}>Harika bir başlangıç!</Text>
      <Text style={styles.status}>
        Profiliniz oluşturuluyor ve kişiselleştiriliyor. Sizi ana sayfaya yönlendiriyoruz...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F9F9F9' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1c1c1e' },
    status: { fontSize: 16, textAlign: 'center', color: '#8e8e93', lineHeight: 22 },
}); 