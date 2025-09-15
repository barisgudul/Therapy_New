// supabase/functions/_shared/config.ts

/**
 * Çevre değişkenini (environment variable) okuyan yardımcı fonksiyon.
 * Değişken bulunamazsa, sağlanan varsayılan değeri kullanır.
 * Bu, hem local geliştirmeyi (varsayılan değerlerle) hem de production'ı
 * (Supabase Dashboard'dan ayarlanan değerlerle) destekler.
 */
const getEnv = (key: string, defaultValue: string): string =>
  Deno.env.get(key) ?? defaultValue;
const getEnvAsNumber = (key: string, defaultValue: number): number => {
  const value = Deno.env.get(key);
  return value ? parseFloat(value) : defaultValue;
};

/**
 * UYGULAMA GENELİ KONFİGÜRASYON MERKEZİ
 * Tüm "sihirli sayılar" ve "sihirli metinler" burada toplanmalıdır.
 * 'as const' ifadesi, bu objenin ve içindeki tüm değerlerin
 * çalışma zamanında değiştirilemez (readonly) olmasını sağlar, bu da hataları önler.
 */
export const config = {
  /**
   * Yapay zeka modelleri için merkezi ayarlar.
   * Yarın Gemini 2.0 çıktığında, sadece burayı değiştirmen yeterli olacak.
   */
  AI_MODELS: {
    // Hızlı ve ucuz işler için (niyet analizi, basit cevaplar)
    FAST: getEnv("AI_MODEL_FAST", "gemini-1.5-flash-latest"),

    // Derin analiz ve karmaşık görevler için (rüya analizi, raporlama)
    ADVANCED: getEnv("AI_MODEL_ADVANCED", "gemini-1.5-pro-latest"),

    // Eskiden kullandığın "INTENT" ve "RESPONSE" anahtarlarını koruyoruz
    // ama artık daha genel olan "FAST" modelini kullanıyorlar.
    // Bu, eski kodun kırılmasını engeller ama yeni kodda "FAST" kullanmalısın.
    INTENT: getEnv("AI_MODEL_FAST", "gemini-1.5-flash-latest"),
    RESPONSE: getEnv("AI_MODEL_FAST", "gemini-1.5-flash-latest"),
  },

  /**
   * Retrieval-Augmented Generation (RAG) için parametreler.
   * Farklı kullanım senaryoları için farklı hassasiyet ayarları.
   */
  RAG_PARAMS: {
    // Günlük yansıma gibi daha genel, kişisel konular için
    DAILY_REFLECTION: {
      threshold: getEnvAsNumber("RAG_THRESHOLD_DAILY", 0.4),
      count: getEnvAsNumber("RAG_COUNT_DAILY", 3),
    },
    // Rüya analizi gibi daha spesifik ve derin konular için
    DREAM_ANALYSIS: {
      threshold: getEnvAsNumber("RAG_THRESHOLD_DREAM", 0.37),
      count: getEnvAsNumber("RAG_COUNT_DREAM", 9),
    },
    // Eskiden kullandığın genel RAG_CONFIG'i koruyoruz ama
    // artık daha spesifik olan üsttekileri kullanmalısın.
    DEFAULT: {
      THRESHOLD: getEnvAsNumber("RAG_THRESHOLD_DEFAULT", 0.75),
      COUNT: getEnvAsNumber("RAG_COUNT_DEFAULT", 3),
    },
  },

  /**
   * Prompt ve yanıtlar için genel limitler.
   * Sistemi kötüye kullanımdan ve aşırı maliyetlerden korur.
   */
  PROMPT_LIMITS: {
    MAX_PROMPT_LENGTH: getEnvAsNumber("MAX_PROMPT_LENGTH", 1000),
    MAX_RESPONSE_LENGTH: getEnvAsNumber("MAX_RESPONSE_LENGTH", 500),
  },

  /**
   * LLM token limitleri - maliyet kontrolü için kesin tavanlar
   * Her özellik için ayrı limit tanımlanır, env ile override edilebilir
   */
  LLM_LIMITS: {
    DAILY_REFLECTION: getEnvAsNumber("LLM_MAX_OUT_DAILY_REFLECTION", 200),
    DREAM_ANALYSIS: getEnvAsNumber("LLM_MAX_OUT_DREAM_ANALYSIS", 600),
    DIARY_START: getEnvAsNumber("LLM_MAX_OUT_DIARY_START", 150),
    DIARY_NEXT: getEnvAsNumber("LLM_MAX_OUT_DIARY_NEXT", 150),
    DIARY_CONCLUSION: getEnvAsNumber("LLM_MAX_OUT_DIARY_CONCLUSION", 250),

    // AI analiz ve raporlar için tavan
    AI_ANALYSIS: getEnvAsNumber("LLM_MAX_OUT_AI_ANALYSIS", 1024),
    // Text session yanıtları için tavan (warm start dahil)
    TEXT_SESSION_RESPONSE: getEnvAsNumber("LLM_MAX_OUT_TEXT_SESSION", 128),
    // Onboarding insight için tavan (çok kısa ve ucuz)
    ONBOARDING_INSIGHT: getEnvAsNumber("LLM_MAX_OUT_ONBOARDING_INSIGHT", 150),
  } as const,

  /**
   * Özellik bayrakları - dinamik özellik kontrolü için
   * Environment variable'larla açılıp kapatılabilir
   */
  FEATURE_FLAGS: {
    ANTIPARROT_ENABLED: getEnv("ANTIPARROT_ENABLED", "1") === "1",
  } as const,
} as const;

// LLM limitleri ayrı export - kolay import için
export const LLM_LIMITS = config.LLM_LIMITS;
