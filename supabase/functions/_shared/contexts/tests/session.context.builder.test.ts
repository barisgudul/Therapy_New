// supabase/functions/_shared/contexts/__tests__/session.context.builder.test.ts

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { buildTextSessionContext } from "../session.context.builder.ts";

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

// Mock RAG service
const _mockRagService = {
  retrieveContext: (_userId: string, _query: string, _params: unknown) => {
    return Promise.resolve([
      {
        content: "Mock memory 1",
        similarity: 0.9,
        source_layer: "events" as const,
      },
      {
        content: "Mock memory 2",
        similarity: 0.8,
        source_layer: "diary" as const,
      },
      {
        content: "Mock memory 3",
        similarity: 0.7,
        source_layer: "dreams" as const,
      },
    ]);
  },
};

// Test: buildTextSessionContext - warm start olmadan
Deno.test("buildTextSessionContext - warm start olmadan tam bağlam oluşturmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVault = {
    vault_data: {
      profile: { nickname: "Çömez" },
      dna_summary: "Yaratıcı düşünür",
    },
  };

  const mockMemories = [
    {
      event_type: "diary",
      content: "İş hakkında endişelerim var",
      mood: "endişeli",
      event_time: "2024-01-01T10:00:00Z",
      sentiment_data: { dominant_emotion: "endişeli" },
    },
  ];

  const mockClient = createMockSupabaseClient({
    vaults: mockVault,
    cognitiveMemories: mockMemories,
  });
  const userId = "test-user-123";
  const userMessage = "Bugün nasıl hissediyorum?";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["supabaseClient"],
    ragService: _mockRagService as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["ragService"],
  };

  // 2. EYLEM (Act)
  const result = await buildTextSessionContext(
    dependencies,
    userId,
    userMessage,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userDossier.nickname, "Çömez");
  assertEquals(result.userDossier.dnaSummary, "Yaratıcı düşünür");
  assertEquals(result.warmStartContext, null);
  assertEquals(result.recentActivities.length, 1);
  assertEquals(
    result.activityContext.includes("iş/kariyer"),
    true,
  );
  assertEquals(result.retrievedMemories.length, 1);
});

// Test: buildTextSessionContext - warm start ile
Deno.test("buildTextSessionContext - warm start ile bağlam oluşturmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVault = {
    vault_data: {
      profile: { nickname: "Çömez" },
    },
  };

  const mockPendingSession = {
    context_data: {
      originalNote: "Başlangıç mesajı",
      aiReflection: "AI analizi",
      theme: "özgüven",
      source: "diary",
    },
  };

  const mockMemories = [
    {
      event_type: "diary",
      content: "Özgüven sorunları",
      mood: "endişeli",
      event_time: "2024-01-01T10:00:00Z",
      sentiment_data: { dominant_emotion: "endişeli" },
    },
  ];

  const mockClient = createMockSupabaseClient({
    vaults: mockVault,
    pendingSessions: mockPendingSession,
    cognitiveMemories: mockMemories,
  });
  const userId = "test-user-123";
  const userMessage = "Devam etmek istiyorum";
  const pendingSessionId = "pending-session-123";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["supabaseClient"],
    ragService: _mockRagService as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["ragService"],
  };

  // 2. EYLEM (Act)
  const result = await buildTextSessionContext(
    dependencies,
    userId,
    userMessage,
    pendingSessionId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userDossier.nickname, "Çömez");
  assertEquals(result.warmStartContext?.originalNote, "Başlangıç mesajı");
  assertEquals(result.warmStartContext?.theme, "özgüven");
  assertEquals(result.retrievedMemories.length, 0); // Warm start'ta RAG atlanır
  assertEquals(result.ragForPrompt, ""); // Activity context kullanılır
});

// Test: buildTextSessionContext - RAG filtreleme testi
Deno.test("buildTextSessionContext - RAG sonuçları doğru filtrelenmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVault = {
    vault_data: {
      profile: { nickname: "TestUser" },
    },
  };

  const mockMemories = [
    {
      event_type: "diary",
      content: "İş hakkında endişelerim var, patronla konuşmam gerekiyor",
      mood: "endişeli",
      event_time: "2024-01-01T10:00:00Z",
      sentiment_data: { dominant_emotion: "endişeli" },
    },
  ];

  const mockClient = createMockSupabaseClient({
    vaults: mockVault,
    cognitiveMemories: mockMemories,
  });
  const userId = "test-user-123";
  const userMessage = "İş hakkında konuşmak istiyorum";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["supabaseClient"],
    ragService: _mockRagService as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["ragService"],
  };

  // 2. EYLEM (Act)
  const result = await buildTextSessionContext(
    dependencies,
    userId,
    userMessage,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userDossier.nickname, "TestUser");
  assertEquals(result.recentActivities.length, 1);
  assertEquals(result.retrievedMemories.length, 1); // smartFilterMemories filtrelenmiş sonuç
  assertEquals(result.ragForPrompt.includes("Mock memory"), true);
});

// Test: buildTextSessionContext - hata durumları
Deno.test("buildTextSessionContext - veritabanı hatalarında varsayılan değerler dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockClient = createMockSupabaseClient({
    vaultsError: { message: "Not found" },
    cognitiveMemoriesError: { message: "Connection failed" },
  });
  const userId = "test-user-123";
  const userMessage = "Test mesajı";

  const dependencies = {
    supabaseClient: mockClient as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["supabaseClient"],
    ragService: _mockRagService as unknown as Parameters<
      typeof buildTextSessionContext
    >[0]["ragService"],
  };

  // 2. EYLEM (Act)
  const result = await buildTextSessionContext(
    dependencies,
    userId,
    userMessage,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userDossier.nickname, null);
  assertEquals(result.userDossier.dnaSummary, null);
  assertEquals(result.recentActivities.length, 0);
  assertEquals(result.retrievedMemories.length, 1); // smartFilterMemories filtrelenmiş sonuç
});
