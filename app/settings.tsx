// app/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react'; // React'tan useState'i import et.
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../utils/auth';
import { supabase } from '../utils/supabase'; // supabase'i import et.
// Her ayar butonu için bir component
const SettingsButton = ({
  icon,
  label,
  onPress,
  isDestructive = false, // 'Çıkış Yap' gibi butonlar için
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  isDestructive?: boolean;
}) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
    <Ionicons name={icon} size={24} color={isDestructive ? '#EF4444' : '#64748B'} />
    <Text style={[styles.buttonLabel, isDestructive && styles.destructiveText]}>{label}</Text>
    <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" style={styles.chevron} />
  </Pressable>
);

export default function SettingsScreen() {
  const router = useRouter();
  const [isResetting, setIsResetting] = useState(false);
  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // Çıkış başarılı olursa yönlendirme
              router.replace('/login');
            } catch (error: any) { // Hatayı 'any' türünde yakalayalım ki .message erişebilir olalım.
              // Hata olduğunu konsola yazdırıyoruz.
              console.error('Çıkış yapılırken bir hata oluştu:', error.message || error); 
              Alert.alert('Hata', error.message || 'Çıkış yapılırken bir sorun oluştu.');
            }
          },
        },
      ]
    );
  };
  
  const handleResetData = () => {
  const confirmationText = "tüm verilerimi sil"; // Kullanıcının girmesi gereken metin.

  // 1. SÜRTÜNME KATMANI: Standart Onay Alert'i
  Alert.alert(
    'Emin misiniz?',
    `Bu işlem GERİ ALINAMAZ! Tüm uygulama verileriniz kalıcı olarak silinecektir.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Devam Et',
        style: 'destructive',
        onPress: () => {
          // 2. DOĞRULAMA KATMANI: Metin Girişli Onay Alert'i (Sadece iOS'te bu şekilde çalışır)
          // Not: Android için custom bir modal component oluşturmak gerekir.
          // React Native'in Alert API'si Android'de metin girişi desteklemez.
          // Şimdilik iOS varsayımıyla en güvenli senaryoyu kodluyoruz.
          Alert.prompt(
            'Son Onay',
            `Lütfen devam etmek için aşağıdaki kutucuğa "${confirmationText}" yazın.`,
            [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'ONAYLIYORUM, SİL',
                style: 'destructive',
                onPress: async (inputText) => {
                  if (inputText?.toLowerCase() !== confirmationText) {
                    Alert.alert('Hata', 'Yazdığınız metin eşleşmedi. İşlem iptal edildi.');
                    return;
                  }
                  
                  // EĞER BURAYA ULAŞILDIYSA, KULLANICI İKİ AŞAMAYI DA GEÇMİŞTİR.
                  await executeDataReset();
                },
              },
            ],
            'plain-text'
          );
        },
      },
    ]
  );
};

// Asıl silme işlemini yapan fonksiyonu ayıralım ki kod temiz kalsın.
const executeDataReset = async () => {
  setIsResetting(true);
  try {
    const { error } = await supabase.functions.invoke('reset-user-data');
    if (error) throw error;

    Alert.alert(
        "İşlem Başlatıldı", 
        "Hesabınız 7 gün içinde kalıcı olarak silinmek üzere sıraya alındı. Bu süre zarfında fikrinizi değiştirirseniz, tekrar giriş yaparak işlemi iptal edebilirsiniz."
    );
    // İşlem bittikten sonra kullanıcıyı uygulamadan atıyoruz.
    await signOut();
    router.replace('/login');

  } catch (err: any) {
    console.error("Veri sıfırlama işlemi sırasında hata:", err);
    let errorMessage = "Beklenmedik bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
    
    // Hatanın internet bağlantısı kaynaklı olup olmadığını kontrol et
    if (err.message === 'Failed to fetch') {
        errorMessage = "İnternet bağlantınız kontrol edin. Sunucuya ulaşılamadı.";
    } 
    // Supabase'in döndürdüğü spesifik bir hata varsa, onu gösterelim.
    else if (err.details) { 
        errorMessage = `Sunucu Hatası: ${err.details}`;
    }
    
    Alert.alert("Başarısız Oldu", errorMessage);
}  finally {
    setIsResetting(false);
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#1E293B" />
        </Pressable>
        <Text style={styles.headerTitle}>Ayarlar</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Yönetimi</Text>
          <SettingsButton icon="person-outline" label="Profili Düzenle" onPress={() => { /* TODO: Profil düzenleme sayfası */ }} />
          <SettingsButton icon="shield-checkmark-outline" label="Şifre ve Güvenlik" onPress={() => { /* TODO: Şifre değiştirme sayfası */ }} />
          <SettingsButton icon="notifications-outline" label="Bildirim Ayarları" onPress={() => { /* TODO: Bildirim ayarları */ }} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tehlikeli Bölge</Text>
          {isResetting ? (
            <View style={styles.loadingWrapper}>
                <ActivityIndicator color="#475569" />
                <Text style={styles.loadingText}>Sıfırlanıyor...</Text>
            </View>
          ) : (
            <SettingsButton icon="trash-outline" label="Tüm Verileri Sıfırla" onPress={handleResetData} isDestructive />
          )}
          <SettingsButton icon="log-out-outline" label="Çıkış Yap" onPress={handleSignOut} isDestructive />
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>Versiyon 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Hafif gri arka plan
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonPressed: {
    backgroundColor: '#F1F5F9', // Basıldığında hafif renk değişimi
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    flex: 1,
    marginLeft: 16,
    fontSize: 18,
    color: '#334155',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 'auto',
  },
  destructiveText: {
    color: '#EF4444', // Kırmızı renk
    fontWeight: '600',
  },
  footer: {
      alignItems: 'center',
      paddingTop: 20,
  },
  footerText: {
      fontSize: 14,
      color: '#9CA3AF'
  },
  loadingWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      backgroundColor: 'white',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      marginBottom: 12,
  },
  loadingText: {
      marginLeft: 12,
      fontSize: 18,
      color: '#475569',
      fontWeight: '500'
  }
});