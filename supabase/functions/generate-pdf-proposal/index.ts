import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { proposal_id } = await req.json()

    // 1. Fetch proposal data
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single()

    if (error || !proposal) throw new Error('Proposta não encontrada')

    // 2. Generate HTML Template (simplified)
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; font-size: 11pt; line-height: 1.5; color: #333; }
            @page { size: A4 portrait; margin: 20mm; }
            .header { border-bottom: 2px solid #f97316; padding-bottom: 20px; margin-bottom: 30px; }
            .title { color: #f97316; font-size: 18pt; font-weight: bold; }
            .section { margin-top: 25px; }
            .item { margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .total { font-size: 14pt; font-weight: bold; margin-top: 40px; text-align: right; color: #000; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">ProFem - Proposta Técnica e Comercial</div>
            <div>Ref: ${proposal.proposal_number}</div>
          </div>
          <div class="section">
            <h2>Cliente: ${proposal.client_name}</h2>
            <p>Data: ${new Date(proposal.created_at).toLocaleDateString('pt-BR')}</p>
          </div>
          <div class="section">
            <h3>Escopo Técnico</h3>
            ${proposal.technical_scope?.items?.map((it: any) => `
              <div class="item">
                <strong>${it.category}</strong>: ${it.description}
              </div>
            `).join('')}
          </div>
          <div class="total">
            Valor Total: R$ ${proposal.commercial_proposal?.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </body>
      </html>
    `

    // 3. Convert HTML to PDF (Mocking the conversion service call)
    // In a real scenario, you would fetch a service like Browserless or CloudConvert here
    console.log('Gerando PDF para a proposta:', proposal_id)
    
    // For now, we return the HTML or a success message
    // In production, you would return the PDF blob or a signed URL to the stored PDF in Supabase Storage
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'PDF gerado e disponível para download (Simulação)',
      url: '#' 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
