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
import { processUserMessage } from '../../services/orchestration.service';
import { supabase } from '../../utils/supabase';

export default function AnalyzeDreamScreen() {
  const [dream, setDream] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: (payload: { userId: string, dreamPayload: any }) => 
      processUserMessage(payload.userId, payload.dreamPayload),
    onSuccess: (eventId: string) => {
      queryClient.invalidateQueries({ queryKey: ['dreamEvents'] });
      router.replace({ pathname: '/dream/result', params: { id: eventId } });
    },
    onError: (e: any) => {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: e.message || 'Beklenmedik bir hata oluştu.'
      });
    },
  });

  const handleAnalyzePress = async () => {
    if (dream.trim().length < 20) {
      setError('Lütfen analize başlamak için rüyanızı biraz daha detaylı anlatın.');
      return;
    }
    setError(null);
    Keyboard.dismiss();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dreamAnalysisPayload = {
      type: 'dream_analysis',
      data: { dreamText: dream }
    };

    analyzeMutation.mutate({ userId: user.id, dreamPayload: dreamAnalysisPayload });
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
            style={[styles.analyzeButton, analyzeMutation.isPending && { opacity: 0.7 }]}
            disabled={analyzeMutation.isPending}
            onPress={handleAnalyzePress}
          >
            {analyzeMutation.isPending ? (
              <ActivityIndicator color={COSMIC_COLORS.textPrimary} />
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