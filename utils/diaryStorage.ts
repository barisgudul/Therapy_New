import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiaryEntry {
  messages: Array<{text: string, isUser: boolean}>;
  date: string;
}

const STORAGE_KEY = 'diary-entries';

export const saveDiaryEntry = async (entry: DiaryEntry): Promise<void> => {
  try {
    // Mevcut günlükleri al
    const existingEntries = await AsyncStorage.getItem(STORAGE_KEY);
    const entries: DiaryEntry[] = existingEntries ? JSON.parse(existingEntries) : [];
    
    // Yeni günlüğü ekle
    entries.unshift(entry);
    
    // Güncellenmiş listeyi kaydet
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Günlük kaydetme hatası:', error);
    throw error;
  }
};

export const getDiaryEntries = async (): Promise<DiaryEntry[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Günlükler yüklenirken hata:', error);
    return [];
  }
};

export const deleteDiaryEntry = async (date: string): Promise<void> => {
  try {
    const entries = await getDiaryEntries();
    const updatedEntries = entries.filter(entry => entry.date !== date);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  } catch (error) {
    console.error('Günlük silme hatası:', error);
    throw error;
  }
}; 