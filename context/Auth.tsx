// context/Auth.tsx - AMELİYAT EDİLMİŞ VE GÜÇLENDİRİLMİŞ VERSİYON

import { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query"; // EKLE
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert, ActivityIndicator, View } from "react-native";
// import { useVaultStore } from '../store/vaultStore'; // SİL
import { supabase } from "../utils/supabase";

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
  const [isLoading, setIsLoading] = useState(true);
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

  // 5. TEK VE GÜÇLÜ useEffect - Optimize edilmiş versiyon
  useEffect(() => {
    let isMounted = true; // Component'in hala mount olup olmadığını takip et

    const handleAuthStateChange = async (
      _event: string,
      session: Session | null,
    ) => {
      if (!isMounted) return; // Component unmount olduysa çık

      console.log(
        `[AUTH] onAuthStateChange tetiklendi. Oturum: ${
          session ? "VAR ✅" : "YOK ❌"
        }`,
      );

      // State güncellemelerini güvenli bir şekilde yap
      const currentUser = session?.user ?? null;

      // Tüm state güncellemelerini tek seferde yap
      if (isMounted) {
        setIsLoading(true);
        setSession(session);
        setUser(currentUser);
        // Kullanıcı durumu kontrolünü de burada yap
        if (currentUser) {
          checkUserStatus(currentUser);
        } else {
          console.log("[AUTH] Kullanıcı oturumu kapalı. Cache temizleniyor...");
          queryClient.clear();
        }
      }

      // Loading durumunu ayarla ve authReady'yi işaretle
      if (isMounted) {
        setIsLoading(false);
        setAuthReady(true);
      }
    };

    // Uygulama ilk açıldığında mevcut oturumu al ve işle
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        handleAuthStateChange("INITIAL_SESSION", session);
      }
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      handleAuthStateChange,
    );

    // Component kaldırıldığında dinleyiciyi kapat ve cleanup yap
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]); // Bağımlılıklar doğru.

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
