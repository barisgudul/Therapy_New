// app/dream/analyze.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { useFeatureAccess } from '../../hooks/useSubscription';
import { incrementFeatureUsage } from '../../services/api.service';
import { EventPayload } from '../../services/event.service';
import { processUserMessage } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';

const STORAGE_KEY = 'DREAM_ANALYSES_STORAGE';

// Renk paletini diğer sayfalarla tutarlı hale getiriyoruz
const COSMIC_COLORS = {
  background: ['#0d1117', '#1A2947'] as [string, string],
  card: 'rgba(255, 255, 255, 0.05)',
  cardBorder: 'rgba(255, 255, 255, 0.15)',
  textPrimary: '#EFEFEF',
  textSecondary: '#A9B4C8',
  accent: '#5DA1D9',
  inputBg: 'rgba(0,0,0,0.2)',
  inputBorder: 'rgba(93, 161, 217, 0.5)',
};

export default function AnalyzeDreamScreen() {
  const [dream, setDream] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { can_use, loading: accessLoading, refresh: refreshAccess } = useFeatureAccess('dream_analysis');

  // Sayfa her açıldığında kontrolü yenile
  useEffect(() => {
    refreshAccess();
  }, [])

    const handleAnalyzePress = async () => {
    // Önce erişim hakkını yenileyip kontrol et
    await refreshAccess();

    if (accessLoading) {
      setError('Kullanım hakkınız kontrol ediliyor, lütfen bekleyin...');
      return;
    }

    if (!can_use) {
      Alert.alert(
        'Rüya Analizi Limiti Doldu',
        'Bu özellik için günlük kullanım limitinize ulaştınız. Sınırsız analiz için Premium\'a geçebilirsiniz.',
        [
            { text: 'Kapat', style: 'cancel' },
            { text: 'Premium\'a Geç', onPress: () => router.push('/subscription') }
        ]
      );
      return;
    }

    if (dream.trim().length < 20) {
      setError('Lütfen analize başlamak için rüyanızı biraz daha detaylı anlatın.');
      return;
    }
    setError(null);
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Kullanıcı bulunamadı!");

      // 1. ORKESTRATÖR'E GÖNDERİLECEK OLAYI OLUŞTUR
      const dreamAnalysisPayload: EventPayload = {
        type: 'dream_analysis',
        data: {
          dreamText: dream
        }
      };

      // 2. ZEKA İŞİNİ YAPSIN DİYE BEYNİ ÇAĞIR
      // processUserMessage, arka planda analyzeDreamWithContext'i, logEvent'i
      // ve vault'u güncellemeyi zaten yapacak.
      const resultString = await processUserMessage(user.id, dreamAnalysisPayload);

      if (!resultString) {
        throw new Error("Analizden geçerli bir yanıt alınamadı.");
      }
      
      // Başarılı olursa kullanım sayısını artır
      await incrementFeatureUsage('dream_analysis');
      console.log('✅ [USAGE] dream_analysis kullanımı başarıyla artırıldı.');

      // Gelen yanıt JSON olduğu için parse et
      const resultData = JSON.parse(resultString);
      
      // 3. YENİ BİR OLAY OBJESİ OLUŞTURMAYA GEREK YOK, AMA NAVİGASYON İÇİN EVENT ID LAZIM.
      // logEvent zaten Orkestratör'de yapılıyor. Şimdilik bu kısmı basitleştirelim.
      // Yönlendirme için sadece analizin kendisi yeterli.
      const navigationEventData = {
          id: 'temp-' + Date.now(), // Geçici ID, result ekranı ID'ye ihtiyaç duyuyor.
          timestamp: Date.now(),
          type: 'dream_analysis',
          data: { dreamText: dream, analysis: resultData.analysis, dialogue: [] }
      }

      // 4. Sonuç sayfasına yönlendir
      router.replace({
        pathname: './result',
        params: { eventData: JSON.stringify(navigationEventData), isNewAnalysis: "true" },
      });

    } catch (e: any) {
      console.error("Analiz hatası: ", e);
      setError('Beklenmedik bir hata oluştu: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="never"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: -20 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={styles.headerWrap}
          >
            <Ionicons name="moon-outline" size={48} color={COSMIC_COLORS.accent} />
            <Text style={styles.headerTitle}>Yeni Rüya</Text>
            <Text style={styles.headerSubtext}>
              Zihninizin derinliklerinden gelen mesajı yazın.
            </Text>
          </MotiView>
          
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: 200 }}
          >
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Gecenin sessizliğinde zihnimde belirenler..."
                placeholderTextColor={COSMIC_COLORS.textSecondary}
                multiline
                value={dream}
                onChangeText={setDream}
                editable={!isLoading}
                selectionColor={COSMIC_COLORS.accent}
              />
            </View>
            
            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.analyzeButton, isLoading && { opacity: 0.7 }]}
              disabled={isLoading}
              onPress={handleAnalyzePress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[COSMIC_COLORS.accent, '#4C82B3']} // Hafif ton farkı
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.analyzeButtonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={COSMIC_COLORS.textPrimary} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={22} color={COSMIC_COLORS.textPrimary} />
                    <Text style={styles.analyzeButtonText}>Analiz Et</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </MotiView>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80, 
    paddingBottom: 40,
  },
  headerWrap: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COSMIC_COLORS.textPrimary,
    marginTop: 20,
    letterSpacing: -1,
  },
  headerSubtext: {
    fontSize: 16,
    color: COSMIC_COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: COSMIC_COLORS.inputBg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COSMIC_COLORS.cardBorder,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  input: {
    padding: 24,
    fontSize: 17,
    minHeight: 200,
    textAlignVertical: 'top',
    color: COSMIC_COLORS.textPrimary,
    lineHeight: 26,
  },
  errorText: {
    color: '#FF7B7B',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  analyzeButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COSMIC_COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  analyzeButtonGradient: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: COSMIC_COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
});
