// context/Auth.tsx (İyileştirilmiş Versiyon)

import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useVaultStore } from '../store/vaultStore';
import { supabase } from '../utils/supabase';

type AuthContextType = { 
  user: User | null; 
  session: Session | null; 
  isLoading: boolean;
  isPendingDeletion: boolean;
  cancelDeletion: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  session: null, 
  isLoading: true, 
  isPendingDeletion: false,
  cancelDeletion: async () => {} 
});
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingDeletion, setIsPendingDeletion] = useState(false);
  
  // Zustand'dan fonksiyonları doğrudan al, state'i değil
  const fetchVault = useVaultStore((state) => state.fetchVault);
  const clearVault = useVaultStore((state) => state.clearVault);

  const cancelDeletion = async () => {
    if (!user) return; // Kullanıcı yoksa işlem yapma

    try {
      // Artık admin komutunu değil, GÜVENLİ ve sunucudaki
      // 'cancel-deletion' isimli fonksiyonumuzu çağırıyoruz.
      const { error } = await supabase.functions.invoke('cancel-deletion');
      
      // Eğer Edge Function bir hata döndürürse, onu yakala ve göster.
      if (error) {
        throw error;
      }

      // Sunucudaki işlem başarılı olursa, arayüzdeki durumu hemen güncelliyoruz.
      setIsPendingDeletion(false);
      Alert.alert(
        'İşlem İptal Edildi', 
        'Hesabınız normale döndü. Tekrar hoş geldiniz!'
      );
      
      // Supabase'in en güncel kullanıcı bilgisini (metadata dahil) çekmesini sağlayalım.
      await supabase.auth.refreshSession();
      
    } catch (err: any) {
      // Fonksiyonu çağırma sırasında bir hata olursa (örn: internet bağlantısı yoksa)
      // bunu kullanıcıya bildiriyoruz.
      console.error('Hesap iptal işlemi başarısız:', err);
      Alert.alert('Hata', err.message || 'İşlem sırasında beklenmedik bir hata oluştu.');
    }
  };

  useEffect(() => {
    // 1. Sadece Supabase listener'ını ve ilk oturum kontrolünü yap
    const getInitialSession = async () => {
      console.log("Uygulama Başladı: getInitialSession çağrıldı. AsyncStorage'dan oturum okunuyor...");
      const { data: { session } } = await supabase.auth.getSession();
      console.log("OKUNAN OTURUM:", session ? 'OTURUM BULUNDU ✅' : 'OTURUM BULUNAMADI ❌');
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Kullanıcı durumunu kontrol et
      const userStatus = currentUser?.user_metadata?.status;
      if (userStatus === 'pending_deletion') {
        setIsPendingDeletion(true);
      } else {
        setIsPendingDeletion(false);
      }
      
      setIsLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Bağımlılık listesi boş, sadece bir kez çalışır

  useEffect(() => {
    // 2. Kullanıcı durumu değiştiğinde vault'u ve aboneliği yönet
    const handleUserSession = async () => {
      if (user) {
        try {
          // Önce Vault'u yükle
          await fetchVault();

          // Sonra abonelik durumunu kontrol et ve gerekirse ata
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.functions.invoke('assign-free-plan');
             console.log('✨ [AUTH] Ücretsiz abonelik atama fonksiyonu çağrıldı.');
          }
        } catch (error) {
          console.error("⛔️ [AUTH] Oturum yönetimi hatası:", (error as Error).message);
        }
      } else {
        // Kullanıcı null ise (çıkış yapıldıysa) vault'u temizle
        clearVault();
      }
    };

    handleUserSession();
    
  }, [user, fetchVault, clearVault]); // Bu effect sadece 'user' değiştiğinde tetiklenir

  const value = { session, user, isLoading, isPendingDeletion, cancelDeletion };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};