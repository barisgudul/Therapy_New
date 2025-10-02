// supabase/functions/_shared/contexts/dailyReflection.context.service.test.ts

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import {
  buildDailyReflectionContext,
  prepareDailyReflectionDossier,
} from "../dailyReflection.context.service.ts";

// Mock types
interface MockSupabaseClient {
  from: (tableName: string) => MockQueryBuilder;
}

interface MockQueryBuilder {
  select: () => MockQueryBuilder;
  eq: () => MockQueryBuilder;
  like: () => MockQueryBuilder;
  gte: () => MockQueryBuilder;
  lt: () => MockQueryBuilder;
  order: () => MockQueryBuilder;
  limit: () => MockQueryBuilder;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
}

interface MockRagService {
  retrieveContext: (
    userId: string,
    query: string,
    params: unknown,
  ) => Promise<{
    content: string;
    source_layer: unknown;
    similarity: number;
  }[]>;
}

// Mock Supabase client oluşturma fonksiyonu
function createMockSupabaseClient(returnData: {
  events?: unknown;
  vaults?: unknown;
  eventsError?: unknown;
  vaultsError?: unknown;
}): MockSupabaseClient {
  const mock: MockSupabaseClient = {
    from: (tableName: string): MockQueryBuilder => {
      if (tableName === "events") {
        return {
          select: () => mock.from("events"),
          eq: () => mock.from("events"),
          like: () => mock.from("events"),
          gte: () => mock.from("events"),
          lt: () => mock.from("events"),
          order: () => mock.from("events"),
          limit: () => mock.from("events"),
          maybeSingle: () =>
            Promise.resolve({
              data: returnData.events,
              error: returnData.eventsError,
            }),
          single: () =>
            Promise.resolve({
              data: returnData.events,
              error: returnData.eventsError,
            }),
        };
      }
      if (tableName === "user_vaults") {
        return {
          select: () => mock.from("user_vaults"),
          eq: () => mock.from("user_vaults"),
          like: () => mock.from("user_vaults"),
          gte: () => mock.from("user_vaults"),
          lt: () => mock.from("user_vaults"),
          order: () => mock.from("user_vaults"),
          limit: () => mock.from("user_vaults"),
          maybeSingle: () =>
            Promise.resolve({
              data: returnData.vaults,
              error: returnData.vaultsError,
            }),
          single: () =>
            Promise.resolve({
              data: returnData.vaults,
              error: returnData.vaultsError,
            }),
        };
      }
      // Default implementation
      return {
        select: () => mock.from(""),
        eq: () => mock.from(""),
        like: () => mock.from(""),
        gte: () => mock.from(""),
        lt: () => mock.from(""),
        order: () => mock.from(""),
        limit: () => mock.from(""),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
      };
    },
  };
  return mock;
}

// Mock RagService
const _mockRagService: MockRagService = {
  retrieveContext: (_userId: string, _query: string, _params: unknown) => {
    return Promise.resolve([
      {
        content: "Mock memory 1",
        source_layer: "events" as const,
        similarity: 0.9,
      },
      {
        content: "Mock memory 2",
        source_layer: "diary" as const,
        similarity: 0.8,
      },
    ]);
  },
};

// Test: Başarılı durum - tüm veriler mevcut
Deno.test("prepareDailyReflectionDossier - tüm veriler mevcut olduğunda doğru dosya hazırlamalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockEvents = {
    mood: "mutlu",
    data: { todayNote: "Harika bir gündü." },
  };
  const mockVaults = {
    vault_data: { profile: { nickname: "Çömez" } },
  };
  const mockClient = createMockSupabaseClient({
    events: mockEvents,
    vaults: mockVaults,
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareDailyReflectionDossier(
    mockClient as unknown as Parameters<
      typeof prepareDailyReflectionDossier
    >[0],
    userId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userName, "Çömez");
  assertEquals(result.yesterdayMood, "mutlu");
  assertEquals(result.yesterdayNote, "Harika bir gündü.");
});

// Test: Veritabanı hatası durumu
Deno.test("prepareDailyReflectionDossier - veritabanı hatası olduğunda null değerler dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const dbError = { message: "Veritabanı bağlantısı koptu", code: "500" };
  const mockClient = createMockSupabaseClient({
    eventsError: dbError,
    vaultsError: dbError,
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareDailyReflectionDossier(
    mockClient as unknown as Parameters<
      typeof prepareDailyReflectionDossier
    >[0],
    userId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userName, null);
  assertEquals(result.yesterdayMood, null);
  assertEquals(result.yesterdayNote, null);
});

// Test: Dün yansıma bulunamama durumu
Deno.test("prepareDailyReflectionDossier - dün yansıma bulunamadığında ilgili alanlar null olmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockVaults = { vault_data: { profile: { nickname: "Çömez" } } };
  // events için null gönderiyoruz (maybeSingle boş sonuç dönecek)
  const mockClient = createMockSupabaseClient({
    events: null,
    vaults: mockVaults,
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareDailyReflectionDossier(
    mockClient as unknown as Parameters<
      typeof prepareDailyReflectionDossier
    >[0],
    userId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userName, "Çömez");
  assertEquals(result.yesterdayMood, null);
  assertEquals(result.yesterdayNote, null);
});

// Test: Kullanıcı adı bulunamama durumu
Deno.test("prepareDailyReflectionDossier - kullanıcı adı bulunamadığında null dönmeli", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockEvents = { mood: "üzgün", data: { todayNote: "Kötü bir gündü." } };
  const mockVaults = { vault_data: { profile: {} } }; // nickname yok
  const mockClient = createMockSupabaseClient({
    events: mockEvents,
    vaults: mockVaults,
  });
  const userId = "test-user-123";

  // 2. EYLEM (Act)
  const result = await prepareDailyReflectionDossier(
    mockClient as unknown as Parameters<
      typeof prepareDailyReflectionDossier
    >[0],
    userId,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.userName, null);
  assertEquals(result.yesterdayMood, "üzgün");
  assertEquals(result.yesterdayNote, "Kötü bir gündü.");
});

// Test: buildDailyReflectionContext - başarılı durum
Deno.test("buildDailyReflectionContext - tüm veriler mevcut olduğunda doğru bağlam oluşturmalı", async () => {
  // 1. HAZIRLIK (Arrange)
  const mockEvents = {
    mood: "mutlu",
    data: { todayNote: "Harika bir gündü." },
  };
  const mockVaults = {
    vault_data: { profile: { nickname: "Çömez" } },
  };
  const mockClient = createMockSupabaseClient({
    events: mockEvents,
    vaults: mockVaults,
  });
  const userId = "test-user-123";
  const todayNote = "Bugün de güzel geçiyor.";

  // 2. EYLEM (Act)
  const result = await buildDailyReflectionContext(
    mockClient as unknown as Parameters<typeof buildDailyReflectionContext>[0],
    _mockRagService as unknown as Parameters<
      typeof buildDailyReflectionContext
    >[1],
    userId,
    todayNote,
  );

  // 3. DOĞRULAMA (Assert)
  assertEquals(result.dossier.userName, "Çömez");
  assertEquals(result.dossier.yesterdayMood, "mutlu");
  assertEquals(result.dossier.yesterdayNote, "Harika bir gündü.");
  assertEquals(result.retrievedMemories.length, 2);
  assertEquals(result.retrievedMemories[0].content, "Mock memory 1");
});
