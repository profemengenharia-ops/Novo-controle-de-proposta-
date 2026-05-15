export enum ProposalStatus {
  DRAFT = 'rascunho',
  SENT = 'enviada',
  NEGOTIATING = 'em_negociacao',
  WON = 'ganha',
  LOST = 'perdida',
  EXPIRED = 'expirada'
}

export interface ProposalInteraction {
  id: string;
  createdAt: string;
  note: string;
  user: string;
}

export interface TechnicalScopeItem {
  category: string;
  description: string;
}

export interface TechnicalScope {
  generalConsiderations: string;
  references: string[];
  norms: string[];
  items: TechnicalScopeItem[];
  safetyNotes: string;
  exclusions: string[];
  contractorObligations: string[];
  contracteeObligations: string[];
  // Seção 6 – Considerações ao Escopo (usa padrão ProFem se omitido)
  scopeConsiderations?: string;
  // Seção 10 – Horário de Trabalho (usa padrão se omitido)
  workingHours?: string;
  // Seção 11 – Prazo de Execução
  mobilizationDays?: number;   // ex: 5 (dias após confirmação)
  executionTime?: string;      // ex: "90 dias corridos"
}

export interface CDDetails {
  materials: number;
  labor: number;
  equipment: number;
  subcontractors: number;
}

export interface CIDetails {
  localAdmin: number;
  mobilization: number;
  siteOffice: number;
}

export interface BDIConfig {
  centralAdmin: number; // AC
  financialExpenses: number; // DF
  insuranceAndGuarantees: number; // S+G
  risks: number; // R
  profit: number; // L
  taxes: number; // I (ISS + PIS/COFINS + CPRB)
}

export interface PriceFormation {
  directCosts: CDDetails;
  indirectCosts: CIDetails;
  bdi: BDIConfig;
  calculatedBDI: number;
  totalDirectCost: number;
  totalIndirectCost: number;
  finalPrice: number;
}

export interface CommercialItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  source?: 'manual' | 'catalog' | 'spreadsheet' | 'erp' | 'engineering';
  priceFormation?: PriceFormation;
}

export interface CommercialProposal {
  totalValue: number;
  paymentTerms: string;
  reajuste: string;
  guarantee: string;
  items: CommercialItem[];
  pricingMode: 'manual' | 'catalog' | 'spreadsheet' | 'erp';
  hideItemDetails?: boolean;
}

export interface ContractDetails {
  contractNumber: string;
  signingDate: string;
  executionDeadline: string;
}

export interface Proposal {
  id: string;
  clientName: string;
  proposalNumber: string;
  revision: string;
  status: ProposalStatus;
  validityDays: number;
  technicalScope: TechnicalScope;
  commercialProposal: CommercialProposal;
  contractDetails?: ContractDetails;
  deadline: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  attachments?: string[];
  revisions?: ProposalRevision[];
  followUpDate?: string;
  interactions?: ProposalInteraction[];
  scopeTitle?: string;
  lossReason?: string;
  pricing?: GlobalPriceFormation;
  // vínculos com o fluxo Comercial → Orçamentos → Proposta
  budgetProjectId?: string; // FK → BudgetProject
  obraId?: string;          // FK → Obra
  clientId?: string;        // FK → Client
}

export interface PricingBudgetItem {
  id: string;
  name: string;
  type: 'Material' | 'Mão de Obra' | 'Equipamento' | 'Serviço';
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface GlobalPriceFormation {
  items: PricingBudgetItem[];
  indirectCosts: {
    administration: number;
    mobilization: number;
    transport: number;
    food: number;
    lodging: number;
    others: number;
  };
  bdi: {
    indirectExpenses: number;
    centralAdmin: number;
    risks: number;
    guarantees: number;
    financial: number;
    taxes: number;
    profitMargin: number;
  };
}

export interface ProposalRevision {
  id: string;
  revisionNumber: string;
  createdAt: string;
  changes: string;
  snapshot: Partial<Proposal>;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  unit: string;
  stockLevel: number;
  minStockLevel: number;
  price: number;
  costPrice?: number;
  supplier?: {
    name: string;
    contact?: string;
    leadTime?: string;
  };
  location?: string;
}

export interface Norm {
  id: string;
  title: string;
  content: string;
}

// ─── Orçamento de Obra ───────────────────────────────────────────────────────

export enum BudgetStatus {
  DRAFT = 'rascunho',
  APPROVED = 'aprovado',
  EXECUTING = 'em_execucao',
  COMPLETED = 'concluido',
  CANCELLED = 'cancelado',
}

export type BudgetLineType = 'material' | 'mao_de_obra' | 'servico' | 'equipamento';

export interface BudgetLineItem {
  id: string;
  type: BudgetLineType;
  description: string;
  catalogRefId?: string; // id do Product (catálogo) se vier do banco
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

export interface BudgetStage {
  id: string;
  name: string;
  order: number;
  items: BudgetLineItem[];
}

export interface BudgetIndirectCosts {
  administration: number;
  mobilization: number;
  transport: number;
  food: number;
  lodging: number;
  others: number;
}

export interface BudgetBDI {
  centralAdmin: number;      // AC
  financialExpenses: number; // DF
  insuranceAndGuarantees: number; // S+G
  risks: number;             // R
  profit: number;            // L
  taxes: number;             // I (ISS + PIS/COFINS)
  calculatedBDI: number;     // resultado em %
}

export interface BudgetProject {
  id: string;
  title: string;
  clientName: string;   // mantido para legado e exibição rápida
  address?: string;     // mantido para legado
  // vínculos novos (preenchidos quando criado a partir do fluxo Comercial)
  clientId?: string;    // FK → Client
  obraId?: string;      // FK → Obra
  status: BudgetStatus;
  responsible?: string;
  notes?: string;
  stages: BudgetStage[];
  indirectCosts: BudgetIndirectCosts;
  bdi: BudgetBDI;
  totalDirectCost: number;
  totalIndirectCost: number;
  totalBDI: number;
  finalPrice: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  linkedProposalId?: string;
}

// ─── Cadastro Comercial: Cliente + Obra ──────────────────────────────────────

export interface ClientContact {
  id: string;
  name: string;
  role?: string;     // cargo
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface Client {
  id: string;
  companyName: string;       // razão social
  tradeName?: string;        // nome fantasia
  cnpj?: string;
  cpf?: string;              // PF
  ie?: string;               // inscrição estadual
  segment?: string;          // segmento de atuação
  contacts: ClientContact[];
  billingAddress?: string;
  city?: string;
  state?: string;
  cep?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ObraType =
  | 'residencial'
  | 'comercial'
  | 'industrial'
  | 'reforma'
  | 'manutencao'
  | 'infraestrutura'
  | 'outro';

export type ObraStatus =
  | 'prospeccao'        // só registrada
  | 'aguardando_orcamento'
  | 'em_orcamento'
  | 'orcada'
  | 'em_proposta'
  | 'proposta_enviada'
  | 'ganha'
  | 'perdida'
  | 'cancelada';

export interface Obra {
  id: string;
  clientId: string;          // FK obrigatória
  name: string;              // ex.: "Edifício Aurora — Torre B"
  type?: ObraType;
  status: ObraStatus;
  address?: string;
  city?: string;
  state?: string;
  cep?: string;
  estimatedArea?: number;    // m²
  startDate?: string;
  deadline?: string;
  scopeSummary?: string;     // descrição do que o cliente quer
  attachments?: string[];    // links/URLs
  notes?: string;
  // vínculos com etapas downstream (preenchidos pelos próximos setores)
  budgetProjectId?: string;
  proposalId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface LaborRate {
  id: string;
  role: string;
  unit: 'H' | 'DIA';
  costPerHour: number;
  laborCharges: number;  // % de encargos sociais (ex: 0.72)
  totalCostPerHour: number;
}
