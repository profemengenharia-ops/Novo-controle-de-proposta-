/**
 * logger.ts — Logger seguro para produção.
 *
 * Em DEV:    loga o erro completo (inclui stack trace).
 * Em PROD:   loga apenas código HTTP e mensagem curta — nunca o objeto
 *            completo (que pode conter queries SQL, tokens ou PII).
 */

const IS_DEV = import.meta.env.DEV;

type LogMeta = Record<string, unknown>;

function sanitize(err: unknown): string {
  if (!err) return 'erro desconhecido';
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const e = err as Record<string, unknown>;
    // Supabase errors têm { code, message, details, hint }
    return String(e.message ?? e.code ?? 'erro interno');
  }
  return String(err);
}

export const logger = {
  /** Erros de serviço / API */
  error(context: string, err?: unknown, meta?: LogMeta): void {
    if (IS_DEV) {
      console.error(`[ERR] ${context}`, err, meta ?? '');
    } else {
      // Em produção: apenas contexto + código, sem dados internos
      const safe: LogMeta = {
        status: (err as any)?.status ?? (err as any)?.code ?? 'unknown',
        ...(meta ?? {}),
      };
      console.error(`[ERR] ${context}`, safe);
    }
  },

  /** Avisos não críticos */
  warn(context: string, meta?: LogMeta): void {
    if (IS_DEV) {
      console.warn(`[WARN] ${context}`, meta ?? '');
    }
    // Em produção silencia warns operacionais para não poluir o console
  },

  /** Informação de desenvolvimento */
  info(context: string, meta?: LogMeta): void {
    if (IS_DEV) {
      console.info(`[INFO] ${context}`, meta ?? '');
    }
  },

  /** Retorna mensagem legível de um erro desconhecido */
  message: sanitize,
};
