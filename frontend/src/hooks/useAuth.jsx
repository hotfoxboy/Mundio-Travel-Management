import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    // Charger la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) await loadProfile();
      setLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN')  await loadProfile();
      if (event === 'SIGNED_OUT') setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    try {
      const { data } = await api.get('/api/auth/me');
      setProfile(data.profile);
    } catch {
      setProfile(null);
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await loadProfile();
    return data;
  }

  async function logout() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const value = { profile, loading, login, logout, loadProfile, isAdmin: profile?.role === 'admin' };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
