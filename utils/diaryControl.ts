// utils/diaryControl.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const canWriteDiary = async (): Promise<{ canWrite: boolean; message: string }> => {
  try {
    const lastButtonPress = await AsyncStorage.getItem('lastDiaryButtonPress');
    
    if (lastButtonPress) {
      const lastPressTime = new Date(lastButtonPress).getTime();
      const currentTime = new Date().getTime();
      const hoursPassed = (currentTime - lastPressTime) / (1000 * 60 * 60);
      
      if (hoursPassed < 18) {
        return {
          canWrite: false,
          message: 'Bugün duygularını ve düşüncelerini günlüğüne aktardın. Yarın seni yine bekliyor olacağım!'
        };
      }
    }

    // Butona basıldığı zamanı kaydet
    await AsyncStorage.setItem('lastDiaryButtonPress', new Date().toISOString());
    return { canWrite: true, message: '' };
  } catch (error) {
    console.error('Günlük yazma kontrolü hatası:', error);
    return {
      canWrite: false,
      message: 'Günlük yazma kontrolü yapılırken bir hata oluştu.'
    };
  }
};

export const setLastDeletedDiary = async (date: string) => {
  try {
    const now = new Date();
    await AsyncStorage.setItem('lastDeletedDate', date);
    await AsyncStorage.setItem('lastDeletedTime', now.toISOString());
  } catch (error) {
    console.error('Son silinen günlük kaydedilirken hata:', error);
  }
}; 