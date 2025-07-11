// utils/auth.ts
import { supabase } from './supabase'; // Yeni Supabase bağlantısı

// 1. E-posta ve Şifre ile Yeni Kullanıcı KAYDET
export async function signUpWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) throw error;
    return data.user;

  } catch (error) {
    console.error("Kayıt Olma Hatası:", error.message);
    alert(`Kayıt olurken hata oluştu: ${error.message}`);
    return null;
  }
}

// 2. E-posta ve Şifre ile GİRİŞ YAP
export async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;
    return data.user;

  } catch (error) {
    console.error("Giriş Yapma Hatası:", error.message);
    alert(`Giriş yapılırken hata oluştu: ${error.message}`);
    return null;
  }
}

// 3. Mevcut Kullanıcının Oturumunu KAPAT
export async function signOut() {
  await supabase.auth.signOut();
}

// 4. Şu an Giriş Yapmış Bir Kullanıcı Var mı? KONTROL ET
export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}