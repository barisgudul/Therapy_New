// app/dream/analyze.tsx
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import Toast from 'react-native-toast-message';
import { COSMIC_COLORS } from '../../constants/Colors';
import { useVault } from '../../hooks/useVault';
import { handleDreamAnalysis } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';

export default function AnalyzeDreamScreen() {
  const [dream, setDream] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // ADIM 2'DEKİ DÜZELTME: Vault verisini baştan alıyoruz.
  const { data: vault, isLoading: isVaultLoading } = useVault();

  // YENİ VE AKILLI useMutation BLOĞU
  const analyzeMutation = useMutation({
    // MUTATIONFN ARTIK BÖYLE: Parametre almayan bir async fonksiyon.
    // İhtiyacı olan her şeyi içeriden, anlık olarak kendisi toplar.
    mutationFn: async () => {
      // 1. Önce kontrollerini yap, boş yere backend'i yorma.
      if (dream.trim().length < 20) {
        throw new Error('Lütfen analize başlamak için rüyanızı biraz daha detaylı anlatın.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Bu bir yetkilendirme hatası.
        throw new Error("Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.");
      }

      // Context'i burada, butona basıldığı anki TAZE verilerle oluştur.
      const dreamAnalysisContext = {
        transactionId: "dream-tx-" + Date.now(),
        userId: user.id,
        initialVault: vault || {}, // Vault'u buraya TAZE TAZE koy.
        initialEvent: {
          id: "temp-event-" + Date.now(),
          user_id: user.id,
          type: 'dream_analysis' as const,
          timestamp: Date.now(),
          created_at: new Date().toISOString(),
          data: { dreamText: dream.trim() } // trim() ekle, boşlukları temizle.
        },
        derivedData: {}
      };

      // İşte beyni burada çağırıyoruz.
      return handleDreamAnalysis(dreamAnalysisContext);
    },

    // BAŞARI DURUMU: Dönen şeyin eventId (string) olduğunu biliyoruz.
    onSuccess: (eventId: string) => {
      // Önce cache'i temizle ki liste güncellensin.
      queryClient.invalidateQueries({ queryKey: ['dreamEvents'] });
      
      console.log(`✅ Analiz tamamlandı. Kullanıcı ${eventId} ID'li sonuç sayfasına yönlendiriliyor.`);
      router.replace({ pathname: '/dream/result', params: { id: eventId } });
      
      Toast.show({
        type: 'success',
        text1: 'Analiz Başarılı!',
        text2: 'Sonuçlar yükleniyor...'
      });
    },

    // HATA DURUMU: Gelen hatayı olduğu gibi basma, anlaşılır hale getir.
    onError: (e: any) => {
      setError(e.message || 'Beklenmedik bir hata oluştu.');
      Toast.show({
        type: 'error',
        text1: 'Analiz Başarısız Oldu',
        text2: e.message || 'Lütfen daha sonra tekrar deneyin.'
      });
    },
  });

  // GÜNCELLENMİŞ handleAnalyzePress FONKSİYONU
  const handleAnalyzePress = () => {
    setError(null); // Eski hataları temizle
    Keyboard.dismiss();
    analyzeMutation.mutate(); // Mutasyonu parametresiz çağır.
  };

  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
      </TouchableOpacity>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.headerTitle}>Yeni Rüya</Text>
          <Text style={styles.headerSubtext}>Zihninizin derinliklerinden gelen mesajı yazın.</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Gecenin sessizliğinde zihnimde belirenler..."
            placeholderTextColor={COSMIC_COLORS.textSecondary}
            multiline
            value={dream}
            onChangeText={setDream}
            editable={!analyzeMutation.isPending}
            selectionColor={COSMIC_COLORS.accent}
          />
          
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[
              styles.analyzeButton,
              // Butonun pasif görünmesini sağlayan stil
              (analyzeMutation.isPending || isVaultLoading) && { opacity: 0.7 }
            ]}
            // Analiz işlemi sürerken VEYA vault yüklenirken butonu devre dışı bırak
            disabled={analyzeMutation.isPending || isVaultLoading}
            onPress={handleAnalyzePress}
          >
            {analyzeMutation.isPending ? (
              <ActivityIndicator color={COSMIC_COLORS.textPrimary} />
            ) : isVaultLoading ? (
              // Vault yüklenirken farklı bir mesaj göster, daha şık olur.
              <Text style={styles.analyzeButtonText}>Veriler Hazırlanıyor...</Text>
            ) : (
              <Text style={styles.analyzeButtonText}>Analiz Et</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { 
    position: 'absolute', 
    top: 60, 
    left: 20, 
    zIndex: 10, 
    padding: 8 
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    color: COSMIC_COLORS.textPrimary, 
    marginBottom: 8,
    textAlign: 'center'
  },
  headerSubtext: { 
    fontSize: 16, 
    color: COSMIC_COLORS.textSecondary, 
    marginBottom: 30,
    textAlign: 'center' 
  },
  input: { 
    backgroundColor: COSMIC_COLORS.inputBg,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    minHeight: 200,
    textAlignVertical: 'top',
    color: COSMIC_COLORS.textPrimary,
    marginBottom: 16
  },
  errorText: { 
    color: '#FF7B7B', 
    fontSize: 14, 
    marginBottom: 16,
    textAlign: 'center'
  },
  analyzeButton: { 
    backgroundColor: COSMIC_COLORS.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40
  },
  analyzeButtonText: { 
    color: COSMIC_COLORS.textPrimary, 
    fontSize: 18, 
    fontWeight: '600' 
  }
});