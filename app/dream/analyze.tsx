// app/dream/analyze.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router/';
import { MotiView } from 'moti';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { PremiumGate } from '../../components/PremiumGate';
import { COSMIC_COLORS } from '../../constants/Colors';
import { useFeatureAccess } from '../../hooks/useSubscription';
import { EventPayload } from '../../services/event.service';
import { processUserMessage } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';

export default function AnalyzeDreamScreen() {
  const [dream, setDream] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { can_use, loading: accessLoading, refresh: refreshAccess } = useFeatureAccess('dream_analysis');
  const { height: keyboardHeight } = useKeyboardAnimation();

  // BURASI İŞİN BEYNİ
  const animatedStyle = useAnimatedStyle(() => {
    // Klavye açıldığında dinamik padding ver
    return {
      paddingBottom: keyboardHeight,
    };
  });

  useEffect(() => {
    refreshAccess();
  }, [refreshAccess]);

  const handleAnalyzePress = async () => {
    if (!can_use) {
      Toast.show({
        type: 'error',
        text1: 'Limit Doldu',
        text2: 'Premium üye olmalısınız'
      });
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

      const dreamAnalysisPayload: EventPayload = {
        type: 'dream_analysis',
        data: { dreamText: dream }
      };

      const result = await processUserMessage(user.id, dreamAnalysisPayload);
      
      if (typeof result !== 'string' || !result) {
          throw new Error("Analizden geçerli bir kimlik alınamadı.");
      }
      const eventId = result;

      router.replace({
          pathname: '/dream/result',
          params: { id: eventId },
      });

    } catch (e: any) {
      console.error("Analiz hatası: ", e);
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: e.message || 'Beklenmedik bir hata oluştu.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PremiumGate featureType="dream_analysis" premiumOnly={false}>
      <LinearGradient colors={COSMIC_COLORS.background} style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={COSMIC_COLORS.textPrimary} />
        </TouchableOpacity>
        
        {/* View yerine Animated.ScrollView kullan ve animatedStyle'ı ver */}
        <Animated.ScrollView 
          style={[styles.scrollContainer, animatedStyle]}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <MotiView from={{ opacity: 0, translateY: -20 }} animate={{ opacity: 1, translateY: 0 }} style={styles.headerWrap}>
            <Ionicons name="moon-outline" size={48} color={COSMIC_COLORS.accent} />
            <Text style={styles.headerTitle}>Yeni Rüya</Text>
            <Text style={styles.headerSubtext}>Zihninizin derinliklerinden gelen mesajı yazın.</Text>
          </MotiView>
          
          <MotiView from={{ opacity: 0, translateY: 20 }} animate={{ opacity: 1, translateY: 0 }} transition={{ delay: 200 }}>
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
              disabled={isLoading || accessLoading || !can_use}
              onPress={handleAnalyzePress}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COSMIC_COLORS.accent, '#4C82B3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.analyzeButtonGradient}>
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
        </Animated.ScrollView>
      </LinearGradient>
    </PremiumGate>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    backButton: { position: 'absolute', top: 60, left: 20, zIndex: 10, padding: 8 },
    // scrollContainer'dan paddingBottom'u kaldır, çünkü artık dinamik
    scrollContainer: { paddingHorizontal: 24, paddingTop: 80 }, 
    headerWrap: { alignItems: 'center', marginBottom: 40 },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: COSMIC_COLORS.textPrimary, marginTop: 20, letterSpacing: -1 },
    headerSubtext: { fontSize: 16, color: COSMIC_COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
    inputContainer: { backgroundColor: COSMIC_COLORS.inputBg, borderRadius: 24, borderWidth: 1, borderColor: COSMIC_COLORS.cardBorder, marginBottom: 24 },
    input: { padding: 24, fontSize: 17, minHeight: 200, textAlignVertical: 'top', color: COSMIC_COLORS.textPrimary, lineHeight: 26 },
    errorText: { color: '#FF7B7B', fontSize: 14, marginBottom: 16, textAlign: 'center' },
    analyzeButton: { borderRadius: 28, overflow: 'hidden' },
    analyzeButtonGradient: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    analyzeButtonText: { color: COSMIC_COLORS.textPrimary, fontSize: 18, fontWeight: '600', marginLeft: 10 },
});
