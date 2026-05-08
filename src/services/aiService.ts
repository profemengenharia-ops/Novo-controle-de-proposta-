import { GoogleGenAI } from "@google/genai";
import retry from "async-retry";
import { TechnicalScopeItem, Proposal } from "../types";
import { safeParseJSON } from "../lib/utils";
import { toast } from "sonner";
import { GEMINI_MODEL } from "../config/aiConfig";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

/**
 * Robust wrapper for AI calls with exponential backoff and 503 handling.
 * Based on user feedback, 503 errors require a long wait (up to 51s).
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
        // Detect 503 (Service Unavailable) or high load
        const isServiceUnavailable = 
          error?.status === 503 || 
          error?.message?.includes("503") || 
          error?.message?.includes("capacity") ||
          error?.message?.includes("overloaded");

        // Detect 403 (Unauthorized) - stop retrying
        if (error?.status === 403 || error?.message?.includes("403")) {
          bail(new Error("Não autorizado: Verifique sua API Key do Gemini."));
          return null as any;
        }

        if (isServiceUnavailable) {
          console.warn(`[AI] ${operationName} (Tentativa ${attempt}): Servidor ocupado. Aguardando...`);
          // We don't bail, we let it retry
          throw error; 
        }

        // For other errors, decide whether to bail
        if (error?.status === 400 || error?.status === 404) {
          bail(new Error(`Erro fatal na API (${error.status}): ${error.message}`));
          return null as any;
        }

        throw error;
      }
    },
    {
      retries: 5,
      minTimeout: 5000, // Start with 5s
      maxTimeout: 60000, // Max 60s
      factor: 2,
      onRetry: (error: unknown, attempt) => {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("503") || message.includes("capacity")) {
           toast.info(`Capacidade esgotada. Tentativa ${attempt}/5 em instantes...`, {
             description: "O Google Gemini está sob alta carga. Estamos aguardando a liberação."
           });
        }
      }
    }
  );
}

export const aiService = {
  async generateTechnicalScope(prompt: string): Promise<TechnicalScopeItem[]> {
    const result = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: `Você é um engenheiro especialista em sistemas de combate a incêndio. 
          Sua tarefa é gerar uma lista detalhada de itens de escopo técnico com base na descrição fornecida pelo usuário.
          O formato de saída deve ser um array JSON de objetos com as propriedades "category" (ex: Hidrantes, Alarme, etc) e "description" (texto formal detalhando o fornecimento e instalação).
          Exemplo: [{"category": "HIDRANTES", "description": "Fornecimento e instalação de 30 pontos de hidrantes simples na bitola de 2 1/2''..."}]`,
          responseMimeType: "application/json"
        }
      });
      return response.text;
    }, "Gerar Escopo Técnico");

    if (!result) return [];
    return safeParseJSON<TechnicalScopeItem[]>(result, []);
  },

  async extractQuantities(text: string): Promise<any> {
    const result = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: text,
        config: {
          systemInstruction: `Extraia quantidades de materiais de combate a incêndio (bombas, mangueiras, botoeiras, sirenes, etc) do texto fornecido.
          Retorne um array JSON de objetos com "item", "quantidade", "unidade".`,
          responseMimeType: "application/json"
        }
      });
      return response.text;
    }, "Extrair Quantidades");

    if (!result) return [];
    return safeParseJSON<any>(result, []);
  },

  async analyzePricingRisk(proposal: any, history: any[]): Promise<string> {
    const result = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Proposta Atual: ${JSON.stringify(proposal)}. Histórico: ${JSON.stringify(history)}`,
        config: {
          systemInstruction: `Você é um CFO virtual especialista em engenharia. 
          Analise a proposta atual em relação ao histórico e identifique riscos de margem, descontos excessivos ou erros de cálculo.
          Seja direto e profissional em português brasileiro.`,
        }
      });
      return response.text;
    }, "Analisar Riscos de Preço");

    return result || "Sem insights no momento.";
  },

  async generateFollowUpMessage(proposal: Partial<Proposal>): Promise<string> {
    const result = await callAIWithRetry(async () => {
      const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
      const promptText = `Gere uma mensagem de follow-up curta, profissional e persuasiva para o WhatsApp.
      Cliente: ${proposal.clientName}
      Escopo: ${proposal.scopeTitle || 'Serviços de Engenharia'}
      Status Atual: ${proposal.status}
      Valor: ${formatter.format(proposal.commercialProposal?.totalValue || 0)}
      Revisão: ${proposal.revision}

      Contexto Adicional: 
      - Se for rascunho, incentive o fechamento do escopo para envio.
      - Se for enviado, pergunte se houve dúvidas na abertura.
      - Se for em negociação, peça 10 minutos para alinhar condições.
      - O tom deve ser de parceria técnica, sem ser "chato".`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText
      });
      return response.text;
    }, "Gerar Follow-up");

    return result || "";
  },

  async analyzeBusinessImpact(proposals: Proposal[]): Promise<string> {
    const result = await callAIWithRetry(async () => {
      const data = proposals.map(p => ({
        status: p.status,
        value: p.commercialProposal?.totalValue || 0,
        lossReason: p.lossReason,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));

      const promptText = `Analise os dados destas propostas comerciais de engenharia e forneça insights gerenciais estratégicos em português brasileiro.
      Dados: ${JSON.stringify(data.slice(0, 30))}

      Sua análise deve incluir:
      1. Análise de Motivos de Perda (Loss Analysis): Identifique padrões se houver muitos "lossReason".
      2. Previsão de Fechamento (Forecasting): Baseado no que está "em_negociacao" e "enviada", estime o faturamento provável (considere conversão histórica de ~30%).
      3. Recomendações práticas para o gestor.
      
      Seja direto, data-driven e use um tom de consultor sênior.`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: promptText
      });
      return response.text;
    }, "Analisar Impacto do Negócio");

    return result || "Aguardando mais dados para gerar insights.";
  },

  async parseSpreadsheetColumns(headers: string[]): Promise<any> {
    const result = await callAIWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Cabeçalhos: ${headers.join(", ")}`,
        config: { 
          systemInstruction: `Analise os cabeçalhos de uma planilha e mapeie para as chaves: "description", "quantity", "unit", "price". 
          Retorne um JSON de mapeamento. Ex: {"DESCRIÇÃO ITEM": "description"}`,
          responseMimeType: "application/json" 
        }
      });
      return response.text;
    }, "Mapear Colunas da Planilha");

    return safeParseJSON<any>(result || "{}", {});
  }
};
