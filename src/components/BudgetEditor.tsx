import React, { useState, useCallback, useMemo } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronRight, Save, Check,
  Package, HardHat, Wrench, Truck, Edit2, GripVertical,
  AlertCircle, TrendingUp, Settings2, ChevronUp, Copy, ArrowUp, ArrowDown,
  Briefcase, FileText,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  BudgetProject, BudgetStatus, BudgetStage, BudgetLineItem,
  BudgetLineType, BudgetBDI, BudgetIndirectCosts, ProposalStatus,
} from '../types';
import { budgetProjectService } from '../services/budgetProjectService';
import { proposalService } from '../services/proposalService';
import { formatCurrency, cn, calculateBDI } from '../lib/utils';
import { BudgetLineItemModal } from './BudgetLineItemModal';
import { BudgetPrintView } from './BudgetPrintView';
import { confirmAction } from '../hooks/useConfirm';

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: BudgetStatus; label: string }[] = [
  { value: BudgetStatus.DRAFT,      label: 'Rascunho' },
  { value: BudgetStatus.APPROVED,   label: 'Aprovado' },
  { value: BudgetStatus.EXECUTING,  label: 'Em Execução' },
  { value: BudgetStatus.COMPLETED,  label: 'Concluído' },
  { value: BudgetStatus.CANCELLED,  label: 'Cancelado' },
];

const STATUS_COLOR: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]:      'bg-black/5 text-black/60',
  [BudgetStatus.APPROVED]:   'bg-blue-50 text-blue-700',
  [BudgetStatus.EXECUTING]:  'bg-orange-50 text-orange-700',
  [BudgetStatus.COMPLETED]:  'bg-green-50 text-green-700',
  [BudgetStatus.CANCELLED]:  'bg-red-50 text-red-500',
};

const TYPE_ICON: Record<BudgetLineType, React.ReactNode> = {
  material:    <Package size={12} />,
  mao_de_obra: <HardHat size={12} />,
  servico:     <Wrench size={12} />,
  equipamento: <Truck size={12} />,
};

const TYPE_COLOR: Record<BudgetLineType, string> = {
  material:    'bg-blue-50 text-blue-600',
  mao_de_obra: 'bg-orange-50 text-orange-600',
  servico:     'bg-purple-50 text-purple-600',
  equipamento: 'bg-green-50 text-green-600',
};

const TYPE_LABEL: Record<BudgetLineType, string> = {
  material:    'Material',
  mao_de_obra: 'Mão de Obra',
  servico:     'Serviço',
  equipamento: 'Equipamento',
};

// ─── BDI Presets ─────────────────────────────────────────────────────────────

const BDI_PRESETS: { label: string; bdi: Omit<BudgetBDI, 'calculatedBDI'> }[] = [
  { label: 'Obra Pública', bdi: { centralAdmin: 4, financialExpenses: 1.2, insuranceAndGuarantees: 0.8, risks: 1, profit: 7.5, taxes: 8.65 } },
  { label: 'Serviços Privados', bdi: { centralAdmin: 3, financialExpenses: 1.0, insuranceAndGuarantees: 0.5, risks: 0.5, profit: 10, taxes: 6.5 } },
  { label: 'Conservador', bdi: { centralAdmin: 5, financialExpenses: 1.5, insuranceAndGuarantees: 1.0, risks: 2.0, profit: 12, taxes: 8.65 } },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId() { return crypto.randomUUID(); }

function calcStageTotal(stage: BudgetStage) {
  return stage.items.reduce((s, i) => s + i.totalCost, 0);
}

function calcDirectTotal(stages: BudgetStage[]) {
  return stages.reduce((s, st) => s + calcStageTotal(st), 0);
}

function calcIndirectTotal(ic: BudgetIndirectCosts) {
  return Object.values(ic).reduce((s: number, v) => s + Number(v), 0);
}

function computeBDI(bdi: BudgetBDI): number {
  return calculateBDI({
    ac: bdi.centralAdmin,
    sg: bdi.insuranceAndGuarantees,
    r: bdi.risks,
    df: bdi.financialExpenses,
    l: bdi.profit,
    i: bdi.taxes,
  }) * 100;
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  project: BudgetProject;
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

export function BudgetEditor({ project: initial, onBack, onNavigate }: Props) {
  const [project, setProject] = useState<BudgetProject>(initial);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(
    new Set(initial.stages.map(s => s.id))
  );
  const [addingStage, setAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [addItemModal, setAddItemModal] = useState<{ stageId: string; item?: BudgetLineItem } | null>(null);
  const [showBDIPanel, setShowBDIPanel] = useState(false);
  const [showIndirectPanel, setShowIndirectPanel] = useState(false);

  // ─── Derived financials ────────────────────────────────────────────────────

  const totalDirectCost = useMemo(() => calcDirectTotal(project.stages), [project.stages]);
  const totalIndirectCost = useMemo(() => calcIndirectTotal(project.indirectCosts), [project.indirectCosts]);
  const calculatedBDIPct = useMemo(() => computeBDI(project.bdi), [project.bdi]);
  const totalBDI = useMemo(() => totalDirectCost * (calculatedBDIPct / 100), [totalDirectCost, calculatedBDIPct]);
  const finalPrice = useMemo(() => totalDirectCost + totalIndirectCost + totalBDI, [totalDirectCost, totalIndirectCost, totalBDI]);

  const marginPct = useMemo(
    () => (finalPrice > 0 ? (totalBDI / finalPrice) * 100 : 0),
    [totalBDI, finalPrice]
  );

  const byType = useMemo(() => {
    const totals: Record<BudgetLineType, number> = { material: 0, mao_de_obra: 0, servico: 0, equipamento: 0 };
    project.stages.forEach(st => st.items.forEach(i => { totals[i.type] += i.totalCost; }));
    return totals;
  }, [project.stages]);

  // ─── Mutators ─────────────────────────────────────────────────────────────

  const update = useCallback((patch: Partial<BudgetProject>) => {
    setProject(p => ({ ...p, ...patch }));
    setDirty(true);
  }, []);

  const toggleStage = (id: string) => {
    setExpandedStages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const addStage = () => {
    if (!newStageName.trim()) return;
    const stage: BudgetStage = {
      id: newId(),
      name: newStageName.trim(),
      order: project.stages.length + 1,
      items: [],
    };
    const stages = [...project.stages, stage];
    setExpandedStages(prev => new Set([...prev, stage.id]));
    update({ stages });
    setNewStageName('');
    setAddingStage(false);
  };

  const renameStage = (id: string) => {
    if (!editingStageName.trim()) return;
    update({ stages: project.stages.map(s => s.id === id ? { ...s, name: editingStageName.trim() } : s) });
    setEditingStageId(null);
  };

  const deleteStage = async (id: string) => {
    const ok = await confirmAction({
      title: 'Excluir esta etapa?',
      description: 'Todos os itens dessa etapa serão removidos.',
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    update({ stages: project.stages.filter(s => s.id !== id) });
  };

  const duplicateStage = (stageId: string) => {
    const src = project.stages.find(s => s.id === stageId);
    if (!src) return;
    const clone: BudgetStage = {
      id: newId(),
      name: src.name + ' (Cópia)',
      order: project.stages.length + 1,
      items: src.items.map(i => ({ ...i, id: newId() })),
    };
    setExpandedStages(prev => new Set([...prev, clone.id]));
    update({ stages: [...project.stages, clone] });
    toast.success('Etapa duplicada!');
  };

  const moveStage = (id: string, direction: 'up' | 'down') => {
    const idx = project.stages.findIndex(s => s.id === id);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === project.stages.length - 1) return;
    const stages = [...project.stages];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [stages[idx], stages[swapIdx]] = [stages[swapIdx], stages[idx]];
    update({ stages: stages.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  const addItemToStage = (stageId: string, item: Omit<BudgetLineItem, 'id'>) => {
    update({
      stages: project.stages.map(s =>
        s.id === stageId
          ? { ...s, items: [...s.items, { id: newId(), ...item }] }
          : s
      ),
    });
  };

  const updateItem = (stageId: string, itemId: string, patch: Partial<BudgetLineItem>) => {
    update({
      stages: project.stages.map(s =>
        s.id === stageId
          ? {
              ...s,
              items: s.items.map(i => {
                if (i.id !== itemId) return i;
                const merged = { ...i, ...patch };
                return { ...merged, totalCost: merged.quantity * merged.unitCost };
              }),
            }
          : s
      ),
    });
  };

  const duplicateItem = (stageId: string, item: BudgetLineItem) => {
    const { id: _id, ...rest } = item;
    addItemToStage(stageId, rest);
  };

  const deleteItem = (stageId: string, itemId: string) => {
    update({
      stages: project.stages.map(s =>
        s.id === stageId ? { ...s, items: s.items.filter(i => i.id !== itemId) } : s
      ),
    });
  };

  const updateBDIField = (key: keyof BudgetBDI, value: number) => {
    const bdi = { ...project.bdi, [key]: value };
    update({ bdi });
  };

  const updateIndirectField = (key: keyof BudgetIndirectCosts, value: number) => {
    update({ indirectCosts: { ...project.indirectCosts, [key]: value } });
  };

  // ─── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    try {
      await budgetProjectService.update(project.id, {
        ...project,
        totalDirectCost,
        totalIndirectCost,
        totalBDI,
        finalPrice,
        bdi: { ...project.bdi, calculatedBDI: calculatedBDIPct },
      });
      setDirty(false);
      toast.success('Orçamento salvo!');
    } catch {
      toast.error('Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const [generatingProposal, setGeneratingProposal] = useState(false);

  const handleGenerateProposal = async () => {
    if (!onNavigate) return;
    setGeneratingProposal(true);
    try {
      // Save first to ensure latest numbers
      await budgetProjectService.update(project.id, {
        ...project,
        totalDirectCost,
        totalIndirectCost,
        totalBDI,
        finalPrice,
        bdi: { ...project.bdi, calculatedBDI: calculatedBDIPct },
      });

      // Fator de markup: distribui indiretos + BDI proporcionalmente sobre os
      // itens, de modo que a soma das linhas seja igual ao finalPrice (sem expor
      // o custo direto ao cliente nem divergir do total exibido).
      const markup = totalDirectCost > 0 ? finalPrice / totalDirectCost : 1;
      const newId = await proposalService.createProposal({
        clientName: project.clientName,
        proposalNumber: `PF-${new Date().getFullYear()}-${crypto.randomUUID().split('-')[0].toUpperCase().slice(0, 4)}`,
        revision: '00',
        status: ProposalStatus.DRAFT,
        validityDays: 30,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        createdBy: project.createdBy,
        technicalScope: {
          generalConsiderations: project.notes ?? '',
          references: [],
          norms: [],
          items: [],
          safetyNotes: '',
          exclusions: [],
          contractorObligations: [],
          contracteeObligations: [],
        },
        commercialProposal: {
          totalValue: finalPrice,
          paymentTerms: '',
          reajuste: '',
          guarantee: '',
          items: project.stages.flatMap(st =>
            st.items.map(i => ({
              id: i.id,
              description: i.description,
              quantity: i.quantity,
              unit: i.unit,
              unitPrice: i.unitCost * markup,
              totalPrice: i.totalCost * markup,
              source: 'engineering' as const,
            }))
          ),
        },
        scopeTitle: project.title,
      });

      // Link the proposal back to the budget
      await budgetProjectService.update(project.id, { linkedProposalId: newId });
      setDirty(false);
      toast.success('Proposta criada com sucesso!');
      onNavigate(`edit-${newId}`);
    } catch {
      toast.error('Erro ao gerar proposta.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-10">
      {/* Breadcrumb + header */}
      <div className="flex flex-col gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity w-fit"
        >
          ← Voltar aos Orçamentos
        </button>

        {/* Origin banner */}
        {project.originOpportunityId && (
          <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
            <Briefcase size={14} className="text-violet-600 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Solicitado pelo Comercial</p>
              {project.requestedBy && (
                <p className="text-xs text-violet-600 opacity-70">Responsável: {project.requestedBy}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl border border-black/5 shadow-sm p-6">
          <div className="space-y-1">
            <h1 className="text-xl font-black tracking-tight">{project.title}</h1>
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">{project.clientName}{project.address ? ` · ${project.address}` : ''}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={project.status}
              onChange={e => update({ status: e.target.value as BudgetStatus })}
              className={cn('px-3 py-2 rounded-xl text-xs font-bold border-0 focus:ring-2 focus:ring-black cursor-pointer', STATUS_COLOR[project.status])}
            >
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <BudgetPrintView
              project={project}
              totalDirectCost={totalDirectCost}
              totalIndirectCost={totalIndirectCost}
              totalBDI={totalBDI}
              finalPrice={finalPrice}
              calculatedBDIPct={calculatedBDIPct}
              byType={byType}
            />

            {project.status === BudgetStatus.APPROVED && onNavigate && (
              <button
                onClick={handleGenerateProposal}
                disabled={generatingProposal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50"
              >
                {generatingProposal
                  ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  : <FileText size={14} />}
                {generatingProposal ? 'Gerando...' : 'Gerar Proposta'}
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                dirty
                  ? 'bg-black text-white hover:bg-neutral-800 shadow-lg shadow-black/10'
                  : 'bg-black/5 text-black/30 cursor-not-allowed'
              )}
            >
              {saving ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> : dirty ? <Save size={14} /> : <Check size={14} />}
              {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo'}
            </button>
          </div>
        </div>
      </div>

      {/* Main grid: stages left, summary right */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">

        {/* ── Left: Stages ── */}
        <div className="space-y-3">
          {project.stages.length === 0 && (
            <div className="bg-white rounded-2xl border border-black/5 border-dashed p-12 text-center space-y-3">
              <p className="text-sm font-bold opacity-40">Nenhuma etapa criada.</p>
              <p className="text-xs opacity-30">Adicione etapas para organizar os itens do orçamento.</p>
            </div>
          )}

          {project.stages.map(stage => (
            <motion.div key={stage.id} layout className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
              {/* Stage header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-black/5 group">
                <button onClick={() => toggleStage(stage.id)} className="text-black/30 hover:text-black transition-colors">
                  {expandedStages.has(stage.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                {editingStageId === stage.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-sm font-bold bg-black/5 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                    value={editingStageName}
                    onChange={e => setEditingStageName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') renameStage(stage.id); if (e.key === 'Escape') setEditingStageId(null); }}
                    onBlur={() => renameStage(stage.id)}
                  />
                ) : (
                  <span className="flex-1 text-sm font-black tracking-tight">{stage.name}</span>
                )}

                <span className="text-xs font-mono font-bold opacity-50 shrink-0">
                  {stage.items.length} {stage.items.length === 1 ? 'item' : 'itens'} · {formatCurrency(calcStageTotal(stage))}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveStage(stage.id, 'up')}
                    className="p-1.5 hover:bg-black/5 rounded-lg text-black/30 hover:text-black transition-colors disabled:opacity-20"
                    title="Mover para cima"
                    disabled={project.stages.indexOf(stage) === 0}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveStage(stage.id, 'down')}
                    className="p-1.5 hover:bg-black/5 rounded-lg text-black/30 hover:text-black transition-colors disabled:opacity-20"
                    title="Mover para baixo"
                    disabled={project.stages.indexOf(stage) === project.stages.length - 1}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => duplicateStage(stage.id)}
                    className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-400 hover:text-blue-600 transition-colors"
                    title="Duplicar etapa"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => { setEditingStageId(stage.id); setEditingStageName(stage.name); }}
                    className="p-1.5 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-colors"
                    title="Renomear"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => setAddItemModal({ stageId: stage.id })}
                    className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-400 hover:text-orange-600 transition-colors"
                    title="Adicionar item"
                  >
                    <Plus size={13} />
                  </button>
                  <button
                    onClick={() => deleteStage(stage.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                    title="Excluir etapa"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Items */}
              <AnimatePresence initial={false}>
                {expandedStages.has(stage.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {stage.items.length === 0 ? (
                      <div className="px-5 py-8 text-center">
                        <p className="text-xs opacity-30 font-bold">Nenhum item. Clique em + para adicionar.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[9px] font-bold uppercase tracking-widest opacity-30 bg-black/[0.01]">
                              <th className="px-5 py-2.5">Tipo</th>
                              <th className="px-3 py-2.5">Descrição</th>
                              <th className="px-3 py-2.5 text-center">Und.</th>
                              <th className="px-3 py-2.5 text-right">Qtd.</th>
                              <th className="px-3 py-2.5 text-right">Custo Unit.</th>
                              <th className="px-3 py-2.5 text-right">Total</th>
                              <th className="px-3 py-2.5" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {stage.items.map(item => (
                              <ItemRow
                                key={item.id}
                                item={item}
                                onUpdate={patch => updateItem(stage.id, item.id, patch)}
                                onDelete={() => deleteItem(stage.id, item.id)}
                                onEdit={() => setAddItemModal({ stageId: stage.id, item })}
                                onDuplicate={() => duplicateItem(stage.id, item)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t border-black/5">
                      <button
                        onClick={() => setAddItemModal({ stageId: stage.id })}
                        className="flex items-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-700 transition-colors"
                      >
                        <Plus size={14} /> Adicionar item a "{stage.name}"
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Add stage */}
          <div className="bg-white rounded-2xl border border-black/5 border-dashed shadow-sm overflow-hidden">
            {addingStage ? (
              <div className="flex items-center gap-3 p-4">
                <input
                  autoFocus
                  className="flex-1 text-sm font-bold bg-black/5 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Nome da etapa (ex: Fundação, Elétrica...)"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addStage(); if (e.key === 'Escape') { setAddingStage(false); setNewStageName(''); } }}
                />
                <button onClick={addStage} className="px-4 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all">
                  Criar
                </button>
                <button onClick={() => { setAddingStage(false); setNewStageName(''); }} className="px-3 py-2.5 text-xs font-bold opacity-40 hover:opacity-100 transition-opacity">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingStage(true)}
                className="w-full flex items-center justify-center gap-2 p-5 text-sm font-bold text-black/30 hover:text-black hover:bg-black/[0.02] transition-all"
              >
                <Plus size={16} /> Nova Etapa
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Summary panel ── */}
        <div className="space-y-3 lg:sticky lg:top-4">
          {/* Totals */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Resumo Financeiro</p>

            {/* By type */}
            <div className="space-y-2">
              {(Object.keys(byType) as BudgetLineType[]).map(type => (
                byType[type] > 0 && (
                  <div key={type} className="flex items-center justify-between">
                    <span className={cn('flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg', TYPE_COLOR[type])}>
                      {TYPE_ICON[type]} {TYPE_LABEL[type]}
                    </span>
                    <span className="text-xs font-mono font-bold opacity-60">{formatCurrency(byType[type])}</span>
                  </div>
                )
              ))}
              {totalDirectCost === 0 && (
                <p className="text-xs opacity-30 text-center py-2">Adicione itens para ver o resumo.</p>
              )}
            </div>

            <div className="border-t border-black/5 pt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold opacity-50">Custo Direto</span>
                <span className="font-mono text-sm font-bold">{formatCurrency(totalDirectCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold opacity-50">Custos Indiretos</span>
                <span className="font-mono text-sm font-bold">{formatCurrency(totalIndirectCost)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold opacity-50">BDI ({calculatedBDIPct.toFixed(2)}%)</span>
                <span className="font-mono text-sm font-bold">{formatCurrency(totalBDI)}</span>
              </div>
            </div>

            <div className="bg-black rounded-2xl p-4 flex justify-between items-center">
              <span className="text-xs font-bold text-white/60 uppercase tracking-widest">Preço Final</span>
              <span className="font-mono text-xl font-black text-white">{formatCurrency(finalPrice)}</span>
            </div>

            {/* Margin health */}
            {finalPrice > 0 && (
              <div className={cn(
                'rounded-2xl p-4 flex items-center justify-between',
                marginPct >= 15 ? 'bg-green-50' : marginPct >= 8 ? 'bg-orange-50' : 'bg-red-50'
              )}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Margem BDI</p>
                  <p className={cn(
                    'text-2xl font-black',
                    marginPct >= 15 ? 'text-green-700' : marginPct >= 8 ? 'text-orange-600' : 'text-red-600'
                  )}>
                    {marginPct.toFixed(1)}%
                  </p>
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-1 rounded-lg',
                  marginPct >= 15 ? 'bg-green-100 text-green-700' : marginPct >= 8 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-600'
                )}>
                  {marginPct >= 15 ? 'Saudável' : marginPct >= 8 ? 'Atenção' : 'Crítico'}
                </span>
              </div>
            )}

            {/* Breakdown % */}
            {totalDirectCost > 0 && (
              <div className="space-y-1.5">
                {(Object.keys(byType) as BudgetLineType[]).map(type =>
                  byType[type] > 0 ? (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold opacity-50">
                        <span>{TYPE_LABEL[type]}</span>
                        <span>{((byType[type] / totalDirectCost) * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1 bg-black/5 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', {
                            'bg-blue-400': type === 'material',
                            'bg-orange-400': type === 'mao_de_obra',
                            'bg-purple-400': type === 'servico',
                            'bg-green-400': type === 'equipamento',
                          })}
                          style={{ width: `${(byType[type] / totalDirectCost) * 100}%` }}
                        />
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            )}
          </div>

          {/* Custos Indiretos */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowIndirectPanel(!showIndirectPanel)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.01] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings2 size={14} className="opacity-40" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Custos Indiretos</span>
              </div>
              {showIndirectPanel ? <ChevronUp size={14} className="opacity-30" /> : <ChevronDown size={14} className="opacity-30" />}
            </button>
            <AnimatePresence initial={false}>
              {showIndirectPanel && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-black/5"
                >
                  <div className="p-5 space-y-3">
                    {(Object.keys(project.indirectCosts) as (keyof BudgetIndirectCosts)[]).map(key => (
                      <IndirectRow
                        key={key}
                        label={INDIRECT_LABELS[key]}
                        value={project.indirectCosts[key]}
                        onChange={v => updateIndirectField(key, v)}
                      />
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-black/5">
                      <span className="text-xs font-bold opacity-50">Total</span>
                      <span className="text-sm font-mono font-bold">{formatCurrency(totalIndirectCost)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BDI Panel */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowBDIPanel(!showBDIPanel)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-black/[0.01] transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="opacity-40" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">BDI</span>
                <span className="text-xs font-mono font-bold text-orange-600">{calculatedBDIPct.toFixed(2)}%</span>
              </div>
              {showBDIPanel ? <ChevronUp size={14} className="opacity-30" /> : <ChevronDown size={14} className="opacity-30" />}
            </button>
            <AnimatePresence initial={false}>
              {showBDIPanel && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-black/5"
                >
                  <div className="p-5 space-y-3">
                    <div className="flex flex-wrap gap-2 pb-1">
                      {BDI_PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => update({ bdi: { ...project.bdi, ...p.bdi } })}
                          className="px-3 py-1.5 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-lg hover:bg-orange-100 transition-all"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {BDI_FIELDS.map(f => (
                      <BDIRow
                        key={f.key}
                        label={f.label}
                        hint={f.hint}
                        value={project.bdi[f.key]}
                        onChange={v => updateBDIField(f.key, v)}
                      />
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-black/5">
                      <span className="text-xs font-bold opacity-50">BDI Calculado</span>
                      <span className="text-sm font-mono font-black text-orange-600">{calculatedBDIPct.toFixed(2)}%</span>
                    </div>
                    <p className="text-[9px] opacity-30 font-bold">
                      Fórmula SINAPI: [(1+AC+SG+R)(1+DF)(1+L)/(1-I) - 1] × 100
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Save reminder */}
          {dirty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-4 bg-orange-50 border border-orange-200 rounded-2xl"
            >
              <AlertCircle size={14} className="text-orange-500 shrink-0" />
              <p className="text-[11px] font-bold text-orange-700">Há alterações não salvas.</p>
              <button onClick={handleSave} disabled={saving} className="ml-auto text-[11px] font-black text-orange-700 hover:underline">
                Salvar agora
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add item modal */}
      <AnimatePresence>
        {addItemModal && (
          <BudgetLineItemModal
            editingItem={addItemModal.item}
            onClose={() => setAddItemModal(null)}
            onAdd={item => {
              if (addItemModal.item) {
                updateItem(addItemModal.stageId, addItemModal.item.id, item);
              } else {
                addItemToStage(addItemModal.stageId, item);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ItemRow ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: BudgetLineItem;
  onUpdate: (patch: Partial<BudgetLineItem>) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

function ItemRow({ item, onUpdate, onDelete, onEdit, onDuplicate }: ItemRowProps) {
  const [editQty, setEditQty] = useState(false);
  const [editCost, setEditCost] = useState(false);

  return (
    <tr className="hover:bg-black/[0.01] transition-colors group">
      <td className="px-5 py-3">
        <span className={cn('flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded-lg w-fit', TYPE_COLOR[item.type])}>
          {TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}
        </span>
      </td>
      <td className="px-3 py-3 max-w-[200px]">
        <p className="text-xs font-bold truncate">{item.description}</p>
        {item.notes && <p className="text-[9px] opacity-30 truncate">{item.notes}</p>}
      </td>
      <td className="px-3 py-3 text-center">
        <span className="text-[10px] font-mono font-bold opacity-50 bg-black/5 px-1.5 py-0.5 rounded">{item.unit}</span>
      </td>

      {/* Editable quantity */}
      <td className="px-3 py-3 text-right">
        {editQty ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            className="w-16 text-right text-xs font-mono font-bold bg-black/5 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-black"
            defaultValue={item.quantity}
            onBlur={e => { onUpdate({ quantity: parseFloat(e.target.value) || 0 }); setEditQty(false); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditQty(false); }}
          />
        ) : (
          <button onClick={() => setEditQty(true)} className="text-xs font-mono font-bold opacity-70 hover:opacity-100 hover:underline transition-opacity">
            {item.quantity}
          </button>
        )}
      </td>

      {/* Editable unit cost */}
      <td className="px-3 py-3 text-right">
        {editCost ? (
          <input
            autoFocus
            type="number"
            step="0.01"
            className="w-24 text-right text-xs font-mono font-bold bg-black/5 px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-black"
            defaultValue={item.unitCost}
            onBlur={e => { onUpdate({ unitCost: parseFloat(e.target.value) || 0 }); setEditCost(false); }}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditCost(false); }}
          />
        ) : (
          <button onClick={() => setEditCost(true)} className="text-xs font-mono font-bold opacity-70 hover:opacity-100 hover:underline transition-opacity">
            {formatCurrency(item.unitCost)}
          </button>
        )}
      </td>

      <td className="px-3 py-3 text-right">
        <span className="text-xs font-mono font-bold">{formatCurrency(item.totalCost)}</span>
      </td>

      <td className="px-3 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onDuplicate} className="p-1 hover:bg-blue-50 rounded text-blue-300 hover:text-blue-600 transition-colors" title="Duplicar"><Copy size={11} /></button>
          <button onClick={onEdit} className="p-1 hover:bg-black/5 rounded text-black/30 hover:text-black transition-colors" title="Editar"><Edit2 size={11} /></button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded text-red-300 hover:text-red-600 transition-colors" title="Excluir"><Trash2 size={11} /></button>
        </div>
      </td>
    </tr>
  );
}

// ─── IndirectRow ─────────────────────────────────────────────────────────────

const INDIRECT_LABELS: Record<keyof BudgetIndirectCosts, string> = {
  administration: 'Administração',
  mobilization:   'Mobilização',
  transport:      'Transporte',
  food:           'Alimentação',
  lodging:        'Hospedagem',
  others:         'Outros',
};

function IndirectRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[10px] font-bold opacity-50 shrink-0">{label}</label>
      <input
        type="number"
        min="0"
        step="0.01"
        className="w-28 text-right text-xs font-mono font-bold bg-black/5 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

// ─── BDIRow ──────────────────────────────────────────────────────────────────

const BDI_FIELDS: { key: keyof Omit<BudgetBDI, 'calculatedBDI'>; label: string; hint: string }[] = [
  { key: 'centralAdmin',            label: 'Adm. Central (AC)',    hint: '%' },
  { key: 'financialExpenses',       label: 'Desp. Financeiras (DF)', hint: '%' },
  { key: 'insuranceAndGuarantees',  label: 'Seguros e Garantias (SG)', hint: '%' },
  { key: 'risks',                   label: 'Riscos (R)',            hint: '%' },
  { key: 'profit',                  label: 'Lucro (L)',             hint: '%' },
  { key: 'taxes',                   label: 'Tributos ISS/PIS (I)',  hint: '%' },
];

function BDIRow({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[10px] font-bold opacity-50 shrink-0">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          step="0.01"
          className="w-20 text-right text-xs font-mono font-bold bg-black/5 px-2 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        <span className="text-[10px] opacity-30 font-bold">{hint}</span>
      </div>
    </div>
  );
}
