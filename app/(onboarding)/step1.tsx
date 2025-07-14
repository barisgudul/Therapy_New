// app/(onboarding)/step1.tsx
import { useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { useOnboardingStore } from '../../store/onboardingStore';

const QUESTION = "Kendini en güçlü ve yetenekli hissettiğin bir anı anlatır mısın?";

export default function Step1Screen() {
  const [answer, setAnswer] = useState('');
  const router = useRouter();
  const setOnboardingAnswer = useOnboardingStore((s) => s.setAnswer);

  const handleNext = () => {
    setOnboardingAnswer(2, QUESTION, answer);
    router.push('/onboarding/step2');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{QUESTION}</Text>
      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        placeholder="Cevabını yaz..."
      />
      <Button title="İleri" onPress={handleNext} disabled={!answer.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  question: { fontSize: 20, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 }
}); 