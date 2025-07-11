// context/Auth.tsx
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase'; // Bizim oluşturduğumuz Supabase bağlantısı

// Context'in tipini tanımlıyoruz
type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

// Context'i oluşturuyoruz
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

// Bu, Context'i kullanmayı kolaylaştıran bir custom hook
export const useAuth = () => {
  return useContext(AuthContext);
};

// Bu, tüm uygulamayı saracak olan sağlayıcı
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Uygulama ilk açıldığında mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Kullanıcı giriş/çıkış yaptığında anında haberdar ol
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Component kaldırıldığında listener'ı temizle
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};