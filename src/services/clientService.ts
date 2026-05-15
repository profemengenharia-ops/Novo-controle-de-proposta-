import { supabase, isMockMode } from '../lib/supabase';
import { Client, ClientContact } from '../types';

const TABLE = 'clients';

const mapFromDb = (row: any): Client => ({
  id: row.id,
  companyName: row.company_name,
  tradeName: row.trade_name ?? undefined,
  cnpj: row.cnpj ?? undefined,
  cpf: row.cpf ?? undefined,
  ie: row.ie ?? undefined,
  segment: row.segment ?? undefined,
  contacts: (row.contacts ?? []) as ClientContact[],
  billingAddress: row.billing_address ?? undefined,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  cep: row.cep ?? undefined,
  notes: row.notes ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by,
});

const mapToDb = (c: Partial<Client>) => {
  const data: any = {};
  if (c.companyName !== undefined) data.company_name = c.companyName;
  if (c.tradeName !== undefined) data.trade_name = c.tradeName;
  if (c.cnpj !== undefined) data.cnpj = c.cnpj;
  if (c.cpf !== undefined) data.cpf = c.cpf;
  if (c.ie !== undefined) data.ie = c.ie;
  if (c.segment !== undefined) data.segment = c.segment;
  if (c.contacts !== undefined) data.contacts = c.contacts;
  if (c.billingAddress !== undefined) data.billing_address = c.billingAddress;
  if (c.city !== undefined) data.city = c.city;
  if (c.state !== undefined) data.state = c.state;
  if (c.cep !== undefined) data.cep = c.cep;
  if (c.notes !== undefined) data.notes = c.notes;
  if (c.createdBy !== undefined) data.created_by = c.createdBy;
  return data;
};

const now = () => new Date().toISOString();

const MOCK_CLIENTS: Client[] = [
  {
    id: 'client-mock-1',
    companyName: 'Indústria ABC Ltda',
    tradeName: 'ABC Indústria',
    cnpj: '12.345.678/0001-90',
    segment: 'Metalurgia',
    contacts: [
      { id: 'ct-1', name: 'João Silva', role: 'Gerente de Manutenção', email: 'joao@abc.com.br', phone: '(11) 99999-0001', isPrimary: true },
      { id: 'ct-2', name: 'Marcos Lima', role: 'Compras', email: 'compras@abc.com.br', phone: '(11) 99999-0002' },
    ],
    billingAddress: 'Av. Industrial, 500',
    city: 'São Paulo',
    state: 'SP',
    cep: '04000-000',
    notes: 'Cliente recorrente desde 2021.',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user',
  },
  {
    id: 'client-mock-2',
    companyName: 'Construtora Horizonte S.A.',
    tradeName: 'Horizonte',
    cnpj: '98.765.432/0001-10',
    segment: 'Construção Civil',
    contacts: [
      { id: 'ct-3', name: 'Ana Beatriz', role: 'Engenheira Coordenadora', email: 'ana@horizonte.com.br', phone: '(11) 98888-1111', isPrimary: true },
    ],
    billingAddress: 'Rua das Acácias, 1200',
    city: 'Campinas',
    state: 'SP',
    cep: '13000-000',
    notes: '',
    createdAt: now(),
    updatedAt: now(),
    createdBy: 'mock-user',
  },
];

const MOCK_STORE = [...MOCK_CLIENTS];

export const clientService = {
  async getAll(): Promise<Client[]> {
    if (isMockMode) {
      return [...MOCK_STORE].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(mapFromDb);
  },

  async getById(id: string): Promise<Client | null> {
    if (isMockMode) return MOCK_STORE.find(c => c.id === id) || null;
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) return null;
    return mapFromDb(data);
  },

  async create(
    fields: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>,
    userId: string,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const ts = now();

    if (isMockMode) {
      const newClient: Client = {
        id,
        ...fields,
        contacts: fields.contacts ?? [],
        createdAt: ts,
        updatedAt: ts,
        createdBy: userId,
      };
      MOCK_STORE.push(newClient);
      return id;
    }

    const data = mapToDb({ ...fields, createdBy: userId });
    const { data: inserted, error } = await supabase
      .from(TABLE)
      .insert([data])
      .select('id')
      .single();
    if (error) throw error;
    return inserted.id;
  },

  async update(id: string, updates: Partial<Client>): Promise<void> {
    if (isMockMode) {
      const idx = MOCK_STORE.findIndex(c => c.id === id);
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
      const idx = MOCK_STORE.findIndex(c => c.id === id);
      if (idx !== -1) MOCK_STORE.splice(idx, 1);
      return;
    }
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
