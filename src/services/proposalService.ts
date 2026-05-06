import { supabase, isMockMode } from '../lib/supabase';
import { Proposal, ProposalStatus } from '../types';

const TABLE_NAME = 'proposals';

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
  return data;
};

export const proposalService = {
  async createProposal(proposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (isMockMode) {
      console.log('Mock Create:', proposal);
      return crypto.randomUUID();
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
    if (isMockMode) return null;
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
      return [
        {
          id: '1',
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
      console.log('Mock Update:', id, updates);
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
    if (isMockMode) return;
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
