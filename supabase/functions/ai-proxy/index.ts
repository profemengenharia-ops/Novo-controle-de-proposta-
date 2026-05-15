/**
 * ai-proxy — Supabase Edge Function
 *
 * Proxies all Gemini API calls server-side so the API key is never
 * embedded in the browser bundle.
 *
 * Deploy:
 *   supabase secrets set GEMINI_API_KEY=<sua-chave>
 *   supabase functions deploy ai-proxy --no-verify-jwt
 *
 * A chave Gemini é lida de Deno.env — NUNCA do frontend.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS: permite apenas o domínio de produção e localhost dev ─────────────
const ALLOWED_ORIGINS = [
  'https://profem-proposal-gen-3.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
];

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// ── Gemini REST API (sem SDK para manter bundle leve no Deno) ──────────────
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash:generateContent';

async function callGemini(
  apiKey: string,
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string,
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }
  if (responseMimeType) {
    body.generation_config = { response_mime_type: responseMimeType };
  }

  const res = await fetch(`${GEMINI_BASE}/${MODEL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

// ── Operações disponíveis ──────────────────────────────────────────────────
async function handleOperation(
  operation: string,
  params: Record<string, unknown>,
  apiKey: string,
): Promise<unknown> {
  switch (operation) {
    case 'generateTechnicalScope':
      return callGemini(
        apiKey,
        String(params.prompt ?? ''),
        `Você é um engenheiro especialista em sistemas de combate a incêndio.
Gere uma lista detalhada de itens de escopo técnico com base na descrição.
Formato: array JSON com "category" e "description".
Exemplo: [{"category":"HIDRANTES","description":"Fornecimento e instalação..."}]`,
        'application/json',
      );

    case 'extractQuantities':
      return callGemini(
        apiKey,
        String(params.text ?? ''),
        `Extraia quantidades de materiais de combate a incêndio do texto.
Retorne array JSON com "item", "quantidade", "unidade".`,
        'application/json',
      );

    case 'generateFollowUp': {
      const p = params.proposal as Record<string, unknown>;
      const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
      const value = typeof p?.commercialProposal === 'object'
        ? ((p.commercialProposal as any)?.totalValue ?? 0)
        : 0;
      const prompt = `Gere uma mensagem de follow-up profissional para WhatsApp.
Cliente: ${p?.clientName ?? ''}
Escopo: ${p?.scopeTitle ?? 'Serviços de Engenharia'}
Status: ${p?.status ?? ''}
Valor: ${fmt.format(Number(value))}
Revisão: ${p?.revision ?? '00'}
Tom: parceria técnica, sem ser chato.`;
      return callGemini(apiKey, prompt);
    }

    case 'analyzeBusinessImpact': {
      const data = (params.proposals as any[])?.slice(0, 30).map((p: any) => ({
        status: p.status,
        value: p.commercialProposal?.totalValue ?? 0,
        lossReason: p.lossReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));
      const prompt = `Analise as propostas e forneça insights gerenciais em português.
Dados: ${JSON.stringify(data)}
Inclua: análise de motivos de perda, previsão de fechamento (~30% conversão), recomendações.
Tom: consultor sênior, data-driven.`;
      return callGemini(apiKey, prompt);
    }

    case 'parseSpreadsheetColumns': {
      const headers = (params.headers as string[])?.join(', ') ?? '';
      return callGemini(
        apiKey,
        `Cabeçalhos: ${headers}`,
        `Mapeie os cabeçalhos para: "description", "quantity", "unit", "price".
Retorne JSON. Ex: {"DESCRIÇÃO ITEM":"description"}`,
        'application/json',
      );
    }

    default:
      throw new Error(`Operação desconhecida: ${operation}`);
  }
}

// ── Servidor ───────────────────────────────────────────────────────────────
serve(async (req) => {
  const origin = req.headers.get('origin');
  const cors = corsHeaders(origin);

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    // 1. Verificar autenticação Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2. Ler API key do Vault (nunca do cliente)
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Serviço de IA não configurado' }), {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 3. Parsear body
    const body = await req.json().catch(() => ({}));
    const { operation, ...params } = body as { operation: string; [k: string]: unknown };

    if (!operation) {
      return new Response(JSON.stringify({ error: 'Campo "operation" obrigatório' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 4. Executar operação
    const result = await handleOperation(operation, params, apiKey);

    return new Response(JSON.stringify({ result }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    // Log sem dados sensíveis do usuário
    console.error('[ai-proxy] erro:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
