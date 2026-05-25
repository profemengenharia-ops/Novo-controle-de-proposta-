-- ════════════════════════════════════════════════════════════════════════════
-- Módulo Comercial: tabelas clients + obras e vínculos do pipeline.
--
-- Corrige o erro: function update_updated_at_column() does not exist (42883)
-- garantindo a função ANTES de qualquer CREATE TRIGGER.
--
-- Idempotente: pode ser executado mais de uma vez sem erro.
-- ════════════════════════════════════════════════════════════════════════════

-- 0. Função do trigger updated_at (DEVE existir antes dos triggers) ─────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Clientes ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    trade_name TEXT,
    cnpj TEXT,
    cpf TEXT,
    ie TEXT,
    segment TEXT,
    contacts JSONB DEFAULT '[]'::jsonb,
    billing_address TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own clients" ON public.clients;
CREATE POLICY "Users can manage their own clients"
    ON public.clients FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 2. Obras ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    status TEXT NOT NULL DEFAULT 'prospeccao',
    address TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    estimated_area NUMERIC(12, 2),
    start_date DATE,
    deadline DATE,
    scope_summary TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    budget_project_id UUID,
    proposal_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.obras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own obras" ON public.obras;
CREATE POLICY "Users can manage their own obras"
    ON public.obras FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

DROP TRIGGER IF EXISTS update_obras_updated_at ON public.obras;
CREATE TRIGGER update_obras_updated_at
    BEFORE UPDATE ON public.obras
    FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 3. Vínculos do pipeline em proposals (se a tabela já existir) ──────────────────
DO $$
BEGIN
  IF to_regclass('public.proposals') IS NOT NULL THEN
    ALTER TABLE public.proposals
        ADD COLUMN IF NOT EXISTS deadline TEXT,
        ADD COLUMN IF NOT EXISTS loss_reason TEXT,
        ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS budget_project_id UUID;
  END IF;
END $$;

-- 4. Vínculos do pipeline em budget_projects (se a tabela já existir) ────────────
DO $$
BEGIN
  IF to_regclass('public.budget_projects') IS NOT NULL THEN
    ALTER TABLE public.budget_projects
        ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. FKs de obras → proposals / budget_projects (após as tabelas existirem) ──────
DO $$
BEGIN
  IF to_regclass('public.proposals') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_proposal_id_fkey') THEN
    ALTER TABLE public.obras
        ADD CONSTRAINT obras_proposal_id_fkey
        FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.budget_projects') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'obras_budget_project_id_fkey') THEN
    ALTER TABLE public.obras
        ADD CONSTRAINT obras_budget_project_id_fkey
        FOREIGN KEY (budget_project_id) REFERENCES public.budget_projects(id) ON DELETE SET NULL;
  END IF;
END $$;
