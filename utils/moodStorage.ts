import AsyncStorage from '@react-native-async-storage/async-storage';

const MOOD_HISTORY_KEY = 'MOOD_HISTORY';

export interface MoodEntry {
  mood: string;
  timestamp: number;
  isoDate: string;
}

export const saveMoodEntry = async (moodLabel: string): Promise<void> => {
  try {
    const now = new Date();
    const newEntry: MoodEntry = {
      mood: moodLabel,
      timestamp: now.getTime(),
      isoDate: now.toISOString().split('T')[0], // YYYY-MM-DD formatı
    };

    // Mevcut geçmişi al
    const existingHistoryRaw = await AsyncStorage.getItem(MOOD_HISTORY_KEY);
    const existingHistory: MoodEntry[] = existingHistoryRaw ? JSON.parse(existingHistoryRaw) : [];

    // Yeni girişi ekle
    existingHistory.push(newEntry);

    // Güncellenmiş geçmişi kaydet
    await AsyncStorage.setItem(MOOD_HISTORY_KEY, JSON.stringify(existingHistory));

    console.log('Mood entry saved successfully:', newEntry);

  } catch (error) {
    console.error('Failed to save mood entry:', error);
  }
};