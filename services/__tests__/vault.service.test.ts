// services/__tests__/vault.service.test.ts

import { getUserVault, updateUserVault, VaultData } from "../vault.service";
import { supabase } from "../../utils/supabase";
import { getMockedSupabaseQuery } from "./supabase.mock";

// Supabase'in mock'lanmış versiyonuna tip güvenliğiyle erişim için
const mockedSupabase = supabase as jest.Mocked<typeof supabase>;

describe("vault.service", () => {
  // Her testten ÖNCE, mock'un iskeletini KUR.
  beforeEach(() => {
    // Önceki tüm mock çağrılarını ve implementasyonlarını temizle.
    jest.clearAllMocks();

    // Varsayılan olarak her testte kullanıcı login olmuş olsun.
    // İhtiyacı olan test bunu özellikle ezip geçebilir (override).
    (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: "test-user-id" } },
      error: null,
    });

    // `from` çağrıldığında, TÜM olası zincirleme methodları olan bir obje dönsün.
    // Bu methodların hepsi de birer jest.fn() olmalı.
    (mockedSupabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(), // BU EKSİKTİ!
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(), // .mockReturnThis() değil, çünkü bu zincirin sonu.
      maybeSingle: jest.fn(), // .mockReturnThis() değil, çünkü bu zincirin sonu.
    });
  });

  describe("getUserVault", () => {
    it("Kullanıcıya ait vault verisini başarılı bir şekilde çekmeli", async () => {
      // ARRANGE: Sadece zincirin son halkasını mock'la!
      const mockVaultData = {
        vault_data: { profile: { nickname: "TestUser" } },
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT
      expect(vault).toEqual({ profile: { nickname: "TestUser" } });
      expect(fromMock.eq).toHaveBeenCalledWith("user_id", "test-user-id");
    });

    it("Supabase hatası durumunda hata fırlatmalı", async () => {
      // ARRANGE: Zincirin son halkası olan single(), HATA içeren bir promise dönsün.
      const mockError = { message: "Database error", code: "500" };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: null,
        error: mockError,
        status: 500,
        statusText: "Internal Server Error",
      });

      // ACT & ASSERT
      // Fonksiyonun kendisi bir promise döndürdüğü için, `expect` içine fonksiyonun çağrısını koy.
      // `rejects` bu promise'in reddedilmesini bekler. `toThrow` ise reddedilme sebebini kontrol eder.
      await expect(getUserVault()).rejects.toThrow(new Error("Database error"));
    });

    it("Ana sütun ve vault_data içindeki veri çakıştığında, ana sütundaki veriyi önceliklendirmeli", async () => {
      // ARRANGE: Hem ana sütunda hem de JSON içinde nickname var.
      const mockVaultData = {
        vault_data: {
          profile: { nickname: "JSON_Nick", therapyGoals: "JSON_Goals" },
          metadata: { someKey: "value" },
        },
        nickname: "ROOT_Nick", // Ana sütun, bunun kazanması lazım
        therapy_goals: "ROOT_Goals", // Ana sütun, bunun kazanması lazım
        current_mood: null, // Ana sütun boş, JSON'dan gelmemeli
        last_daily_reflection_at: null,
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT: Ana sütunların, JSON içindeki veriyi ezdiğini doğrula.
      expect(vault.profile.nickname).toBe("ROOT_Nick");
      expect(vault.profile.therapyGoals).toBe("ROOT_Goals");
      expect(vault.metadata.someKey).toBe("value"); // JSON'daki diğer veriler korunmalı
    });

    it("vault_data alanı null geldiğinde patlamamalı ve boş bir obje olarak başlamalı", async () => {
      // ARRANGE: vault_data alanı null
      const mockVaultData = {
        vault_data: null,
        nickname: "TestNick",
        therapy_goals: "TestGoals",
        current_mood: "happy",
        last_daily_reflection_at: "2024-01-01T12:00:00Z",
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT: Boş obje ile başlamalı ve ana sütunları eklemeli
      expect(vault).toEqual({
        profile: {
          nickname: "TestNick",
          therapyGoals: "TestGoals",
        },
        metadata: {
          currentMood: "happy",
          lastDailyReflectionAt: "2024-01-01T12:00:00Z",
        },
      });
    });

    it("vault_data alanı undefined geldiğinde patlamamalı", async () => {
      // ARRANGE: vault_data alanı undefined
      const mockVaultData = {
        vault_data: undefined,
        nickname: "TestNick",
        therapy_goals: null,
        current_mood: null,
        last_daily_reflection_at: null,
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT: Boş obje ile başlamalı
      expect(vault).toEqual({
        profile: {
          nickname: "TestNick",
        },
      });
    });

    it("Ana sütunlar null/undefined geldiğinde vault_data içindeki veriyi kullanmalı", async () => {
      // ARRANGE: Ana sütunlar boş, sadece vault_data var
      const mockVaultData = {
        vault_data: {
          profile: { nickname: "JSON_Nick", therapyGoals: "JSON_Goals" },
          metadata: {
            currentMood: "sad",
            lastDailyReflectionAt: "2024-01-01T12:00:00Z",
          },
        },
        nickname: null,
        therapy_goals: null,
        current_mood: null,
        last_daily_reflection_at: null,
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT: JSON içindeki veri kullanılmalı
      expect(vault).toEqual({
        profile: {
          nickname: "JSON_Nick",
          therapyGoals: "JSON_Goals",
        },
        metadata: {
          currentMood: "sad",
          lastDailyReflectionAt: "2024-01-01T12:00:00Z",
        },
      });
    });

    it("Karmaşık veri yapısında doğru birleştirme yapmalı", async () => {
      // ARRANGE: Karmaşık veri yapısı
      const mockVaultData = {
        vault_data: {
          profile: {
            nickname: "JSON_Nick",
            therapyGoals: "JSON_Goals",
            birthDate: "1990-01-01",
            expectation: "Get better",
          },
          metadata: {
            someKey: "value",
            onboardingCompleted: true,
          },
          traits: { openness: 0.8 },
          memories: [{ key: "value" }],
        },
        nickname: "ROOT_Nick", // Ana sütun kazanmalı
        therapy_goals: "ROOT_Goals", // Ana sütun kazanmalı
        current_mood: "excited", // Ana sütun kazanmalı
        last_daily_reflection_at: "2024-01-01T12:00:00Z", // Ana sütun kazanmalı
      };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.single.mockResolvedValue({
        data: mockVaultData,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      const vault = await getUserVault();

      // ASSERT: Karmaşık veri doğru birleştirilmeli
      expect(vault).toEqual({
        profile: {
          nickname: "ROOT_Nick", // Ana sütun kazandı
          therapyGoals: "ROOT_Goals", // Ana sütun kazandı
          birthDate: "1990-01-01", // JSON'dan geldi
          expectation: "Get better", // JSON'dan geldi
        },
        metadata: {
          someKey: "value", // JSON'dan geldi
          onboardingCompleted: true, // JSON'dan geldi
          currentMood: "excited", // Ana sütun kazandı
          lastDailyReflectionAt: "2024-01-01T12:00:00Z", // Ana sütun kazandı
        },
        traits: { openness: 0.8 }, // JSON'dan geldi
        memories: [{ key: "value" }], // JSON'dan geldi
      });
    });
  });

  describe("updateUserVault", () => {
    it("Verilen vault verisiyle upsert işlemini çağırmalı", async () => {
      // ARRANGE
      const newVaultData: VaultData = { profile: { nickname: "UpdatedNick" } };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      // Zincirin son halkası olan upsert(), BAŞARILI bir promise dönsün.
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault(newVaultData);

      // ASSERT
      expect(fromMock.upsert).toHaveBeenCalledTimes(1);
      expect(fromMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          nickname: "UpdatedNick",
        }),
        { onConflict: "user_id" },
      );
    });

    it("Supabase hatası durumunda hata fırlatmalı", async () => {
      // ARRANGE
      const mockError = { message: "Upsert failed" };
      const newVaultData: VaultData = { profile: { nickname: "Test" } };
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      // Zincirin son halkası olan upsert(), HATA içeren bir promise dönsün.
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: mockError,
        status: 500,
        statusText: "Internal Server Error",
      });

      // ACT & ASSERT
      await expect(updateUserVault(newVaultData)).rejects.toThrow(
        new Error("Upsert failed"),
      );
    });

    it("Kullanıcı giriş yapmamışsa hata fırlatmalı (veya sessizce dönmeli)", async () => {
      // Senin kodun `updateUserVault` içinde `if (!user) return;` diyor.
      // Bu hata fırlatmaz, sessizce biter. Bu davranışı test edelim.
      (mockedSupabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await updateUserVault({ profile: { nickname: "Test" } });

      // from() fonksiyonunun HİÇ çağrılmadığını doğrula.
      expect(mockedSupabase.from).not.toHaveBeenCalled();
    });

    it("Boş obje ile çağrıldığında patlamamalı", async () => {
      // ARRANGE: Boş obje
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault({});

      // ASSERT: Boş obje ile de çalışmalı
      expect(fromMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          vault_data: {},
        }),
        { onConflict: "user_id" },
      );
    });

    it("Profile ve metadata alanları undefined/null geldiğinde patlamamalı", async () => {
      // ARRANGE: Undefined/null alanlar
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault({
        profile: undefined,
        metadata: null,
        traits: { openness: 0.8 },
      });

      // ASSERT: Undefined/null alanlar atlanmalı
      const upsertCall = fromMock.upsert.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(upsertCall).toBeDefined(); // Önce çağrıldığından emin ol
      expect(upsertCall).not.toHaveProperty("nickname");
      expect(upsertCall).not.toHaveProperty("therapy_goals");
      expect(upsertCall).not.toHaveProperty("current_mood");
      expect(upsertCall).not.toHaveProperty("last_daily_reflection_at");
      expect(upsertCall.vault_data).toEqual({
        profile: undefined,
        metadata: null,
        traits: { openness: 0.8 },
      });
    });

    it("Sadece profile.nickname varsa, sadece nickname alanını güncellemeli", async () => {
      // ARRANGE: Sadece nickname
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault({
        profile: { nickname: "OnlyNick" },
      });

      // ASSERT: Sadece nickname güncellenmeli
      expect(fromMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          vault_data: { profile: { nickname: "OnlyNick" } },
          nickname: "OnlyNick",
        }),
        { onConflict: "user_id" },
      );
    });

    it("Sadece metadata.currentMood varsa, sadece current_mood alanını güncellemeli", async () => {
      // ARRANGE: Sadece currentMood
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault({
        metadata: { currentMood: "angry" },
      });

      // ASSERT: Sadece current_mood güncellenmeli
      expect(fromMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          vault_data: { metadata: { currentMood: "angry" } },
          current_mood: "angry",
        }),
        { onConflict: "user_id" },
      );
    });

    it("Karmaşık veri yapısında doğru alanları ayırmalı", async () => {
      // ARRANGE: Karmaşık veri
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      const complexData: VaultData = {
        profile: {
          nickname: "ComplexNick",
          therapyGoals: "ComplexGoals",
          birthDate: "1990-01-01",
        },
        metadata: {
          currentMood: "excited",
          lastDailyReflectionAt: "2024-01-01T12:00:00Z",
          someOtherKey: "value",
        },
        traits: { openness: 0.8 },
        memories: [{ key: "value" }],
      };

      // ACT
      await updateUserVault(complexData);

      // ASSERT: Doğru alanlar ayrılmalı
      expect(fromMock.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "test-user-id",
          vault_data: complexData,
          nickname: "ComplexNick",
          therapy_goals: "ComplexGoals",
          current_mood: "excited",
          last_daily_reflection_at: "2024-01-01T12:00:00Z",
        }),
        { onConflict: "user_id" },
      );
    });

    it("String olmayan değerleri stringe çevirmeli", async () => {
      // ARRANGE: Non-string değerler
      const fromMock = getMockedSupabaseQuery(mockedSupabase.from as jest.Mock);
      fromMock.upsert.mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
      });

      // ACT
      await updateUserVault({
        metadata: {
          currentMood: 123, // Number
          lastDailyReflectionAt: "2024-01-01T12:00:00Z", // String olarak
        },
      });

      // ASSERT: String'e çevrilmeli
      const upsertCall = fromMock.upsert.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >;
      expect(upsertCall).toBeDefined(); // Önce çağrıldığından emin ol
      expect(upsertCall.current_mood).toBe("123");
      expect(typeof upsertCall.last_daily_reflection_at).toBe("string"); // String'e çevrilmeli
    });
  });
});
