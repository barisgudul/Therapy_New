// context/Auth.tsx
import { Session, User } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useVaultStore } from '../store/vaultStore';
import { supabase } from '../utils/supabase';

type AuthContextType = { user: User | null; session: Session | null; loading: boolean; };
const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const { fetchVault, clearVault } = useVaultStore.getState();

  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;

        setSession(session);
        setUser(session?.user ?? null);

        if (session) {
          try {
            await fetchVault();
          } catch (vaultError: any) {
            console.error("⛔️ Vault yükleme hatası:", vaultError.message);
            // Vault yüklemede hata olsa bile oturum devam edebilir
          }
        }
      } catch (initialError: any) {
        console.error("⛔️ Auth başlangıç hatası:", initialError.message);
        // Hata durumunda oturum null, kullanıcı null olsun
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        try {
          setSession(session);
          setUser(session?.user ?? null);

          if (_event === 'SIGNED_IN') {
            // fetchVault() bir hata fırlatabilir, async olarak yakala
            (async () => {
              try {
                await fetchVault();
              } catch (vaultFetchError: any) {
                console.error("AuthListener - Vault yükleme hatası:", vaultFetchError.message);
                // Vault yüklemede hata olsa bile kullanıcı giriş yapmış olabilir
              }
            })();
          } else if (_event === 'SIGNED_OUT') {
            clearVault();
          }
        } catch (listenerError: any) {
          console.error("Auth Listener hatası:", listenerError.message);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [fetchVault, clearVault]);

  const value = { session, user, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};