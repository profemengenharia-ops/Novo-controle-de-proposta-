-- Supabase Schema for ProFem Financial Engineering Platform

-- 1. Proposals Table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name TEXT NOT NULL,
    proposal_number TEXT NOT NULL UNIQUE,
    revision TEXT DEFAULT '00',
    status TEXT NOT NULL DEFAULT 'rascunho',
    scope_title TEXT,
    validity_days INTEGER DEFAULT 30,
    technical_scope JSONB DEFAULT '{}',
    commercial_proposal JSONB DEFAULT '{}',
    pricing_details JSONB DEFAULT '{}', -- Added for detailed financial engineering
    contract_details JSONB DEFAULT '{}',
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    revisions JSONB DEFAULT '[]'
);

-- 2. Products / Inventory Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    description TEXT,
    unit TEXT,
    price DECIMAL(12, 2) DEFAULT 0,
    cost_price DECIMAL(12, 2) DEFAULT 0,
    stock_level INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security (RLS)

-- Proposals: Users only see/manage their own proposals
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own proposals"
    ON public.proposals
    FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Products: Any authenticated user can read, management restricted (simplified for now)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read products"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_proposals_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 3. Budget Projects Table (Orçamentos de Obra)
CREATE TABLE IF NOT EXISTS public.budget_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL DEFAULT 'rascunho',
    responsible TEXT,
    notes TEXT,
    stages JSONB DEFAULT '[]',
    indirect_costs JSONB DEFAULT '{"administration":0,"mobilization":0,"transport":0,"food":0,"lodging":0,"others":0}',
    bdi JSONB DEFAULT '{"centralAdmin":0,"financialExpenses":0,"insuranceAndGuarantees":0,"risks":0,"profit":0,"taxes":0,"calculatedBDI":0}',
    total_direct_cost DECIMAL(14, 2) DEFAULT 0,
    total_indirect_cost DECIMAL(14, 2) DEFAULT 0,
    total_bdi DECIMAL(14, 2) DEFAULT 0,
    final_price DECIMAL(14, 2) DEFAULT 0,
    linked_proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.budget_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own budget projects"
    ON public.budget_projects
    FOR ALL
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE TRIGGER update_budget_projects_updated_at
    BEFORE UPDATE ON public.budget_projects
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 4. Labor Rates Table (Tabela de Mão de Obra)
CREATE TABLE IF NOT EXISTS public.labor_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'H',
    cost_per_hour DECIMAL(10, 2) DEFAULT 0,
    labor_charges DECIMAL(6, 4) DEFAULT 0,
    total_cost_per_hour DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read labor rates"
    ON public.labor_rates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can manage labor rates"
    ON public.labor_rates FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE TRIGGER update_labor_rates_updated_at
    BEFORE UPDATE ON public.labor_rates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 5. Clientes (Cadastro Comercial)
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
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 6. Obras (Cadastro Comercial)
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
    budget_project_id UUID REFERENCES public.budget_projects(id) ON DELETE SET NULL,
    proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
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
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 7. Vínculos do pipeline Comercial → Orçamento → Proposta
ALTER TABLE public.proposals
    ADD COLUMN IF NOT EXISTS deadline TEXT,
    ADD COLUMN IF NOT EXISTS loss_reason TEXT,
    ADD COLUMN IF NOT EXISTS interactions JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS budget_project_id UUID REFERENCES public.budget_projects(id) ON DELETE SET NULL;

ALTER TABLE public.budget_projects
    ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES public.obras(id) ON DELETE SET NULL;
