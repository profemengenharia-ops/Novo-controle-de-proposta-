/**
 * rateLimit.ts — throttle client-side para chamadas custosas (IA, uploads).
 *
 * Uso:
 *   const canCall = aiLimiter.check();
 *   if (!canCall) { toast.warning('Aguarde...'); return; }
 *   await aiService.generateTechnicalScope(prompt);
 */

interface RateLimiterOptions {
  /** Máximo de chamadas permitidas dentro da janela */
  maxCalls: number;
  /** Tamanho da janela em ms (default: 60_000 = 1 min) */
  windowMs?: number;
  /** Mensagem exibida ao usuário quando o limite é atingido */
  message?: string;
}

export class RateLimiter {
  private calls: number[] = [];
  private readonly maxCalls: number;
  private readonly windowMs: number;
  readonly message: string;

  constructor({ maxCalls, windowMs = 60_000, message = 'Muitas requisições. Aguarde um momento.' }: RateLimiterOptions) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.message = message;
  }

  /** Retorna true se a chamada for permitida (e a registra). */
  check(): boolean {
    const now = Date.now();
    // Remove chamadas fora da janela
    this.calls = this.calls.filter(t => now - t < this.windowMs);

    if (this.calls.length >= this.maxCalls) return false;

    this.calls.push(now);
    return true;
  }

  /** Segundos restantes até a próxima janela abrir. */
  retryAfterSeconds(): number {
    if (this.calls.length === 0) return 0;
    const oldest = Math.min(...this.calls);
    return Math.ceil((this.windowMs - (Date.now() - oldest)) / 1000);
  }

  reset(): void {
    this.calls = [];
  }
}

// ── Instâncias prontas para uso ───────────────────────────────────────────────

/** Chamadas à IA: máx 10 por minuto por usuário (browser) */
export const aiLimiter = new RateLimiter({
  maxCalls: 10,
  windowMs: 60_000,
  message: 'Limite de 10 consultas à IA por minuto atingido. Aguarde.',
});

/** Upload de planilhas: máx 5 por minuto */
export const uploadLimiter = new RateLimiter({
  maxCalls: 5,
  windowMs: 60_000,
  message: 'Muitos uploads em sequência. Aguarde 1 minuto.',
});
