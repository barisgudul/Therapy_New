import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. STANDART OLAY TİPİNİ TANIMLAYALIM
//    Uygulamadaki her önemli olay bu yapıya uyacak.
export interface AppEvent {
  id: string;        // Benzersiz kimlik (örn: timestamp)
  type: EventType;   // Olayın türü (örn: 'daily_reflection', 'session_end')
  timestamp: number;   // Olayın gerçekleştiği zaman
  mood?: string;     // Olayla ilişkili ruh hali
  data: any;         // Olayın detaylı verisi (notlar, mesajlar vb.)
}

export type EventType =
  | 'daily_reflection'     // Duygu Günlüğü
  | 'session_start'        // Seans Başlangıcı (before_feeling)
  | 'session_end'          // Seans Sonu (after_feeling)
  | 'mood_comparison_note' // Seans sonrası karşılaştırma notu
  | 'text_session'         // Yazılı seans içeriği
  | 'voice_session'        // Sesli seans içeriği
  | 'video_session'        // Görüntülü seans içeriği
  | 'diary_entry';         // Günlük (diary.tsx) içeriği

/**
 * Yeni bir olayı o günün olay kaydına ekler.
 * Anahtar formatı her zaman: `events-YYYY-MM-DD`
 * @param event Kaydedilecek standart olay nesnesi.
 */
export async function logEvent(event: Omit<AppEvent, 'id' | 'timestamp'>): Promise<void> {
  const now = Date.now();
  const today = new Date(now).toISOString().split('T')[0];
  const key = `events-${today}`; // <-- HER ŞEY BU STANDART ANAHTARLA KAYDEDİLECEK

  const finalEvent: AppEvent = {
    ...event,
    id: now.toString(),
    timestamp: now,
  };

  try {
    let todaysEvents: AppEvent[] = [];
    const existingEventsRaw = await AsyncStorage.getItem(key);

    if (existingEventsRaw) {
      todaysEvents = JSON.parse(existingEventsRaw);
    }
    
    // Yeni olayı günün olayları listesine ekle
    todaysEvents.push(finalEvent);
    
    // Güncellenmiş listeyi AsyncStorage'a geri kaydet
    await AsyncStorage.setItem(key, JSON.stringify(todaysEvents));
    console.log(`✅ Olay Kaydedildi: ${finalEvent.type} -> ${key}`);

  } catch (error) {
    console.error(`Olay kaydedilirken hata oluştu (${key}):`, error);
  }
}

/**
 * Belirtilen gün sayısı için tüm olay kayıtlarını çeker ve tek bir dizide birleştirir.
 * AI analizi için veri toplama görevini üstlenir.
 * @param days Geçmişe dönük kaç günün verisi alınacak.
 * @returns Tüm olayları içeren bir AppEvent[] dizisi.
 */
export async function getEventsForLast(days: number): Promise<AppEvent[]> {
    try {
        const allKeys = await AsyncStorage.getAllKeys();
        
        // Sadece 'events-YYYY-MM-DD' formatındaki anahtarları filtrele
        const eventKeys = allKeys
            .filter(key => /^events-\d{4}-\d{2}-\d{2}$/.test(key))
            .sort((a, b) => b.localeCompare(a)) // En yeniden eskiye sırala
            .slice(0, days); // Belirtilen gün kadarını al

        if (eventKeys.length === 0) return [];
        
        const dataPairs = await AsyncStorage.multiGet(eventKeys);

        const allEvents: AppEvent[] = [];
        dataPairs.forEach(pair => {
            const eventsJson = pair[1];
            if (eventsJson) {
                try {
                    const dailyEvents: AppEvent[] = JSON.parse(eventsJson);
                    allEvents.push(...dailyEvents); // Her günün olaylarını ana listeye ekle
                } catch (e) {
                    console.error("Hatalı olay verisi parse edilemedi:", e);
                }
            }
        });

        // Tüm olayları tarihe göre en yeniden eskiye sırala ve döndür
        return allEvents.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
        console.error("Olaylar alınırken hata oluştu:", error);
        return [];
    }
} 

// ---- YENİ EKLENEN FONKSİYON ----

/**
 * Belirtilen ID'ye sahip bir olayı AsyncStorage'dan siler.
 * Olayların günlük gruplar halinde tutulduğu `events-YYYY-MM-DD` yapısına göre çalışır.
 * @param eventId Silinecek olayın ID'si (timestamp).
 */
export async function deleteEventById(eventId: string): Promise<void> {
  try {
    // 1. eventId'den (timestamp) olayın tarihini ve anahtarını türet
    const timestamp = Number(eventId);
    if (isNaN(timestamp)) {
      console.error('Geçersiz eventId, silme işlemi yapılamadı:', eventId);
      return;
    }
    const eventDate = new Date(timestamp).toISOString().split('T')[0];
    const key = `events-${eventDate}`;

    // 2. O güne ait olay listesini al
    const dailyEventsRaw = await AsyncStorage.getItem(key);
    if (!dailyEventsRaw) {
      console.warn(`Silinecek olay için anahtar bulunamadı: ${key}`);
      return;
    }

    let dailyEvents: AppEvent[] = JSON.parse(dailyEventsRaw);

    // 3. İlgili olayı listeden filtreleyerek çıkar
    const updatedDailyEvents = dailyEvents.filter(event => event.id !== eventId);

    // 4. Güncellenmiş listeyi kontrol et
    if (updatedDailyEvents.length < dailyEvents.length) {
      if (updatedDailyEvents.length > 0) {
        // Eğer gün içinde başka olaylar varsa, listeyi güncelle
        await AsyncStorage.setItem(key, JSON.stringify(updatedDailyEvents));
        console.log(`✅ Olay (${eventId}) silindi. Anahtar güncellendi: ${key}`);
      } else {
        // Eğer gün içinde başka olay kalmadıysa, anahtarı tamamen sil
        await AsyncStorage.removeItem(key);
        console.log(`✅ Olay (${eventId}) silindi. Anahtar boş kaldığı için kaldırıldı: ${key}`);
      }
    } else {
      console.warn(`Olay (${eventId}) listede bulunamadı. Anahtar: ${key}`);
    }
  } catch (error) {
    console.error(`Olay silinirken hata oluştu (ID: ${eventId}):`, error);
    // Hatanın çağrıldığı yere de bildirilmesi için tekrar fırlat
    throw error;
  }
}