// app/(onboarding)/summary.tsx
import { useLocalSearchParams } from 'expo-router/';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { analyzeOnboardingAnswers } from '../../services/ai.service';
import { useVaultStore } from '../../store/vaultStore';

export default function SummaryScreen() {
  const params = useLocalSearchParams();
  const updateAndSyncVault = useVaultStore((s) => s.updateAndSyncVault);
  const currentVault = useVaultStore((s) => s.vault);
  const [status, setStatus] = useState('AI analiz yapıyor...');

  useEffect(() => {
    const runAnalysis = async () => {
      // Parametreleri anlamlı bir objeye dönüştür
      const answers: Record<string, string> = {};
      for (let i = 1; i <= 4; i++) {
        const q = params[`q${i}`] as string;
        const a = params[`a${i}`] as string;
        if (q && a) answers[q] = a;
      }
      const aiTraits = await analyzeOnboardingAnswers(answers);
      if (aiTraits) {
        setStatus('Profilin oluşturuldu. Harika bir başlangıç!');
        const newVault = {
          ...currentVault,
          traits: { ...currentVault?.traits, ...aiTraits },
          metadata: { ...currentVault?.metadata, onboardingCompleted: true }
        };
        await updateAndSyncVault(newVault);
      } else {
        setStatus('Analiz başarısız oldu, ama sorun değil. Seni zamanla tanıyacağız.');
      }
      setTimeout(() => {
        // Ana ekrana yönlendirme vs. burada yapılabilir
      }, 1500);
    };
    runAnalysis();
    // eslint-disable-next-line
  }, []);

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