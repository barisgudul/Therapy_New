// app/feel/before_feeling.tsx (Seans Öncesi Ruh Hali)
// -----------------------------------------------------------------------
// Expo deps: expo-haptics expo-linear-gradient @react-native-async-storage/async-storage react-native-reanimated

import { useLocalSearchParams, useRouter } from 'expo-router/';
import React from 'react';
import MoodSelector from '../../../components/MoodSelector';
import { logEvent } from '../../../services/api.service';

export default function BeforeFeelingScreen() {
  const router = useRouter();
  const { sessionType, therapistId } = useLocalSearchParams<{ sessionType?: string, therapistId?: string }>();

  const handleSaveMood = async (moodLabel: string) => {
    await logEvent({
      type: 'session_start',
      mood: moodLabel,
      data: { sessionType, therapistId }
    });
    router.replace({
      pathname: `/sessions/${sessionType}_session`,
      params: { therapistId, mood: moodLabel }
    });
  };

  return (
    <MoodSelector
      title="Seans Öncesi Ruh Hali"
      buttonText="Seansa Başla"
      onSave={handleSaveMood}
    />
  );
}