import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, HelpCircle, X, Pencil } from 'lucide-react';

// ─── Confirmação (sim/não) ────────────────────────────────────────────────────

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' pinta o botão de confirmação de vermelho (ações destrutivas). */
  tone?: 'default' | 'danger';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

// ─── Prompt (entrada de texto) ─────────────────────────────────────────────────

export interface PromptOptions {
  title?: string;
  message?: React.ReactNode;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

type PromptFn = (opts: PromptOptions) => Promise<string | null>;

const ConfirmContext = createContext<ConfirmFn | null>(null);
const PromptContext = createContext<PromptFn | null>(null);

/**
 * Hook para abrir um diálogo de confirmação estilizado.
 * Uso: `const confirm = useConfirm(); if (!(await confirm({ message: '...' }))) return;`
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>');
  return ctx;
}

/**
 * Hook para abrir um diálogo de entrada de texto estilizado.
 * Uso: `const prompt = usePrompt(); const name = await prompt({ label: 'Nome:' });`
 * Resolve para a string informada, ou null se cancelado/vazio.
 */
export function usePrompt(): PromptFn {
  const ctx = useContext(PromptContext);
  if (!ctx) throw new Error('usePrompt deve ser usado dentro de <ConfirmProvider>');
  return ctx;
}

type DialogState =
  | { kind: 'confirm'; opts: ConfirmOptions }
  | { kind: 'prompt'; opts: PromptOptions };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolver = useRef<((v: any) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setDialog({ kind: 'confirm', opts });
    return new Promise<boolean>((resolve) => { resolver.current = resolve; });
  }, []);

  const prompt = useCallback<PromptFn>((opts) => {
    setDialog({ kind: 'prompt', opts });
    return new Promise<string | null>((resolve) => { resolver.current = resolve; });
  }, []);

  const finish = (value: boolean | string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      <PromptContext.Provider value={prompt}>
        {children}
        <AnimatePresence>
          {dialog?.kind === 'confirm' && (
            <ConfirmView
              opts={dialog.opts}
              onCancel={() => finish(false)}
              onConfirm={() => finish(true)}
            />
          )}
          {dialog?.kind === 'prompt' && (
            <PromptView
              opts={dialog.opts}
              onCancel={() => finish(null)}
              onConfirm={(value) => finish(value)}
            />
          )}
        </AnimatePresence>
      </PromptContext.Provider>
    </ConfirmContext.Provider>
  );
}

// ─── Shell visual compartilhado ────────────────────────────────────────────────

function DialogShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  );
}

function ConfirmView({ opts, onCancel, onConfirm }: {
  opts: ConfirmOptions;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const danger = opts.tone === 'danger';
  return (
    <DialogShell onClose={onCancel}>
      <div className="p-6 flex items-start gap-4">
        <div className={'shrink-0 p-3 rounded-2xl ' + (danger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500')}>
          {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          {opts.title && <h3 className="text-base font-black tracking-tight mb-1">{opts.title}</h3>}
          <div className="text-sm text-black/70 leading-relaxed">{opts.message}</div>
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-black/5 rounded-full transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
      <div className="px-6 py-4 bg-black/[0.02] border-t border-black/5 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-5 py-2.5 bg-white border border-black/10 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black/5 transition-all">
          {opts.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          onClick={onConfirm}
          className={
            'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 text-white ' +
            (danger ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20' : 'bg-black hover:bg-neutral-800 shadow-lg shadow-black/10')
          }
        >
          {opts.confirmLabel ?? 'Confirmar'}
        </button>
      </div>
    </DialogShell>
  );
}

function PromptView({ opts, onCancel, onConfirm }: {
  opts: PromptOptions;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}) {
  const [value, setValue] = useState(opts.defaultValue ?? '');

  const submit = () => {
    const v = value.trim();
    if (!v) { onCancel(); return; }
    onConfirm(v);
  };

  return (
    <DialogShell onClose={onCancel}>
      <div className="p-6 flex items-start gap-4">
        <div className="shrink-0 p-3 rounded-2xl bg-orange-50 text-orange-500">
          <Pencil size={20} />
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          {opts.title && <h3 className="text-base font-black tracking-tight mb-1">{opts.title}</h3>}
          {opts.message && <div className="text-sm text-black/70 leading-relaxed mb-2">{opts.message}</div>}
          {opts.label && <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{opts.label}</label>}
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
            placeholder={opts.placeholder}
            className="mt-1.5 w-full px-3 py-2 text-sm bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 transition-colors"
          />
        </div>
        <button onClick={onCancel} className="p-1.5 hover:bg-black/5 rounded-full transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
      <div className="px-6 py-4 bg-black/[0.02] border-t border-black/5 flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-5 py-2.5 bg-white border border-black/10 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black/5 transition-all">
          {opts.cancelLabel ?? 'Cancelar'}
        </button>
        <button
          onClick={submit}
          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 text-white bg-black hover:bg-neutral-800 shadow-lg shadow-black/10"
        >
          {opts.confirmLabel ?? 'Adicionar'}
        </button>
      </div>
    </DialogShell>
  );
}
