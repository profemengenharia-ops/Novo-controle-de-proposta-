/**
 * aiService — chama a Supabase Edge Function "ai-proxy".
 *
 * A chave GEMINI_API_KEY vive APENAS no servidor (Supabase Vault).
 * O frontend nunca toca nela. Remove-se VITE_GEMINI_API_KEY do .env.local.
 *
 * Setup (uma vez):
 *   supabase secrets set GEMINI_API_KEY=<sua-chave>
 *   supabase functions deploy ai-proxy
 */

import { supabase, isMockMode } from '../lib/supabase';
import { TechnicalScopeItem, Proposal } from '../types';
import { safeParseJSON } from '../lib/utils';
import { toast } from 'sonner';
import { logger } from '../lib/logger';

// ── Proxy helper ─────────────────────────────────────────────────────────────
async function callProxy<T>(
  operation: string,
  payload: Record<string, unknown>,
): Promise<T | null> {
  if (isMockMode) {
    toast.info('IA indisponível em modo preview.', {
      description: 'Configure as variáveis de ambiente Supabase para usar IA.',
    });
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    toast.error('Sessão expirada. Faça login novamente.');
    return null;
  }

  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: { operation, ...payload },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw error;

    // Edge function retorna { result: string }; parsear se necessário
    return (data?.result ?? data) as T;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    toast.error(`IA indisponível: ${operation}`, { description: msg });
    // Logger seguro: não loga payload (pode conter dados do cliente)
    logger.error(`[AI] ${operation} falhou`, { status: (err as any)?.status });
    return null;
  }
}

// ── API pública ───────────────────────────────────────────────────────────────
export const aiService = {
  async generateTechnicalScope(prompt: string): Promise<TechnicalScopeItem[]> {
    const result = await callProxy<string>('generateTechnicalScope', { prompt });
    if (!result) return [];
    return safeParseJSON<TechnicalScopeItem[]>(result, []);
  },

  async extractQuantities(text: string): Promise<unknown[]> {
    const result = await callProxy<string>('extractQuantities', { text });
    if (!result) return [];
    return safeParseJSON<unknown[]>(result, []);
  },

  async analyzePricingRisk(_proposal: unknown, _history: unknown[]): Promise<string> {
    // Mantido como stub — implementar via edge function quando necessário
    return 'Sem insights no momento.';
  },

  async generateFollowUpMessage(proposal: Partial<Proposal>): Promise<string> {
    const result = await callProxy<string>('generateFollowUp', { proposal });
    return result ?? '';
  },

  async analyzeBusinessImpact(proposals: Proposal[]): Promise<string> {
    const result = await callProxy<string>('analyzeBusinessImpact', { proposals });
    return result ?? 'Aguardando mais dados para gerar insights.';
  },

  async parseSpreadsheetColumns(headers: string[]): Promise<Record<string, string>> {
    const result = await callProxy<string>('parseSpreadsheetColumns', { headers });
    return safeParseJSON<Record<string, string>>(result ?? '{}', {});
  },
};
