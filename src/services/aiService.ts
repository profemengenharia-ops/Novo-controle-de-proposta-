import retry from "async-retry";
import { TechnicalScopeItem, Proposal } from "../types";
import { safeParseJSON } from "../lib/utils";
import { toast } from "sonner";
import { GEMINI_MODEL } from "../config/aiConfig";
import { supabase, isMockMode } from "../lib/supabase";

interface GeminiRequest {
  contents: string;
  systemInstruction?: string;
  responseMimeType?: "application/json" | "text/plain";
}

async function invokeGemini(request: GeminiRequest): Promise<string> {
  if (isMockMode) {
    const error = new Error("IA indisponivel no modo mock. Configure o Supabase e a Edge Function ai-generate.");
    (error as any).status = 403;
    throw error;
  }

  const { data, error } = await supabase.functions.invoke("ai-generate", {
    body: {
      ...request,
      model: GEMINI_MODEL,
    },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data?.text || "";
}

/**
 * Robust wrapper for AI calls with exponential backoff and 503 handling.
 */
async function callAIWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T | null> {
  return await retry(
    async (bail, attempt) => {
      try {
        return await operation();
      } catch (error: any) {
        const isServiceUnavailable =
          error?.status === 503 ||
          error?.message?.includes("503") ||
          error?.message?.includes("capacity") ||
          error?.message?.includes("overloaded");

        if (error?.status === 403 || error?.message?.includes("403")) {
          bail(new Error("Nao autorizado: verifique a configuracao da Edge Function ai-generate."));
          return null as any;
        }

        if (isServiceUnavailable) {
          console.warn(`[AI] ${operationName} (Tentativa ${attempt}): servidor ocupado. Aguardando...`);
          throw error;
        }

        if (error?.status === 400 || error?.status === 404) {
          bail(new Error(`Erro fatal na API (${error.status}): ${error.message}`));
          return null as any;
        }

        throw error;
      }
    },
    {
      retries: 5,
      minTimeout: 5000,
      maxTimeout: 60000,
      factor: 2,
      onRetry: (error: unknown, attempt) => {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("503") || message.includes("capacity")) {
          toast.info(`Capacidade esgotada. Tentativa ${attempt}/5 em instantes...`, {
            description: "O Google Gemini esta sob alta carga. Estamos aguardando a liberacao."
          });
        }
      }
    }
  );
}

export const aiService = {
  async generateTechnicalScope(prompt: string): Promise<TechnicalScopeItem[]> {
    const result = await callAIWithRetry(() => invokeGemini({
      contents: prompt,
      responseMimeType: "application/json",
      systemInstruction: `Voce e um engenheiro especialista em sistemas de combate a incendio.
Gere uma lista detalhada de itens de escopo tecnico com base na descricao fornecida.
Retorne apenas um array JSON de objetos com "category" e "description".
Exemplo: [{"category":"HIDRANTES","description":"Fornecimento e instalacao de 30 pontos de hidrantes simples..."}]`,
    }), "Gerar Escopo Tecnico");

    if (!result) return [];
    return safeParseJSON<TechnicalScopeItem[]>(result, []);
  },

  async generateScopeSummary(prompt: string): Promise<string> {
    const result = await callAIWithRetry(() => invokeGemini({
      contents: prompt,
      systemInstruction: `Voce e um engenheiro especialista em sistemas de combate a incendio.
Escreva o paragrafo de "Objeto e Escopo" para uma proposta tecnica formal em portugues brasileiro.
Regras: um unico paragrafo corrido de 3 a 5 frases, tom profissional e tecnico, sem listas, sem titulos e sem markdown.`,
    }), "Gerar Objeto e Escopo");

    return (result || "").trim();
  },

  async extractQuantities(text: string): Promise<any> {
    const result = await callAIWithRetry(() => invokeGemini({
      contents: text,
      responseMimeType: "application/json",
      systemInstruction: `Extraia quantidades de materiais de combate a incendio do texto fornecido.
Retorne apenas um array JSON de objetos com "item", "quantidade" e "unidade".`,
    }), "Extrair Quantidades");

    if (!result) return [];
    return safeParseJSON<any>(result, []);
  },

  async analyzePricingRisk(proposal: any, history: any[]): Promise<string> {
    const result = await callAIWithRetry(() => invokeGemini({
      contents: `Proposta Atual: ${JSON.stringify(proposal)}. Historico: ${JSON.stringify(history)}`,
      systemInstruction: `Voce e um CFO virtual especialista em engenharia.
Analise a proposta atual em relacao ao historico e identifique riscos de margem, descontos excessivos ou erros de calculo.
Seja direto e profissional em portugues brasileiro.`,
    }), "Analisar Riscos de Preco");

    return result || "Sem insights no momento.";
  },

  async generateFollowUpMessage(proposal: Partial<Proposal>): Promise<string> {
    const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
    const promptText = `Gere uma mensagem de follow-up curta, profissional e persuasiva para WhatsApp.
Cliente: ${proposal.clientName}
Escopo: ${proposal.scopeTitle || "Servicos de Engenharia"}
Status Atual: ${proposal.status}
Valor: ${formatter.format(proposal.commercialProposal?.totalValue || 0)}
Revisao: ${proposal.revision}

Contexto:
- Se for rascunho, incentive o fechamento do escopo para envio.
- Se for enviado, pergunte se houve duvidas na abertura.
- Se for em negociacao, peca 10 minutos para alinhar condicoes.
- O tom deve ser de parceria tecnica, sem ser insistente.`;

    const result = await callAIWithRetry(() => invokeGemini({ contents: promptText }), "Gerar Follow-up");
    return result || "";
  },

  async analyzeBusinessImpact(proposals: Proposal[]): Promise<string> {
    const data = proposals.map(p => ({
      status: p.status,
      value: p.commercialProposal?.totalValue || 0,
      lossReason: p.lossReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    const promptText = `Analise os dados destas propostas comerciais de engenharia e forneca insights gerenciais estrategicos em portugues brasileiro.
Dados: ${JSON.stringify(data.slice(0, 30))}

Inclua:
1. Analise de motivos de perda, se houver padroes em lossReason.
2. Forecast de fechamento com base em propostas em negociacao e enviadas, considerando conversao historica aproximada de 30%.
3. Recomendacoes praticas para o gestor.

Seja direto, data-driven e use tom de consultor senior.`;

    const result = await callAIWithRetry(() => invokeGemini({ contents: promptText }), "Analisar Impacto do Negocio");
    return result || "Aguardando mais dados para gerar insights.";
  },

  async parseSpreadsheetColumns(headers: string[]): Promise<any> {
    const result = await callAIWithRetry(() => invokeGemini({
      contents: `Cabecalhos: ${headers.join(", ")}`,
      responseMimeType: "application/json",
      systemInstruction: `Analise os cabecalhos de uma planilha e mapeie para as chaves "description", "quantity", "unit" e "price".
Retorne apenas um objeto JSON de mapeamento. Exemplo: {"DESCRICAO ITEM":"description"}`,
    }), "Mapear Colunas da Planilha");

    return safeParseJSON<any>(result || "{}", {});
  }
};
