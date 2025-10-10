// app/(settings)/__tests__/change-password.test.tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import ChangePasswordScreen from "../change-password";

// ============================================
// MOCK'LAR
// ============================================

jest.mock("../../../utils/supabase", () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
            signInWithPassword: jest.fn(),
            updateUser: jest.fn(),
        },
    },
}));
jest.mock("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));
jest.mock("expo-router/", () => ({
    useRouter: jest.fn(),
}));
jest.mock("@expo/vector-icons", () => ({
    Ionicons: "Ionicons",
}));

describe("ChangePasswordScreen - GÜVENLİK KASASI 🔐", () => {
    const mockUseRouter = jest.mocked(require("expo-router/").useRouter);
    const mockSupabase = jest.mocked(require("../../../utils/supabase").supabase);
    
    let mockBack: jest.Mock;
    let mockAlert: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockBack = jest.fn();
        mockUseRouter.mockReturnValue({
            back: mockBack,
        } as any);

        // Alert'i spy'la
        mockAlert = jest.spyOn(Alert, "alert").mockImplementation();

        // Varsayılan başarılı auth mocks
        mockSupabase.auth.getUser.mockResolvedValue({
            data: { user: { email: "test@example.com" } },
            error: null,
        } as any);

        mockSupabase.auth.signInWithPassword.mockResolvedValue({
            data: {},
            error: null,
        } as any);

        mockSupabase.auth.updateUser.mockResolvedValue({
            data: {},
            error: null,
        } as any);
    });

    afterEach(() => {
        mockAlert.mockRestore();
    });

    // ============================================
    // FUNKSİYON TESTLERİ: isPasswordStrong
    // ============================================
    describe("🔒 isPasswordStrong Fonksiyonu (Satır 83-84)", () => {
        it("Zayıf şifre: sadece küçük harf - RED", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "weakpassword"); // Sadece küçük harf
            fireEvent.changeText(confirmPw, "weakpassword");

            const submitButton = screen.getByText("settings.password.submit_button");
            fireEvent.press(submitButton);

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_weak_title",
                    "settings.password.alert_weak_body"
                );
            });

            expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
        });

        it("Zayıf şifre: büyük ve küçük harf ama rakam yok - RED", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "WeakPassword"); // Rakam yok
            fireEvent.changeText(confirmPw, "WeakPassword");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_weak_title",
                    "settings.password.alert_weak_body"
                );
            });
        });

        it("Zayıf şifre: 8 karakterden kısa - RED", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "Ab1"); // Çok kısa
            fireEvent.changeText(confirmPw, "Ab1");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_weak_title",
                    "settings.password.alert_weak_body"
                );
            });
        });

        it("Güçlü şifre: büyük+küçük+rakam+8 karakter - GREEN ✅", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "StrongPass123"); // GÜÇLÜ!
            fireEvent.changeText(confirmPw, "StrongPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            // Zayıf şifre alert'i çağrılmamalı
            await waitFor(() => {
                expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
            });

            const weakAlertCall = mockAlert.mock.calls.find(
                call => call[0] === "settings.password.alert_weak_title"
            );
            expect(weakAlertCall).toBeUndefined();
        });
    });

    // ============================================
    // VALİDASYON TESTLERİ
    // ============================================
    describe("⚠️ Validation Kontrolleri (Satır 88-111)", () => {
        it("Tüm alanlar boşsa alert göstermeli (Satır 88-92)", async () => {
            render(<ChangePasswordScreen />);

            const submitButton = screen.getByText("settings.password.submit_button");
            fireEvent.press(submitButton);

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_missing_fields_title",
                    "settings.password.alert_missing_fields_body"
                );
            });

            expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
        });

        it("Sadece current password doluysa alert göstermeli", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            fireEvent.changeText(currentPw, "OldPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_missing_fields_title",
                    "settings.password.alert_missing_fields_body"
                );
            });
        });

        it("Şifreler eşleşmezse alert göstermeli (Satır 94-98)", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "DifferentPass123"); // Eşleşmiyor!

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_mismatch_title",
                    "settings.password.alert_mismatch_body"
                );
            });

            expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
        });

        it("Eski şifre = yeni şifre ise alert göstermeli (Satır 106-110)", async () => {
            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "SamePass123");
            fireEvent.changeText(newPw, "SamePass123"); // AYNI!
            fireEvent.changeText(confirmPw, "SamePass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_same_title",
                    "settings.password.alert_same_body"
                );
            });

            expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
        });
    });

    // ============================================
    // SUPABASE HATA DURUMLARI
    // ============================================
    describe("💥 Supabase Auth Hata Durumları", () => {
        it("getUser başarısız olursa (user null) hata alert göstermeli (Satır 116-118)", async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({
                data: { user: null }, // User yok!
                error: null,
            } as any);

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_error_title",
                    "settings.password.error_auth"
                );
            });
        });

        it("getUser email olmadan user dönerse hata alert göstermeli", async () => {
            mockSupabase.auth.getUser.mockResolvedValueOnce({
                data: { user: { email: null } }, // Email yok!
                error: null,
            } as any);

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_error_title",
                    "settings.password.error_auth"
                );
            });
        });

        it("signInWithPassword hata verirse (yanlış mevcut şifre) alert göstermeli (Satır 126-129)", async () => {
            mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
                data: null,
                error: { message: "Invalid login credentials" },
            } as any);

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "WrongOldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_error_title",
                    "settings.password.error_wrong_password"
                );
            });

            // updateUser çağrılmamalı
            expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
        });

        it("updateUser başarısız olursa hata alert göstermeli (Satır 135)", async () => {
            // Supabase error objesi Error instance değil, bu yüzden generic message kullanılır
            const updateError = { message: "Update failed", status: 500 };
            mockSupabase.auth.updateUser.mockResolvedValueOnce({
                data: null,
                error: updateError,
            } as any);

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            // Supabase error'u Error instance değil, generic message gösterilir
            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_error_title",
                    "settings.password.error_unexpected" // error instanceof Error === false
                );
            });
        });

        it("Beklenmeyen hata olursa (non-Error exception) generic error mesajı göstermeli (Satır 141-145)", async () => {
            // String hata fırlat (Error objesi değil)
            mockSupabase.auth.getUser.mockRejectedValueOnce("Random string error");

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_error_title",
                    "settings.password.error_unexpected"
                );
            });
        });
    });

    // ============================================
    // BAŞARILI AKIŞ TESTİ
    // ============================================
    describe("✅ Başarılı Şifre Değiştirme Akışı", () => {
        it("Tüm kontroller geçildiğinde şifre güncellenip success alert gösterilmeli (Satır 137-140)", async () => {
            // Alert'i success button callback'i ile mock'la
            mockAlert.mockImplementation((title, message, buttons) => {
                if (buttons && buttons[0]?.onPress) {
                    buttons[0].onPress();
                }
            });

            render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewStrongPass123");
            fireEvent.changeText(confirmPw, "NewStrongPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            // Tüm auth işlemleri çağrılmalı
            await waitFor(() => {
                expect(mockSupabase.auth.getUser).toHaveBeenCalled();
                expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                    email: "test@example.com",
                    password: "OldPass123",
                });
                expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
                    password: "NewStrongPass123",
                });
            });

            // Success alert gösterilmeli
            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_success_title",
                    "settings.password.alert_success_body",
                    expect.arrayContaining([
                        expect.objectContaining({
                            text: "settings.password.alert_success_button",
                        })
                    ])
                );
            });

            // Success alert'teki button tıklandığında router.back çağrılmalı
            expect(mockBack).toHaveBeenCalled();
        });

        it("Loading state doğru çalışmalıdır", async () => {
            // updateUser'ı yavaş yaparak loading state'i yakalayalım
            let resolveUpdate: any;
            mockSupabase.auth.updateUser.mockReturnValue(
                new Promise((resolve) => { resolveUpdate = resolve; })
            );

            const { UNSAFE_root } = render(<ChangePasswordScreen />);

            const currentPw = screen.getByPlaceholderText("settings.password.placeholder_current");
            const newPw = screen.getByPlaceholderText("settings.password.placeholder_new");
            const confirmPw = screen.getByPlaceholderText("settings.password.placeholder_confirm");
            
            fireEvent.changeText(currentPw, "OldPass123");
            fireEvent.changeText(newPw, "NewPass123");
            fireEvent.changeText(confirmPw, "NewPass123");

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            // ActivityIndicator gösterilmeli
            await waitFor(() => {
                const indicators = UNSAFE_root.findAllByType(
                    require("react-native").ActivityIndicator
                );
                expect(indicators.length).toBeGreaterThan(0);
            });

            // Submit button text'i kaybolmalı
            expect(screen.queryByText("settings.password.submit_button")).toBeNull();

            // İşlemi tamamla
            if (resolveUpdate) {
                resolveUpdate({ data: {}, error: null });
            }
        });
    });

    // ============================================
    // UI BİLEŞEN TESTLERİ
    // ============================================
    describe("🎨 PasswordInputField - Visibility Toggle", () => {
        it("Göz butonuna tıklandığında şifre görünürlüğü toggle edilmeli", async () => {
            const { UNSAFE_root } = render(<ChangePasswordScreen />);

            // İlk PasswordInputField'i bul (current password)
            const currentPwInput = screen.getByPlaceholderText("settings.password.placeholder_current");
            
            // İlk durum: secureTextEntry true olmalı
            expect(currentPwInput.props.secureTextEntry).toBe(true);

            // Göz ikonunu bul ve tıkla
            const ionicons = UNSAFE_root.findAllByType("Ionicons");
            const eyeIcon = ionicons.find(icon => 
                icon.props.name === "eye-outline" || icon.props.name === "eye-off-outline"
            );

            expect(eyeIcon).toBeTruthy();

            if (eyeIcon?.parent) {
                fireEvent.press(eyeIcon.parent);

                // secureTextEntry false olmalı
                await waitFor(() => {
                    const updatedInput = screen.getByPlaceholderText("settings.password.placeholder_current");
                    expect(updatedInput.props.secureTextEntry).toBe(false);
                });

                // Tekrar tıkla
                fireEvent.press(eyeIcon.parent);

                // secureTextEntry tekrar true olmalı
                await waitFor(() => {
                    const updatedInput2 = screen.getByPlaceholderText("settings.password.placeholder_current");
                    expect(updatedInput2.props.secureTextEntry).toBe(true);
                });
            }
        });
    });

    describe("🚪 Navigation", () => {
        it("Close butonu router.back() çağırmalı", () => {
            const { UNSAFE_root } = render(<ChangePasswordScreen />);

            // Close icon'u bul
            const ionicons = UNSAFE_root.findAllByType("Ionicons");
            const closeIcon = ionicons.find(icon => icon.props.name === "close-outline");

            expect(closeIcon).toBeTruthy();

            if (closeIcon?.parent) {
                fireEvent.press(closeIcon.parent);
                expect(mockBack).toHaveBeenCalled();
            }
        });
    });

    // ============================================
    // BÜTÜNLEŞME TESTLERİ
    // ============================================
    describe("🔄 End-to-End Akışlar", () => {
        it("Baştan sona başarılı şifre değiştirme akışı", async () => {
            mockAlert.mockImplementation((title, message, buttons) => {
                if (buttons && buttons[0]?.onPress) {
                    buttons[0].onPress();
                }
            });

            render(<ChangePasswordScreen />);

            // 1. Tüm alanları doldur
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_current"),
                "CurrentPass123"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_new"),
                "BrandNewPass456"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_confirm"),
                "BrandNewPass456"
            );

            // 2. Submit
            fireEvent.press(screen.getByText("settings.password.submit_button"));

            // 3. Tüm Supabase çağrıları sırayla gerçekleşmeli
            await waitFor(() => {
                expect(mockSupabase.auth.getUser).toHaveBeenCalled();
                expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
                    email: "test@example.com",
                    password: "CurrentPass123",
                });
                expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
                    password: "BrandNewPass456",
                });
            });

            // 4. Success alert ve navigation
            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_success_title",
                    "settings.password.alert_success_body",
                    expect.any(Array)
                );
                expect(mockBack).toHaveBeenCalled();
            });
        });

        it("Validation başarısız olursa Supabase çağrılmamalı", async () => {
            render(<ChangePasswordScreen />);

            // Zayıf şifre gir
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_current"),
                "OldPass123"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_new"),
                "weak"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_confirm"),
                "weak"
            );

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalled();
            });

            // Hiçbir Supabase metodu çağrılmamalı
            expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
            expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
            expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
        });
    });

    describe("🎯 Edge Cases", () => {
        it("Component mount/unmount güvenli olmalı", () => {
            const { unmount } = render(<ChangePasswordScreen />);
            expect(() => unmount()).not.toThrow();
        });

        it("Boş stringler ile validation çalışmalı", async () => {
            render(<ChangePasswordScreen />);

            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_current"),
                ""
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_new"),
                ""
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_confirm"),
                ""
            );

            fireEvent.press(screen.getByText("settings.password.submit_button"));

            await waitFor(() => {
                expect(mockAlert).toHaveBeenCalledWith(
                    "settings.password.alert_missing_fields_title",
                    "settings.password.alert_missing_fields_body"
                );
            });
        });

        it("isLoading true iken submit button disabled olmalı", async () => {
            let resolveUpdate: any;
            mockSupabase.auth.updateUser.mockReturnValue(
                new Promise((resolve) => { resolveUpdate = resolve; })
            );

            render(<ChangePasswordScreen />);

            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_current"),
                "OldPass123"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_new"),
                "NewPass123"
            );
            fireEvent.changeText(
                screen.getByPlaceholderText("settings.password.placeholder_confirm"),
                "NewPass123"
            );

            const submitButton = screen.getByText("settings.password.submit_button");
            fireEvent.press(submitButton);

            // Loading state'inde tekrar basılmamalı
            await waitFor(() => {
                expect(screen.queryByText("settings.password.submit_button")).toBeNull();
            });

            // İşlemi tamamla
            if (resolveUpdate) {
                resolveUpdate({ data: {}, error: null });
            }
        });
    });
});
