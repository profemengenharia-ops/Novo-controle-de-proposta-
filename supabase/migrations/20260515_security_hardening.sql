-- =============================================================================
-- Migration: security_hardening
-- Data: 2026-05-15
-- Corrige: labor_rates RLS, adiciona clients/obras com RLS,
--          produtos com write restrito, audit_log global.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABELA: clients  (cadastro de clientes com RLS por criador)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    trade_name   TEXT,
    cnpj         TEXT,
    cpf          TEXT,
    ie           TEXT,
    segment      TEXT,
    contacts     JSONB  DEFAULT '[]',
    billing_address TEXT,
    city         TEXT,
    state        TEXT,
    cep          TEXT,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    created_by   UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas seus próprios clientes
CREATE POLICY "clients: owner full access"
    ON public.clients FOR ALL
    USING  (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TABELA: obras  (cadastro de obras com RLS por criador)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT,
    status          TEXT NOT NULL DEFAULT 'prospeccao',
    address         TEXT,
    city            TEXT,
    state           TEXT,
    cep             TEXT,
    estimated_area  DECIMAL(12,2),
    start_date      DATE,
    deadline        DATE,
    scope_summary   TEXT,
    attachments     JSONB DEFAULT '[]',
    notes           TEXT,
    budget_project_id UUID REFERENCES public.budget_projects(id) ON DELETE SET NULL,
    proposal_id       UUID REFERENCES public.proposals(id)      ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    created_by      UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas obras que criou
CREATE POLICY "obras: owner full access"
    ON public.obras FOR ALL
    USING  (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE TRIGGER update_obras_updated_at
    BEFORE UPDATE ON public.obras
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CORRIGIR labor_rates  — RLS anteriormente permissivo demais
--    Estratégia: leitura para todos autenticados; escrita apenas para
--    usuários cujo e-mail pertence ao domínio @profem.com.br.
--    (Altere o domínio se necessário.)
-- ─────────────────────────────────────────────────────────────────────────────

-- Remover política antiga que permitia tudo para qualquer autenticado
DROP POLICY IF EXISTS "Authenticated users can manage labor rates" ON public.labor_rates;

-- Adicionar coluna de propriedade (nullable para retrocompatibilidade)
ALTER TABLE public.labor_rates
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Leitura: todos autenticados (sem mudança)
-- (a policy "Authenticated users can read labor rates" existente cobre SELECT)

-- Escrita: apenas domínio ProFem
CREATE POLICY "labor_rates: staff can write"
    ON public.labor_rates
    FOR INSERT UPDATE DELETE
    TO authenticated
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@profem.com.br'
    )
    WITH CHECK (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@profem.com.br'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CORRIGIR products  — adicionar write restrito (apenas staff ProFem)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "products: staff can write"
    ON public.products
    FOR INSERT UPDATE DELETE
    TO authenticated
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@profem.com.br'
    )
    WITH CHECK (
        (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@profem.com.br'
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TABELA: audit_logs  — registro imutável de criações/alterações
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name  TEXT      NOT NULL,
    record_id   UUID      NOT NULL,
    operation   TEXT      NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    changed_by  UUID      REFERENCES auth.users(id) ON DELETE SET NULL,
    changed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    old_data    JSONB,
    new_data    JSONB
);

-- Ninguém altera audit_logs via RLS — somente a função de trigger (SECURITY DEFINER)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuário pode consultar apenas logs relacionados aos seus próprios registros
CREATE POLICY "audit_logs: owner can read"
    ON public.audit_logs FOR SELECT
    USING (changed_by = auth.uid());

-- Nenhuma policy de INSERT/UPDATE/DELETE para usuários — só o trigger escreve

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. FUNÇÃO de trigger para audit_logs (SECURITY DEFINER = executa como owner)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- bypass RLS para escrever no audit_logs
SET search_path = public
AS $$
DECLARE
    v_user UUID;
BEGIN
    -- Tenta obter o usuário autenticado; NULL se chamado por migrations
    BEGIN
        v_user := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user := NULL;
    END;

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, operation, changed_by, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_user, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (table_name, record_id, operation, changed_by, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_user, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (table_name, record_id, operation, changed_by, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_user, to_jsonb(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TRIGGERS de audit nas tabelas críticas
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE TRIGGER audit_proposals
    AFTER INSERT OR UPDATE OR DELETE ON public.proposals
    FOR EACH ROW EXECUTE PROCEDURE public.fn_audit_log();

CREATE OR REPLACE TRIGGER audit_budget_projects
    AFTER INSERT OR UPDATE OR DELETE ON public.budget_projects
    FOR EACH ROW EXECUTE PROCEDURE public.fn_audit_log();

CREATE OR REPLACE TRIGGER audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE public.fn_audit_log();

CREATE OR REPLACE TRIGGER audit_obras
    AFTER INSERT OR UPDATE OR DELETE ON public.obras
    FOR EACH ROW EXECUTE PROCEDURE public.fn_audit_log();

CREATE OR REPLACE TRIGGER audit_labor_rates
    AFTER INSERT OR UPDATE OR DELETE ON public.labor_rates
    FOR EACH ROW EXECUTE PROCEDURE public.fn_audit_log();
