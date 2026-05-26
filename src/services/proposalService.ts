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

const newPublicToken = () => `${crypto.randomUUID()}-${crypto.randomUUID()}`.replace(/-/g, '');

const normalizeMockProposal = (proposal: Proposal): Proposal => ({
  ...proposal,
  interactions: proposal.interactions || [],
  publicToken: proposal.publicToken || newPublicToken(),
});

const loadMockStore = (): Proposal[] => {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) as Proposal[]).map(normalizeMockProposal);
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
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
      deadline: '30 dias',
      publicToken: newPublicToken(),
      interactions: [],
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
  interactions: row.interactions ?? [],
  lossReason: row.loss_reason,
  deadline: row.deadline ?? '',
  vendorId: row.vendor_id,
  vendorName: row.vendor_name,
  publicToken: row.public_token,
  publicExpiresAt: row.public_expires_at,
  approvedAt: row.approved_at,
  approvedBy: row.approved_by,
  approvalSignature: row.approval_signature,
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
  if (proposal.interactions !== undefined) data.interactions = proposal.interactions;
  if (proposal.lossReason !== undefined) data.loss_reason = proposal.lossReason;
  if (proposal.deadline !== undefined) data.deadline = proposal.deadline;
  if (proposal.vendorId !== undefined) data.vendor_id = proposal.vendorId;
  if (proposal.vendorName !== undefined) data.vendor_name = proposal.vendorName;
  if (proposal.publicToken !== undefined) data.public_token = proposal.publicToken;
  if (proposal.publicExpiresAt !== undefined) data.public_expires_at = proposal.publicExpiresAt;
  if (proposal.approvedAt !== undefined) data.approved_at = proposal.approvedAt;
  if (proposal.approvedBy !== undefined) data.approved_by = proposal.approvedBy;
  if (proposal.approvalSignature !== undefined) data.approval_signature = proposal.approvalSignature;
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
        publicToken: (proposal as Proposal).publicToken || newPublicToken(),
        interactions: (proposal as Proposal).interactions || [],
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

  async getPublicProposal(id: string, publicToken: string): Promise<Proposal | null> {
    if (!publicToken) return null;
    if (isMockMode) {
      return loadMockStore().find(p => p.id === id && p.publicToken === publicToken) ?? null;
    }
    const { data, error } = await supabase
      .rpc('get_public_proposal', {
        p_proposal_id: id,
        p_public_token: publicToken,
      })
      .single();

    if (error || !data) return null;
    return mapFromDb(data);
  },

  async ensurePublicToken(id: string): Promise<string> {
    if (isMockMode) {
      const store = loadMockStore();
      const idx = store.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Proposta nao encontrada.');
      if (!store[idx].publicToken) {
        store[idx] = { ...store[idx], publicToken: newPublicToken() };
        saveMockStore(store);
      }
      return store[idx].publicToken!;
    }

    const current = await this.getProposal(id);
    if (current?.publicToken) return current.publicToken;

    const token = newPublicToken();
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ public_token: token })
      .eq('id', id);
    if (error) throw error;
    return token;
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

  async approvePublicProposal(id: string, publicToken: string, signature: string): Promise<Proposal> {
    if (!publicToken) throw new Error('Link publico invalido.');
    if (isMockMode) {
      const store = loadMockStore();
      const idx = store.findIndex(p => p.id === id && p.publicToken === publicToken);
      if (idx === -1) throw new Error('Proposta nao encontrada.');
      const approvalInteraction = {
        id: crypto.randomUUID().split('-')[0],
        createdAt: new Date().toISOString(),
        note: 'Proposta aprovada pelo link publico.',
        user: signature,
      };
      store[idx] = {
        ...store[idx],
        status: ProposalStatus.WON,
        approvedAt: new Date().toISOString(),
        approvedBy: signature,
        approvalSignature: signature,
        interactions: [...(store[idx].interactions || []), approvalInteraction],
        updatedAt: new Date().toISOString(),
      };
      saveMockStore(store);
      await syncLinkedOpportunityStage(id, ProposalStatus.WON);
      return store[idx];
    }

    const { data, error } = await supabase
      .rpc('approve_public_proposal', {
        p_proposal_id: id,
        p_public_token: publicToken,
        p_signature: signature,
      })
      .single();

    if (error || !data) throw error || new Error('Proposta nao encontrada.');
    const approved = mapFromDb(data);
    await syncLinkedOpportunityStage(id, approved.status);
    return approved;
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
