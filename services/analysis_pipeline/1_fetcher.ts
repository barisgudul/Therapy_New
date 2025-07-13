// services/analysis_pipeline/1_fetcher.ts (YENİ VE KUSURSUZ HALİ)

import { InsufficientDataError } from '../../utils/errors';
import { AppEvent, getEventsForLast } from '../event.service';

/**
 * Belirtilen gün sayısına göre olayları veritabanından çeker ve
 * analiz için yeterli veri olup olmadığını kontrol eder.
 * @param days Analiz edilecek gün sayısı.
 * @returns Yeterli sayıda AppEvent dizisi.
 * @throws {InsufficientDataError} Eğer 3'ten az olay bulunursa.
 */
export async function fetchAndValidateAnalysisEvents(days: number): Promise<AppEvent[]> {
  try {
    console.log(`[FETCHER] ${days} günlük olaylar çekiliyor...`);
    const eventsFromPeriod = await getEventsForLast(days);

    if (eventsFromPeriod.length < 3) {
      throw new InsufficientDataError(`Analiz için en az 3 olay gerekli, sadece ${eventsFromPeriod.length} tane bulundu.`);
    }
    
    console.log(`[FETCHER] ${eventsFromPeriod.length} olay başarıyla çekildi.`);
    // DOĞRUDAN DÖNDÜR. ARADA GEREKSİZ BİR İŞLEM YOK.
    return eventsFromPeriod;

  } catch (error) {
    console.error('[FETCHER] Veri çekme ve doğrulama sırasında kritik hata:', error);
    throw error;
  }
} 