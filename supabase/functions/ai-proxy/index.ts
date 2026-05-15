/**
 * ai-proxy — Supabase Edge Function
 *
 * Proxies all Gemini API calls server-side so the API key is never
 * embedded in the browser bundle.
 *
 * Required secret: supabase secrets set GEMINI_API_KEY=<sua-chave>
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://profem-proposal-gen-3.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ── Gemini REST API ───────────────────────────────────────────────────────────
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.0-flash:generateContent";

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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── Operações disponíveis ─────────────────────────────────────────────────────
async function handleOperation(
  operation: string,
  params: Record<string, unknown>,
  apiKey: string,
): Promise<unknown> {
  switch (operation) {
    case "generateTechnicalScope":
      return callGemini(
        apiKey,
        String(params.prompt ?? ""),
        `Voce e um engenheiro especialista em sistemas de combate a incendio.
Gere uma lista detalhada de itens de escopo tecnico com base na descricao.
Formato: array JSON com "category" e "description".
Exemplo: [{"category":"HIDRANTES","description":"Fornecimento e instalacao..."}]`,
        "application/json",
      );

    case "extractQuantities":
      return callGemini(
        apiKey,
        String(params.text ?? ""),
        `Extraia quantidades de materiais de combate a incendio do texto.
Retorne array JSON com "item", "quantidade", "unidade".`,
        "application/json",
      );

    case "generateFollowUp": {
      const p = params.proposal as Record<string, unknown>;
      const fmt = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const value =
        typeof p?.commercialProposal === "object"
          ? ((p.commercialProposal as Record<string, unknown>)?.totalValue ?? 0)
          : 0;
      const prompt = `Gere uma mensagem de follow-up profissional para WhatsApp.
Cliente: ${p?.clientName ?? ""}
Escopo: ${p?.scopeTitle ?? "Servicos de Engenharia"}
Status: ${p?.status ?? ""}
Valor: ${fmt.format(Number(value))}
Revisao: ${p?.revision ?? "00"}
Tom: parceria tecnica, sem ser chato.`;
      return callGemini(apiKey, prompt);
    }

    case "analyzeBusinessImpact": {
      const data = (params.proposals as Record<string, unknown>[])
        ?.slice(0, 30)
        .map((p) => ({
          status: p.status,
          value:
            (p.commercialProposal as Record<string, unknown>)?.totalValue ?? 0,
          lossReason: p.lossReason,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
      const prompt = `Analise as propostas e forneca insights gerenciais em portugues.
Dados: ${JSON.stringify(data)}
Inclua: analise de motivos de perda, previsao de fechamento (~30% conversao), recomendacoes.
Tom: consultor senior, data-driven.`;
      return callGemini(apiKey, prompt);
    }

    case "parseSpreadsheetColumns": {
      const headers = (params.headers as string[])?.join(", ") ?? "";
      return callGemini(
        apiKey,
        `Cabecalhos: ${headers}`,
        `Mapeie os cabecalhos para: "description", "quantity", "unit", "price".
Retorne JSON. Ex: {"DESCRICAO ITEM":"description"}`,
        "application/json",
      );
    }

    default:
      throw new Error(`Operacao desconhecida: ${operation}`);
  }
}

// ── Servidor ──────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // 1. Verificar autenticacao Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authErr,
    } = await supabaseClient.auth.getUser();

    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // 2. Ler API key do Secret (nunca do cliente)
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Servico de IA nao configurado" }),
        {
          status: 503,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Parsear body
    const body = (await req.json().catch(() => ({}))) as {
      operation: string;
      [k: string]: unknown;
    };
    const { operation, ...params } = body;

    if (!operation) {
      return new Response(
        JSON.stringify({ error: 'Campo "operation" obrigatorio' }),
        {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Executar operacao
    const result = await handleOperation(operation, params, apiKey);

    return new Response(JSON.stringify({ result }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[ai-proxy] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
