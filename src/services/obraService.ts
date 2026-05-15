import { supabase, isMockMode } from '../lib/supabase';
import { Obra, ObraStatus, ObraType } from '../types';
import { logger } from '../lib/logger';

const TABLE = 'obras';

const mapFromDb = (row: any): Obra => ({
  id: row.id,
  clientId: row.client_id,
  name: row.name,
  type: (row.type ?? undefined) as ObraType | undefined,
  status: row.status as ObraStatus,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  cep: row.cep ?? undefined,
  estimatedArea: row.estimated_area != null ? Number(row.estimated_area) : undefined,
  startDate: row.start_date ?? undefined,
  deadline: row.deadline ?? undefined,
  scopeSummary: row.scope_summary ?? undefined,
  attachments: row.attachments ?? undefined,
  notes: row.notes ?? undefined,
  budgetProjectId: row.budget_project_id ?? undefined,
  proposalId: row.proposal_id ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const mapToDb = (o: Partial<Obra>) => {
  const data: any = {};
  if (o.clientId !== undefined) data.client_id = o.clientId;
  if (o.name !== undefined) data.name = o.name;
  if (o.type !== undefined) data.type = o.type;
  if (o.status !== undefined) data.status = o.status;
  if (o.address !== undefined) data.address = o.address;
  if (o.city !== undefined) data.city = o.city;
  if (o.state !== undefined) data.state = o.state;
  if (o.cep !== undefined) data.cep = o.cep;
  if (o.estimatedArea !== undefined) data.estimated_area = o.estimatedArea;
  if (o.startDate !== undefined) data.start_date = o.startDate;
  if (o.deadline !== undefined) data.deadline = o.deadline;
  if (o.scopeSummary !== undefined) data.scope_summary = o.scopeSummary;
  if (o.attachments !== undefined) data.attachments = o.attachments;
  if (o.notes !== undefined) data.notes = o.notes;
  if (o.budgetProjectId !== undefined) data.budget_project_id = o.budgetProjectId;
  if (o.proposalId !== undefined) data.proposal_id = o.proposalId;
  if (o.createdBy !== undefined) data.created_by = o.createdBy;
  return data;
};

const now = () => new Date().toISOString();

const MOCK_OBRAS: Obra[] = [
  {
    id: 'obra-mock-1',
    clientId: 'client-mock-1',
    name: 'Reforma Hidráulica Galpão Norte',
    type: 'reforma',
    status: 'em_orcamento',
    address: 'Av. Industrial, 500',
    city: 'São Paulo',
    state: 'SP',
    cep: '04000-000',
    estimatedArea: 1200,
    deadline: '2026-09-30',
    scopeSummary: 'Substituição de tubulação principal e adequação de sistema de drenagem.',
    notes: '',
    budgetProjectId: 'mock-1',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user',
  },
  {
    id: 'obra-mock-2',
    clientId: 'client-mock-1',
    name: 'Ampliação do Refeitório',
    type: 'comercial',
    status: 'prospeccao',
    address: 'Av. Industrial, 500',
    city: 'São Paulo',
    state: 'SP',
    cep: '04000-000',
    estimatedArea: 320,
    scopeSummary: 'Ampliar capacidade do refeitório para 180 lugares.',
    notes: '',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user',
  },
  {
    id: 'obra-mock-3',
    clientId: 'client-mock-2',
    name: 'Edifício Aurora — Torre B',
    type: 'residencial',
    status: 'aguardando_orcamento',
    address: 'Rua das Acácias, 1200',
    city: 'Campinas',
    state: 'SP',
    cep: '13000-000',
    estimatedArea: 8400,
    deadline: '2027-03-15',
    scopeSummary: 'Execução da estrutura da Torre B do empreendimento Aurora.',
    notes: '',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user',
  },
];

const MOCK_STORE = [...MOCK_OBRAS];

export const obraService = {
  async getAll(): Promise<Obra[]> {
    if (isMockMode) {
      return [...MOCK_STORE].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { logger.error('obraService.getAll', error); return []; }
    return data.map(mapFromDb);
  },

  async getByClient(clientId: string): Promise<Obra[]> {
    if (isMockMode) {
      return MOCK_STORE
        .filter(o => o.clientId === clientId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false });
    if (error) { logger.error('obraService.getByClient', error); return []; }
    return data.map(mapFromDb);
  },

  async getById(id: string): Promise<Obra | null> {
    if (isMockMode) return MOCK_STORE.find(o => o.id === id) || null;
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) return null;
    return mapFromDb(data);
  },

  async create(
    fields: Omit<Obra, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'status'> & {
      status?: ObraStatus;
    },
    userId: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const ts = now();
    const status: ObraStatus = fields.status ?? 'prospeccao';

    if (isMockMode) {
      const newObra: Obra = {
        id,
        ...fields,
        status,
        createdAt: ts,
        updatedAt: ts,
        createdBy: userId,
      };
      MOCK_STORE.push(newObra);
      return id;
    }

    const data = mapToDb({ ...fields, status, createdBy: userId });
    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert([data])
      .select('id')
      .single();
    if (error) throw error;
    return inserted.id;
  },

  async update(id: string, updates: Partial<Obra>): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(o => o.id === id);
      if (idx !== -1) {
        MOCK_STORE[idx] = { ...MOCK_STORE[idx], ...updates, updatedAt: now() };
      }
      return;
    }
    const { error } = await supabase.from(TABLE).update(mapToDb(updates)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(o => o.id === id);
      if (idx !== -1) MOCK_STORE.splice(idx, 1);
      return;
    }
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
