# Guia de Deploy: Supabase Edge Functions

Siga este guia para colocar o "Cérebro Financeiro" e o "Gerador de PDF" no ar utilizando a CLI do Supabase.

## 1. Preparação do Ambiente
Se você ainda não tem o Supabase CLI instalado, instale-o e inicialize no projeto:

```powershell
# Inicializar o Supabase na pasta do projeto
supabase init
```

## 2. Configurar Variáveis de Ambiente (Secrets)
Para que as funções consigam acessar a IA do Gemini, você precisa configurar as chaves no servidor do Supabase:

```powershell
supabase secrets set GEMINI_API_KEY=SUA_CHAVE_AQUI
```

## 3. Deploy das Funções
As funções já estão estruturadas na pasta `./supabase/functions/`. Execute o deploy para cada uma:

```powershell
# Subir a função de cálculo de precificação
supabase functions deploy calculate-pricing --project-ref SEU_ID_DO_PROJETO

# Subir a função de geração de PDF
supabase functions deploy generate-pdf-proposal --project-ref SEU_ID_DO_PROJETO
```

> [!NOTE]
> O `project-ref` é o código de letras e números na URL do seu dashboard do Supabase (ex: `https://supabase.com/dashboard/project/abcde...`).

## 4. Monitoramento (Logs de Guerra)
Para verificar se os **Retries de 51s** estão funcionando quando o Google Gemini está lotado, acompanhe os logs em tempo real:

```powershell
supabase functions logs calculate-pricing --project-ref SEU_ID_DO_PROJETO --follow
```

## 5. Gatilhos de Banco (Database Triggers)
Para que a função de cálculo dispare automaticamente, você pode adicionar este SQL no seu **SQL Editor**:

```sql
-- Exemplo de Trigger para disparar a Edge Function ao criar uma proposta
CREATE OR REPLACE FUNCTION public.trigger_pricing_calculation()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM
    net.http_post(
      url:='https://SEU_PROJECT_ID.functions.supabase.co/calculate-pricing',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer SUA_SERVICE_ROLE_KEY"}'::jsonb,
      body:=json_build_object('proposal_id', NEW.id, 'survey_data', NEW.technical_scope)::text
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_proposal_created
AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION trigger_pricing_calculation();
```
