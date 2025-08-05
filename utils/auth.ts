// utils/auth.ts - OLMASI GEREKEN BU

import { supabase } from './supabase';

// Hata mesajlarını merkezileştiriyoruz.
const getFriendlyError = (raw: string): string => {
    const msg = raw.toLowerCase();
    if (msg.includes("invalid login credentials")) return "E-posta veya şifre hatalı. Lütfen tekrar kontrol edin.";
    if (msg.includes("network") || msg.includes("fetch")) return "İnternet bağlantınızı kontrol edin.";
    if (msg.includes("user not found")) return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı.";
    if (msg.includes("email not confirmed")) return "Lütfen e-posta adresinizi onaylayın.";
    if (msg.includes('already in use')) return 'Bu e-posta adresi zaten kullanımda.';
    return "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.";
};

// GİRİŞ YAPMA VE KULLANICIYI DOĞRULAMA MANTIĞI
// BÜTÜN AĞIR İŞİ BU FONKSİYON YAPACAK
export const signInAndVerifyUser = async (email: string, password: string) => {
    // 1. Giriş yapmayı dene
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (signInError) {
        return { success: false, error: getFriendlyError(signInError.message) };
    }

    const user = signInData.user;
    if (!user) {
        return { success: false, error: "Giriş sonrası kullanıcı bilgisi alınamadı." };
    }

    // 2. Veritabanından kullanıcı verisini kontrol et (vault)
    // Bu, RLS politikasının çalışıp çalışmadığını ve kullanıcının profilinin olup olmadığını test eder.
    const { error: vaultError } = await supabase
        .from('user_vaults')
        .select('user_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

    if (vaultError) {
        await supabase.auth.signOut(); // Güvenlik önlemi: Profili olmayan kullanıcıyı sistemde tutma.
        return { success: false, error: "Veritabanına erişim engellendi. Profiliniz yüklenemedi." };
    }
    
    // Her şey yolunda.
    return { success: true, error: null };
};

// KAYIT OLMA MANTIĞI (Bu zaten vardı, sadece hata yönetimini merkezileştirdik)
export async function signUpWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });
    if (error) throw new Error(getFriendlyError(error.message));
    return data.user;
}

// ÇIKIŞ YAPMA MANTIĞI (Bu zaten iyiydi)
export async function signOut() {
    await supabase.auth.signOut();
}