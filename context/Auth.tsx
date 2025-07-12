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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) {
        fetchVault();
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (_event === 'SIGNED_IN') fetchVault();
        if (_event === 'SIGNED_OUT') clearVault();
      }
    );
    return () => authListener.subscription.unsubscribe();
  }, [fetchVault, clearVault]);

  const value = { session, user, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};