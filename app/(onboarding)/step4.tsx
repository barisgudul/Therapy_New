// app/(onboarding)/step4.tsx
import { useLocalSearchParams, useRouter } from 'expo-router/';
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';

const QUESTION = "Duygularını başkalarıyla paylaşmak senin için ne kadar kolay?";

export default function Step4Screen() {
  const [answer, setAnswer] = useState('');
  const router = useRouter();
  const params = useLocalSearchParams();

  const handleNext = () => {
    router.push({
      pathname: '/onboarding/summary',
      params: { ...params, q4: QUESTION, a4: answer }
    });
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
      <Button title="Bitir" onPress={handleNext} disabled={!answer.trim()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  question: { fontSize: 20, marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 20 }
}); 