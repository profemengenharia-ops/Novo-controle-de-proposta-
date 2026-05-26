import React, { useState, useEffect } from 'react';
import { Proposal, ProposalStatus, TechnicalScopeItem } from '../types';
import { proposalService } from '../services/proposalService';
import { aiService } from '../services/aiService';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

import {
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Trash2,
  Plus,
  Save,
  AlertCircle,
  FileSpreadsheet,
  Calculator,
  Search,
  MapPin,
  CalendarClock,
  ClipboardList,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatDate, itemContractValue } from '../lib/utils';
import * as XLSX from 'xlsx';
import { CommercialItem, OnDemandService } from '../types';

import { ProposalPremiumView } from './ProposalPremiumView';
import { BudgetSelector } from './BudgetSelector';
import { BudgetProject } from '../types';
import { normsService, Norm, Block } from '../services/normsService';
import { calculateBDI } from '../lib/utils';
import { crmService } from '../services/crmService';
import { Vendor, CRMClient, CRMOpportunity } from '../types';

interface WizardProps {
  proposalId?: string;
  onComplete: () => void;
}

/** Atalhos de escopo para a IA de engenharia (Etapa 3). */
const AI_SCOPE_PRESETS: { label: string; prompt: string }[] = [
  {
    label: 'Inspeção Mensal de Incêndio',
    prompt:
      'Gere o escopo técnico detalhado de inspeção e manutenção preventiva mensal de sistema de combate a incêndio, incluindo central de alarme, detectores, sirenes, bomba de incêndio (jockey e principal), hidrantes, sprinklers e extintores, com as periodicidades aplicáveis (mensal, trimestral, semestral e anual).',
  },
  {
    label: 'Instalação de Sprinklers',
    prompt:
      'Gere o escopo técnico de fornecimento e instalação de sistema de chuveiros automáticos (sprinklers) conforme ABNT NBR 10897, incluindo tubulação, bombas, válvulas de governo e alarme, e testes de aceitação.',
  },
  {
    label: 'Alarme e Detecção',
    prompt:
      'Gere o escopo técnico de fornecimento e instalação de sistema de detecção e alarme de incêndio conforme ABNT NBR 17240, incluindo central, detectores de fumaça, acionadores manuais, avisadores sonoros/visuais e comissionamento.',
  },
  {
    label: 'Rede de Hidrantes',
    prompt:
      'Gere o escopo técnico de fornecimento e instalação de rede de hidrantes conforme normas aplicáveis, incluindo tubulação, abrigos, mangueiras, esguichos, registros e bomba de pressurização, com testes hidrostáticos.',
  },
];

/** Frequências disponíveis na matriz de periodicidade de manutenção. */
const FREQUENCIES = ['Diária', 'Semanal', 'Mensal', 'Trimestral', 'Semestral', 'Anual', 'Sob demanda'];

/** Templates de checklist de manutenção (carregam linhas na matriz de periodicidade). */
const MAINTENANCE_TEMPLATES: { label: string; tasks: { equipment: string; inspection: string; frequency: string }[] }[] = [
  {
    label: 'Inspeção Mensal de Incêndio',
    tasks: [
      { equipment: 'Central de alarme', inspection: 'Teste funcional e limpeza', frequency: 'Mensal' },
      { equipment: 'Detectores de fumaça', inspection: 'Teste de acionamento', frequency: 'Mensal' },
      { equipment: 'Sirenes / avisadores', inspection: 'Teste sonoro e visual', frequency: 'Trimestral' },
      { equipment: 'Bomba de incêndio (jockey/principal)', inspection: 'Teste de partida e pressão', frequency: 'Mensal' },
      { equipment: 'Hidrantes e mangueiras', inspection: 'Inspeção visual e teste hidrostático', frequency: 'Anual' },
      { equipment: 'Sprinklers', inspection: 'Inspeção visual de cobertura', frequency: 'Trimestral' },
      { equipment: 'Extintores', inspection: 'Verificação de carga e validade', frequency: 'Mensal' },
    ],
  },
  {
    label: 'Detecção e Alarme',
    tasks: [
      { equipment: 'Central de alarme', inspection: 'Teste de baterias e medição de tensão', frequency: 'Mensal' },
      { equipment: 'Detectores', inspection: 'Limpeza e teste de sensibilidade', frequency: 'Semestral' },
      { equipment: 'Acionadores manuais', inspection: 'Teste funcional', frequency: 'Trimestral' },
    ],
  },
  {
    label: 'Hidrantes e Bombas',
    tasks: [
      { equipment: 'Bomba principal', inspection: 'Teste de curva e vazão', frequency: 'Anual' },
      { equipment: 'Bomba jockey', inspection: 'Teste de pressurização', frequency: 'Mensal' },
      { equipment: 'Hidrantes', inspection: 'Inspeção de abrigos e mangueiras', frequency: 'Semestral' },
    ],
  },
];

export function ProposalWizard({ proposalId, onComplete }: WizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);
  const [libraryNorms, setLibraryNorms] = useState<Norm[]>([]);
  const [libraryBlocks, setLibraryBlocks] = useState<Block[]>([]);
  const [newReference, setNewReference] = useState('');
  const [newCustomNorm, setNewCustomNorm] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ clientName?: string; scopeTitle?: string }>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [normSearch, setNormSearch] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  
  const [proposal, setProposal] = useState<Partial<Proposal>>({
    clientName: '',
    proposalNumber: `PF-${new Date().getFullYear()}-${crypto.randomUUID().split('-')[0].toUpperCase().slice(0, 4)}`,
    revision: '00',
    status: ProposalStatus.DRAFT,
    validityDays: 30,
    scopeTitle: '',
    followUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contractDetails: {
      contractNumber: '',
      signingDate: new Date().toISOString().split('T')[0],
      executionDeadline: ''
    },
    technicalScope: {
      generalConsiderations: '',
      references: [],
      norms: [],
      items: [],
      safetyNotes: '',
      exclusions: [],
      contractorObligations: [],
      contracteeObligations: []
    },
    commercialProposal: {
      totalValue: 0,
      paymentTerms: 'Faturamento total para 07 DDL após a finalização dos trabalhos',
      reajuste: 'Não aplicável durante o prazo de validade da proposta',
      guarantee: 'Conforme manual do fabricante',
      items: [],
      pricingMode: 'manual'
    }
  });

  useEffect(() => {
    if (proposalId) {
      async function load() {
        const data = await proposalService.getProposal(proposalId!);
        if (data) {
          setProposal({
            ...data,
            contractDetails: data.contractDetails || {
              contractNumber: '',
              signingDate: '',
              executionDeadline: ''
            }
          });
        }
      }
      load();

      const unsubscribe = proposalService.subscribeToProposal(proposalId, (updated) => {
        setProposal(prev => {
          if (prev.status === ProposalStatus.DRAFT && updated.status !== ProposalStatus.DRAFT) {
            toast.info(`Status da proposta atualizado para: ${updated.status.toUpperCase()}`);
          }
          return {
            ...prev,
            ...updated,
            contractDetails: updated.contractDetails || prev.contractDetails
          };
        });
      });

      return () => unsubscribe();
    }
  }, [proposalId]);

  useEffect(() => {
    normsService.getNorms().then(setLibraryNorms).catch(console.error);
    normsService.getBlocks().then(setLibraryBlocks).catch(console.error);
    crmService.getVendors().then(vs => setVendors(vs.filter(v => v.active))).catch(console.error);
    crmService.getClients().then(setClients).catch(console.error);
    crmService.getOpportunities().then(setOpportunities).catch(console.error);
  }, []);

  // Marca a maior etapa já alcançada (para permitir voltar/pular para etapas visitadas).
  useEffect(() => { setMaxStepReached(m => Math.max(m, step)); }, [step]);

  // Avisa ao fechar/atualizar a aba se houver alterações não salvas.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleSave = async () => {
    const errors: { clientName?: string; scopeTitle?: string } = {};
    if (!proposal.clientName?.trim()) errors.clientName = 'Informe o nome do cliente.';
    if (!proposal.scopeTitle?.trim()) errors.scopeTitle = 'Informe o título do escopo.';
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Há campos obrigatórios não preenchidos.');
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      const itemsTotal = calculateTotal(proposal.commercialProposal?.items || []);
      const currentTotal = proposal.commercialProposal?.totalValue || 0;
      // Preserva o totalValue se foi definido pela Formação de Preço (Step 5),
      // detectado quando há um pricing aplicado e o total diverge da soma dos itens.
      const userAppliedPricing =
        !!proposal.pricing &&
        proposal.pricing.items.length > 0 &&
        currentTotal > 0 &&
        Math.abs(currentTotal - itemsTotal) > 0.01;

      const finalTotal = userAppliedPricing
        ? currentTotal
        : (itemsTotal > 0 ? itemsTotal : currentTotal);

      const proposalToSave = {
        ...proposal,
        commercialProposal: {
          ...proposal.commercialProposal!,
          totalValue: finalTotal,
        },
      };

      if (proposal.id) {
        let nextRev = proposal.revision || '00';
        if (revisionNote) {
          const revNum = parseInt(nextRev);
          nextRev = String((Number.isFinite(revNum) ? revNum : 0) + 1).padStart(2, '0');
        }

        await proposalService.updateProposal(proposal.id, {
          ...proposalToSave,
          revision: nextRev,
        }, revisionNote);
      } else {
        await proposalService.createProposal({
          ...proposalToSave as Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>,
          createdBy: user?.id || 'unknown'
        });
      }
      toast.success(proposal.id ? 'Proposta atualizada com sucesso!' : 'Proposta criada com sucesso!');
      setIsDirty(false);
      onComplete();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar proposta. Tente novamente.');
    }
    setLoading(false);
  };

  const addReference = () => {
    const ref = newReference.trim();
    if (!ref) return;
    updateTechnical('references', [...(proposal.technicalScope?.references || []), ref]);
    setNewReference('');
  };

  // ── Unidades / Locais de execução ────────────────────────────────────────────
  const addLocation = () => {
    const loc = newLocation.trim();
    if (!loc) return;
    updateTechnical('locations', [...(proposal.technicalScope?.locations || []), loc]);
    setNewLocation('');
  };

  // ── Matriz de periodicidade de manutenção ────────────────────────────────────
  const loadMaintenanceTemplate = (tasks: { equipment: string; inspection: string; frequency: string }[]) => {
    const withIds = tasks.map(t => ({ id: crypto.randomUUID(), ...t }));
    updateTechnical('maintenancePlan', [...(proposal.technicalScope?.maintenancePlan || []), ...withIds]);
    toast.success(`${withIds.length} itens adicionados à matriz de periodicidade.`);
  };
  const addMaintenanceRow = () => {
    updateTechnical('maintenancePlan', [
      ...(proposal.technicalScope?.maintenancePlan || []),
      { id: crypto.randomUUID(), equipment: '', inspection: '', frequency: 'Mensal' },
    ]);
  };
  const updateMaintenanceRow = (id: string, patch: Partial<{ equipment: string; inspection: string; frequency: string }>) => {
    updateTechnical('maintenancePlan', (proposal.technicalScope?.maintenancePlan || []).map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const removeMaintenanceRow = (id: string) => {
    updateTechnical('maintenancePlan', (proposal.technicalScope?.maintenancePlan || []).filter(t => t.id !== id));
  };

  const addCustomNorm = () => {
    const norm = newCustomNorm.trim();
    if (!norm) return;
    if (proposal.technicalScope?.norms?.includes(norm)) {
      toast.info('Norma já adicionada.');
      return;
    }
    updateTechnical('norms', [...(proposal.technicalScope?.norms || []), norm]);
    setNewCustomNorm('');
  };

  const insertBlock = (block: Block) => {
    const lower = (block.type || '').toLowerCase();
    let target: keyof Proposal['technicalScope'];
    if (lower.includes('contratada')) target = 'contractorObligations';
    else if (lower.includes('contratante')) target = 'contracteeObligations';
    else if (lower.includes('exclus')) target = 'exclusions';
    else target = 'contracteeObligations';

    const current = (proposal.technicalScope?.[target] as string[] | undefined) || [];
    if (current.includes(block.text)) {
      toast.info('Este bloco já foi inserido.');
      return;
    }
    updateTechnical(target, [...current, block.text]);
    toast.success(`Bloco "${block.type}" inserido.`);
  };

  const [pricingInsight, setPricingInsight] = useState<string | null>(null);

  const handleAiGenerateObjective = async () => {
    const seed = (proposal.scopeTitle || aiPrompt || '').trim();
    if (!seed) {
      toast.info('Informe o título do escopo (Etapa 1) ou descreva o projeto abaixo.');
      return;
    }
    setObjectiveLoading(true);
    try {
      const text = await aiService.generateScopeSummary(
        `Projeto/escopo: ${seed}. Cliente: ${proposal.clientName || 'não informado'}.`
      );
      if (text) {
        updateTechnical('generalConsiderations', text);
        setIsDirty(true);
        toast.success('Objeto e Escopo gerado.');
      } else {
        toast.error('Não foi possível gerar o texto agora.');
      }
    } finally {
      setObjectiveLoading(false);
    }
  };

  const handleAiGenerateText = async (prompt: string) => {
    if (!prompt.trim()) return;
    setAiLoading(true);
    const items = await aiService.generateTechnicalScope(prompt);
    setProposal(prev => ({
      ...prev,
      technicalScope: {
        ...prev.technicalScope!,
        items: [...(prev.technicalScope?.items || []), ...items]
      }
    }));
    setAiPrompt('');
    setAiLoading(false);
  };

  const analyzeRisk = async () => {
    setAiLoading(true);
    const insight = await aiService.analyzePricingRisk(proposal, []);
    setPricingInsight(insight);
    setAiLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const headers = data[0];
      const mapping = await aiService.parseSpreadsheetColumns(headers);
      
      const items = data.slice(1).map((row, idx) => {
        const item: any = { id: `xl-${idx}`, source: 'manual' };
        headers.forEach((h, i) => {
          const key = mapping[h];
          if (key) {
            item[key === 'price' ? 'unitPrice' : key] = row[i];
          }
        });
        item.totalPrice = (item.unitPrice || 0) * (item.quantity || 1);
        return item;
      }).filter(i => i.description);

      updateCommercial('items', [...(proposal.commercialProposal?.items || []), ...items]);
      setAiLoading(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateTotal = (items: any[]) => {
    return items.reduce((acc, item) => acc + itemContractValue(item), 0);
  };

  const addCommercialItem = () => {
    const newItem = { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'UN', unitPrice: 0, totalPrice: 0, source: 'manual', billingType: 'once' as const };
    updateCommercial('items', [...(proposal.commercialProposal?.items || []), newItem]);
    setTimeout(() => document.getElementById(`pw-item-${newItem.id}`)?.focus(), 50);
  };

  // ── Serviços sob demanda / chamados ──────────────────────────────────────────
  const onDemandServices = proposal.commercialProposal?.onDemandServices || [];
  const addOnDemandService = () => {
    const next: OnDemandService = { id: crypto.randomUUID(), description: '', unit: 'por visita', price: 0 };
    updateCommercial('onDemandServices', [...onDemandServices, next]);
  };
  const updateOnDemandService = (id: string, patch: Partial<OnDemandService>) => {
    updateCommercial('onDemandServices', onDemandServices.map(s => s.id === id ? { ...s, ...patch } : s));
  };
  const removeOnDemandService = (id: string) => {
    updateCommercial('onDemandServices', onDemandServices.filter(s => s.id !== id));
  };

  const handleBudgetSelect = (project: BudgetProject) => {
    // Recompute BDI on import (canonical formula). Never trust persisted calculatedBDI.
    const bdiRate = calculateBDI({
      ac: project.bdi.centralAdmin,
      sg: project.bdi.insuranceAndGuarantees,
      r: project.bdi.risks,
      df: project.bdi.financialExpenses,
      l: project.bdi.profit,
      i: project.bdi.taxes,
    });

    if (bdiRate <= 0) {
      toast.warning('Atenção: BDI calculado é zero ou negativo. Verifique a configuração do orçamento.');
    }

    const importedItems: CommercialItem[] = project.stages.flatMap(stage =>
      stage.items.map(item => {
        const unitPrice = item.unitCost * (1 + bdiRate);
        return {
          id: crypto.randomUUID(),
          description: `[${stage.name}] ${item.description}`,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice,
          totalPrice: item.quantity * unitPrice,
          source: 'engineering' as const,
        };
      })
    );

    updateCommercial('items', [...(proposal.commercialProposal?.items || []), ...importedItems]);
    setShowBudgetSelector(false);
    toast.success(
      `${importedItems.length} itens importados de "${project.title}" (BDI ${(bdiRate * 100).toFixed(2)}%)`
    );
  };

  const steps = [
    { title: 'Geral', icon: 1 },
    { title: 'Referências', icon: 2 },
    { title: 'Técnico', icon: 3 },
    { title: 'Comercial & Preço', icon: 4 },
  ];
  const TOTAL_STEPS = steps.length;

  const updateTechnical = (key: keyof Proposal['technicalScope'], value: any) => {
    setProposal(prev => ({
      ...prev,
      technicalScope: {
        ...(prev.technicalScope || { 
          generalConsiderations: '', 
          references: [], 
          norms: [], 
          items: [], 
          safetyNotes: '', 
          exclusions: [], 
          contractorObligations: [], 
          contracteeObligations: [] 
        }),
        [key]: value
      }
    }));
  };

  const updateCommercial = (key: keyof Proposal['commercialProposal'], value: any) => {
    setProposal(prev => {
      const currentCommercial = prev.commercialProposal || {
        totalValue: 0,
        paymentTerms: '',
        reajuste: '',
        guarantee: '',
        items: [],
        pricingMode: 'manual' as const
      };
      
      const nextCommercial = {
        ...currentCommercial,
        [key]: value
      };

      if (key === 'items') {
        nextCommercial.totalValue = (value as any[]).reduce((acc, item) => acc + itemContractValue(item), 0);
      }

      return {
        ...prev,
        commercialProposal: nextCommercial
      };
    });
  };

  // Cliente correspondente no CRM (para exibir cidade/segmento como contexto).
  const matchedClient = clients.find(
    c => c.name.trim().toLowerCase() === (proposal.clientName || '').trim().toLowerCase()
  );

  // Obras / oportunidades cadastradas no CRM para o cliente selecionado.
  const clientKey = (proposal.clientName || '').trim().toLowerCase();
  const clientOpportunities = clientKey
    ? opportunities.filter(o => (o.clientName || '').trim().toLowerCase() === clientKey)
    : [];

  // Ao escolher uma obra, herda título do escopo e vendedor responsável.
  const selectObra = (opp: CRMOpportunity) => {
    const vendor = opp.vendorId ? vendors.find(v => v.id === opp.vendorId) : undefined;
    setProposal(prev => ({
      ...prev,
      scopeTitle: opp.title,
      vendorId: vendor?.id ?? prev.vendorId,
      vendorName: vendor?.name ?? prev.vendorName,
    }));
    if (validationErrors.scopeTitle) setValidationErrors(prev => ({ ...prev, scopeTitle: undefined }));
    if (!isDirty) setIsDirty(true);
    toast.success(`Obra vinculada: ${opp.title}`);
  };

  const OPP_STAGE_LABELS: Record<string, string> = {
    prospecting: 'Prospecção',
    qualification: 'Qualificação',
    proposal: 'Proposta',
    negotiation: 'Negociação',
    won: 'Ganha',
    lost: 'Perdida',
  };

  // Data-limite de validade = base (emissão/hoje) + dias de validade.
  const validityBase = proposal.createdAt ? new Date(proposal.createdAt) : new Date();
  const validityLimitISO = Number.isFinite(proposal.validityDays) && (proposal.validityDays || 0) > 0
    ? new Date(validityBase.getTime() + (proposal.validityDays || 0) * 86400000).toISOString()
    : '';

  return (
    <React.Fragment>
      {/* Header and Preview Toggle */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold tracking-tight">
          {proposal.id ? `Editando Proposta: ${proposal.proposalNumber}` : 'Nova Proposta Técnica'}
        </h2>
        <button 
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-bold shadow-lg hover:opacity-90 transition-all font-mono"
        >
          {showPreview ? 'Voltar ao Editor' : 'Visualizar Super PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8" onChange={() => { if (!isDirty) setIsDirty(true); }}>
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {showPreview ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
               <ProposalPremiumView proposal={proposal as Proposal} />
            </div>
          ) : (
            <React.Fragment>
              {/* Progress Tracker */}
              <div className="flex items-center justify-between px-12">
                {steps.map((s, i) => (
                  <React.Fragment key={i}>
                    <button
                      type="button"
                      onClick={() => { if (i + 1 <= maxStepReached) setStep(i + 1); }}
                      disabled={i + 1 > maxStepReached}
                      aria-label={`Ir para a etapa ${s.title}`}
                      className={cn(
                        "flex flex-col items-center space-y-2 transition-opacity",
                        i + 1 <= maxStepReached ? "cursor-pointer hover:opacity-80" : "cursor-default"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                        step >= i + 1 ? "bg-[var(--color-brand-primary)] text-white" : "bg-black/5 text-black/40"
                      )}>
                        {step > i + 1 ? <Check size={20} /> : s.icon}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", step >= i + 1 ? "opacity-100" : "opacity-30")}>
                        {s.title}
                      </span>
                    </button>
                    {i < steps.length - 1 && <div className="flex-1 h-[2px] bg-black/5 mx-4" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Step Content Container */}
              <div className="bg-white rounded-2xl border border-black/5 shadow-xl p-8 min-h-[500px] flex flex-col">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div 
                      key="step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 flex-1"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Escopo da Proposta (Título)</label>
                          <input
                            type="text"
                            value={proposal.scopeTitle || ''}
                            onChange={e => {
                              setProposal({ ...proposal, scopeTitle: e.target.value });
                              if (validationErrors.scopeTitle && e.target.value.trim()) setValidationErrors(prev => ({ ...prev, scopeTitle: undefined }));
                            }}
                            placeholder="Ex: Instalação de Sistema de Incêndio - Prédio Comercial"
                            className={cn(
                              "w-full p-4 rounded-xl border-transparent focus:ring-0 transition-all font-bold text-lg",
                              validationErrors.scopeTitle
                                ? "bg-red-50 border border-red-200 focus:border-red-400"
                                : "bg-black/5 focus:border-[var(--color-brand-primary)]"
                            )}
                          />
                          {validationErrors.scopeTitle && <p className="text-xs text-red-600 font-medium">{validationErrors.scopeTitle}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Cliente / Empresa</label>
                          <input
                            type="text"
                            list="pw-crm-clients"
                            value={proposal.clientName}
                            onChange={e => {
                              setProposal({ ...proposal, clientName: e.target.value });
                              if (validationErrors.clientName && e.target.value.trim()) setValidationErrors(prev => ({ ...prev, clientName: undefined }));
                            }}
                            placeholder="Digite ou selecione um cliente do CRM..."
                            className={cn(
                              "w-full p-4 rounded-xl border-transparent focus:ring-0 transition-all font-medium",
                              validationErrors.clientName
                                ? "bg-red-50 border border-red-200 focus:border-red-400"
                                : "bg-black/5 focus:border-[var(--color-brand-primary)]"
                            )}
                          />
                          <datalist id="pw-crm-clients">
                            {clients.map(c => (
                              <option key={c.id} value={c.name}>
                                {[c.company, c.city, c.segment].filter(Boolean).join(' · ')}
                              </option>
                            ))}
                          </datalist>
                          {matchedClient && (
                            <p className="text-[10px] font-medium text-[var(--color-brand-primary)] flex items-center gap-1">
                              <MapPin size={11} />
                              {[matchedClient.company, matchedClient.city, matchedClient.segment].filter(Boolean).join(' · ') || 'Cliente vinculado ao CRM'}
                            </p>
                          )}
                          {validationErrors.clientName && <p className="text-xs text-red-600 font-medium">{validationErrors.clientName}</p>}
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold uppercase tracking-widest opacity-40">Número da Proposta</label>
                           <input 
                            type="text" 
                            value={proposal.proposalNumber}
                            readOnly
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent font-mono text-sm opacity-60"
                          />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold uppercase tracking-widest opacity-40">Revisão</label>
                           <input 
                            type="text" 
                            value={proposal.revision}
                            onChange={e => setProposal({...proposal, revision: e.target.value})}
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)]"
                          />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-bold uppercase tracking-widest opacity-40">Validade (Dias)</label>
                           <input
                            type="number"
                            min={1}
                            value={proposal.validityDays ?? ''}
                            onChange={e => {
                              const v = parseInt(e.target.value);
                              setProposal({ ...proposal, validityDays: Number.isFinite(v) && v > 0 ? v : 0 });
                            }}
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)]"
                          />
                          {validityLimitISO && (
                            <p className="text-[10px] font-medium opacity-50 flex items-center gap-1">
                              <CalendarClock size={11} />
                              Válida até {formatDate(validityLimitISO)}
                            </p>
                          )}
                        </div>

                        {/* Obras / Oportunidades cadastradas do cliente */}
                        {clientKey && (
                          <div className="space-y-3 col-span-2">
                            <label className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
                              <Building2 size={13} className="text-[var(--color-brand-primary)]" />
                              Obras cadastradas deste cliente
                            </label>
                            {clientOpportunities.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {clientOpportunities.map(opp => {
                                  const isSelected = (proposal.scopeTitle || '').trim().toLowerCase() === opp.title.trim().toLowerCase();
                                  return (
                                    <button
                                      key={opp.id}
                                      type="button"
                                      onClick={() => selectObra(opp)}
                                      aria-label={`Vincular obra ${opp.title}`}
                                      className={cn(
                                        "text-left p-4 rounded-xl border transition-all group",
                                        isSelected
                                          ? "bg-[var(--color-brand-primary)]/5 border-[var(--color-brand-primary)]/40 shadow-sm"
                                          : "bg-black/[0.02] border-black/5 hover:border-[var(--color-brand-primary)]/30 hover:bg-black/[0.04]"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="font-bold text-sm leading-tight">{opp.title}</p>
                                        {isSelected && <Check size={16} className="text-[var(--color-brand-primary)] shrink-0" />}
                                      </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs font-mono opacity-60">{formatCurrency(opp.value || 0)}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-black/5 opacity-50">
                                          {OPP_STAGE_LABELS[opp.stage] || opp.stage}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-[11px] opacity-40 italic px-1">
                                {matchedClient
                                  ? 'Nenhuma obra cadastrada para este cliente no CRM. Cadastre a obra em Comercial → Oportunidades.'
                                  : 'Selecione um cliente do CRM para listar as obras vinculadas.'}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Vendedor Responsável</label>
                          <select
                            value={proposal.vendorId ?? ''}
                            onChange={e => {
                              const v = vendors.find(v => v.id === e.target.value);
                              setProposal({ ...proposal, vendorId: v?.id ?? '', vendorName: v?.name ?? '' });
                            }}
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-medium appearance-none"
                          >
                            <option value="">— Sem responsável —</option>
                            {vendors.map(v => (
                              <option key={v.id} value={v.id}>{v.name}{v.role ? ` · ${v.role}` : ''}</option>
                            ))}
                          </select>
                        </div>

                        {/* Detalhes do Contrato */}
                        <div className="space-y-4 col-span-2 pt-6 border-t border-black/5 mt-2">
                          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-brand-primary)] px-1">Detalhes do Contrato</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest opacity-40">Número do Contrato</label>
                              <input 
                                type="text" 
                                value={proposal.contractDetails?.contractNumber || ''}
                                onChange={e => setProposal({
                                  ...proposal, 
                                  contractDetails: { 
                                    ...(proposal.contractDetails || { contractNumber: '', signingDate: '', executionDeadline: '' }), 
                                    contractNumber: e.target.value 
                                  }
                                })}
                                placeholder="Ex: CT-2024-001"
                                className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest opacity-40">Data de Assinatura</label>
                              <input 
                                type="date" 
                                value={proposal.contractDetails?.signingDate || ''}
                                onChange={e => setProposal({
                                  ...proposal, 
                                  contractDetails: { 
                                    ...(proposal.contractDetails || { contractNumber: '', signingDate: '', executionDeadline: '' }), 
                                    signingDate: e.target.value 
                                  }
                                })}
                                className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-medium"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-widest opacity-40">Prazo de Execução</label>
                              <input 
                                type="text" 
                                value={proposal.contractDetails?.executionDeadline || ''}
                                onChange={e => setProposal({
                                  ...proposal, 
                                  contractDetails: { 
                                    ...(proposal.contractDetails || { contractNumber: '', signingDate: '', executionDeadline: '' }), 
                                    executionDeadline: e.target.value 
                                  }
                                })}
                                placeholder="Ex: 60 dias úteis"
                                className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-medium"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                       key="step-2"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-8 flex-1"
                    >
                      <div className="space-y-4">
                         <label className="text-xs font-bold uppercase tracking-widest opacity-40">Unidades / Locais de Execução</label>
                         <p className="text-[10px] opacity-50 italic -mt-2">Para contratos multi-site, liste os endereços ou unidades atendidas.</p>
                         <div className="flex gap-2">
                           <input
                             type="text"
                             value={newLocation}
                             onChange={e => setNewLocation(e.target.value)}
                             onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocation(); } }}
                             placeholder="Ex: CAAV 5 — Av. Paulista, 1000, São Paulo/SP"
                             className="flex-1 p-3 bg-black/5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                           />
                           <button
                             onClick={addLocation}
                             disabled={!newLocation.trim()}
                             className="px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                           >
                             <Plus size={14} /> Adicionar
                           </button>
                         </div>
                         <div className="space-y-2">
                           {(proposal.technicalScope?.locations || []).map((loc, i) => (
                             <div key={i} className="flex items-center justify-between bg-black/5 px-3 py-2 rounded-lg text-sm font-medium">
                               <span className="flex items-center gap-2"><MapPin size={14} className="text-[var(--color-brand-primary)] shrink-0" /> {loc}</span>
                               <button aria-label="Remover unidade" onClick={() => updateTechnical('locations', (proposal.technicalScope?.locations || []).filter((_, idx) => idx !== i))}>
                                 <Trash2 size={14} className="text-red-500" />
                               </button>
                             </div>
                           ))}
                           {(!proposal.technicalScope?.locations || proposal.technicalScope.locations.length === 0) && (
                             <p className="text-xs opacity-40 italic">Nenhuma unidade adicionada.</p>
                           )}
                         </div>
                      </div>

                      <div className="space-y-4">
                         <label className="text-xs font-bold uppercase tracking-widest opacity-40">Referências de Projeto</label>
                         <div className="flex gap-2">
                           <input
                             type="text"
                             value={newReference}
                             onChange={e => setNewReference(e.target.value)}
                             onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReference(); } }}
                             placeholder="Ex: Projeto Hidráulico Rev 03 ou URL..."
                             className="flex-1 p-3 bg-black/5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                           />
                           <button
                             onClick={addReference}
                             disabled={!newReference.trim()}
                             className="px-4 py-2 bg-[var(--color-brand-primary)] text-white rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                           >
                             <Plus size={14} /> Adicionar
                           </button>
                         </div>
                          <div className="flex flex-wrap gap-2">
                            {proposal.technicalScope?.references?.map((ref, i) => (
                              <div key={i} className="bg-black/5 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
                                {ref?.toLowerCase().startsWith('http') ? (
                                  <a
                                    href={ref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--color-brand-primary)] hover:underline truncate max-w-[200px]"
                                  >
                                    {ref}
                                  </a>
                                ) : (
                                  ref
                                )}
                                <button aria-label="Remover referência" onClick={() => updateTechnical('references', (proposal.technicalScope?.references || []).filter((_, idx) => idx !== i))}>
                                  <Trash2 size={12} className="text-red-500" />
                                </button>
                              </div>
                            ))}
                            {(!proposal.technicalScope?.references || proposal.technicalScope.references.length === 0) && <p className="text-xs opacity-40 italic">Nenhuma referência listada.</p>}
                         </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-bold uppercase tracking-widest opacity-40">Normas Técnicas Aplicáveis</label>
                        {libraryNorms.length === 0 ? (
                          <p className="text-xs opacity-40 italic">Nenhuma norma cadastrada na biblioteca. Cadastre em "Normas & Blocos".</p>
                        ) : (
                          <>
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
                            <input
                              type="text"
                              value={normSearch}
                              onChange={e => setNormSearch(e.target.value)}
                              placeholder="Buscar norma (ex: 17240, alarme, hidrante)..."
                              className="w-full pl-9 p-3 bg-black/5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                            />
                          </div>
                          {(() => {
                            const q = normSearch.trim().toLowerCase();
                            const filtered = q
                              ? libraryNorms.filter(n => n.title.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q))
                              : libraryNorms;
                            if (filtered.length === 0) {
                              return <p className="text-xs opacity-40 italic">Nenhuma norma encontrada para "{normSearch}".</p>;
                            }
                            return (
                          <div className="grid grid-cols-2 gap-3">
                            {filtered.map((libNorm) => {
                              const label = libNorm.title;
                              const checked = proposal.technicalScope?.norms?.includes(label) || false;
                              return (
                                <label key={libNorm.id} className={cn(
                                  "flex flex-col gap-1 p-4 rounded-xl border transition-all cursor-pointer",
                                  checked ? "bg-[var(--color-brand-primary)]/5 border-[var(--color-brand-primary)]" : "border-black/5 hover:border-black/10"
                                )}>
                                  <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={checked}
                                    onChange={() => {
                                      const current = proposal.technicalScope?.norms || [];
                                      const next = current.includes(label) ? current.filter(n => n !== label) : [...current, label];
                                      updateTechnical('norms', next);
                                    }}
                                  />
                                  <span className="text-sm font-medium">{label}</span>
                                  {libNorm.description && <span className="text-[10px] opacity-50">{libNorm.description}</span>}
                                </label>
                              );
                            })}
                          </div>
                            );
                          })()}
                          </>
                        )}

                        <div className="flex gap-2 pt-2">
                          <input
                            type="text"
                            value={newCustomNorm}
                            onChange={e => setNewCustomNorm(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomNorm(); } }}
                            placeholder="Norma personalizada (ex: ABNT NBR 17240)..."
                            className="flex-1 p-3 bg-black/5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                          />
                          <button
                            onClick={addCustomNorm}
                            disabled={!newCustomNorm.trim()}
                            className="px-4 py-2 border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-40"
                          >
                            <Plus size={14} /> Personalizada
                          </button>
                        </div>

                        {/* Selected custom norms (those not in library) */}
                        {proposal.technicalScope?.norms?.filter(n => !libraryNorms.some(ln => ln.title === n)).map((norm) => (
                          <div key={norm} className="flex items-center p-3 rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 justify-between">
                            <span className="text-sm font-medium">{norm}</span>
                            <button onClick={() => updateTechnical('norms', (proposal.technicalScope?.norms || []).filter(n => n !== norm))}>
                              <Trash2 size={12} className="text-red-500" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {libraryBlocks.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-black/5">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Inserir Blocos Padrão</label>
                          <p className="text-[10px] opacity-50 italic">Insere o texto do bloco em Obrigações ou Exclusões conforme o tipo cadastrado.</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {libraryBlocks.map(b => (
                              <button
                                key={b.id}
                                onClick={() => insertBlock(b)}
                                className="text-left bg-white border border-black/5 hover:border-[var(--color-brand-primary)] p-3 rounded-xl transition-all"
                              >
                                <div className="text-[10px] font-bold uppercase tracking-tighter bg-black/5 px-2 py-1 rounded w-fit mb-2">{b.type || 'GERAL'}</div>
                                <p className="text-[11px] opacity-60 italic line-clamp-2">"{b.text}"</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div 
                       key="step-3"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-8 flex-1"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Objeto e Escopo (texto de abertura)</label>
                          <button
                            type="button"
                            onClick={handleAiGenerateObjective}
                            disabled={objectiveLoading}
                            className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-brand-primary)] disabled:opacity-40"
                          >
                            <Sparkles size={12} /> {objectiveLoading ? 'Gerando...' : 'Gerar com IA'}
                          </button>
                        </div>
                        <textarea
                          value={proposal.technicalScope?.generalConsiderations || ''}
                          onChange={e => updateTechnical('generalConsiderations', e.target.value)}
                          rows={4}
                          placeholder="Ex: Fornecimento de material e mão de obra para instalação do sistema de proteção e combate a incêndio, contemplando detecção, alarme e os subsistemas previstos em projeto..."
                          className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:ring-1 focus:ring-[var(--color-brand-primary)] text-sm leading-relaxed"
                        />
                        <p className="text-[10px] opacity-50 italic">
                          Parágrafo de abertura "Objeto e Escopo" da proposta. Se ficar vazio, um texto padrão é usado no PDF/Word.
                        </p>
                      </div>

                      <div className="bg-[var(--color-brand-dark)] text-white p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles size={18} className="text-[var(--color-brand-primary)]" />
                          <span className="text-xs font-bold uppercase tracking-widest">IA Assistente de Engenharia</span>
                        </div>
                        <p className="text-sm opacity-70">Descreva o projeto para gerar os <strong>itens</strong> do escopo formal.</p>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Descreva o escopo aqui..."
                            value={aiPrompt}
                            onChange={e => setAiPrompt(e.target.value)}
                            className="flex-1 bg-white/10 border-transparent rounded-lg p-3 text-sm focus:ring-0"
                            onKeyDown={(e) => {
                               if (e.key === 'Enter') handleAiGenerateText(aiPrompt);
                            }}
                          />
                          <button
                            disabled={aiLoading || !aiPrompt.trim()}
                            onClick={() => handleAiGenerateText(aiPrompt)}
                            className="bg-[var(--color-brand-primary)] px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                          >
                            {aiLoading ? 'Processando...' : 'Gerar'}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 w-full">Atalhos rápidos</span>
                          {AI_SCOPE_PRESETS.map(preset => (
                            <button
                              key={preset.label}
                              disabled={aiLoading}
                              onClick={() => handleAiGenerateText(preset.prompt)}
                              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              <Sparkles size={12} className="text-[var(--color-brand-primary)]" />
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Itens do Escopo Técnico</label>
                          <button 
                            onClick={() => updateTechnical('items', [...(proposal.technicalScope?.items || []), { category: 'GERAL', description: '' }])}
                            className="text-xs font-bold text-[var(--color-brand-primary)]"
                          >
                            + Adicionar Manualmente
                          </button>
                        </div>
                        <div className="space-y-4">
                          {proposal.technicalScope?.items?.map((item, i) => (
                            <div key={i} className="group bg-black/5 p-6 rounded-xl space-y-4 relative">
                               <button
                                aria-label="Remover item do escopo"
                                onClick={() => updateTechnical('items', proposal.technicalScope!.items.filter((_, idx) => idx !== i))}
                                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                               >
                                 <Trash2 size={16} className="text-red-500" />
                               </button>
                               <input 
                                type="text" 
                                value={item.category}
                                onChange={e => {
                                  const next = proposal.technicalScope!.items.map((it, idx) => 
                                    idx === i ? { ...it, category: e.target.value.toUpperCase() } : it
                                  );
                                  updateTechnical('items', next);
                                }}
                                className="bg-transparent border-none p-0 text-sm font-bold uppercase tracking-widest text-[var(--color-brand-primary)] focus:ring-0 w-full"
                               />
                               <textarea 
                                value={item.description}
                                onChange={e => {
                                   const next = proposal.technicalScope!.items.map((it, idx) => 
                                     idx === i ? { ...it, description: e.target.value } : it
                                   );
                                   updateTechnical('items', next);
                                }}
                                rows={3}
                                className="w-full bg-white border-transparent rounded-lg p-4 text-sm focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                               />
                            </div>
                          ))}
                          {(proposal.technicalScope?.items?.length ?? 0) === 0 && (
                            <div className="text-center py-8 text-xs opacity-40 italic border border-dashed border-black/10 rounded-xl">
                              Nenhum item de escopo ainda. Use a IA acima (ou os atalhos) ou "Adicionar Manualmente".
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Matriz de Periodicidade de Manutenção */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Matriz de Periodicidade (Manutenção)</label>
                          <button
                            onClick={addMaintenanceRow}
                            className="text-xs font-bold text-[var(--color-brand-primary)]"
                          >
                            + Adicionar Linha
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 w-full">Carregar checklist</span>
                          {MAINTENANCE_TEMPLATES.map(t => (
                            <button
                              key={t.label}
                              onClick={() => loadMaintenanceTemplate(t.tasks)}
                              className="flex items-center gap-1.5 bg-black/5 hover:bg-black/10 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                            >
                              <ClipboardList size={12} className="text-[var(--color-brand-primary)]" /> {t.label}
                            </button>
                          ))}
                        </div>
                        {(proposal.technicalScope?.maintenancePlan?.length ?? 0) > 0 ? (
                          <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[10px] uppercase opacity-40 font-bold border-b border-black/5">
                                <tr>
                                  <th className="px-4 py-3">Equipamento</th>
                                  <th className="px-4 py-3">Tipo de Inspeção</th>
                                  <th className="px-4 py-3 w-40">Frequência</th>
                                  <th className="px-4 py-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-black/5">
                                {proposal.technicalScope!.maintenancePlan!.map(task => (
                                  <tr key={task.id} className="group">
                                    <td className="px-4 py-2">
                                      <input
                                        value={task.equipment}
                                        onChange={e => updateMaintenanceRow(task.id, { equipment: e.target.value })}
                                        placeholder="Ex: Bomba jockey"
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input
                                        value={task.inspection}
                                        onChange={e => updateMaintenanceRow(task.id, { inspection: e.target.value })}
                                        placeholder="Ex: Teste de pressurização"
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <select
                                        value={task.frequency}
                                        onChange={e => updateMaintenanceRow(task.id, { frequency: e.target.value })}
                                        className="bg-black/5 rounded-lg px-2 py-1 text-xs font-medium border-transparent focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                      >
                                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                      </select>
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      <button aria-label="Remover linha" onClick={() => removeMaintenanceRow(task.id)}>
                                        <Trash2 size={14} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-xs opacity-40 italic">Nenhuma rotina de manutenção definida. Use um checklist acima ou adicione linhas manualmente.</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {step === 4 && (
                    <motion.div 
                       key="step-4"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-8 flex-1"
                    >
                      <div className="space-y-6">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/5 p-4 rounded-2xl">
                            <div className="space-y-1">
                               <h3 className="text-sm font-bold uppercase tracking-widest text-black">Itens e Precificação</h3>
                               <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Adicione itens manualmente ou importe via CSV/Excel</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <button 
                                 onClick={() => setShowBudgetSelector(true)}
                                 className="flex-1 md:flex-none bg-orange-50 text-orange-600 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-100 transition-all border border-orange-100 shadow-sm"
                               >
                                 <Search size={16} /> Buscar Orçamento
                               </button>
                               <label className="flex-1 md:flex-none bg-white border border-black/10 text-black px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center gap-2 hover:bg-black/5 transition-all shadow-sm">
                                 <FileSpreadsheet size={16} className="text-green-600" /> 
                                 Importar CSV/XML
                                 <input type="file" className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />
                               </label>
                               <button 
                                 onClick={addCommercialItem} 
                                 className="flex-1 md:flex-none bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-black/10"
                               >
                                 <Plus size={16} /> Adicionar Manual
                               </button>
                            </div>
                         </div>

                         <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="text-[10px] uppercase opacity-40 font-bold border-b border-black/5">
                                <tr>
                                  <th className="px-4 py-3">Descrição</th>
                                  <th className="px-4 py-3 w-20 text-center">Quant.</th>
                                  <th className="px-4 py-3 w-24 text-right">Unitário</th>
                                  <th className="px-4 py-3 w-36 text-center">Cobrança</th>
                                  <th className="px-4 py-3 w-32 text-right">Total</th>
                                  <th className="px-4 py-3 w-10"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-black/5">
                                {proposal.commercialProposal?.items?.map((item, i) => (
                                  <tr key={i} className="group">
                                    <td className="px-4 py-2">
                                      <input 
                                        id={`pw-item-${item.id}`}
                                        type="text" 
                                        value={item.description}
                                        onChange={e => {
                                          const next = proposal.commercialProposal!.items.map((it, idx) => 
                                            idx === i ? { ...it, description: e.target.value } : it
                                          );
                                          updateCommercial('items', next);
                                        }}
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                                        placeholder="Descrição do item ou serviço..."
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input 
                                        type="number" 
                                        step="any"
                                        min="0"
                                        value={item.quantity === 0 ? '' : item.quantity}
                                        onChange={e => {
                                          const qty = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          const next = proposal.commercialProposal!.items.map((it, idx) => {
                                            if (idx === i) {
                                              return { ...it, quantity: qty, totalPrice: qty * (it.unitPrice || 0) };
                                            }
                                            return it;
                                          });
                                          updateCommercial('items', next);
                                        }}
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-center text-sm"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                                        onChange={e => {
                                          const price = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          const next = proposal.commercialProposal!.items.map((it, idx) => {
                                            if (idx === i) {
                                              return { ...it, unitPrice: price, totalPrice: (it.quantity || 0) * price };
                                            }
                                            return it;
                                          });
                                          updateCommercial('items', next);
                                        }}
                                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-right text-sm font-mono"
                                      />
                                    </td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center justify-center gap-1">
                                        <select
                                          value={item.billingType || 'once'}
                                          onChange={e => {
                                            const bt = e.target.value as 'once' | 'monthly';
                                            const next = proposal.commercialProposal!.items.map((it, idx) =>
                                              idx === i ? { ...it, billingType: bt, contractMonths: bt === 'monthly' ? (it.contractMonths || 12) : it.contractMonths } : it
                                            );
                                            updateCommercial('items', next);
                                          }}
                                          className="bg-black/5 rounded-lg px-2 py-1 text-xs font-medium focus:ring-1 focus:ring-[var(--color-brand-primary)] border-transparent"
                                        >
                                          <option value="once">Único</option>
                                          <option value="monthly">Mensal</option>
                                        </select>
                                        {item.billingType === 'monthly' && (
                                          <input
                                            type="number"
                                            min={1}
                                            value={item.contractMonths || 12}
                                            onChange={e => {
                                              const m = parseInt(e.target.value) || 1;
                                              const next = proposal.commercialProposal!.items.map((it, idx) =>
                                                idx === i ? { ...it, contractMonths: m } : it
                                              );
                                              updateCommercial('items', next);
                                            }}
                                            className="w-12 bg-black/5 rounded-lg px-1 py-1 text-xs text-center font-mono border-transparent focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                            title="Meses de contrato"
                                          />
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-sm font-mono">
                                      {formatCurrency(itemContractValue(item))}
                                      {item.billingType === 'monthly' && (
                                        <span className="block text-[9px] font-normal opacity-50">
                                          {formatCurrency(item.totalPrice)}/mês × {item.contractMonths || 12}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-right">
                                      <button aria-label="Remover item" onClick={() => updateCommercial('items', proposal.commercialProposal!.items.filter((_, idx) => idx !== i))}>
                                        <Trash2 size={14} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {proposal.commercialProposal?.items.length === 0 && (
                              <div className="p-12 text-center text-xs opacity-40 italic">
                                Nenhum item adicionado à precificação.
                              </div>
                            )}
                         </div>

                         {/* Serviços sob demanda / chamados */}
                         <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 space-y-4">
                           <div className="flex items-center justify-between">
                             <div className="space-y-1">
                               <h3 className="text-sm font-bold uppercase tracking-widest text-black">Serviços sob Demanda</h3>
                               <p className="text-[10px] opacity-40 font-bold uppercase tracking-wider">Tabela de preços para chamados/extras — não soma no valor do contrato</p>
                             </div>
                             <button
                               onClick={addOnDemandService}
                               className="bg-black/5 text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-black/10 transition-all shrink-0"
                             >
                               <Plus size={14} /> Adicionar
                             </button>
                           </div>
                           {onDemandServices.length > 0 ? (
                             <div className="space-y-2">
                               {onDemandServices.map(svc => (
                                 <div key={svc.id} className="flex items-center gap-2">
                                   <input
                                     type="text"
                                     value={svc.description}
                                     onChange={e => updateOnDemandService(svc.id, { description: e.target.value })}
                                     placeholder="Ex: Chamado emergencial"
                                     className="flex-1 p-2 bg-black/5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                   />
                                   <input
                                     type="text"
                                     value={svc.unit}
                                     onChange={e => updateOnDemandService(svc.id, { unit: e.target.value })}
                                     placeholder="por visita"
                                     className="w-28 p-2 bg-black/5 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                   />
                                   <input
                                     type="number"
                                     step="0.01"
                                     min="0"
                                     value={svc.price === 0 ? '' : svc.price}
                                     onChange={e => updateOnDemandService(svc.id, { price: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                                     placeholder="0,00"
                                     className="w-28 p-2 bg-black/5 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-primary)]"
                                   />
                                   <button aria-label="Remover serviço" onClick={() => removeOnDemandService(svc.id)} className="p-1">
                                     <Trash2 size={14} className="text-red-500" />
                                   </button>
                                 </div>
                               ))}
                             </div>
                           ) : (
                             <p className="text-xs opacity-40 italic">Nenhum serviço sob demanda cadastrado.</p>
                           )}
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                         <div className="space-y-6">
                            <div className="bg-[var(--color-brand-dark)] text-white p-6 rounded-2xl space-y-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <Sparkles size={18} className="text-[var(--color-brand-primary)]" />
                                   <span className="text-xs font-bold uppercase tracking-widest">Análise de Risco</span>
                                 </div>
                                 <button 
                                  disabled={aiLoading || proposal.commercialProposal?.items.length === 0}
                                  onClick={analyzeRisk}
                                  className="text-[10px] font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 px-3 py-1 rounded"
                                 >
                                   {aiLoading ? 'Analisando...' : 'Analisar Margem'}
                                 </button>
                              </div>
                              <div className="text-sm opacity-80 min-h-[100px] flex items-center justify-center border border-white/10 rounded-xl p-4 bg-black/20">
                                {pricingInsight ? pricingInsight : "Clique em 'Analisar Margem' para obter insights da IA."}
                              </div>
                            </div>
                         </div>

                         <div className="space-y-6 flex flex-col justify-between">
                            <div className="space-y-4">
                               <div className="flex items-center justify-between text-[var(--color-brand-primary)]">
                                 <span className="text-xs font-bold uppercase tracking-widest">Valor Total do Contrato</span>
                                 <span className="font-bold text-2xl tracking-tighter">
                                   {formatCurrency(calculateTotal(proposal.commercialProposal?.items || []))}
                                 </span>
                               </div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-xl flex gap-3">
                              <AlertCircle size={20} className="text-orange-500 shrink-0" />
                              <p className="text-xs text-orange-700 italic">
                                Use "Buscar Orçamento" para importar itens com BDI aplicado do módulo de Orçamentos.
                              </p>
                            </div>
                         </div>
                      </div>

                       <div className="grid grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest opacity-40">Condições de Pagamento</label>
                            <textarea 
                              value={proposal.commercialProposal?.paymentTerms}
                              onChange={e => updateCommercial('paymentTerms', e.target.value)}
                              rows={2}
                              className="w-full p-4 rounded-xl bg-black/5 border-transparent text-sm"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-bold uppercase tracking-widest opacity-40">Garantia</label>
                            <textarea
                              value={proposal.commercialProposal?.guarantee}
                              onChange={e => updateCommercial('guarantee', e.target.value)}
                              rows={2}
                              className="w-full p-4 rounded-xl bg-black/5 border-transparent text-sm"
                            />
                          </div>
                       </div>

                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Footer actions */}
                <div className="mt-auto pt-8 border-t border-black/5 flex items-center justify-between">
                   <button 
                     disabled={step === 1}
                     onClick={() => setStep(step - 1)}
                     className="px-6 py-2 flex items-center gap-2 font-bold text-sm opacity-40 hover:opacity-100 transition-opacity disabled:pointer-events-none"
                   >
                     <ChevronLeft size={16} /> Voltar
                   </button>

                   <div className="flex items-center gap-4">
                      <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 border border-black/10 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black/5 transition-all"
                      >
                        <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Rascunho'}
                      </button>
                      
                      {step < TOTAL_STEPS ? (
                        <button
                          onClick={() => setStep(step + 1)}
                          className="px-8 py-2 bg-[var(--color-brand-primary)] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all font-mono"
                        >
                          Continuar <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={handleSave}
                          className="px-8 py-2 bg-[var(--color-brand-dark)] text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all font-mono"
                        >
                          Finalizar e Gerar Link <Check size={16} />
                        </button>
                      )}
                   </div>
                </div>
              </div>
            </React.Fragment>
          )}
        </div>

        {/* Sidebar for Revision History & Attachments */}
        {!showPreview && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm space-y-6">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Controle de Revisões</h3>
              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold opacity-60">Nota de Alteração</label>
                  <textarea 
                    value={revisionNote}
                    onChange={e => setRevisionNote(e.target.value)}
                    placeholder="O que mudou nesta revisão?"
                    className="w-full p-2 text-xs bg-black/5 rounded-lg border-transparent focus:ring-[var(--color-brand-primary)]"
                    rows={2}
                  />
                </div>
                <div className="space-y-2 border-t border-black/5 pt-4">
                  {(proposal.revisions || []).map((rev, i) => (
                    <div key={i} className="p-3 bg-black/5 rounded-lg text-xs space-y-1 hover:bg-black/10 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between font-bold">
                        <span>Rev.{rev.revisionNumber}</span>
                        <span className="opacity-40">{formatDate(rev.createdAt)}</span>
                      </div>
                      <p className="opacity-60 line-clamp-1">{rev.changes}</p>
                    </div>
                  ))}
                  {(!proposal.revisions || proposal.revisions.length === 0) && (
                    <p className="text-[10px] opacity-40 italic">Nenhuma revisão anterior.</p>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {showBudgetSelector && (
        <BudgetSelector 
          onSelect={handleBudgetSelect} 
          onClose={() => setShowBudgetSelector(false)} 
        />
      )}
    </React.Fragment>
  );
}
