-- Align an existing Supabase project with the current frontend contracts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.crm_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    segment TEXT,
    city TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    client_name TEXT NOT NULL,
    value DECIMAL(14, 2) NOT NULL DEFAULT 0,
    stage TEXT NOT NULL DEFAULT 'prospecting',
    vendor_id UUID REFERENCES public.crm_vendors(id) ON DELETE SET NULL,
    linked_proposal_id UUID,
    linked_budget_id UUID,
    probability INTEGER NOT NULL DEFAULT 20,
    expected_close_date TIMESTAMPTZ,
    activities JSONB NOT NULL DEFAULT '[]',
    tasks JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    loss_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT NOT NULL
);

ALTER TABLE public.proposals
    ADD COLUMN IF NOT EXISTS deadline TEXT,
    ADD COLUMN IF NOT EXISTS loss_reason TEXT,
    ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.crm_vendors(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vendor_name TEXT,
    ADD COLUMN IF NOT EXISTS interactions JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
    ADD COLUMN IF NOT EXISTS public_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS approved_by TEXT,
    ADD COLUMN IF NOT EXISTS approval_signature TEXT;

UPDATE public.proposals
SET public_token = encode(gen_random_bytes(24), 'hex')
WHERE public_token IS NULL;

ALTER TABLE public.proposals
    ALTER COLUMN public_token SET NOT NULL;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS supplier JSONB,
    ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE public.budget_projects
    ADD COLUMN IF NOT EXISTS origin_opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS requested_by TEXT;

CREATE TABLE IF NOT EXISTS public.norms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'crm_opportunities_linked_proposal_id_fkey'
    ) THEN
        ALTER TABLE public.crm_opportunities
            ADD CONSTRAINT crm_opportunities_linked_proposal_id_fkey
            FOREIGN KEY (linked_proposal_id) REFERENCES public.proposals(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'crm_opportunities_linked_budget_id_fkey'
    ) THEN
        ALTER TABLE public.crm_opportunities
            ADD CONSTRAINT crm_opportunities_linked_budget_id_fkey
            FOREIGN KEY (linked_budget_id) REFERENCES public.budget_projects(id) ON DELETE SET NULL;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_proposal(
    p_proposal_id UUID,
    p_public_token TEXT
)
RETURNS SETOF public.proposals
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p.*
    FROM public.proposals p
    WHERE p.id = p_proposal_id
      AND p.public_token = p_public_token
      AND (p.public_expires_at IS NULL OR p.public_expires_at > now())
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.approve_public_proposal(
    p_proposal_id UUID,
    p_public_token TEXT,
    p_signature TEXT
)
RETURNS SETOF public.proposals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.proposals p
    SET
        status = 'ganha',
        approved_at = now(),
        approved_by = p_signature,
        approval_signature = p_signature,
        interactions = COALESCE(p.interactions, '[]'::jsonb) || jsonb_build_array(
            jsonb_build_object(
                'id', encode(gen_random_bytes(6), 'hex'),
                'createdAt', now(),
                'note', 'Proposta aprovada pelo link publico.',
                'user', p_signature
            )
        ),
        updated_at = now()
    WHERE p.id = p_proposal_id
      AND p.public_token = p_public_token
      AND (p.public_expires_at IS NULL OR p.public_expires_at > now())
    RETURNING p.*;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_proposal(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_public_proposal(UUID, TEXT, TEXT) TO anon, authenticated;

ALTER TABLE public.crm_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.norms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage vendors" ON public.crm_vendors;
CREATE POLICY "Authenticated users can manage vendors"
    ON public.crm_vendors FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.crm_clients;
CREATE POLICY "Authenticated users can manage clients"
    ON public.crm_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage opportunities" ON public.crm_opportunities;
CREATE POLICY "Authenticated users can manage opportunities"
    ON public.crm_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage norms" ON public.norms;
CREATE POLICY "Authenticated users can manage norms"
    ON public.norms FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage blocks" ON public.blocks;
CREATE POLICY "Authenticated users can manage blocks"
    ON public.blocks FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can manage products" ON public.products;
CREATE POLICY "Authenticated users can manage products"
    ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_crm_clients_updated_at ON public.crm_clients;
CREATE TRIGGER update_crm_clients_updated_at
    BEFORE UPDATE ON public.crm_clients
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_opportunities_updated_at ON public.crm_opportunities;
CREATE TRIGGER update_crm_opportunities_updated_at
    BEFORE UPDATE ON public.crm_opportunities
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_norms_updated_at ON public.norms;
CREATE TRIGGER update_norms_updated_at
    BEFORE UPDATE ON public.norms
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blocks_updated_at ON public.blocks;
CREATE TRIGGER update_blocks_updated_at
    BEFORE UPDATE ON public.blocks
    FOR EACH ROW
    EXECUTE PROCEDURE public.update_updated_at_column();
