// app/(onboarding)/summary.tsx
import { useRouter } from 'expo-router/';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../context/Auth';
import { analyzeOnboardingAnswers } from '../../services/ai.service';
import { EventType } from '../../services/event.service';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useVaultStore } from '../../store/vaultStore';

export default function SummaryScreen() {
  const { user } = useAuth();
  const updateAndSyncVault = useVaultStore((s) => s.updateAndSyncVault);
  const currentVault = useVaultStore((s) => s.vault);
  const answers = useOnboardingStore((s) => s.answers);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const router = useRouter();
  const [status, setStatus] = useState('AI analiz yapıyor...');

  useEffect(() => {
    const runAnalysis = async () => {
      // AppEvent için zorunlu alanlar: id, user_id, type, timestamp, created_at, data
      const now = new Date();
      const fakeEvent = {
        id: uuidv4(),
        user_id: user?.id || '',
        type: 'ai_analysis' as EventType,
        timestamp: now.getTime(),
        created_at: now.toISOString(),
        data: { answers },
      };
      const fakeContext = {
        transactionId: uuidv4(),
        userId: user?.id || '',
        initialVault: currentVault,
        initialEvent: fakeEvent,
        derivedData: {},
      };
      const aiTraits = await analyzeOnboardingAnswers(fakeContext);
      if (aiTraits) {
        setStatus('Profilin oluşturuldu. Harika bir başlangıç!');
        const newVault = {
          ...currentVault,
          traits: { ...currentVault?.traits, ...aiTraits },
          metadata: { ...currentVault?.metadata, onboardingCompleted: true }
        };
        await updateAndSyncVault(newVault);
        resetOnboarding();
      } else {
        setStatus('Analiz başarısız oldu, ama sorun değil. Seni zamanla tanıyacağız.');
      }
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    };
    runAnalysis();
    // currentVault, updateAndSyncVault, answers, resetOnboarding, router bağımlılıklara eklendi
  }, [currentVault, updateAndSyncVault, answers, resetOnboarding, router, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Onboarding Özeti</Text>
      <Text style={styles.status}>{status}</Text>
      {status.includes('AI analiz') && <ActivityIndicator size="large" style={{ marginTop: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  status: { fontSize: 16, textAlign: 'center' },
}); 