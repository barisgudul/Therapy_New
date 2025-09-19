// context/Auth.tsx - AMELİYAT EDİLMİŞ VE GÜÇLENDİRİLMİŞ VERSİYON

import { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query"; // EKLE
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, ActivityIndicator, View } from "react-native";
// import { useVaultStore } from '../store/vaultStore'; // SİL
import { supabase } from "../utils/supabase";
import * as Linking from 'expo-linking';

// 1. CONTEXT TİPİNİ GENİŞLETİYORUZ
type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isPendingDeletion: boolean; // ⬅️ YENİ: Silinme durumu
  cancelDeletion: () => Promise<void>; // ⬅️ YENİ: İptal fonksiyonu
};

// Başlangıç değerlerini tanımla
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  isPendingDeletion: false,
  cancelDeletion: () => Promise.resolve(),
});

export const useAuth = () => {
  // useContext güvenlidir. Provider dışında kullanılırsa default değeri döndürür.
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Bu bir programlama hatasıdır. Uygulamanın çökmesi daha iyidir.
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 2. AUTH PROVIDER'I BASTAN YAZIYORUZ
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // isLoading state'i yerine authReady üzerinden türetilmiş değer kullanacağız
  const [isPendingDeletion, setIsPendingDeletion] = useState(false);

  const queryClient = useQueryClient();

  // Auth durumunun tamamen hazır olduğundan emin ol
  const [authReady, setAuthReady] = useState(false);

  // 3. İŞİN BEYNİ: KULLANICI DURUMUNU KONTROL ETME FONKSİYONU
  const checkUserStatus = (currentUser: User | null) => {
    if (!currentUser) {
      setIsPendingDeletion(false);
      return;
    }

    // Supabase user_metadata'dan durumu oku.
    // Deno function'da 'status' alanını 'pending_deletion' olarak set etmiştin.
    const deletionStatus =
      currentUser.user_metadata?.status === "pending_deletion";
    setIsPendingDeletion(deletionStatus);
    console.log(
      `[AUTH] Kullanıcı durumu kontrol edildi: ${currentUser.email} -> Silinme Bekliyor mu? ${
        deletionStatus ? "EVET" : "HAYIR"
      }`,
    );
  };

  // 4. SİLME İŞLEMİNİ İPTAL ETME FONKSİYONU
  const cancelDeletion = async () => {
    if (!user) return;

    try {
      // 'cancel-deletion' isimli Supabase Edge Function'ını çağırıyoruz.
      const { error } = await supabase.functions.invoke("cancel-deletion");
      if (error) throw error;

      // Lokal state'i anında güncelle ki UI değişsin.
      setIsPendingDeletion(false);

      Alert.alert(
        "Hesabınız Kurtarıldı",
        "Hesap silme işlemi başarıyla iptal edildi. Tekrar hoş geldiniz!",
      );

      // Kullanıcı bilgisini tazelemek için oturumu yenile. Bu, metadata'yı günceller.
      await supabase.auth.refreshSession();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : "Beklenmedik bir hata oluştu";
      console.error("Hesap kurtarma işlemi başarısız:", errorMessage);
      Alert.alert("Hata", errorMessage);
    }
  };

  // context/Auth.tsx --- TEMİZLENMİŞ ve DOĞRU useEffect ---
  useEffect(() => {
    // 1. Başlangıçta mevcut oturumu al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkUserStatus(session.user);
      setAuthReady(true);
    });

    // 2. Auth durumundaki normal değişiklikleri (giriş, çıkış vs.) dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          checkUserStatus(currentUser);
        } else {
          queryClient.clear();
        }
      }
    );

    // 3. OAuth'tan geri dönen derin link'i yakala ve session'a çevir
    const handleDeepLink = async ({ url }: { url: string }) => {
      console.log('[OAUTH] deep link:', url);
      const { data, error } = await (supabase.auth as unknown as {
        exchangeCodeForSession: (args: { currentUrl: string }) => Promise<{ data: { session?: unknown } | null; error: { message: string } | null }>;
      }).exchangeCodeForSession({ currentUrl: url });
      if (error) console.error('[OAUTH] exchange hata:', error.message);
      if (data?.session) console.log('[OAUTH] session set:', (data as unknown as { session: { user?: { email?: string } } }).session.user?.email);
    };
    
    // Uygulama çalışırken gelen deep link'leri dinle
    const deepLinkSubscription = Linking.addEventListener('url', handleDeepLink);

    // Uygulama kapalıyken deep link ile açılırsa, ilk URL'i işle
    Linking.getInitialURL().then(url => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    // Temizlik: Component kaldırıldığında dinleyicileri kapat
    return () => {
      subscription.unsubscribe();
      deepLinkSubscription.remove();
    };
  }, [queryClient]);

  const isLoading = !authReady;

  const value = {
    user,
    session,
    isLoading,
    isPendingDeletion,
    cancelDeletion,
  };

  // Auth durumunun tamamen hazır olduğundan emin ol!
  // Sadece authReady true olduğunda children'ı render et
  if (!authReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
