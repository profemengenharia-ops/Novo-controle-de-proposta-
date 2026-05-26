export enum ProposalStatus {
  DRAFT = 'rascunho',
  SENT = 'enviada',
  NEGOTIATING = 'em_negociacao',
  PRICED = 'calculado',
  ESTIMATED = 'estimado_manualmente',
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

/** Linha da matriz de periodicidade de manutenção. */
export interface MaintenanceTask {
  id: string;
  equipment: string;   // Equipamento / sistema
  inspection: string;  // Tipo de inspeção / serviço
  frequency: string;   // Mensal, Trimestral, Semestral, Anual, etc.
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
  /** Unidades / locais de execução (contratos multi-site). */
  locations?: string[];
  /** Matriz de periodicidade de manutenção. */
  maintenancePlan?: MaintenanceTask[];
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

/**
 * Canonical BDI configuration (Bonificação e Despesas Indiretas).
 * All BDI consumers — per-item formation, global proposal pricing,
 * and budget projects — share this shape.
 */
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
  /** 'once' = valor único; 'monthly' = recorrente (mensalidade). Default: 'once'. */
  billingType?: 'once' | 'monthly';
  /** Nº de meses do contrato quando billingType === 'monthly'. Default: 12. */
  contractMonths?: number;
}

/** Serviço adicional cobrado sob demanda (tabela de preços / chamados). */
export interface OnDemandService {
  id: string;
  description: string;
  unit: string;   // ex: "por visita", "por hora"
  price: number;
}

export interface CommercialProposal {
  totalValue: number;
  paymentTerms: string;
  reajuste: string;
  guarantee: string;
  items: CommercialItem[];
  pricingMode?: string;
  /** Serviços sob demanda / chamados — não somam no valor total do contrato. */
  onDemandServices?: OnDemandService[];
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
  vendorId?: string;
  vendorName?: string;
  publicToken?: string;
  publicExpiresAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalSignature?: string;
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

export interface BudgetIndirectCostsBreakdown {
  administration: number;
  mobilization: number;
  transport: number;
  food: number;
  lodging: number;
  others: number;
}

export interface GlobalPriceFormation {
  items: PricingBudgetItem[];
  indirectCosts: BudgetIndirectCostsBreakdown;
  bdi: BDIConfig;
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

export type BudgetIndirectCosts = BudgetIndirectCostsBreakdown;

export interface BudgetBDI extends BDIConfig {
  calculatedBDI: number; // resultado em %
}

export interface BudgetProject {
  id: string;
  title: string;
  clientName: string;
  address?: string;
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
  originOpportunityId?: string;
  requestedBy?: string;
}

export interface LaborRate {
  id: string;
  role: string;
  unit: 'H' | 'DIA';
  costPerHour: number;
  laborCharges: number;  // % de encargos sociais (ex: 0.72)
  totalCostPerHour: number;
}

// ─── Mini-CRM ──────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  active: boolean;
  createdAt: string;
}

export type OpportunityStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'proposal_sent';

export interface CRMActivity {
  id: string;
  opportunityId: string;
  type: ActivityType;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface CRMTask {
  id: string;
  opportunityId: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  assignedTo?: string;
  createdAt: string;
}

export interface CRMOpportunity {
  id: string;
  title: string;
  clientName: string;
  value: number;
  stage: OpportunityStage;
  vendorId?: string;
  linkedProposalId?: string;
  linkedBudgetId?: string;
  probability: number;
  expectedCloseDate?: string;
  activities: CRMActivity[];
  tasks: CRMTask[];
  notes?: string;
  lossReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CRMClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  segment?: string;
  city?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
