// app/(app)/sessions/voice_session.tsx

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router/';
import { useFeatureAccess } from '../../../hooks/useSubscription';
import { Colors } from '../../../constants/Colors';

export default function VoiceSessionScreen() {
  const { mood: _mood } = useLocalSearchParams<{ mood?: string }>();
    const router = useRouter();

  // 1. YENİ HOOK'U KULLAN: voice_minutes özelliğine erişimimiz var mı diye sor.
  // Artık 'refresh' diye bir şey yok. Sadece 'can_use' ve 'isLoading' var.
  const { can_use, isLoading } = useFeatureAccess("voice_minutes");

  // 2. PREMIUM GATE MANTIĞINI KUR
    useEffect(() => {
    // Eğer veri hala yükleniyorsa, hiçbir şey yapma, bekle.
    if (isLoading) {
      return;
    }

    // Veri yüklendiğinde, EĞER KULLANIM HAKKI YOKSA (!can_use),
    // kullanıcıyı anında abonelik sayfasına geri at.
    if (!can_use) {
      // push yerine replace kullanıyoruz ki kullanıcı geri tuşuna basıp bu ekrana dönemesin.
      router.replace('/(settings)/subscription');
    }
  }, [isLoading, can_use, router]); // Bu değerler değiştiğinde bu kontrol tekrar çalışır.

  // 3. YÜKLENME DURUMUNU YÖNET
  // Eğer veri hala yükleniyorsa, kullanıcıya boş ekran göstermek yerine bir yüklenme animasyonu göster.
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
                            </View>
    );
  }

  // 4. EKRANIN ASIL İÇERİĞİ
  // Eğer kod buraya kadar gelebildiyse, bu demektir ki isLoading=false ve can_use=true.
  // Yani kullanıcının bu ekranı görmeye hakkı var.
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Session</Text>
      <Text style={styles.subtitle}>Bu ekranı görüyorsan, Premium hakkın var demektir.</Text>
      {/* Buraya sesli sohbet arayüzün gelecek */}
                                    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6ff',
  },
    container: {
        flex: 1,
    justifyContent: 'center',
        alignItems: 'center',
    padding: 20,
    },
    title: {
        fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
        fontSize: 16,
    color: 'gray',
    },
});
