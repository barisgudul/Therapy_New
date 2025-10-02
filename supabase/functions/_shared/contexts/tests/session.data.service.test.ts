// supabase/functions/_shared/contexts/__tests__/session.data.service.test.ts

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  getUserRecentActivities,
  prepareEnhancedUserDossier,
  prepareWarmStartContext,
} from "../session.data.service.ts";

// Mock types
interface MockSupabaseClient {
  from: (tableName: string) => MockQueryBuilder;
}

interface MockQueryBuilder {
  select: () => MockQueryBuilder;
  eq: () => MockQueryBuilder;
  order: () => MockQueryBuilder;
  limit: () => MockQueryBuilder | Promise<{ data: unknown; error: unknown }>;
  delete: () => MockQueryBuilder;
  match: () => MockQueryBuilder;
  single: () => Promise<{ data: unknown; error: unknown }>;
}

// Mock Supabase client oluşturma fonksiyonu
function createMockSupabaseClient(returnData: {
  cognitiveMemories?: unknown;
  vaults?: unknown;
  pendingSessions?: unknown;
  cognitiveMemoriesError?: unknown;
  vaultsError?: unknown;
  pendingSessionsError?: unknown;
}): MockSupabaseClient {
  const mock: MockSupabaseClient = {
    from: (tableName: string): MockQueryBuilder => {
      if (tableName === "cognitive_memories") {
        return {
          select: () => mock.from("cognitive_memories"),
          eq: () => mock.from("cognitive_memories"),
          order: () => mock.from("cognitive_memories"),
          limit: () =>
            Promise.resolve({
              data: returnData.cognitiveMemories,
              error: returnData.cognitiveMemoriesError,
            }),
          delete: () => mock.from("cognitive_memories"),
          match: () => mock.from("cognitive_memories"),
          single: () =>
            Promise.resolve({
              data: returnData.cognitiveMemories,
              error: returnData.cognitiveMemoriesError,
            }),
        };
      }
      if (tableName === "user_vaults") {
        return {
          select: () => mock.from("user_vaults"),
          eq: () => mock.from("user_vaults"),
          order: () => mock.from("user_vaults"),
          limit: () => mock.from("user_vaults"),
          delete: () => mock.from("user_vaults"),
          match: () => mock.from("user_vaults"),
          single: () =>
            Promise.resolve({
              data: returnData.vaults,
              error: returnData.vaultsError,
            }),
        };
      }
      if (tableName === "pending_text_sessions") {
        return {
          delete: () => mock.from("pending_text_sessions"),
          match: () => mock.from("pending_text_sessions"),
          select: () => mock.from("pending_text_sessions"),
          eq: () => mock.from("pending_text_sessions"),
          order: () => mock.from("pending_text_sessions"),
          limit: () => mock.from("pending_text_sessions"),
          single: () =>
            Promise.resolve({
              data: returnData.pendingSessions,
              error: returnData.pendingSessionsError,
            }),
        };
      }
      // Default implementation
      return {
        select: () => mock.from(""),
        eq: () => mock.from(""),
        order: () => mock.from(""),
        limit: () => mock.from(""),
        delete: () => mock.from(""),
        match: () => mock.from(""),
        single: () => Promise.resolve({ data: null, error: null }),
      };
    },
  };
  return mock;
}

// Test: getUserRecentActivities - başarılı durum
Deno.test("getUserRecentActivities - cognitive memories mevcut olduğunda aktiviteleri dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockMemories = [
    {
      event_type: "diary",
      content: "Bugün çok mutluydum çünkü yeni bir proje başlattım",
      mood: "mutlu",
      event_time: "2024-01-01T10:00:00Z",
      sentiment_data: { dominant_emotion: "mutlu" },
    },
    {
      event_type: "therapy_session",
      content: "Seans çok verimli geçti",
      mood: "sakin",
      event_time: "2024-01-02T14:00:00Z",
      sentiment_data: { dominant_emotion: "sakin" },
    },
  ];

  const mockClient = createMockSupabaseClient({
    cognitiveMemories: mockMemories,
  });
  const userId = "test-user-123";
  const limit = 5;

  // 2. EYLEM (Act)
  const result = await getUserRecentActivities(
    mockClient as unknown as Parameters<typeof getUserRecentActivities>[0],
    userId,
    limit,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 2);
  assertEquals(result[0].event_type, "diary");
  assertEquals(result[0].mood, "mutlu");
  assertEquals(
    result[0].content,
    "Bugün çok mutluydum çünkü yeni bir proje başlattım",
  );
  assertEquals(result[1].event_type, "therapy_session");
  assertEquals(result[1].mood, "sakin");
});

// Test: getUserRecentActivities - veritabanı hatası
Deno.test("getUserRecentActivities - veritabanı hatası durumunda boş array dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const dbError = { message: "Veritabanı bağlantısı koptu", code: "500" };
  const mockClient = createMockSupabaseClient({
    cognitiveMemoriesError: dbError,
  });
  const userId = "test-user-123";
  const limit = 5;

  // 2. EYLEM (Act)
  const result = await getUserRecentActivities(
    mockClient as unknown as Parameters<typeof getUserRecentActivities>[0],
    userId,
    limit,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.length, 0);
});

// Test: prepareEnhancedUserDossier - vault verisi mevcut
Deno.test("prepareEnhancedUserDossier - vault verisi mevcut olduğunda tam dosya dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVault = {
    vault_data: {
      profile: { nickname: "Çömez" },
      dna_summary: "Analitik ve yaratıcı düşünen biri",
      metadata: { lastInteractionType: "diary" },
    },
  };

  const recentActivities = [
    {
      event_type: "diary",
      content: "İş stresi hakkında yazdım",
      mood: "stresli",
      event_time: "2024-01-01T10:00:00Z",
      themes: ["iş/kariyer", "duygular"],
    },
  ];

  const mockClient = createMockSupabaseClient({ vaults: mockVault });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareEnhancedUserDossier(
    mockClient as unknown as Parameters<typeof prepareEnhancedUserDossier>[0],
    userId,
    recentActivities,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.nickname, "Çömez");
  assertEquals(result.dnaSummary, "Analitik ve yaratıcı düşünen biri");
  assertEquals(result.recentMood, "stresli");
  assertEquals(result.recentTopics.length, 2);
  assertEquals(result.recentTopics.includes("iş/kariyer"), true);
  assertEquals(result.lastInteractionType, "diary");
});

// Test: prepareEnhancedUserDossier - vault verisi yokken activities'ten dosya oluştur
Deno.test("prepareEnhancedUserDossier - vault yokken activities'ten varsayılan dosya oluşturmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const recentActivities = [
    {
      event_type: "therapy_session",
      content: "İyi bir seanstı",
      mood: "mutlu",
      event_time: "2024-01-01T10:00:00Z",
      themes: ["ilişkiler", "duygular"],
    },
    {
      event_type: "diary",
      content: "Günlük yazısı",
      mood: "sakin",
      event_time: "2024-01-02T14:00:00Z",
      themes: ["geçmiş", "gelecek"],
    },
  ];

  const mockClient = createMockSupabaseClient({
    vaultsError: { message: "Not found" },
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareEnhancedUserDossier(
    mockClient as unknown as Parameters<typeof prepareEnhancedUserDossier>[0],
    userId,
    recentActivities,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.nickname, null);
  assertEquals(result.dnaSummary, null);
  assertEquals(result.recentMood, "mutlu");
  assertEquals(result.recentTopics.length, 3);
  assertEquals(result.recentTopics.includes("ilişkiler"), true);
  assertEquals(result.recentTopics.includes("duygular"), true);
  assertEquals(result.lastInteractionType, "therapy_session");
});

// Test: prepareWarmStartContext - başarılı durum
Deno.test("prepareWarmStartContext - bekleyen session mevcut olduğunda context dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockPendingSession = {
    context_data: {
      originalNote: "Başlangıç notu",
      aiReflection: "AI yorumu",
      theme: "özgüven",
      source: "diary",
    },
  };

  const mockClient = createMockSupabaseClient({
    pendingSessions: mockPendingSession,
  });
  const userId = "test-user-123";
  const pendingSessionId = "pending-session-123";

  // 2. EYLEM (Act)
  const result = await prepareWarmStartContext(
    mockClient as unknown as Parameters<typeof prepareWarmStartContext>[0],
    userId,
    pendingSessionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result?.originalNote, "Başlangıç notu");
  assertEquals(result?.aiReflection, "AI yorumu");
  assertEquals(result?.theme, "özgüven");
  assertEquals(result?.source, "diary");
});

// Test: prepareWarmStartContext - session bulunamadığında null dönmeli
Deno.test("prepareWarmStartContext - session bulunamadığında null dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockClient = createMockSupabaseClient({
    pendingSessionsError: { message: "Not found" },
  });
  const userId = "test-user-123";
  const pendingSessionId = "nonexistent-session";

  // 2. EYLEM (Act)
  const result = await prepareWarmStartContext(
    mockClient as unknown as Parameters<typeof prepareWarmStartContext>[0],
    userId,
    pendingSessionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result, null);
});
