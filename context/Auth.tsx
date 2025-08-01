// context/Auth.tsx (TAM, EKSİKSİZ, KOPYALA-YAPIŞTIR İÇİN HAZIR VERSİYON)

import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState }
  // YUKARIDAKİ SATIRI EKLEMEYİ UNUTTUĞUN İÇİN HER YER KIRMIZIYDI, AMINA KODUĞUM!
  from 'react';
import { Alert } from 'react-native';
import { useVaultStore } from '../store/vaultStore';
import { supabase } from '../utils/supabase';

// --- TİP VE CONTEXT TANIMLARI ---
// Bunlar doğruydu, bunlara dokunmuyoruz.
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

// --- AUTH PROVIDER COMPONENT'İ (BEYİN NAKLİ YAPILMIŞ HALİ) ---
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPendingDeletion, setIsPendingDeletion] = useState(false);
  
  const fetchVault = useVaultStore((state) => state.fetchVault);
  const clearVault = useVaultStore((state) => state.clearVault);

  const cancelDeletion = async () => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke('cancel-deletion');
      if (error) throw error;

      setIsPendingDeletion(false);
      Alert.alert(
        'İşlem İptal Edildi', 
        'Hesabınız normale döndü. Tekrar hoş geldiniz!'
      );
      
      await supabase.auth.refreshSession();
      
    } catch (err: any) {
      console.error('Hesap iptal işlemi başarısız:', err);
      Alert.alert('Hata', err.message || 'İşlem sırasında beklenmedik bir hata oluştu.');
    }
  };

  // TEK VE GÜÇLÜ useEffect. BÜTÜN MANTIK BURADA.
  useEffect(() => {
    setIsLoading(true);
    console.log("AuthProvider bağlandı: Oturum durumu dinleniyor...");

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("onAuthStateChange tetiklendi. Oturum:", session ? 'VAR ✅' : 'YOK ❌');
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        console.log("Kullanıcı oturumu aktif. İşlemler başlıyor...");
        
        const userStatus = currentUser.user_metadata?.status;
        setIsPendingDeletion(userStatus === 'pending_deletion');
        
        try {
          await fetchVault();
          await supabase.functions.invoke('assign-free-plan');
          console.log('✨ [AUTH] Gerekli veriler yüklendi ve ücretsiz plan atandı.');
        } catch (error) {
          console.error("⛔️ [AUTH] Oturum açma sonrası işlemler başarısız:", (error as Error).message);
        }

      } else {
        console.log("Kullanıcı oturumu kapalı. Temizlik yapılıyor...");
        clearVault();
        setIsPendingDeletion(false);
      }
      
      setIsLoading(false);
    });

    return () => {
      console.log("AuthProvider kaldırıldı: Dinleyici aboneliği sonlandırılıyor.");
      authListener.subscription.unsubscribe();
    };
  }, []); // Bağımlılık dizisi boş. Sadece bir kere çalışır.

  const value = { session, user, isLoading, isPendingDeletion, cancelDeletion };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};