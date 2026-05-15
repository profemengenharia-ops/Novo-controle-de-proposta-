import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isMockMode } from '../lib/supabase';

// Chaves de localStorage gerenciadas por este hook
const LS_KEYS = ['lastRadarShow'] as const;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      // Alerta visível apenas em DEV — nunca em produção
      if (import.meta.env.DEV) {
        console.warn('[Auth] MOCK MODE ativo — autenticação desabilitada. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      } else {
        // Em produção sem credenciais: bloquear tudo (não gerar usuário fake)
        console.error('[Auth] Credenciais Supabase ausentes em produção. Acesso bloqueado.');
        setLoading(false);
        return;
      }
      // Apenas em DEV: usuário mock sem email real exposto em log
      setUser({ id: 'mock-user-id', email: 'dev@local.mock' } as User);
      setLoading(false);
      return;
    }

    // Verificar sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças de auth state (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      // Não loga o objeto de erro completo em produção (pode conter tokens)
      console.error('[Auth] Falha ao iniciar OAuth:', import.meta.env.DEV ? error : 'verifique as configurações do provedor');
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Limpar todo o estado de sessão do localStorage
      LS_KEYS.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[Auth] Falha no logout:', import.meta.env.DEV ? error : 'erro interno');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
