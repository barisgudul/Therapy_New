// app/feel/after_feeling.tsx (Seans Sonrası Ruh Hali)
// -----------------------------------------------------------------------
// Expo deps: expo-haptics expo-linear-gradient @react-native-async-storage/async-storage react-native-reanimated

import { useRouter } from 'expo-router/';
import React from 'react';
import MoodSelector from '../../../components/MoodSelector';

export default function AfterFeelingScreen() {
  const router = useRouter();

  const handleSaveMood = async (moodLabel: string) => {
    // ARTIK HİÇBİR ŞEYİ LOG'LAMIYORUZ.
    // Sadece ruh hali bilgisini alıp bir sonraki ekrana gidiyoruz.
    router.replace({
      pathname: '/feel/mood_comparison',
      params: { afterMood: moodLabel }
    });
    await Promise.resolve(); // Async signature için gerekli
  };

  return (
    <MoodSelector
      title="Seans Sonrası Ruh Hali"
      buttonText="Tamamla"
      onSave={handleSaveMood}
    />
  );
}