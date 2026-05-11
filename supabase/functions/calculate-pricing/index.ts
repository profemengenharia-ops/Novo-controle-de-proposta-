import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const systemPrompt = `
Atue como um Engenheiro de Custos especialista em sistemas contra incêndio e infraestrutura.
Sua tarefa é processar dados de uma vistoria técnica e retornar uma composição de preços rigorosa.

REGRAS DE CÁLCULO FINANCEIRO:
1. Preço de Venda = Custo Direto / (1 - (Impostos + Adm + Margem)).
2. Impostos: 15%.
3. Custos Administrativos: 10%.
4. Margem de Lucro Alvo: O que for solicitado ou 20% por padrão.

FORMATO DE SAÍDA:
Você deve responder ESTRITAMENTE com um objeto JSON válido, sem textos explicativos antes ou depois.

ESTRUTURA DO JSON ESPERADO:
{
  "direct_costs": number,
  "indirect_costs": number,
  "suggested_price": number,
  "final_price": number,
  "net_profit_margin_percent": number,
  "items_composition": [
    { "item": string, "qnt": number, "unit_cost": number, "total": number }
  ],
  "technical_justification": string
}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json().catch(() => ({}))
    const { proposal_id, survey_data, target_margin = 0.25 } = body || {}

    if (!proposal_id) throw new Error('Missing proposal_id')
    if (!survey_data) throw new Error('Missing survey_data')

    // --- FUNÇÃO DE TENTATIVA COM BACKOFF ---
    const getAiCalculation = async (data: any, retries = 3, delay = 5000) => {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `${systemPrompt} \n\n DADOS DA VISTORIA: ${JSON.stringify(data)} \n\n MARGEM DESEJADA: ${target_margin * 100}%`
              }]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        })

        if (response.status === 503 && retries > 0) {
          console.log(`[503] Capacidade esgotada. Tentando novamente em ${delay/1000}s...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          return getAiCalculation(data, retries - 1, Math.round(delay * 1.5))
        }

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Falha na API Gemini (${response.status}): ${errText}`);
        }

        const jsonResponse = await response.json();
        // Tenta extrair conteúdo JSON por caminhos conhecidos (variações da API)
        let content: string | undefined
        content = jsonResponse?.candidates?.[0]?.content?.parts?.[0]?.text
          || jsonResponse?.output?.[0]?.content?.[0]?.text
          || jsonResponse?.candidates?.[0]?.message?.content?.[0]?.text
          || jsonResponse?.result?.output?.[0]?.content?.[0]?.text

        if (!content) {
          // última tentativa: serializar o objeto retornado inteiro como string
          const asText = JSON.stringify(jsonResponse)
          const maybeMatch = asText.match(/\{[\s\S]*\}/)
          if (maybeMatch) content = maybeMatch[0]
        }

        if (!content) throw new Error('Resposta vazia da IA')

        // Parse seguro do JSON — tenta extrair JSON de dentro de texto livre se necessário
        try {
          return JSON.parse(content)
        } catch (e) {
          const match = content.match(/\{[\s\S]*\}/)
          if (match) return JSON.parse(match[0])
          throw new Error('Falha ao parsear JSON retornado pela IA')
        }
      } catch (err) {
        if (retries > 0) {
          console.warn('[AI] Erro temporário, tentando novamente:', err.message || err)
          await new Promise(resolve => setTimeout(resolve, 2000))
          return getAiCalculation(data, retries - 1, Math.round(delay * 1.5))
        }
        console.error('[ERRO] Esgotadas tentativas de IA:', err)
        return null
      }
    }

    // --- EXECUÇÃO ---
    const result = await getAiCalculation(survey_data)

    if (result) {
      // Sucesso: Atualiza a proposta com os valores da IA seguindo o novo schema
      await supabase
        .from('proposals')
        .update({ 
          pricing_details: result, 
          status: 'calculado',
          updated_at: new Date() 
        })
        .eq('id', proposal_id)
    } else {
      // Fallback: IA indisponível após retries
      const fallbackValue = (survey_data.area || 100) * 60; // Ajustado para R$ 60/m2 no fallback
      await supabase
        .from('proposals')
        .update({ 
          commercial_proposal: { totalValue: fallbackValue },
          status: 'estimado_manualmente',
          pricing_details: { 
            notes: 'IA temporariamente indisponível após múltiplas tentativas. Valor estimado por m2.' 
          }
        })
        .eq('id', proposal_id)
    }

    return new Response(JSON.stringify({ success: true, mode: result ? 'ai' : 'fallback' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    console.error('[CRITICAL ERROR]', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
