// utils/auth.ts - NİHAİ VERSİYON

import { supabase } from "./supabase";
import { Answer } from "../store/onboardingStore"; // Yalnızca Answer tipi gerekli
import i18n from "./i18n"; // i18n'i import et

// Hata mesajlarını daha anlaşılır hale getir
const getFriendlyError = (rawMessage: string): string => {
    const msg = rawMessage.toLowerCase();
    if (msg.includes("invalid login credentials")) {
        return "E-posta veya şifre hatalı.";
    }
    if (msg.includes("network") || msg.includes("fetch")) {
        return "İnternet bağlantını kontrol edin.";
    }
    if (
        msg.includes("user already registered") ||
        msg.includes("already in use")
    ) return "Bu e-posta adresi zaten kullanılıyor.";
    if (msg.includes("password should be at least 6 characters")) {
        return "Şifre en az 6 karakter olmalıdır.";
    }
    return "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.";
};

/**
 * Yeni kullanıcı kaydı oluşturur ve onboarding verilerini Supabase'e gönderir.
 * Bu, misafir akışını tamamlayan en önemli fonksiyondur.
 */
export async function signUpWithOnboardingData(
    email: string,
    password: string,
    nickname: string,
    answersArray: Answer[],
) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                // Bu 'data' objesi, kullanıcı oluşturulurken onun metadata'sına
                // güvenli bir şekilde eklenir. Veritabanı trigger'ı bu veriyi oradan okuyacak.
                data: {
                    nickname: nickname.trim(),
                    onboarding_answers: answersArray,
                    locale: i18n.language,
                },
            },
        });

        if (error) {
            throw error; // Hata varsa yakala ve aşağıda işle
        }

        if (!data.user) {
            // Beklenmedik durum: user objesi yok
            throw new Error(
                "Kullanıcı oluşturulamadı.",
            );
        }

        return { user: data.user, error: null };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
        return { user: null, error: getFriendlyError(errorMessage) };
    }
}

/**
 * Mevcut kullanıcı için giriş yapar.
 */
export async function signInWithEmail(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        if (data.session) {
            console.log(
                ">>>>>> BENİM JWT TOKEN'IM BU:",
                data.session.access_token,
            );
        }
        return { session: data.session, error: null };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
        return { session: null, error: getFriendlyError(errorMessage) };
    }
}

/**
 * Kullanıcı girişini yapar ve doğrular.
 */
export async function signInAndVerifyUser(email: string, password: string) {
    try {
        const result = await signInWithEmail(email, password);

        if (result.error) {
            return { success: false, error: result.error };
        }

        if (!result.session) {
            return { success: false, error: "Oturum oluşturulamadı." };
        }

        return { success: true, session: result.session };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error
            ? error.message
            : String(error);
        return { success: false, error: getFriendlyError(errorMessage) };
    }
}

/**
 * Kullanıcının oturumunu kapatır.
 */
export async function signOut() {
    await supabase.auth.signOut();
}
