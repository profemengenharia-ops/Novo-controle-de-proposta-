import React from 'react';
import { AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Logo } from './Logo';

interface LoginPageProps {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
  onClearError: () => void;
}

/** Ícone oficial do Google */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginPage({ onSignIn, loading, error, onClearError }: LoginPageProps) {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 relative overflow-hidden px-4">
      {/* Blobs decorativos */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] bg-orange-400/8 rounded-full blur-3xl" />
      </div>

      {/* Card principal */}
      <div className="relative w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Faixa de cor no topo */}
          <div className="h-1.5 bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600" />

          <div className="p-10 space-y-8">
            {/* Logo + Nome */}
            <div className="flex flex-col items-center gap-4">
              <Logo size={68} />
              <div className="text-center">
                <h1 className="text-lg font-black tracking-tighter text-neutral-900 uppercase leading-none">
                  ProFem Engenharia
                </h1>
                <p className="text-[9px] text-neutral-400 uppercase tracking-[0.3em] font-bold mt-1">
                  Sistema de Gestão Comercial
                </p>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-neutral-100" />

            {/* Mensagem de erro */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <AlertCircle size={15} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-700 leading-snug">{error}</p>
                  <button
                    onClick={onClearError}
                    className="text-[10px] text-red-400 hover:text-red-600 mt-1.5 underline underline-offset-2 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}

            {/* Instrução + Botão */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs font-semibold text-neutral-600">Entrar no sistema</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Use sua conta Google corporativa
                </p>
              </div>

              <button
                onClick={onSignIn}
                disabled={loading}
                aria-busy={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-neutral-200 hover:border-orange-400 hover:shadow-md py-3.5 px-6 rounded-2xl transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 group"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-orange-500" />
                    <span className="text-xs font-bold text-neutral-600 uppercase tracking-widest">
                      Conectando...
                    </span>
                  </>
                ) : (
                  <>
                    <GoogleIcon />
                    <span className="text-xs font-bold text-neutral-700 uppercase tracking-widest group-hover:text-neutral-900 transition-colors">
                      Acessar com Google
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Aviso de domínio restrito */}
            <div className="bg-neutral-50 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide leading-none mb-1">
                  Acesso restrito
                </p>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  Exclusivo para colaboradores com conta{' '}
                  <strong className="text-neutral-500">@profem.com.br</strong>.{' '}
                  Sessões registradas por auditoria.
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé do card */}
          <div className="px-10 pb-7 text-center">
            <p className="text-[9px] text-neutral-300 uppercase tracking-widest font-bold">
              ProFem Engenharia &copy; {year}
            </p>
          </div>
        </div>

        {/* Tagline abaixo do card */}
        <p className="text-center text-[9px] text-white/20 mt-5 uppercase tracking-[0.25em] font-bold">
          Gestao de propostas &amp; orcamentos
        </p>
      </div>
    </div>
  );
}
