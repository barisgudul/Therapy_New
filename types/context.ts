// types/context.ts

import { AppEvent } from '../services/event.service';
import { VaultData } from '../services/vault.service';

/**
 * Her kullanıcı etkileşimini temsil eden, baştan sona taşınan bağlam.
 * Bu, sistemin "kısa süreli hafızası" gibi davranır.
 */
export interface InteractionContext {
  readonly transactionId: string; // Her işlem için benzersiz, loglama için kritik.
  readonly userId: string;        // İşlemin sahibi olan kullanıcı.
  
  // İşlem başında bir kere çekilen, değişmez veriler.
  readonly initialVault: VaultData;
  readonly initialEvent: AppEvent;
  
  // İşlem sırasında ortaya çıkan ve diğer fonksiyonların kullanabileceği dinamik veriler.
  // Bu, zincirin halkalarının birbiriyle konuşmasını sağlar.
  derivedData: {
    dominantMood?: string;         // Bir fonksiyon bunu belirler, diğeri kullanır.
    identifiedThemes?: string[];     // Bir fonksiyon bunları çıkarır, diğeri vault'a işler.
    safetyClassification?: string; // Güvenlik seviyesi işlem boyunca bilinir.
    generatedReply?: string;       // Üretilen cevap, log'a eklenmeden önce burada tutulur.
    
    // Rüya analizi için
    dreamAnalysis?: any;           // Rüya analiz sonucu
    currentQuestion?: string;      // Mevcut soru
    
    // Analiz raporları için
    analysisReport?: string;       // Yapılandırılmış analiz raporu
    
    // Günlük akışı için
    questions?: string[];          // Üretilen sorular
    moodChange?: string;           // Mood değişimi takibi
    moodTrend?: string;            // Mood trend analizi (pozitif_trend, negatif_trend, kararsız_trend)
    
    // Onboarding için
    analyzedTraits?: any;          // Analiz edilen kişilik özellikleri
    
    // ... gelecekte eklenebilecek her türlü geçici veri ...
  };
}
