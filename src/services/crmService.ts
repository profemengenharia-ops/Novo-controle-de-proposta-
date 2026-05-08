import { isMockMode } from '../lib/supabase';
import { Vendor, CRMOpportunity, CRMClient } from '../types';

const LS_VENDORS = 'crm_vendors_v1';
const LS_OPPS = 'crm_opportunities_v1';
const LS_CLIENTS = 'crm_clients_v1';

function load<T>(key: string, seed: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T[]) : seed;
  } catch {
    return seed;
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

const SEED_VENDORS: Vendor[] = [
  {
    id: 'v1',
    name: 'Marcus Lopes',
    email: 'marcus@profem.com.br',
    phone: '(11) 99999-0001',
    role: 'Eng. Comercial',
    active: true,
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'v2',
    name: 'Ana Beatriz',
    email: 'ana@profem.com.br',
    phone: '(11) 99999-0002',
    role: 'Consultora Técnica',
    active: true,
    createdAt: '2024-02-15T10:00:00Z',
  },
];

const SEED_CLIENTS: CRMClient[] = [
  {
    id: 'c1',
    name: 'Indústria ABC Ltda',
    email: 'contato@abc.com.br',
    phone: '(11) 3333-0001',
    company: 'ABC Ltda',
    segment: 'Indústria',
    city: 'São Paulo',
    notes: '',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'c2',
    name: 'Construtora XYZ',
    email: 'obras@xyz.com.br',
    phone: '(11) 3333-0002',
    company: 'XYZ Construções',
    segment: 'Construção Civil',
    city: 'Guarulhos',
    notes: '',
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-02-10T10:00:00Z',
  },
  {
    id: 'c3',
    name: 'Shopping Norte Administradora',
    email: 'manutencao@shopping-norte.com.br',
    phone: '(11) 3333-0003',
    company: 'Shopping Norte',
    segment: 'Varejo',
    city: 'São Paulo',
    notes: '',
    createdAt: '2024-03-05T10:00:00Z',
    updatedAt: '2024-03-05T10:00:00Z',
  },
];

const SEED_OPPS: CRMOpportunity[] = [
  {
    id: 'o1',
    title: 'Reforma Hidráulica Industrial',
    clientName: 'Indústria ABC Ltda',
    value: 85000,
    stage: 'negotiation',
    vendorId: 'v1',
    probability: 70,
    expectedCloseDate: '2026-05-30T00:00:00Z',
    activities: [
      {
        id: 'a1',
        opportunityId: 'o1',
        type: 'meeting',
        description: 'Reunião técnica com eng. de manutenção. Escopo aprovado.',
        createdAt: '2026-04-15T14:00:00Z',
        createdBy: 'Marcus Lopes',
      },
      {
        id: 'a2',
        opportunityId: 'o1',
        type: 'proposal_sent',
        description: 'Proposta Rev.01 enviada por e-mail.',
        createdAt: '2026-04-20T10:00:00Z',
        createdBy: 'Marcus Lopes',
      },
    ],
    tasks: [
      {
        id: 't1',
        opportunityId: 'o1',
        title: 'Aguardar retorno da proposta comercial',
        dueDate: '2026-05-15T00:00:00Z',
        completed: false,
        assignedTo: 'Marcus Lopes',
        createdAt: '2026-04-20T10:00:00Z',
      },
    ],
    notes: 'Cliente com urgência para Q3. Possibilidade de expansão de escopo.',
    createdAt: '2026-04-10T10:00:00Z',
    updatedAt: '2026-04-20T10:00:00Z',
    createdBy: 'v1',
  },
  {
    id: 'o2',
    title: 'Instalação de Sprinklers PPCI',
    clientName: 'Shopping Norte Administradora',
    value: 220000,
    stage: 'proposal',
    vendorId: 'v2',
    probability: 50,
    expectedCloseDate: '2026-06-30T00:00:00Z',
    activities: [
      {
        id: 'a3',
        opportunityId: 'o2',
        type: 'call',
        description: 'Ligação inicial. Levantamento de requisitos de PPCI.',
        createdAt: '2026-04-25T09:00:00Z',
        createdBy: 'Ana Beatriz',
      },
    ],
    tasks: [
      {
        id: 't2',
        opportunityId: 'o2',
        title: 'Elaborar memorial descritivo PPCI',
        dueDate: '2026-05-10T00:00:00Z',
        completed: true,
        assignedTo: 'Ana Beatriz',
        createdAt: '2026-04-25T09:00:00Z',
      },
      {
        id: 't3',
        opportunityId: 'o2',
        title: 'Enviar proposta técnica completa',
        dueDate: '2026-05-20T00:00:00Z',
        completed: false,
        assignedTo: 'Ana Beatriz',
        createdAt: '2026-04-25T09:00:00Z',
      },
    ],
    notes: '',
    createdAt: '2026-04-24T10:00:00Z',
    updatedAt: '2026-04-25T09:00:00Z',
    createdBy: 'v2',
  },
  {
    id: 'o3',
    title: 'Rede de Incêndio Galpão Industrial',
    clientName: 'Construtora XYZ',
    value: 45000,
    stage: 'won',
    vendorId: 'v1',
    probability: 100,
    activities: [],
    tasks: [],
    notes: 'Contrato assinado em abril/2026.',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-04-05T10:00:00Z',
    createdBy: 'v1',
  },
  {
    id: 'o4',
    title: 'Consultoria PPCI Residencial',
    clientName: 'Construtora XYZ',
    value: 12000,
    stage: 'qualification',
    vendorId: 'v2',
    probability: 30,
    activities: [
      {
        id: 'a4',
        opportunityId: 'o4',
        type: 'email',
        description: 'E-mail de apresentação de serviços enviado.',
        createdAt: '2026-05-01T11:00:00Z',
        createdBy: 'Ana Beatriz',
      },
    ],
    tasks: [],
    notes: '',
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-05-01T10:00:00Z',
    createdBy: 'v2',
  },
  {
    id: 'o5',
    title: 'Manutenção Preventiva Anual',
    clientName: 'Indústria ABC Ltda',
    value: 30000,
    stage: 'prospecting',
    vendorId: 'v1',
    probability: 20,
    activities: [],
    tasks: [
      {
        id: 't4',
        opportunityId: 'o5',
        title: 'Preparar apresentação de serviços de manutenção',
        dueDate: '2026-05-12T00:00:00Z',
        completed: false,
        assignedTo: 'Marcus Lopes',
        createdAt: '2026-05-02T10:00:00Z',
      },
    ],
    notes: '',
    createdAt: '2026-05-02T10:00:00Z',
    updatedAt: '2026-05-02T10:00:00Z',
    createdBy: 'v1',
  },
  {
    id: 'o6',
    title: 'Projeto Hidráulico Comercial',
    clientName: 'Shopping Norte Administradora',
    value: 18000,
    stage: 'lost',
    vendorId: 'v2',
    probability: 0,
    lossReason: 'Preço acima do orçamento aprovado pelo cliente.',
    activities: [
      {
        id: 'a5',
        opportunityId: 'o6',
        type: 'note',
        description: 'Cliente optou por proposta concorrente com menor escopo.',
        createdAt: '2026-04-30T16:00:00Z',
        createdBy: 'Ana Beatriz',
      },
    ],
    tasks: [],
    notes: '',
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-30T16:00:00Z',
    createdBy: 'v2',
  },
];

export const crmService = {
  // ── Vendors ────────────────────────────────────────────────────────────────
  async getVendors(): Promise<Vendor[]> {
    if (isMockMode) return load(LS_VENDORS, SEED_VENDORS);
    return [];
  },

  async createVendor(fields: Omit<Vendor, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const vendor: Vendor = { id, ...fields, createdAt: new Date().toISOString() };
    if (isMockMode) {
      const store = load<Vendor>(LS_VENDORS, SEED_VENDORS);
      store.push(vendor);
      save(LS_VENDORS, store);
    }
    return id;
  },

  async updateVendor(id: string, updates: Partial<Vendor>): Promise<void> {
    if (isMockMode) {
      const store = load<Vendor>(LS_VENDORS, SEED_VENDORS);
      const idx = store.findIndex(v => v.id === id);
      if (idx !== -1) store[idx] = { ...store[idx], ...updates };
      save(LS_VENDORS, store);
    }
  },

  async deleteVendor(id: string): Promise<void> {
    if (isMockMode) {
      save(LS_VENDORS, load<Vendor>(LS_VENDORS, SEED_VENDORS).filter(v => v.id !== id));
    }
  },

  // ── Opportunities ──────────────────────────────────────────────────────────
  async getOpportunities(): Promise<CRMOpportunity[]> {
    if (isMockMode) return load(LS_OPPS, SEED_OPPS);
    return [];
  },

  async createOpportunity(
    fields: Omit<CRMOpportunity, 'id' | 'createdAt' | 'updatedAt' | 'activities' | 'tasks'>,
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const opp: CRMOpportunity = { id, ...fields, activities: [], tasks: [], createdAt: now, updatedAt: now };
    if (isMockMode) {
      const store = load<CRMOpportunity>(LS_OPPS, SEED_OPPS);
      store.push(opp);
      save(LS_OPPS, store);
    }
    return id;
  },

  async updateOpportunity(id: string, updates: Partial<CRMOpportunity>): Promise<void> {
    if (isMockMode) {
      const store = load<CRMOpportunity>(LS_OPPS, SEED_OPPS);
      const idx = store.findIndex(o => o.id === id);
      if (idx !== -1)
        store[idx] = { ...store[idx], ...updates, updatedAt: new Date().toISOString() };
      save(LS_OPPS, store);
    }
  },

  async deleteOpportunity(id: string): Promise<void> {
    if (isMockMode) {
      save(LS_OPPS, load<CRMOpportunity>(LS_OPPS, SEED_OPPS).filter(o => o.id !== id));
    }
  },

  // ── Clients ────────────────────────────────────────────────────────────────
  async getClients(): Promise<CRMClient[]> {
    if (isMockMode) return load(LS_CLIENTS, SEED_CLIENTS);
    return [];
  },

  async createClient(fields: Omit<CRMClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const client: CRMClient = { id, ...fields, createdAt: now, updatedAt: now };
    if (isMockMode) {
      const store = load<CRMClient>(LS_CLIENTS, SEED_CLIENTS);
      store.push(client);
      save(LS_CLIENTS, store);
    }
    return id;
  },

  async updateClient(id: string, updates: Partial<CRMClient>): Promise<void> {
    if (isMockMode) {
      const store = load<CRMClient>(LS_CLIENTS, SEED_CLIENTS);
      const idx = store.findIndex(c => c.id === id);
      if (idx !== -1)
        store[idx] = { ...store[idx], ...updates, updatedAt: new Date().toISOString() };
      save(LS_CLIENTS, store);
    }
  },

  async deleteClient(id: string): Promise<void> {
    if (isMockMode) {
      save(LS_CLIENTS, load<CRMClient>(LS_CLIENTS, SEED_CLIENTS).filter(c => c.id !== id));
    }
  },
};
