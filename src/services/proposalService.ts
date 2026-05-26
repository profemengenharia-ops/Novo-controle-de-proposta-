import { supabase, isMockMode } from '../lib/supabase';
import { Proposal, ProposalRevision, ProposalStatus, OpportunityStage } from '../types';
import { crmService } from './crmService';

const TABLE_NAME = 'proposals';

/**
 * Fecha o ciclo cliente → obra → orçamento → proposta de volta no CRM:
 * quando a proposta muda de status, o estágio da oportunidade vinculada
 * (via linkedProposalId) acompanha. Best-effort — nunca bloqueia o save.
 */
const PROPOSAL_TO_OPP_STAGE: Partial<Record<ProposalStatus, OpportunityStage>> = {
  [ProposalStatus.NEGOTIATING]: 'negotiation',
  [ProposalStatus.WON]: 'won',
  [ProposalStatus.LOST]: 'lost',
};

async function syncLinkedOpportunityStage(proposalId: string, status?: ProposalStatus): Promise<void> {
  if (!status) return;
  const stage = PROPOSAL_TO_OPP_STAGE[status];
  if (!stage) return;
  try {
    const opps = await crmService.getOpportunities();
    const linked = opps.find(o => o.linkedProposalId === proposalId);
    if (linked && linked.stage !== stage) {
      await crmService.updateOpportunity(linked.id, { stage });
    }
  } catch (e) {
    console.warn('Falha ao sincronizar estágio da oportunidade vinculada:', e);
  }
}

const MOCK_STORAGE_KEY = 'mock_proposals_v1';

const loadMockStore = (): Proposal[] => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Proposal[];
  } catch (e) {
    console.warn('Mock store parse failed, resetting.', e);
  }
  const seed: Proposal[] = [
    {
      id: 'mock-seed-1',
      clientName: 'Cliente Mock Exemplo',
      proposalNumber: '2024-001',
      status: ProposalStatus.DRAFT,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'mock-user-id',
      revision: '00',
      validityDays: 30,
      technicalScope: { items: [] } as any,
      commercialProposal: { totalValue: 50000, items: [] } as any,
      deadline: '30 dias'
    }
  ];
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seed));
  return seed;
};

const saveMockStore = (items: Proposal[]) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(items));
};

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
  deadline: row.deadline ?? '',
  vendorId: row.vendor_id,
  vendorName: row.vendor_name,
});

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
  if (proposal.vendorId !== undefined) data.vendor_id = proposal.vendorId;
  if (proposal.vendorName !== undefined) data.vendor_name = proposal.vendorName;
  return data;
};

export const proposalService = {
  async createProposal(proposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (isMockMode) {
      const now = new Date().toISOString();
      const newProposal: Proposal = {
        ...(proposal as Proposal),
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      const store = loadMockStore();
      store.unshift(newProposal);
      saveMockStore(store);
      return newProposal.id;
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
    if (isMockMode) {
      return loadMockStore().find(p => p.id === id) ?? null;
    }
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
      return loadMockStore();
    }
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) return [];
    return data.map(mapFromDb);
  },

  async updateProposal(id: string, updates: Partial<Proposal>, revisionNote?: string): Promise<void> {
    const buildRevisionEntry = (current: Proposal, nextRevision: string): ProposalRevision => ({
      id: crypto.randomUUID(),
      revisionNumber: nextRevision,
      createdAt: new Date().toISOString(),
      changes: revisionNote ?? '',
      snapshot: {
        clientName: current.clientName,
        scopeTitle: current.scopeTitle,
        status: current.status,
        revision: current.revision,
        validityDays: current.validityDays,
        commercialProposal: current.commercialProposal,
        technicalScope: current.technicalScope,
        pricing: current.pricing,
      },
    });

    if (isMockMode) {
      const store = loadMockStore();
      const idx = store.findIndex(p => p.id === id);
      if (idx >= 0) {
        const current = store[idx];
        const nextRevisions = revisionNote
          ? [...(current.revisions || []), buildRevisionEntry(current, updates.revision || current.revision)]
          : current.revisions;
        store[idx] = {
          ...current,
          ...updates,
          revisions: nextRevisions,
          updatedAt: new Date().toISOString(),
        };
        saveMockStore(store);
      }
      await syncLinkedOpportunityStage(id, updates.status);
      return;
    }

    let finalUpdates: any = mapToDb(updates);
    if (revisionNote) {
      const current = await this.getProposal(id);
      if (current) {
        const nextRevisions = [
          ...(current.revisions || []),
          buildRevisionEntry(current, updates.revision || current.revision),
        ];
        finalUpdates.revisions = nextRevisions;
      }
    }
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(finalUpdates)
      .eq('id', id);
    if (error) throw error;
    await syncLinkedOpportunityStage(id, updates.status);
  },

  async deleteProposal(id: string): Promise<void> {
    if (isMockMode) {
      saveMockStore(loadMockStore().filter(p => p.id !== id));
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
