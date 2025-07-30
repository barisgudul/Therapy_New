// context/Auth.tsx (İyileştirilmiş Versiyon)

import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { supabase } from '../utils/supabase';

type AuthContextType = { 
  user: User | null; 
  session: Session | null; 
  isLoading: boolean; // "loading" yerine daha açıklayıcı
};

const AuthContext = createContext<AuthContextType>({ user: null, session: null, isLoading: true });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Zustand'dan fonksiyonları doğrudan al, state'i değil
  const fetchVault = useVaultStore((state) => state.fetchVault);
  const clearVault = useVaultStore((state) => state.clearVault);

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
      setUser(session?.user ?? null);
      setIsLoading(false); // Her state değişiminden sonra yüklenmenin bittiğini belirt
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

  const value = { session, user, isLoading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};