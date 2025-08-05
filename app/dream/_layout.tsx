// app/dream/_layout.tsx - SABİT SÜRÜM
import { useRouter, useSegments } from 'expo-router/';
import { Stack } from 'expo-router/stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFeatureAccess } from '../../hooks/useSubscription';

export default function DreamLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { can_use, loading } = useFeatureAccess('dream_analysis');

  const isEnteringAnalyze = segments[segments.length - 1] === 'analyze';

  // Yükleme durumu
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Eğer analyze'a girmeye çalışıyor ama yetkisi yoksa
  if (isEnteringAnalyze && !can_use) {
    router.replace('/dream/index');
    return null; // Render etme
  }

  // Normal flow
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="analyze" />
      <Stack.Screen name="result" />
    </Stack>
  );
}