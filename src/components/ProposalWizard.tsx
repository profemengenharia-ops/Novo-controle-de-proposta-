import React, { useState, useEffect } from 'react';
import { Proposal, ProposalStatus, TechnicalScopeItem, Client, Obra, ObraStatus } from '../types';
import { proposalService } from '../services/proposalService';
import { clientService } from '../services/clientService';
import { obraService } from '../services/obraService';
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
  PackageSearch,
  Zap,
  Calculator,
  TrendingUp,
  Search,
  Upload,
  ArrowRight,
  Building2,
  HardHat,
  MapPin,
  Ruler,
  Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, formatDate, maskCNPJ, maskPhone, calculateBDI } from '../lib/utils';
import * as XLSX from 'xlsx';
import { PriceFormationModal } from './PriceFormationModal';
import { PricingFormulation } from './PricingFormulation';
import { CommercialItem, PriceFormation, GlobalPriceFormation } from '../types';

import { ProposalPrintView } from './ProposalPrintView';
import { BudgetSelector } from './BudgetSelector';
import { budgetProjectService } from '../services/budgetProjectService';
import { BudgetProject } from '../types';

interface WizardProps {
  proposalId?: string;
  /** Pre-link to an obra without an existing proposal (from PropostasInbox) */
  initialObraId?: string;
  onComplete: () => void;
}

export function ProposalWizard({ proposalId, initialObraId, onComplete }: WizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [revisionNote, setRevisionNote] = useState('');
  const [selectedItemForPricing, setSelectedItemForPricing] = useState<{index: number, item: CommercialItem} | null>(null);
  const [showBudgetSelector, setShowBudgetSelector] = useState(false);
  const [linkedClient, setLinkedClient] = useState<Client | null>(null);
  const [linkedObra, setLinkedObra] = useState<Obra | null>(null);
  
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
      signingDate: '',
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
    if (!proposalId) return;

    // Bug #9: flag para evitar setState em componente desmontado durante load async
    let cancelled = false;

    async function load() {
      const data = await proposalService.getProposal(proposalId!);
      if (!data || cancelled) return;

      const preFill: Partial<Proposal> = {};
      const [client, obra] = await Promise.all([
        data.clientId ? clientService.getById(data.clientId).catch(() => null) : null,
        data.obraId   ? obraService.getById(data.obraId).catch(() => null)   : null,
      ]);
      if (cancelled) return;

      if (client) {
        setLinkedClient(client);
        if (!data.clientName) preFill.clientName = client.companyName;
      }
      if (obra) {
        setLinkedObra(obra);
        if (!data.scopeTitle)  preFill.scopeTitle = obra.name;
        if (!data.deadline && obra.deadline) preFill.deadline = obra.deadline;
        if (obra.scopeSummary && !data.technicalScope?.generalConsiderations) {
          preFill.technicalScope = {
            ...(data.technicalScope ?? {
              generalConsiderations: '',
              references: [],
              norms: [],
              items: [],
              safetyNotes: '',
              exclusions: [],
              contractorObligations: [],
              contracteeObligations: [],
            }),
            generalConsiderations: obra.scopeSummary,
          };
        }
      }

      if (!cancelled) {
        setProposal({
          ...data,
          ...preFill,
          contractDetails: data.contractDetails || {
            contractNumber: '',
            signingDate: '',
            executionDeadline: '',
          },
        });
      }
    }
    load();

    // Realtime subscription for pricing updates
    const unsubscribe = proposalService.subscribeToProposal(proposalId, (updated) => {
      if (cancelled) return;
      setProposal(prev => {
        if (prev.status === ProposalStatus.DRAFT && updated.status !== ProposalStatus.DRAFT) {
          toast.info(`Status da proposta atualizado para: ${updated.status.toUpperCase()}`);
        }
        return {
          ...prev,
          ...updated,
          contractDetails: updated.contractDetails || prev.contractDetails,
        };
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [proposalId]);

  // ── Pre-fill from obra (Inbox "Assumir" flow) ─────────────────────────────
  useEffect(() => {
    if (!initialObraId || proposalId) return; // editing an existing proposal takes priority
    async function loadFromObra() {
      const obra = await obraService.getById(initialObraId!).catch(() => null);
      if (!obra) return;
      setLinkedObra(obra);
      const client = obra.clientId
        ? await clientService.getById(obra.clientId).catch(() => null)
        : null;
      if (client) setLinkedClient(client);
      setProposal(prev => ({
        ...prev,
        obraId: obra.id,
        clientId: obra.clientId,
        clientName: client?.companyName ?? prev.clientName ?? '',
        scopeTitle: obra.name,
        ...(obra.deadline ? { deadline: obra.deadline } : {}),
        ...(obra.scopeSummary
          ? {
              technicalScope: {
                ...(prev.technicalScope ?? {
                  generalConsiderations: '',
                  references: [],
                  norms: [],
                  items: [],
                  safetyNotes: '',
                  exclusions: [],
                  contractorObligations: [],
                  contracteeObligations: [],
                }),
                generalConsiderations: obra.scopeSummary,
              },
            }
          : {}),
      }));
    }
    loadFromObra();
  }, [initialObraId, proposalId]);

  const handleSave = async () => {
    if (!proposal.clientName?.trim()) {
      alert('Por favor, informe o nome do cliente.');
      return;
    }
    if (!proposal.scopeTitle?.trim()) {
      alert('Por favor, informe o título do escopo.');
      return;
    }

    setLoading(true);
    try {
      const finalTotal = calculateTotal(proposal.commercialProposal?.items || []);
      const proposalToSave = {
        ...proposal,
        commercialProposal: {
          ...proposal.commercialProposal!,
          totalValue: finalTotal > 0 ? finalTotal : (proposal.commercialProposal?.totalValue || 0)
        }
      };

      let newProposalId: string | undefined;

      if (proposal.id) {
        let nextRev = proposal.revision || '00';
        if (revisionNote) {
          const revNum = parseInt(nextRev);
          nextRev = String(revNum + 1).padStart(2, '0');
        }

        await proposalService.updateProposal(proposal.id, {
          ...proposalToSave,
          revision: nextRev
        }, revisionNote);
      } else {
        newProposalId = await proposalService.createProposal({
          ...proposalToSave as Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>,
          createdBy: user?.id || ''
        });
      }
      toast.success(proposal.id ? 'Proposta atualizada com sucesso!' : 'Proposta criada com sucesso!');

      // ── Auto-avançar obra vinculada para "Em Proposta" no Kanban ──────────────
      const obraId = proposal.obraId ?? linkedObra?.id;
      if (obraId) {
        try {
          const ADVANCE_FROM: ObraStatus[] = [
            'prospeccao', 'aguardando_orcamento', 'em_orcamento', 'orcada',
          ];
          const currentObra = linkedObra ?? await obraService.getById(obraId).catch(() => null);
          if (currentObra && ADVANCE_FROM.includes(currentObra.status)) {
            await obraService.update(obraId, {
              status: 'em_proposta',
              // Link obra ↔ proposal so downstream (CRMKanban, PropostasInboxComercial)
              // can find the proposal when the card is advanced to "proposta_enviada".
              ...(newProposalId ? { proposalId: newProposalId } : {}),
            });
            // Update local reference so stale status isn't used again in this session
            setLinkedObra(prev => prev ? { ...prev, status: 'em_proposta' } : prev);
          }
        } catch (obraErr) {
          // Non-fatal — proposal saved OK, status update failed silently
          console.warn('Falha ao avançar status da obra:', obraErr);
        }
      }

      onComplete();
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar proposta. Tente novamente.');
    } finally {
      // Bug #22: movido para finally para garantir que loading seja resetado mesmo em erro duplo
      setLoading(false);
    }
  };

  const [pricingInsight, setPricingInsight] = useState<string | null>(null);
  const [summaryView, setSummaryView] = useState(false);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [clientObras, setClientObras] = useState<Obra[]>([]);

  // Bug #12: dependência correta — sincronizar quando o campo é carregado do DB (pode ser async)
  useEffect(() => {
    if (proposal.commercialProposal?.hideItemDetails !== undefined) {
      setSummaryView(proposal.commercialProposal.hideItemDetails);
    }
  }, [proposal.commercialProposal?.hideItemDetails]);

  useEffect(() => {
    clientService.getAll().then(setAllClients).catch(() => {});
  }, []);

  const handleSelectClient = async (client: Client) => {
    setLinkedClient(client);
    setClientQuery(client.companyName);
    setClientDropOpen(false);
    setProposal(prev => ({ ...prev, clientName: client.companyName, clientId: client.id }));
    try {
      // Bug #13: getAll() carregava TODAS as obras para filtrar no front — N+1 query.
      // getByClient() faz a query filtrada direto no banco.
      const obras = await obraService.getByClient(client.id);
      setClientObras(obras);
    } catch {
      setClientObras([]);
    }
  };

  const handleSelectObra = (obra: Obra) => {
    setLinkedObra(obra);
    setProposal(prev => ({
      ...prev,
      obraId: obra.id,
      scopeTitle: prev.scopeTitle || obra.name,
      ...((!prev.deadline && obra.deadline) ? { deadline: obra.deadline } : {}),
      technicalScope: {
        generalConsiderations: '',
        references: [],
        norms: [],
        items: [],
        safetyNotes: '',
        exclusions: [],
        contractorObligations: [],
        contracteeObligations: [],
        ...(prev.technicalScope ?? {}),
        ...(!prev.technicalScope?.generalConsiderations && obra.scopeSummary
          ? { generalConsiderations: obra.scopeSummary }
          : {}),
      },
    }));
  };

  const handleAiGenerateText = async (prompt: string) => {
    if (!prompt.trim()) return;
    setAiLoading(true);
    try {
      const items = await aiService.generateTechnicalScope(prompt);
      if (items && items.length > 0) {
        setProposal(prev => ({
          ...prev,
          technicalScope: {
            ...prev.technicalScope!,
            items: [...(prev.technicalScope?.items || []), ...items]
          }
        }));
        toast.success(`${items.length} ${items.length === 1 ? 'item gerado' : 'itens gerados'} pela IA!`);
        setAiPrompt('');
      } else if (items !== null) {
        toast.warning('A IA não retornou itens. Tente descrever o projeto com mais detalhes.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
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
    // Bug #11: sem onerror o spinner travava indefinidamente em arquivo corrompido
    reader.onerror = () => {
      setAiLoading(false);
      toast.error('Não foi possível ler o arquivo. Verifique se está corrompido.');
    };
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
    return items.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
  };

  const addCommercialItem = () => {
    const newItem = { id: crypto.randomUUID(), description: '', quantity: 1, unit: 'UN', unitPrice: 0, totalPrice: 0, source: 'manual' };
    updateCommercial('items', [...(proposal.commercialProposal?.items || []), newItem]);
    setTimeout(() => document.getElementById(`pw-item-${newItem.id}`)?.focus(), 50);
  };

  const handleBudgetSelect = (project: BudgetProject) => {
    // Bug #10: se calculatedBDI for 0 (projeto recém-criado sem recalcular),
    // os itens importavam sem margem. Recalculamos usando os campos de configuração do BDI.
    const bdiPercent =
      project.bdi.calculatedBDI > 0
        ? project.bdi.calculatedBDI
        : calculateBDI({
            ac: project.bdi.centralAdmin,
            sg: project.bdi.insuranceAndGuarantees,
            r:  project.bdi.risks,
            df: project.bdi.financialExpenses,
            l:  project.bdi.profit,
            i:  project.bdi.taxes,
          }) * 100; // calculateBDI retorna decimal (ex: 0.2479), converter para %

    const bdiMultiplier = 1 + bdiPercent / 100;

    const finalizedItems: CommercialItem[] = project.stages.flatMap(stage =>
      stage.items.map(item => {
        const unitPrice = item.unitCost * bdiMultiplier;
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

    updateCommercial('items', [...(proposal.commercialProposal?.items || []), ...finalizedItems]);
    setShowBudgetSelector(false);
    toast.success(`${finalizedItems.length} itens importados de "${project.title}"`);
  };

  const steps = [
    { title: 'Geral', icon: 1 },
    { title: 'Referências', icon: 2 },
    { title: 'Técnico', icon: 3 },
    { title: 'Comercial', icon: 4 },
    { title: 'Workbench', icon: 5 },
  ];

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
        nextCommercial.totalValue = (value as any[]).reduce((acc, item) => acc + (item.totalPrice || 0), 0);
      }

      return {
        ...prev,
        commercialProposal: nextCommercial
      };
    });
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          {showPreview ? (
            <div className="animate-in fade-in zoom-in-95 duration-500">
               <ProposalPrintView proposal={proposal as Proposal} />
            </div>
          ) : (
            <React.Fragment>
              {/* Progress Tracker */}
              <div className="flex items-center justify-between px-12">
                {steps.map((s, i) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center space-y-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all",
                        step >= i + 1 ? "bg-[var(--color-brand-primary)] text-white" : "bg-black/5 text-black/40"
                      )}>
                        {step > i + 1 ? <Check size={20} /> : s.icon}
                      </div>
                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", step >= i + 1 ? "opacity-100" : "opacity-30")}>
                        {s.title}
                      </span>
                    </div>
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
                      {/* ── Linked Context Card ─────────────────────────────────── */}
                      {(linkedClient || linkedObra) && (
                        <div className="flex gap-0 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50/60 overflow-hidden">
                          {linkedClient && (
                            <div className="flex-1 p-4 space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1 mb-2">
                                <Building2 size={9} /> Cliente Vinculado
                              </p>
                              <p className="text-sm font-black text-blue-900 leading-tight">{linkedClient.companyName}</p>
                              {linkedClient.tradeName && (
                                <p className="text-[10px] text-blue-600 font-medium">{linkedClient.tradeName}</p>
                              )}
                              {linkedClient.cnpj && (
                                <p className="text-[10px] text-blue-500 font-mono">{maskCNPJ(linkedClient.cnpj)}</p>
                              )}
                              {linkedClient.contacts.length > 0 && (() => {
                                const ct = linkedClient.contacts.find(c => c.isPrimary) ?? linkedClient.contacts[0];
                                return (
                                  <p className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                                    <Phone size={9} />
                                    {ct.name}{ct.phone ? ` · ${maskPhone(ct.phone)}` : ''}
                                  </p>
                                );
                              })()}
                              {(linkedClient.city || linkedClient.state) && (
                                <p className="text-[10px] text-blue-500 flex items-center gap-1">
                                  <MapPin size={9} />
                                  {[linkedClient.city, linkedClient.state].filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                          )}
                          {linkedObra && (
                            <div className={`flex-1 p-4 space-y-1 ${linkedClient ? 'border-l border-blue-200' : ''}`}>
                              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1 mb-2">
                                <HardHat size={9} /> Obra Vinculada
                              </p>
                              <p className="text-sm font-black text-indigo-900 leading-tight">{linkedObra.name}</p>
                              {linkedObra.type && (
                                <p className="text-[10px] text-indigo-600 font-medium capitalize">{linkedObra.type}</p>
                              )}
                              {linkedObra.estimatedArea && (
                                <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                                  <Ruler size={9} /> {linkedObra.estimatedArea} m²
                                </p>
                              )}
                              {(linkedObra.city || linkedObra.state) && (
                                <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                                  <MapPin size={9} />
                                  {[linkedObra.city, linkedObra.state].filter(Boolean).join(' · ')}
                                </p>
                              )}
                              {linkedObra.deadline && (
                                <p className="text-[10px] text-indigo-400 font-medium">
                                  Prazo: {linkedObra.deadline}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* ─────────────────────────────────────────────────────────── */}

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Escopo da Proposta (Título)</label>
                          <input 
                            type="text" 
                            value={proposal.scopeTitle || ''}
                            onChange={e => setProposal({...proposal, scopeTitle: e.target.value})}
                            placeholder="Ex: Instalação de Sistema de Incêndio - Prédio Comercial"
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-bold text-lg"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-1.5">
                            <Building2 size={11} /> Cliente / Empresa
                          </label>
                          {/* Search bar */}
                          <div className="relative">
                            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30 pointer-events-none" />
                            <input
                              type="text"
                              value={clientQuery || proposal.clientName || ''}
                              onChange={e => {
                                const q = e.target.value;
                                setClientQuery(q);
                                setProposal(prev => ({ ...prev, clientName: q }));
                                setClientDropOpen(q.length > 0);
                                if (!q) { setLinkedClient(null); setClientObras([]); }
                              }}
                              onFocus={() => { if ((clientQuery || proposal.clientName || '').length > 0) setClientDropOpen(true); }}
                              placeholder="Buscar cliente cadastrado ou digitar manualmente..."
                              className="w-full pl-10 pr-4 p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)] focus:ring-0 transition-all font-medium"
                            />
                            {/* Dropdown */}
                            {clientDropOpen && (() => {
                              const q = (clientQuery || proposal.clientName || '').toLowerCase();
                              const filtered = allClients.filter(c =>
                                c.companyName.toLowerCase().includes(q) ||
                                (c.tradeName ?? '').toLowerCase().includes(q)
                              ).slice(0, 6);
                              if (filtered.length === 0) return null;
                              return (
                                <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-black/10 rounded-2xl shadow-xl z-50 overflow-hidden">
                                  {filtered.map(c => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleSelectClient(c)}
                                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 text-left transition-colors border-b border-black/5 last:border-0"
                                    >
                                      <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center shrink-0 text-[10px] font-black">
                                        {c.companyName.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold">{c.companyName}</p>
                                        {c.tradeName && <p className="text-[10px] opacity-50">{c.tradeName}</p>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Obras do cliente selecionado */}
                          {linkedClient && clientObras.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2 flex items-center gap-1">
                                <HardHat size={9} /> Obras de {linkedClient.companyName}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {clientObras.map(obra => (
                                  <button
                                    key={obra.id}
                                    type="button"
                                    onClick={() => handleSelectObra(obra)}
                                    className={cn(
                                      'px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all',
                                      linkedObra?.id === obra.id
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white border-black/10 text-black/60 hover:border-orange-400 hover:text-orange-600'
                                    )}
                                  >
                                    {obra.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {linkedClient && clientObras.length === 0 && (
                            <p className="text-[10px] opacity-40 italic mt-1">Nenhuma obra cadastrada para este cliente.</p>
                          )}
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
                            value={proposal.validityDays}
                            onChange={e => setProposal({...proposal, validityDays: parseInt(e.target.value)})}
                            className="w-full p-4 rounded-xl bg-black/5 border-transparent focus:border-[var(--color-brand-primary)]"
                          />
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
                         <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-widest opacity-40">Referências de Projeto</label>
                            <button 
                              onClick={() => {
                                const name = prompt('Nome da referência:');
                                if (name) updateTechnical('references', [...(proposal.technicalScope?.references || []), name]);
                              }}
                              className="text-xs font-bold text-[var(--color-brand-primary)] flex items-center"
                            >
                              <Plus size={14} className="mr-1" /> Adicionar
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
                                <button onClick={() => updateTechnical('references', (proposal.technicalScope?.references || []).filter((_, idx) => idx !== i))}>
                                  <Trash2 size={12} className="text-red-500" />
                                </button>
                              </div>
                            ))}
                            {(!proposal.technicalScope?.references || proposal.technicalScope.references.length === 0) && <p className="text-xs opacity-40 italic">Nenhuma referência listada.</p>}
                         </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Normas Técnicas Aplicáveis</label>
                          <button 
                            onClick={() => {
                              const name = prompt('Nome da norma técnica:');
                              if (name) updateTechnical('norms', [...(proposal.technicalScope?.norms || []), name]);
                            }}
                            className="text-xs font-bold text-[var(--color-brand-primary)] flex items-center"
                          >
                            <Plus size={14} className="mr-1" /> Adicionar Personalizada
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            "Decreto Estadual Corpo de Bombeiros SP 56.819/2011",
                            "NR 10 - Instalações e Serviços em Eletricidade",
                            "NR 33 - Espaços Confinados",
                            "NR 35 - Trabalhos em Altura"
                          ].map((norm) => (
                            <label key={norm} className={cn(
                              "flex items-center p-4 rounded-xl border transition-all cursor-pointer",
                              proposal.technicalScope?.norms?.includes(norm) ? "bg-[var(--color-brand-primary)]/5 border-[var(--color-brand-primary)]" : "border-black/5 hover:border-black/10"
                            )}>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={proposal.technicalScope?.norms?.includes(norm) || false}
                                onChange={() => {
                                  const current = proposal.technicalScope?.norms || [];
                                  const next = current.includes(norm) ? current.filter(n => n !== norm) : [...current, norm];
                                  updateTechnical('norms', next);
                                }}
                              />
                              <span className="text-sm font-medium">{norm}</span>
                            </label>
                          ))}
                          
                          {/* Custom norms */}
                          {proposal.technicalScope?.norms?.filter(n => ![
                            "Decreto Estadual Corpo de Bombeiros SP 56.819/2011",
                            "NR 10 - Instalações e Serviços em Eletricidade",
                            "NR 33 - Espaços Confinados",
                            "NR 35 - Trabalhos em Altura"
                          ].includes(n)).map((norm) => (
                            <div key={norm} className="flex items-center p-4 rounded-xl border border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5 justify-between">
                              <span className="text-sm font-medium">{norm}</span>
                              <button onClick={() => updateTechnical('norms', (proposal.technicalScope?.norms || []).filter(n => n !== norm))}>
                                <Trash2 size={12} className="text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Obrigação da Contratada */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Obrigação da Contratada</label>
                          <button
                            type="button"
                            onClick={() => updateTechnical('contractorObligations', [...(proposal.technicalScope?.contractorObligations || []), ''])}
                            className="text-xs font-bold text-[var(--color-brand-primary)] flex items-center gap-1"
                          >
                            <Plus size={13} /> Adicionar
                          </button>
                        </div>
                        <div className="space-y-2 border border-black/8 rounded-2xl p-4 bg-black/[0.015]">
                          {(proposal.technicalScope?.contractorObligations || []).length === 0 && (
                            <p className="text-xs opacity-30 italic">Nenhuma obrigação listada. Clique em Adicionar.</p>
                          )}
                          {(proposal.technicalScope?.contractorObligations || []).map((obl, i) => (
                            <div key={i} className="flex items-start gap-2 group">
                              <span className="mt-3 text-[var(--color-brand-primary)] shrink-0 text-xs font-black">◆</span>
                              <input
                                type="text"
                                value={obl}
                                onChange={e => {
                                  const next = [...(proposal.technicalScope?.contractorObligations || [])];
                                  next[i] = e.target.value;
                                  updateTechnical('contractorObligations', next);
                                }}
                                placeholder="Descrever obrigação da contratada..."
                                className="flex-1 p-2.5 rounded-xl bg-white border border-black/8 text-sm focus:ring-1 focus:ring-[var(--color-brand-primary)] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateTechnical('contractorObligations', (proposal.technicalScope?.contractorObligations || []).filter((_, idx) => idx !== i))}
                                className="mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Obrigação da Contratante */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-40">Obrigação da Contratante</label>
                          <button
                            type="button"
                            onClick={() => updateTechnical('contracteeObligations', [...(proposal.technicalScope?.contracteeObligations || []), ''])}
                            className="text-xs font-bold text-[var(--color-brand-primary)] flex items-center gap-1"
                          >
                            <Plus size={13} /> Adicionar
                          </button>
                        </div>
                        <div className="space-y-2 border border-black/8 rounded-2xl p-4 bg-black/[0.015]">
                          {(proposal.technicalScope?.contracteeObligations || []).length === 0 && (
                            <p className="text-xs opacity-30 italic">Nenhuma obrigação listada. Clique em Adicionar.</p>
                          )}
                          {(proposal.technicalScope?.contracteeObligations || []).map((obl, i) => (
                            <div key={i} className="flex items-start gap-2 group">
                              <span className="mt-3 text-blue-500 shrink-0 text-xs font-black">◆</span>
                              <input
                                type="text"
                                value={obl}
                                onChange={e => {
                                  const next = [...(proposal.technicalScope?.contracteeObligations || [])];
                                  next[i] = e.target.value;
                                  updateTechnical('contracteeObligations', next);
                                }}
                                placeholder="Descrever obrigação da contratante..."
                                className="flex-1 p-2.5 rounded-xl bg-white border border-black/8 text-sm focus:ring-1 focus:ring-[var(--color-brand-primary)] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateTechnical('contracteeObligations', (proposal.technicalScope?.contracteeObligations || []).filter((_, idx) => idx !== i))}
                                className="mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
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
                      <div className="bg-[var(--color-brand-dark)] text-white p-6 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2">
                          <Sparkles size={18} className="text-[var(--color-brand-primary)]" />
                          <span className="text-xs font-bold uppercase tracking-widest">IA Assistente de Engenharia</span>
                        </div>
                        <p className="text-sm opacity-70">Descreva o projeto para gerar o escopo formal.</p>
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
                        </div>
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
                      <div className="grid grid-cols-5 gap-4">
                        {[
                          { id: 'manual', label: 'Manual', icon: Calculator, desc: 'Venda Rápida' },
                          { id: 'engineering', label: 'Engenharia', icon: TrendingUp, desc: 'BDI Técnico' },
                          { id: 'catalog', label: 'Catálogo', icon: PackageSearch, desc: 'Itens Internos' },
                          { id: 'spreadsheet', label: 'Planilha', icon: FileSpreadsheet, desc: 'Importar Excel' },
                          { id: 'erp', label: 'ERP', icon: Zap, desc: 'Sincronizar' },
                        ].map((mode) => (
                          <button 
                            key={mode.id}
                            onClick={() => updateCommercial('pricingMode', mode.id)}
                            className={cn(
                              "p-4 rounded-xl border flex flex-col items-center gap-2 transition-all",
                              proposal.commercialProposal?.pricingMode === mode.id 
                                ? "bg-[var(--color-brand-primary)] text-white border-[var(--color-brand-primary)]" 
                                : "bg-white border-black/5 hover:border-black/10"
                            )}
                          >
                            <mode.icon size={20} />
                            <div className="text-center">
                              <p className="text-[10px] font-bold uppercase tracking-widest">{mode.label}</p>
                              <p className="text-[8px] opacity-60 uppercase">{mode.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>

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

                         {/* Summary toggle */}
                         <div className="flex items-center justify-end -mt-2">
                           <button
                             onClick={() => {
                               const next = !summaryView;
                               setSummaryView(next);
                               updateCommercial('hideItemDetails', next);
                             }}
                             className={cn(
                               'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border',
                               summaryView
                                 ? 'bg-black text-white border-black'
                                 : 'bg-white text-black/50 border-black/10 hover:border-black/30 hover:text-black'
                             )}
                           >
                             ≡ Resumo
                           </button>
                         </div>

                         {summaryView ? (
                           /* ── MODO RESUMO: apenas o valor total ── */
                           <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-8 flex flex-col items-center justify-center gap-2">
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor Total da Proposta</p>
                             <p className="text-4xl font-black tracking-tighter text-[var(--color-brand-primary)]">
                               {formatCurrency(calculateTotal(proposal.commercialProposal?.items || []))}
                             </p>
                             <p className="text-[10px] opacity-30 font-medium">
                               {proposal.commercialProposal?.items?.length ?? 0} {(proposal.commercialProposal?.items?.length ?? 0) === 1 ? 'item' : 'itens'}
                             </p>
                           </div>
                         ) : (
                           /* ── MODO DETALHADO: tabela completa ── */
                           <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
                              <table className="w-full text-left text-sm">
                                <thead className="text-[10px] uppercase opacity-40 font-bold border-b border-black/5">
                                  <tr>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3 w-20 text-center">Quant.</th>
                                    <th className="px-4 py-3 w-24 text-right">Unitário</th>
                                    <th className="px-4 py-3 w-32 text-right">Total</th>
                                    <th className="px-4 py-3 w-20 text-center">Ações</th>
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
                                      <td className="px-4 py-2 text-right font-bold text-sm font-mono">
                                        {formatCurrency(item.totalPrice)}
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <button
                                          onClick={() => setSelectedItemForPricing({ index: i, item })}
                                          className={cn(
                                            "p-1.5 rounded-lg transition-all",
                                            item.source === 'engineering' ? "bg-orange-100 text-orange-600" : "bg-neutral-100 text-neutral-400 hover:text-neutral-900"
                                          )}
                                          title="Formação de Preço (BDI)"
                                        >
                                          <Calculator size={14} />
                                        </button>
                                      </td>
                                      <td className="px-2 py-2 text-right">
                                        <button onClick={() => updateCommercial('items', proposal.commercialProposal!.items.filter((_, idx) => idx !== i))}>
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
                         )}
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
                               <div className="flex items-center justify-between">
                                 <span className="text-xs font-bold uppercase tracking-widest opacity-40">Subtotal</span>
                                 <span className="font-mono text-sm">{formatCurrency(calculateTotal(proposal.commercialProposal?.items || []))}</span>
                               </div>
                               <div className="flex items-center justify-between text-[var(--color-brand-primary)]">
                                 <span className="text-xs font-bold uppercase tracking-widest">Valor Final Sugerido</span>
                                 <span className="font-bold text-2xl tracking-tighter">
                                   {formatCurrency(calculateTotal(proposal.commercialProposal?.items || []))}
                                 </span>
                               </div>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-xl flex gap-3">
                              <AlertCircle size={20} className="text-orange-500 shrink-0" />
                              <p className="text-xs text-orange-700 italic">
                                {proposal.commercialProposal?.pricingMode === 'erp' ? 
                                  "Modo ERP Ativo: Preços sincronizados em tempo real." : 
                                  "Use o modo Catálogo para maior precisão."}
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

                  {step === 5 && (
                    <motion.div
                       key="step-5"
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -20 }}
                       className="space-y-8 flex-1"
                    >
                      <div className="flex flex-col gap-6">
                        <div className="bg-neutral-900 text-white p-8 rounded-[2rem] shadow-2xl space-y-8 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
                          
                          <div className="flex items-center justify-between relative z-10">
                            <div>
                              <h3 className="text-2xl font-black tracking-tight uppercase">Engenharia Financeira ERP</h3>
                              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Pricing Workbench & Margin Analysis</p>
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mr-3">Status Global:</span>
                              <span className="text-sm font-black text-green-400 uppercase tracking-tighter">Saudável</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Valor Total da Proposta</span>
                              <p className="text-3xl font-black tabular-nums tracking-tighter">{formatCurrency(proposal.commercialProposal?.totalValue || 0)}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Custo Direto Total</span>
                              <p className="text-3xl font-black tabular-nums tracking-tighter opacity-60">{formatCurrency((proposal.commercialProposal?.totalValue || 0) * 0.7)}</p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Lucro Bruto Estimado</span>
                              <p className="text-3xl font-black tabular-nums tracking-tighter text-[var(--color-brand-primary)]">{formatCurrency((proposal.commercialProposal?.totalValue || 0) * 0.15)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                           <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-4">
                             <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Análise de Pontos de Equilíbrio</h4>
                             <div className="h-40 flex items-end gap-2 px-2">
                               {[45, 60, 30, 80, 50, 90, 40].map((h, i) => (
                                 <div key={i} className="flex-1 bg-black/5 rounded-t-lg relative group transition-all hover:bg-[var(--color-brand-primary)]" style={{height: `${h}%`}}>
                                   <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">R$ {h}k</div>
                                 </div>
                               ))}
                             </div>
                             <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-30 pt-2 border-t border-black/5">
                               <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span><span>Jun</span><span>Jul</span>
                             </div>
                           </div>

                           <div className="bg-white p-6 rounded-2xl border border-black/5 space-y-6">
                             <h4 className="text-xs font-black uppercase tracking-widest text-neutral-400">Guardrails & Riscos</h4>
                             <div className="space-y-4">
                               {[
                                 { label: 'Margem de Contribuição', value: 24, status: 'healthy' },
                                 { label: 'Custo de Aquisição (CAC)', value: 8, status: 'healthy' },
                                 { label: 'Exposição Financeira', value: 12, status: 'warning' }
                               ].map((g, i) => (
                                 <div key={i} className="space-y-2">
                                   <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                     <span>{g.label}</span>
                                     <span>{g.value}%</span>
                                   </div>
                                   <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                                     <div 
                                      className={cn("h-full rounded-full transition-all duration-1000", g.status === 'healthy' ? 'bg-green-400' : 'bg-yellow-400')} 
                                      style={{width: `${g.value * 3}%`}} 
                                     />
                                   </div>
                                 </div>
                               ))}
                             </div>
                           </div>
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
                      
                      {step < 5 ? (
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

            <div className="bg-[var(--color-brand-dark)] text-white p-6 rounded-2xl space-y-4">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Anexos Inteligentes</h3>
               <div className="space-y-3">
                  {['Folder Corporativo', 'Tabela de Bombas', 'Certificações NR'].map(file => (
                    <div key={file} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
                      <span>{file}.pdf</span>
                      <Plus size={12} className="opacity-40" />
                    </div>
                  ))}
               </div>
               <p className="text-[9px] opacity-40 leading-relaxed italic">
                 Anexos selecionados serão "costurados" automaticamente ao PDF final.
               </p>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedItemForPricing && (
          <PriceFormationModal 
            itemDescription={selectedItemForPricing.item.description || "Novo Item"}
            initialData={selectedItemForPricing.item.priceFormation}
            onClose={() => setSelectedItemForPricing(null)}
            onSave={(pricing) => {
              const next = proposal.commercialProposal!.items.map((it, idx) => {
                if (idx === selectedItemForPricing.index) {
                  return { 
                    ...it, 
                    unitPrice: pricing.finalPrice, 
                    totalPrice: (it.quantity || 1) * pricing.finalPrice,
                    source: 'engineering' as const,
                    priceFormation: pricing
                  };
                }
                return it;
              });
              updateCommercial('items', next);
              setSelectedItemForPricing(null);
            }}
          />
        )}
      </AnimatePresence>
      {showBudgetSelector && (
        <BudgetSelector 
          onSelect={handleBudgetSelect} 
          onClose={() => setShowBudgetSelector(false)} 
        />
      )}
    </React.Fragment>
  );
}
