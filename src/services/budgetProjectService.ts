import { supabase, isMockMode } from '../lib/supabase';
import { BudgetProject, BudgetStatus, BudgetIndirectCosts, BudgetBDI } from '../types';

const TABLE = 'budget_projects';

const defaultIndirectCosts = (): BudgetIndirectCosts => ({
  administration: 0,
  mobilization: 0,
  transport: 0,
  food: 0,
  lodging: 0,
  others: 0,
});

const defaultBDI = (): BudgetBDI => ({
  centralAdmin: 4,
  financialExpenses: 1.2,
  insuranceAndGuarantees: 0.8,
  risks: 1,
  profit: 7.5,
  taxes: 8.65,
  calculatedBDI: 0,
});

const mapFromDb = (row: any): BudgetProject => ({
  id: row.id,
  title: row.title,
  clientName: row.client_name,
  address: row.address,
  status: row.status as BudgetStatus,
  responsible: row.responsible,
  notes: row.notes,
  stages: row.stages ?? [],
  indirectCosts: row.indirect_costs ?? defaultIndirectCosts(),
  bdi: row.bdi ?? defaultBDI(),
  totalDirectCost: Number(row.total_direct_cost ?? 0),
  totalIndirectCost: Number(row.total_indirect_cost ?? 0),
  totalBDI: Number(row.total_bdi ?? 0),
  finalPrice: Number(row.final_price ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
  linkedProposalId: row.linked_proposal_id,
});

const mapToDb = (p: Partial<BudgetProject>) => {
  const data: any = {};
  if (p.title !== undefined) data.title = p.title;
  if (p.clientName !== undefined) data.client_name = p.clientName;
  if (p.address !== undefined) data.address = p.address;
  if (p.status !== undefined) data.status = p.status;
  if (p.responsible !== undefined) data.responsible = p.responsible;
  if (p.notes !== undefined) data.notes = p.notes;
  if (p.stages !== undefined) data.stages = p.stages;
  if (p.indirectCosts !== undefined) data.indirect_costs = p.indirectCosts;
  if (p.bdi !== undefined) data.bdi = p.bdi;
  if (p.totalDirectCost !== undefined) data.total_direct_cost = p.totalDirectCost;
  if (p.totalIndirectCost !== undefined) data.total_indirect_cost = p.totalIndirectCost;
  if (p.totalBDI !== undefined) data.total_bdi = p.totalBDI;
  if (p.finalPrice !== undefined) data.final_price = p.finalPrice;
  if (p.linkedProposalId !== undefined) data.linked_proposal_id = p.linkedProposalId;
  if (p.createdBy !== undefined) data.created_by = p.createdBy;
  return data;
};

const MOCK_PROJECTS: BudgetProject[] = [
  {
    id: 'mock-1',
    title: 'Reforma Hidráulica Galpão Norte',
    clientName: 'Indústria ABC Ltda',
    address: 'Av. Industrial, 500 - São Paulo/SP',
    status: BudgetStatus.DRAFT,
    responsible: 'Eng. Marcus',
    notes: '',
    stages: [
      {
        id: 'stage-1',
        name: 'Demolição e Preparo',
        order: 1,
        items: [
          { id: 'item-1', type: 'servico', description: 'Demolição de alvenaria', unit: 'M²', quantity: 20, unitCost: 85, totalCost: 1700, notes: '' },
          { id: 'item-2', type: 'mao_de_obra', description: 'Servente', unit: 'H', quantity: 40, unitCost: 25, totalCost: 1000, notes: '' },
        ],
      },
      {
        id: 'stage-2',
        name: 'Tubulação e Conexões',
        order: 2,
        items: [
          { id: 'item-3', type: 'material', description: 'Tubo PEAD DN100', unit: 'MT', quantity: 50, unitCost: 42, totalCost: 2100, notes: '' },
          { id: 'item-4', type: 'material', description: 'Conexões diversas', unit: 'VB', quantity: 1, unitCost: 800, totalCost: 800, notes: '' },
        ],
      },
    ],
    indirectCosts: defaultIndirectCosts(),
    bdi: { ...defaultBDI(), calculatedBDI: 25.99 },
    totalDirectCost: 5600,
    totalIndirectCost: 0,
    totalBDI: 1455.44,
    finalPrice: 7055.44,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'mock-user',
  },
];

const MOCK_STORE = [...MOCK_PROJECTS];

export const budgetProjectService = {
  async getAll(): Promise<BudgetProject[]> {
    if (isMockMode) return [...MOCK_STORE].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(mapFromDb);
  },

  async getById(id: string): Promise<BudgetProject | null> {
    if (isMockMode) return MOCK_STORE.find(p => p.id === id) || null;
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) return null;
    return mapFromDb(data);
  },

  async create(
    fields: Pick<BudgetProject, 'title' | 'clientName' | 'address' | 'responsible' | 'notes'>,
    userId: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    if (isMockMode) {
      const newProject: BudgetProject = {
        id,
        ...fields,
        status: BudgetStatus.DRAFT,
        stages: [],
        indirectCosts: defaultIndirectCosts(),
        bdi: defaultBDI(),
        totalDirectCost: 0,
        totalIndirectCost: 0,
        totalBDI: 0,
        finalPrice: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
      };
      MOCK_STORE.push(newProject);
      return id;
    }

    const data = mapToDb({
      ...fields,
      status: BudgetStatus.DRAFT,
      stages: [],
      indirectCosts: defaultIndirectCosts(),
      bdi: defaultBDI(),
      totalDirectCost: 0,
      totalIndirectCost: 0,
      totalBDI: 0,
      finalPrice: 0,
      createdBy: userId,
    });
    const { data: inserted, error } = await supabase.from(TABLE).insert([data]).select('id').single();
    if (error) throw error;
    return inserted.id;
  },

  async update(id: string, updates: Partial<BudgetProject>): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(p => p.id === id);
      if (idx !== -1) {
        MOCK_STORE[idx] = { 
          ...MOCK_STORE[idx], 
          ...updates, 
          updatedAt: new Date().toISOString() 
        };
      }
      return;
    }
    const { error } = await supabase.from(TABLE).update(mapToDb(updates)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(p => p.id === id);
      if (idx !== -1) MOCK_STORE.splice(idx, 1);
      return;
    }
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
