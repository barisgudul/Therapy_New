// context/Auth.tsx - AMELİYAT EDİLMİŞ VE GÜÇLENDİRİLMİŞ VERSİYON

import { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query"; // EKLE
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
// import { useVaultStore } from '../store/vaultStore'; // SİL
import { supabase } from "../utils/supabase.ts";

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

export const useAuth = () => useContext(AuthContext);

// 2. AUTH PROVIDER'I BASTAN YAZIYORUZ
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingDeletion, setIsPendingDeletion] = useState(false); // State'i burada tut

  // Vault kullanılıyorsa, fonksiyonları al
  // const fetchVault = useVaultStore((state) => state.fetchVault); // SİL
  // const clearVault = useVaultStore((state) => state.clearVault); // SİL

  const queryClient = useQueryClient(); // queryClient'ı al.

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

  // 5. TEK VE GÜÇLÜ useEffect
  useEffect(() => {
    const handleAuthStateChange = async (
      _event: string,
      session: Session | null,
    ) => {
      console.log(
        `[AUTH] onAuthStateChange tetiklendi. Oturum: ${
          session ? "VAR ✅" : "YOK ❌"
        }`,
      );

      setIsLoading(true); // İşlemler başlarken yükleniyor durumuna al
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      await checkUserStatus(currentUser); // ⬅️ İŞTE BÜTÜN OLAY BU SATIRDA

      if (currentUser) {
        // console.log("[AUTH] Kullanıcı oturumu aktif. Vault yükleniyor..."); // BU YORUM BİLE YALAN SÖYLÜYOR.
        // await fetchVault(); // SİL. _layout zaten bu işi yapıyor.
      } else {
        console.log("[AUTH] Kullanıcı oturumu kapalı. Cache temizleniyor...");
        // clearVault(); // SİL.
        queryClient.clear(); // BÜTÜN cache'i temizle. En güvenlisi bu.
      }

      setIsLoading(false); // Bütün işlemler bitince yükleniyor durumunu kapat
    };

    // Uygulama ilk açıldığında mevcut oturumu al ve işle
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange("INITIAL_SESSION", session);
    });

    // Oturum değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      handleAuthStateChange,
    );

    // Component kaldırıldığında dinleyiciyi kapat
    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]); // Bağımlılıklar doğru.

  const value = {
    user,
    session,
    isLoading,
    isPendingDeletion,
    cancelDeletion, // ⬅️ Context'e ver
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
