// app/settings.tsx

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router/';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signOut } from '../utils/auth'; // Bu fonksiyonu daha sonra oluşturacağız.

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
    Alert.alert(
      'Tüm Verileri Sıfırla',
      'Bu işlem geri alınamaz! Hesabınızla ilişkili tüm seanslar, notlar ve kişisel veriler kalıcı olarak silinecektir. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Hepsini Sil',
          style: 'destructive',
          onPress: () => {
            console.log(">> TODO: Veri sıfırlama fonksiyonu çağrılacak.");
            Alert.alert("Başarılı", "Tüm verileriniz başarıyla sıfırlandı.");
          },
        },
      ]
    );
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
          <SettingsButton icon="trash-outline" label="Tüm Verileri Sıfırla" onPress={handleResetData} isDestructive />
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
  }
});