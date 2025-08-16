// supabase/functions/_shared/types/context.ts

export interface VaultData {
  traits?: Partial<Record<string, number | string>>;
  memories?: { [key: string]: any }[];
  themes?: string[];
  keyInsights?: string[];
  coreBeliefs?: Record<string, string>;
  onboarding?: Record<string, string>;
  profile?: {
    nickname?: string;
    birthDate?: string;
    expectation?: string;
    therapyGoals?: string;
    previousTherapy?: string;
    relationshipStatus?:
      | "single"
      | "in_relationship"
      | "married"
      | "complicated"
      | "";
    gender?: "male" | "female" | "other" | "";
  };
  metadata?: {
    onboardingCompleted?: boolean;
    [key: string]: any;
  };
  moodHistory?: { mood: string; timestamp: string }[];
  [key: string]: any;
}

export interface AppEvent {
  id: string;
  user_id: string;
  type: string;
  timestamp: number;
  created_at: string;
  data: Record<string, any>;
}

/**
 * Her kullanıcı etkileşimini temsil eden, baştan sona taşınan bağlam.
 * Bu, sistemin "kısa süreli hafızası" gibi davranır.
 */
export interface InteractionContext {
  readonly transactionId: string; // Her işlem için benzersiz, loglama için kritik.
  readonly userId: string; // İşlemin sahibi olan kullanıcı.

  // İşlem başında bir kere çekilen, değişmez veriler.
  readonly initialVault: VaultData;
  readonly initialEvent: AppEvent;

  // İşlem sırasında ortaya çıkan ve diğer fonksiyonların kullanabileceği dinamik veriler.
  // Bu, zincirin halkalarının birbiriyle konuşmasını sağlar.
  derivedData: {
    dominantMood?: string; // Bir fonksiyon bunu belirler, diğeri kullanır.
    identifiedThemes?: string[]; // Bir fonksiyon bunları çıkarır, diğeri vault'a işler.
    safetyClassification?: string; // Güvenlik seviyesi işlem boyunca bilinir.
    generatedReply?: string; // Üretilen cevap, log'a eklenmeden önce burada tutulur.

    // Rüya analizi için
    dreamAnalysis?: unknown; // Rüya analiz sonucu
    currentQuestion?: string; // Mevcut soru

    // Analiz raporları için
    analysisReport?: string; // Yapılandırılmış analiz raporu

    // Günlük akışı için
    questions?: string[]; // Üretilen sorular
    moodChange?: string; // Mood değişimi takibi
    moodTrend?: string; // Mood trend analizi (pozitif_trend, negatif_trend, kararsız_trend)

    // Onboarding için
    analyzedTraits?: unknown; // Analiz edilen kişilik özellikleri
    // ... gelecekte eklenebilecek her türlü geçici veri ...
  };
}
