// app/feel/after_feeling.tsx (Seans Sonrası Ruh Hali)
// -----------------------------------------------------------------------
// Expo deps: expo-haptics expo-linear-gradient @react-native-async-storage/async-storage react-native-reanimated

import { useRouter } from 'expo-router/';
import React from 'react';
import MoodSelector from '../../components/MoodSelector';
import { logEvent } from '../../services/api.service';

export default function AfterFeelingScreen() {
  const router = useRouter();

  const handleSaveMood = async (moodLabel: string) => {
    await logEvent({
      type: 'session_end',
      mood: moodLabel,
      data: {} // Gerekirse ek veri eklenebilir
    });
    router.replace({
      pathname: '/feel/mood_comparison',
      params: { afterMood: moodLabel }
    });
  };

  return (
    <MoodSelector
      title="Seans Sonrası Ruh Hali"
      buttonText="Tamamla"
      onSave={handleSaveMood}
    />
  );
}