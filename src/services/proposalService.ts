import { supabase, isMockMode } from '../lib/supabase';
import { Proposal, ProposalStatus, CommercialProposal, TechnicalScope } from '../types';

const TABLE_NAME = 'proposals';

// ─── Mock store ───────────────────────────────────────────────────────────────

const defaultTechnicalScope = (): TechnicalScope => ({
  generalConsiderations: '',
  references: [],
  norms: [],
  items: [],
  safetyNotes: '',
  exclusions: [],
  contractorObligations: [],
  contracteeObligations: [],
});

const defaultCommercialProposal = (): CommercialProposal => ({
  totalValue: 0,
  paymentTerms: 'Faturamento total para 07 DDL após a finalização dos trabalhos',
  reajuste: 'Não aplicável durante o prazo de validade da proposta',
  guarantee: 'Conforme manual do fabricante',
  items: [],
  pricingMode: 'manual',
});

const now = () => new Date().toISOString();

const MOCK_PROPOSALS: Proposal[] = [
  {
    id: 'mock-proposal-1',
    clientName: 'Cliente Mock Exemplo',
    proposalNumber: `PF-${new Date().getFullYear()}-0001`,
    revision: '00',
    status: ProposalStatus.DRAFT,
    validityDays: 30,
    scopeTitle: 'Proposta de Exemplo',
    technicalScope: defaultTechnicalScope(),
    commercialProposal: { ...defaultCommercialProposal(), totalValue: 50000, items: [] },
    deadline: '30 dias',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user-id',
  },
];

const MOCK_STORE: Proposal[] = [...MOCK_PROPOSALS];

let mockSeq = 2; // next sequential number for new proposals

// ─── DB mappers ───────────────────────────────────────────────────────────────

// Helper to map DB snake_case to Frontend camelCase
const mapFromDb = (row: any): Proposal => ({
  id: row.id,
  clientName: row.client_name,
  proposalNumber: row.proposal_number,
  revision: row.revision,
  status: row.status as ProposalStatus,
  scopeTitle: row.scope_title,
  validityDays: row.validity_days,
  technicalScope: row.technical_scope,
  commercialProposal: row.commercial_proposal,
  pricing: row.pricing_details,
  contractDetails: row.contract_details,
  followUpDate: row.follow_up_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  revisions: row.revisions,
  lossReason: row.loss_reason,
  deadline: row.deadline ?? '30 dias',
  budgetProjectId: row.budget_project_id ?? undefined,
  obraId: row.obra_id ?? undefined,
  clientId: row.client_id ?? undefined,
});

// Helper to map Frontend camelCase to DB snake_case
const mapToDb = (proposal: Partial<Proposal>) => {
  const data: any = {};
  if (proposal.clientName !== undefined) data.client_name = proposal.clientName;
  if (proposal.proposalNumber !== undefined) data.proposal_number = proposal.proposalNumber;
  if (proposal.revision !== undefined) data.revision = proposal.revision;
  if (proposal.status !== undefined) data.status = proposal.status;
  if (proposal.scopeTitle !== undefined) data.scope_title = proposal.scopeTitle;
  if (proposal.validityDays !== undefined) data.validity_days = proposal.validityDays;
  if (proposal.technicalScope !== undefined) data.technical_scope = proposal.technicalScope;
  if (proposal.commercialProposal !== undefined) data.commercial_proposal = proposal.commercialProposal;
  if (proposal.pricing !== undefined) data.pricing_details = proposal.pricing;
  if (proposal.contractDetails !== undefined) data.contract_details = proposal.contractDetails;
  if (proposal.followUpDate !== undefined) data.follow_up_date = proposal.followUpDate;
  if (proposal.createdBy !== undefined) data.created_by = proposal.createdBy;
  if (proposal.revisions !== undefined) data.revisions = proposal.revisions;
  if (proposal.lossReason !== undefined) data.loss_reason = proposal.lossReason;
  if (proposal.deadline !== undefined) data.deadline = proposal.deadline;
  if (proposal.budgetProjectId !== undefined) data.budget_project_id = proposal.budgetProjectId;
  if (proposal.obraId !== undefined) data.obra_id = proposal.obraId;
  if (proposal.clientId !== undefined) data.client_id = proposal.clientId;
  return data;
};

export const proposalService = {
  async createProposal(proposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (isMockMode) {
      const id = crypto.randomUUID();
      const ts = now();
      const seq = String(mockSeq++).padStart(4, '0');
      const stored: Proposal = {
        ...proposal,
        id,
        proposalNumber: proposal.proposalNumber || `PF-${new Date().getFullYear()}-${seq}`,
        createdAt: ts,
        updatedAt: ts,
      };
      MOCK_STORE.push(stored);
      return id;
    }
    const data = mapToDb(proposal);
    const { data: inserted, error } = await supabase
      .from(TABLE_NAME)
      .insert([data])
      .select('id')
      .single();

    if (error) throw error;
    return inserted.id;
  },

  async getProposal(id: string): Promise<Proposal | null> {
    if (isMockMode) return MOCK_STORE.find(p => p.id === id) ?? null;
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return mapFromDb(data);
  },

  async getAllProposals(): Promise<Proposal[]> {
    if (isMockMode) {
      return [...MOCK_STORE].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data.map(mapFromDb);
  },

  async updateProposal(id: string, updates: Partial<Proposal>, revisionNote?: string): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(p => p.id === id);
      if (idx !== -1) {
        MOCK_STORE[idx] = { ...MOCK_STORE[idx], ...updates, updatedAt: now() };
      }
      return;
    }
    let finalUpdates = mapToDb(updates);
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(finalUpdates)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteProposal(id: string): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(p => p.id === id);
      if (idx !== -1) MOCK_STORE.splice(idx, 1);
      return;
    }
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  subscribeToProposal(id: string, onUpdate: (proposal: Proposal) => void) {
    if (isMockMode) return () => {};
    
    const channel = supabase
      .channel(`proposal-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: TABLE_NAME,
          filter: `id=eq.${id}`
        },
        (payload) => {
          onUpdate(mapFromDb(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
