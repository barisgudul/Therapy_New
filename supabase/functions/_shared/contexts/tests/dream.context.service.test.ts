// supabase/functions/_shared/contexts/dream.context.service.test.ts

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  buildDreamAnalysisContext,
  getEnhancedDreamRagContext,
  prepareDreamAnalysisDossier,
} from "../dream.context.service.ts";

// Mock types
interface MockSupabaseClient {
  from: (tableName: string) => MockQueryBuilder;
}

interface MockQueryBuilder {
  select: () => MockQueryBuilder;
  eq: () => MockQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  order: () => MockQueryBuilder;
  limit: () => MockQueryBuilder;
  gt: () => MockQueryBuilder;
}

// Mock Supabase client oluşturma fonksiyonu
function createMockSupabaseClient(
  returnData: Record<string, { data?: unknown; error?: unknown }>,
): MockSupabaseClient {
  const mock: MockSupabaseClient = {
    from: (tableName: string): MockQueryBuilder => {
      const result = {
        data: returnData[tableName]?.data,
        error: returnData[tableName]?.error,
      };

      // PromiseLike obje: .then() metodu var, Promise.allSettled çalışır
      const promiseLike: MockQueryBuilder & PromiseLike<typeof result> = {
        select: () => promiseLike,
        eq: () => promiseLike,
        maybeSingle: () => Promise.resolve(result),
        single: () => Promise.resolve(result),
        order: () => promiseLike,
        limit: () => promiseLike,
        gt: () => promiseLike,
        then: (onFulfilled?: (value: typeof result) => unknown) => {
          return Promise.resolve(result).then(onFulfilled);
        },
      } as MockQueryBuilder & PromiseLike<typeof result>;

      return promiseLike as unknown as MockQueryBuilder;
    },
  };
  return mock;
}

// Mock servisler
const _mockAiService = {
  invokeGemini: (_prompt: string, _model: string) => {
    return Promise.resolve("korku, yalnızlık");
  },
  generateElegantReport: () => Promise.resolve({} as unknown),
  embedContent: () => Promise.resolve({ embedding: [] } as unknown),
  embedContentsBatch: () => Promise.resolve({ embeddings: [] } as unknown),
};

const _mockRagService = {
  retrieveContext: (_userId: string, _query: string, _params: unknown) => {
    return Promise.resolve([
      {
        content: "Mock dream memory 1",
        source_layer: "dreams" as const,
        similarity: 0.9,
      },
      {
        content: "Mock dream memory 2",
        source_layer: "events" as const,
        similarity: 0.8,
      },
    ]);
  },
};

const _mockLogService = {
  logRagInvocation: (_client: unknown, _data: unknown) => {
    return Promise.resolve();
  },
};

// Test: prepareDreamAnalysisDossier - başarılı durum
Deno.test("prepareDreamAnalysisDossier - tüm veriler mevcut olduğunda doğru dosya hazırlamalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVaults = {
    vault_data: { profile: { therapyGoals: "Kendimi daha iyi tanımak" } },
  };
  const mockTraits = {
    confidence: "0.8",
    anxiety_level: "0.3",
    motivation: "0.7",
    openness: "0.9",
    neuroticism: "0.2",
  };
  const mockEvents = [
    {
      type: "therapy_session",
      created_at: "2024-01-01",
      data: { note: "İyi bir seanstı" },
    },
    {
      type: "diary",
      created_at: "2024-01-02",
      data: { content: "Günlük yazı" },
    },
  ];
  const mockPredictions = [
    { title: "Pozitif değişim", description: "Motivasyon artışı bekleniyor" },
    { title: "Yeni fırsatlar", description: "Kariyer fırsatları görünüyor" },
  ];
  const mockJourneyLogs = [
    { log_text: "İlk adım atıldı" },
    { log_text: "Başarı kaydedildi" },
  ];

  const mockClient = createMockSupabaseClient({
    "user_vaults": { data: mockVaults },
    "user_traits": { data: mockTraits },
    "events": { data: mockEvents },
    "predicted_outcomes": { data: mockPredictions },
    "journey_logs": { data: mockJourneyLogs },
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareDreamAnalysisDossier(
    mockClient as unknown as Parameters<typeof prepareDreamAnalysisDossier>[0],
    userId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.traits.confidence, "0.8");
  assertEquals(result.traits.anxiety_level, "0.3");
  assertEquals(result.therapyGoals, "Kendimi daha iyi tanımak");
  assertEquals(result.recentEvents.includes("therapy_session"), true);
  assertEquals(result.recentEvents.includes("diary"), true);
  assertEquals(result.predictions.includes("Pozitif değişim"), true);
  assertEquals(result.journeyLogs.includes("İlk adım atıldı"), true);
});

// Test: Vault hatası durumu - hata fırlatmalı
Deno.test("prepareDreamAnalysisDossier - vault hatası durumunda hata fırlatmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const dbError = { message: "Veritabanı bağlantısı koptu", code: "500" };
  const mockClient = createMockSupabaseClient({
    "user_vaults": { error: dbError },
    "user_traits": { data: {} },
    "events": { data: [] },
    "predicted_outcomes": { data: [] },
    "journey_logs": { data: [] },
  });
  const userId = "test-user-123";

  // 2. EYLEM VE DOĞRULAMA (Act & Assert)
  try {
    await prepareDreamAnalysisDossier(
      mockClient as unknown as Parameters<
        typeof prepareDreamAnalysisDossier
      >[0],
      userId,
    );
    // Eğer buraya gelirse test başarısız
    assertEquals(true, false, "Hata fırlatılmalıydı ama fırlatılmadı");
  } catch (error) {
    // Hata fırlatıldı, bu beklenen davranış
    assertEquals(error instanceof Error, true);
    assertEquals(
      (error as Error).message.includes("Vault bilgisi alınamadı"),
      true,
    );
  }
});

// Test: getEnhancedDreamRagContext - başarılı durum
Deno.test("getEnhancedDreamRagContext - rüya metni ve tema çıkarıldığında doğru bağlam dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockClient = createMockSupabaseClient({});
  const userId = "test-user-123";
  const dreamText = "Korkunç bir rüyaydı, yalnız başıma kalmıştım";
  const transactionId = "test-transaction-123";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["supabaseClient"],
    aiService: _mockAiService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["aiService"],
    ragService: _mockRagService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["ragService"],
    logRagInvocation: _mockLogService.logRagInvocation,
  };

  // 2. EYLEM (Act)
  const result = await getEnhancedDreamRagContext(
    dependencies,
    userId,
    dreamText,
    transactionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.includes("Mock dream memory 1"), true);
  assertEquals(result.includes("Mock dream memory 2"), true);
});

// Test: getEnhancedDreamRagContext - AI hatası durumunda fallback çalışmalı
Deno.test("getEnhancedDreamRagContext - AI hatası durumunda basit RAG kullanmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockClient = createMockSupabaseClient({});
  const userId = "test-user-123";
  const dreamText = "Test rüyası";
  const transactionId = "test-transaction-123";

  // AI servisini hata fırlatacak şekilde mock'la
  const failingAiService = {
    invokeGemini: (_prompt: string, _model: string) => {
      return Promise.reject(new Error("AI servisi çalışmıyor"));
    },
    generateElegantReport: () => Promise.resolve({} as unknown),
    embedContent: () => Promise.resolve({ embedding: [] } as unknown),
    embedContentsBatch: () => Promise.resolve({ embeddings: [] } as unknown),
  };

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["supabaseClient"],
    aiService: failingAiService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["aiService"],
    ragService: _mockRagService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["ragService"],
    logRagInvocation: _mockLogService.logRagInvocation,
  };

  // 2. EYLEM (Act)
  const result = await getEnhancedDreamRagContext(
    dependencies,
    userId,
    dreamText,
    transactionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.includes("Mock dream memory"), true);
  // Fallback'te source_layer bilgisi olmamalı
  assertEquals(result.includes("Kaynak:"), false);
});

// Test: buildDreamAnalysisContext - tüm parçalar birleştiğinde doğru sonuç dönmeli
Deno.test("buildDreamAnalysisContext - tüm bileşenler birleştiğinde doğru bağlam oluşturmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVaults = {
    vault_data: { profile: { therapyGoals: "Kendimi tanımak" } },
  };
  const mockTraits = { confidence: "0.8", anxiety_level: "0.3" };
  const mockEvents = [{
    type: "therapy_session",
    created_at: "2024-01-01",
    data: { note: "İyi bir seanstı" },
  }];
  const mockPredictions = [{
    title: "Başarı",
    description: "Motivasyon artışı",
  }];
  const mockJourneyLogs = [{ log_text: "İlk adım" }];

  const mockClient = createMockSupabaseClient({
    "user_vaults": { data: mockVaults },
    "user_traits": { data: mockTraits },
    "events": { data: mockEvents },
    "predicted_outcomes": { data: mockPredictions },
    "journey_logs": { data: mockJourneyLogs },
  });
  const userId = "test-user-123";
  const dreamText = "Başarı dolu bir rüya gördüm";
  const transactionId = "test-transaction-123";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["supabaseClient"],
    aiService: _mockAiService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["aiService"],
    ragService: _mockRagService as unknown as Parameters<
      typeof getEnhancedDreamRagContext
    >[0]["ragService"],
    logRagInvocation: _mockLogService.logRagInvocation,
  };

  // 2. EYLEM (Act)
  const result = await buildDreamAnalysisContext(
    dependencies,
    userId,
    dreamText,
    transactionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userDossier.therapyGoals, "Kendimi tanımak");
  assertEquals(result.userDossier.traits.confidence, "0.8");
  assertEquals(result.ragContext.includes("Mock dream memory"), true);
});
