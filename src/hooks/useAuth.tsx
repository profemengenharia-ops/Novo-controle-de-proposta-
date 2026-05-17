import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isMockMode } from '../lib/supabase';
import { RateLimiter } from '../lib/rateLimit';

// ── Domínios autorizados ───────────────────────────────────────────────────────
// Adicione ou remova domínios conforme necessário
const ALLOWED_DOMAINS = ['profem.com.br', 'profemengenharia.com.br'];

// Rate limiter: máx 5 tentativas de login por minuto
const loginLimiter = new RateLimiter({
  maxCalls: 5,
  windowMs: 60_000,
  message: 'Muitas tentativas de acesso. Aguarde antes de tentar novamente.',
});

// Chaves de localStorage gerenciadas por este hook
const LS_KEYS = ['lastRadarShow'] as const;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInLoading: boolean;
  signInError: string | null;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  clearSignInError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Verifica se um e-mail pertence a um domínio autorizado. */
function isAllowedEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  return ALLOWED_DOMAINS.some(domain => lower.endsWith(`@${domain}`));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    // ── Modo desenvolvimento (sem Supabase configurado) ──────────────────────
    if (isMockMode) {
      if (import.meta.env.DEV) {
        console.warn(
          '[Auth] MOCK MODE ativo — autenticação desabilitada. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
        );
        setUser({ id: 'mock-user-id', email: 'dev@local.mock' } as User);
      } else {
        // Em produção sem credenciais: bloquear tudo
        console.error('[Auth] Credenciais Supabase ausentes em produção. Acesso bloqueado.');
      }
      setLoading(false);
      return;
    }

    // Flag para evitar setState em componente desmontado
    let mounted = true;

    // ── Sessão inicial ───────────────────────────────────────────────────────
    // Bug #3: sem .catch() o app travava em loading eterno se Supabase falhasse
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session?.user) {
          if (!isAllowedEmail(session.user.email)) {
            supabase.auth.signOut();
            setUser(null);
          } else {
            setUser(session.user);
          }
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        // Bug #4: setLoading(false) garantido mesmo com erro de rede
        if (mounted) setLoading(false);
      });

    // ── Listener de mudanças de auth ─────────────────────────────────────────
    // Bug #4: onAuthStateChange não seta loading para evitar race condition
    // com getSession — quem chama primeiro define o estado final
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        if (!isAllowedEmail(session.user.email)) {
          // Autenticou, mas domínio não permitido → rejeitar e expulsar
          await supabase.auth.signOut();
          setSignInError(
            `Acesso negado. Apenas contas @${ALLOWED_DOMAINS[0]} têm permissão de acesso ao sistema.`,
          );
          setUser(null);
        } else {
          setUser(session.user);
          setSignInError(null);
        }
      } else {
        setUser(null);
      }
      // loading é resolvido pelo finally do getSession; aqui apenas paramos o spinner de login
      setLoading(false);
      setSignInLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    // Rate limit
    if (!loginLimiter.check()) {
      const seconds = loginLimiter.retryAfterSeconds();
      setSignInError(
        `Muitas tentativas. Aguarde ${seconds} segundo${seconds !== 1 ? 's' : ''} antes de tentar novamente.`,
      );
      return;
    }

    setSignInLoading(true);
    setSignInError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            // Sugere ao Google que filtre por conta da organização (hint apenas)
            hd: ALLOWED_DOMAINS[0],
          },
        },
      });
      if (error) throw error;
      // signInLoading fica true até onAuthStateChange disparar (ou o tab redirecionar)
    } catch (err) {
      setSignInLoading(false);
      setSignInError('Não foi possível conectar ao Google. Verifique sua conexão e tente novamente.');
      if (import.meta.env.DEV) {
        console.error('[Auth] Falha ao iniciar OAuth:', err);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // Limpa estado de sessão do localStorage
      LS_KEYS.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.error('[Auth] Falha no logout:', import.meta.env.DEV ? err : 'erro interno');
    }
  }, []);

  const clearSignInError = useCallback(() => setSignInError(null), []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signInLoading, signInError, signIn, logout, clearSignInError }}
    >
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
