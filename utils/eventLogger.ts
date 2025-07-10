// utils/eventLogger.ts
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
  | 'diary_entry'         // Günlük (diary.tsx) içeriği
  | 'dream_analysis'      // Rüya analizi
  // --- YENİ HAFIZA TÜRLERİ ---
  | 'user_vault'           // Dinamik Kullanıcı Kasası (JSON objesi)
  | 'journey_log_entry';   // Kronolojik Seyir Defteri'ne eklenen her bir özet

/**
 * Yeni bir olayı o günün olay kaydına ekler.
 * Anahtar formatı her zaman: `events-YYYY-MM-DD`
 * @param event Kaydedilecek standart olay nesnesi.
 */
export async function logEvent(event: Omit<AppEvent, 'id' | 'timestamp'>): Promise<string> {
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
    return finalEvent.id;
  } catch (error) {
    console.error(`Olay kaydedilirken hata oluştu (${key}):`, error);
    throw error;
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

/**
 * Belirtilen ID'ye sahip bir olayın `data` alanını günceller.
 * @param eventId Güncellenecek olayın ID'si (timestamp).
 * @param newData Olayın yeni data nesnesi.
 */
export async function updateEventData(eventId: string, newData: any): Promise<void> {
  try {
    const timestamp = Number(eventId);
    if (isNaN(timestamp)) {
      console.error('Geçersiz eventId, güncelleme işlemi yapılamadı:', eventId);
      return;
    }
    const eventDate = new Date(timestamp).toISOString().split('T')[0];
    const key = `events-${eventDate}`;

    const dailyEventsRaw = await AsyncStorage.getItem(key);
    if (!dailyEventsRaw) {
      console.warn(`Güncellenecek olay için anahtar bulunamadı: ${key}`);
      return;
    }

    let dailyEvents: AppEvent[] = JSON.parse(dailyEventsRaw);

    // Güncellenecek olayın index'ini bul
    const eventIndex = dailyEvents.findIndex(event => event.id === eventId);

    if (eventIndex !== -1) {
      // Olayın data alanını yeni veriyle güncelle
      dailyEvents[eventIndex].data = newData;
      
      // Tüm günün olaylarını güncellenmiş haliyle geri yaz
      await AsyncStorage.setItem(key, JSON.stringify(dailyEvents));
      console.log(`✅ Olay (${eventId}) datası güncellendi. Anahtar: ${key}`);
    } else {
      console.warn(`Güncellenecek Olay (${eventId}) listede bulunamadı. Anahtar: ${key}`);
    }
  } catch (error) {
    console.error(`Olay datası güncellenirken hata oluştu (ID: ${eventId}):`, error);
    throw error;
  }
}

// const LAST_DREAM_ANALYSIS_DATE_KEY = 'lastDreamAnalysisDate';

/**
 * Kullanıcının yeni bir ücretsiz rüya analizi yapıp yapamayacağını kontrol eder.
 * Son analizden bu yana 7 gün geçtiyse izin verir.
 * @returns { canAnalyze: boolean, daysRemaining: number }
 */
// export async function canUserAnalyzeDream(): Promise<{ canAnalyze: boolean, daysRemaining: number }> {
//   const lastAnalysisDateStr = await AsyncStorage.getItem(LAST_DREAM_ANALYSIS_DATE_KEY);
//
//   if (!lastAnalysisDateStr) {
//     // Hiç analiz yapmamış, izin ver.
//     return { canAnalyze: true, daysRemaining: 0 };
//   }
//
//   const lastAnalysisDate = new Date(Number(lastAnalysisDateStr));
//   const now = new Date();
//   
//   // Aradaki farkı milisaniye cinsinden hesapla
//   const diffTime = now.getTime() - lastAnalysisDate.getTime();
//   const diffDays = diffTime / (1000 * 60 * 60 * 24);
//
//   if (diffDays >= 7) {
//     // 7 gün veya daha fazla geçmiş, izin ver.
//     return { canAnalyze: true, daysRemaining: 0 };
//   } else {
//     // Henüz 7 gün geçmemiş.
//     const daysRemaining = Math.ceil(7 - diffDays);
//     return { canAnalyze: false, daysRemaining };
//   }
// }

/**
 * Yeni bir rüya analizi yapıldıktan sonra bugünün tarihini kaydeder.
 */
// export async function recordDreamAnalysisUsage(): Promise<void> {
//   await AsyncStorage.setItem(LAST_DREAM_ANALYSIS_DATE_KEY, Date.now().toString());
//   console.log('Rüya analizi kullanım zamanı kaydedildi.');
// }

// Haftalık limit fonksiyonları geliştirme aşamasında, şimdilik stub olarak export ediliyor
export async function canUserAnalyzeDream(): Promise<{ canAnalyze: boolean, daysRemaining: number }> {
  return { canAnalyze: true, daysRemaining: 0 };
}
export async function recordDreamAnalysisUsage(): Promise<void> {
  // no-op
}

// --- YENİ HAFIZA YÖNETİM FONKSİYONLARI ---

/**
 * Kullanıcı Kasası'nı getirir. Sadece tek bir 'user_vault' olacağı için en sonuncusunu bulur.
 */
export async function getUserVault(): Promise<any | null> {
  try {
    const allEvents = await getEventsForLast(365); // Geniş bir zaman aralığı iyidir.
    const vaultEvent = allEvents.find(e => e.type === 'user_vault');
    return vaultEvent ? vaultEvent.data : null;
  } catch (error) {
    console.error("Kullanıcı Kasası alınırken hata:", error);
    return null;
  }
}

/**
 * Kullanıcı Kasası'nı kaydeder veya günceller.
 * @param newVaultData Kasanın tamamının güncel hali.
 */
export async function updateUserVault(newVaultData: any): Promise<void> {
  try {
    const allEvents = await getEventsForLast(365);
    const existingVault = allEvents.find(e => e.type === 'user_vault');

    if (existingVault) {
      // Var olanı güncelle
      await updateEventData(existingVault.id, newVaultData);
    } else {
      // Yoksa yeni oluştur
      await logEvent({ type: 'user_vault', data: newVaultData });
    }
  } catch (error) {
    console.error("Kullanıcı Kasası güncellenirken hata:", error);
  }
}

/**
 * Seyir Defteri'ne yeni bir giriş (kısa özet) ekler.
 * @param logEntryText Eklenen seans/rüya/günlük özeti.
 */
export async function addJourneyLogEntry(logEntryText: string): Promise<void> {
    try {
        await logEvent({
            type: 'journey_log_entry',
            data: {
                entry: logEntryText,
                // Bu zaman damgası, olayların sıralanması için kritiktir.
                // logEvent zaten timestamp ekliyor, bu yüzden burada eklemeye gerek yok.
            }
        });
    } catch (error) {
        console.error("Seyir Defteri'ne giriş eklenirken hata:", error);
    }
}

/**
 * Seyir Defteri'nin son 'X' girişini getirir.
 * @param limit Kaç adet son girişin getirileceği.
 */
export async function getRecentJourneyLogEntries(limit: number = 5): Promise<string[]> {
  try {
    const allEvents = await getEventsForLast(365);
    return allEvents
      .filter(e => e.type === 'journey_log_entry')
      .sort((a, b) => b.timestamp - a.timestamp) // En yeniden eskiye sırala
      .slice(0, limit)
      .map(e => e.data.entry as string)
      .reverse(); // Kronolojik sıra için tekrar ters çevir (eskiden yeniye)
  } catch (error) {
    console.error("Seyir Defteri girişleri alınırken hata:", error);
    return [];
  }
}
