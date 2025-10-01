// utils/__tests__/auth.test.ts
// ⚡️ EN KRİTİK TEST DOSYASI - Auth sistemi patlarsa uygulama gider

import { Answer } from "../../store/onboardingStore";
import { supabase } from "../supabase";
import {
    signInAndVerifyUser,
    signInWithEmail,
    signOut,
    signUpWithOnboardingData,
} from "../auth";

jest.mock("../i18n", () => ({
    default: {
        language: "tr",
    },
    language: "tr",
}));

// Supabase'i mock'la
jest.mock("../supabase", () => ({
    supabase: {
        auth: {
            signUp: jest.fn(),
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
        },
    },
}));

describe("auth.ts - Kimlik Doğrulama Sistemi", () => {
    // Mock fonksiyonları tip güvenli şekilde al
    const mockSignUp = supabase.auth.signUp as jest.MockedFunction<
        typeof supabase.auth.signUp
    >;
    const mockSignInWithPassword = supabase.auth
        .signInWithPassword as jest.MockedFunction<
            typeof supabase.auth.signInWithPassword
        >;
    const mockSignOut = supabase.auth.signOut as jest.MockedFunction<
        typeof supabase.auth.signOut
    >;

    beforeEach(() => {
        // Her testten önce tüm mock'ları temizle
        jest.clearAllMocks();
    });

    describe("signUpWithOnboardingData - Yeni Kullanıcı Kaydı", () => {
        const mockAnswers: Answer[] = [
            { step: 1, question: "1", answer: "test-answer" },
        ];

        it("✅ başarılı kayıt durumunda user objesini dönmeli", async () => {
            const mockUser = {
                id: "user-123",
                email: "test@test.com",
                created_at: new Date().toISOString(),
            };

            mockSignUp.mockResolvedValue({
                data: { user: mockUser as any, session: null },
                error: null,
            });

            const result = await signUpWithOnboardingData(
                "test@test.com",
                "password123",
                "TestUser",
                mockAnswers,
            );

            expect(result.user).toEqual(mockUser);
            expect(result.error).toBeNull();
            expect(mockSignUp).toHaveBeenCalledWith({
                email: "test@test.com",
                password: "password123",
                options: {
                    data: {
                        nickname: "TestUser",
                        onboarding_answers: mockAnswers,
                        locale: "tr",
                    },
                },
            });
        });

        it("✅ nickname'i trim ile temizleyip göndermeli", async () => {
            mockSignUp.mockResolvedValue({
                data: { user: { id: "123" } as any, session: null },
                error: null,
            });

            await signUpWithOnboardingData(
                "test@test.com",
                "password123",
                "  Boşluklu İsim  ",
                mockAnswers,
            );

            expect(mockSignUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    options: expect.objectContaining({
                        data: expect.objectContaining({
                            nickname: "Boşluklu İsim",
                        }),
                    }),
                }),
            );
        });

        it("❌ Supabase'den 'user already registered' hatası geldiğinde anlaşılır mesaj dönmeli", async () => {
            const error = new Error("User already registered");
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: error as any,
            });

            const result = await signUpWithOnboardingData(
                "test@test.com",
                "password123",
                "TestUser",
                mockAnswers,
            );

            expect(result.user).toBeNull();
            expect(result.error).toBe("Bu e-posta adresi zaten kullanılıyor.");
        });

        it("❌ Supabase'den 'password too short' hatası geldiğinde anlaşılır mesaj dönmeli", async () => {
            const error = new Error("Password should be at least 6 characters");
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: error as any,
            });

            const result = await signUpWithOnboardingData(
                "test@test.com",
                "12345",
                "TestUser",
                mockAnswers,
            );

            expect(result.user).toBeNull();
            expect(result.error).toBe("Şifre en az 6 karakter olmalıdır.");
        });

        it("❌ beklenmedik şekilde user null gelirse hata dönmeli", async () => {
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: null,
            });

            const result = await signUpWithOnboardingData(
                "test@test.com",
                "password123",
                "TestUser",
                mockAnswers,
            );

            expect(result.user).toBeNull();
            // getFriendlyError generic mesaj döndürüyor
            expect(result.error).toBe(
                "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.",
            );
        });

        it("❌ network hatası durumunda anlaşılır mesaj dönmeli", async () => {
            const error = new Error("Network request failed");
            mockSignUp.mockResolvedValue({
                data: { user: null, session: null },
                error: error as any,
            });

            const result = await signUpWithOnboardingData(
                "test@test.com",
                "password123",
                "TestUser",
                mockAnswers,
            );

            expect(result.user).toBeNull();
            expect(result.error).toBe("İnternet bağlantını kontrol edin.");
        });
    });

    describe("signInWithEmail - Kullanıcı Girişi", () => {
        it("✅ başarılı giriş durumunda session objesini dönmeli", async () => {
            const mockSession = {
                access_token: "mock-jwt-token",
                user: { id: "user-123", email: "test@test.com" },
            };

            mockSignInWithPassword.mockResolvedValue({
                data: {
                    session: mockSession as any,
                    user: mockSession.user as any,
                },
                error: null,
            });

            const result = await signInWithEmail(
                "test@test.com",
                "password123",
            );

            expect(result.session).toEqual(mockSession);
            expect(result.error).toBeNull();
            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: "test@test.com",
                password: "password123",
            });
        });

        it("❌ hatalı şifre durumunda anlaşılır mesaj dönmeli", async () => {
            const error = new Error("Invalid login credentials");
            mockSignInWithPassword.mockResolvedValue({
                data: { session: null, user: null },
                error: error as any,
            });

            const result = await signInWithEmail(
                "test@test.com",
                "wrongpassword",
            );

            expect(result.session).toBeNull();
            expect(result.error).toBe("E-posta veya şifre hatalı.");
        });

        it("❌ network hatası durumunda anlaşılır mesaj dönmeli", async () => {
            mockSignInWithPassword.mockRejectedValue(
                new Error("fetch failed"),
            );

            const result = await signInWithEmail(
                "test@test.com",
                "password123",
            );

            expect(result.session).toBeNull();
            expect(result.error).toBe("İnternet bağlantını kontrol edin.");
        });

        it("❌ bilinmeyen hata durumunda varsayılan mesaj dönmeli", async () => {
            const error = new Error("Weird unknown error");
            mockSignInWithPassword.mockResolvedValue({
                data: { session: null, user: null },
                error: error as any,
            });

            const result = await signInWithEmail(
                "test@test.com",
                "password123",
            );

            expect(result.session).toBeNull();
            expect(result.error).toBe(
                "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.",
            );
        });
    });

    describe("signInAndVerifyUser - Giriş ve Doğrulama", () => {
        it("✅ başarılı giriş durumunda success:true dönmeli", async () => {
            const mockSession = {
                access_token: "mock-jwt",
                user: { id: "123", email: "test@test.com" },
            };

            mockSignInWithPassword.mockResolvedValue({
                data: {
                    session: mockSession as any,
                    user: mockSession.user as any,
                },
                error: null,
            });

            const result = await signInAndVerifyUser(
                "test@test.com",
                "password123",
            );

            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
            if ("session" in result) {
                expect(result.session).toEqual(mockSession);
            }
        });

        it("❌ giriş hatası durumunda success:false ve error dönmeli", async () => {
            const error = new Error("Invalid login credentials");
            mockSignInWithPassword.mockResolvedValue({
                data: { session: null, user: null },
                error: error as any,
            });

            const result = await signInAndVerifyUser(
                "test@test.com",
                "wrongpass",
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("E-posta veya şifre hatalı.");
        });

        it("❌ session oluşmadığında uygun hata mesajı dönmeli", async () => {
            mockSignInWithPassword.mockResolvedValue({
                data: { session: null, user: null },
                error: null,
            });

            const result = await signInAndVerifyUser(
                "test@test.com",
                "password123",
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("Oturum oluşturulamadı.");
        });

        it("❌ exception fırlatılırsa catch bloğu çalışmalı", async () => {
            // "network" kelimesini içeren bir hata fırlat ki getFriendlyError yakalasın
            const exception = new Error("Network request failed");
            mockSignInWithPassword.mockRejectedValue(exception);

            const result = await signInAndVerifyUser(
                "test@test.com",
                "password123",
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe("İnternet bağlantını kontrol edin.");
        });
    });

    describe("signOut - Oturum Kapatma", () => {
        it("✅ signOut fonksiyonu Supabase auth.signOut'u çağırmalı", async () => {
            mockSignOut.mockResolvedValue({ error: null });

            await signOut();

            expect(mockSignOut).toHaveBeenCalledTimes(1);
        });
    });
});
