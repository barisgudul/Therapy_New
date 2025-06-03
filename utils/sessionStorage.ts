import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SessionData {
  date: string;
  type: 'diary' | 'chat' | 'note';
  content: string;
  summary: string;
  mood: string;
  tags: string[];
}

const STORAGE_KEY = 'session-data';

export const saveSessionData = async (data: SessionData): Promise<void> => {
  try {
    // Mevcut session verilerini al
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    const sessions: SessionData[] = existingData ? JSON.parse(existingData) : [];
    
    // Yeni session verisini ekle
    sessions.unshift(data);
    
    // Güncellenmiş listeyi kaydet
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Session verisi kaydetme hatası:', error);
    throw error;
  }
};

export const getSessionData = async (): Promise<SessionData[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Session verileri yüklenirken hata:', error);
    return [];
  }
}; 