// utils/auth.ts - NİHAİ VERSİYON

import { supabase } from "./supabase";
import { Answer, useOnboardingStore } from "../store/onboardingStore"; // Answer tipini ve store'u import et
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
                    locale: i18n.language, // <<-- BU SATIRI EKLE
                },
            },
        });

        if (error) {
            throw error; // Hata varsa yakala ve aşağıda işle
        }

        // Kaydolma başarılı olduysa ve oturum oluştuysa, onboarding içgörüsünü üret
        if (data.user && data.session) {
            // Oturumu anında set et ki sonraki invoke doğru JWT ile gitsin
            await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
            });
            const a1 = answersArray[0]?.answer ?? "";
            const a2 = answersArray[1]?.answer ?? "";
            const a3 = answersArray[2]?.answer ?? "";

            // Zorunlu 3 cevap yoksa analiz çağrısı yapma
            if (a1 && a2 && a3) {
                const { data: insightData, error: insightError } =
                    await supabase.functions.invoke(
                        "generate-onboarding-insight",
                        {
                            body: {
                                answer1: a1,
                                answer2: a2,
                                answer3: a3,
                                language: i18n.language,
                                nickname: nickname, // <<-- EKLEMEN GEREKEN LANET SATIR BU
                            },
                        },
                    );

                if (insightError) {
                    // 500 gibi hataları kullanıcıya yansıt
                    return {
                        user: null,
                        error:
                            "Analiziniz oluşturulamadı. Lütfen tekrar deneyin.",
                    };
                }

                // Başarılıysa store'a kaydet
                const payload = typeof insightData === "string"
                    ? JSON.parse(insightData)
                    : insightData;
                useOnboardingStore.getState().setOnboardingInsight(
                    payload as Record<string, string>,
                );
            }
        } else {
            // Beklenmedik durum: kullanıcı var ama session yoksa akışı durdur
            throw new Error(
                "Kullanıcı oluşturuldu ancak oturum başlatılamadı.",
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
