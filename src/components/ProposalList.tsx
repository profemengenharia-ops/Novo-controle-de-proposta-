import React, { useEffect, useState } from 'react';
import { proposalService } from '../services/proposalService';
import { useAuth } from '../hooks/useAuth';
import { Proposal, ProposalStatus, ProposalInteraction } from '../types';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  Edit, 
  Trash2,
  Bell,
  MessageSquare,
  Download,
  History,
  Send,
  Plus,
  X,
  AlertCircle,
  FileText,
  Briefcase,
  ClipboardList,
  Layout,
  CheckCircle2,
  Target,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { STATUS_TAGS } from '../constants';
import { toast } from 'sonner';

interface ProposalListProps {
  onEdit: (id: string) => void;
}

export function ProposalList({ onEdit }: ProposalListProps) {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [interactionId, setInteractionId] = useState<string | null>(null);
  const [interactionNote, setInteractionNote] = useState('');
  const [activeActionsMenu, setActiveActionsMenu] = useState<string | null>(null);
  const [lossReasonProposalId, setLossReasonProposalId] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState('');
  const [activeTab, setActiveTab] = useState<Record<string, 'overview' | 'technical' | 'commercial' | 'history'>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const setProposalTab = (id: string, tab: 'overview' | 'technical' | 'commercial' | 'history') => {
    setActiveTab(prev => ({ ...prev, [id]: tab }));
  };

  useEffect(() => {
    async function load() {
      const data = await proposalService.getAllProposals();
      setProposals(data);
    }
    load();
  }, []);

  const filteredProposals = proposals.filter(p => {
    const searchTerm = filter.toLowerCase();
    const matchesSearch = p.clientName.toLowerCase().includes(searchTerm) || 
                         p.proposalNumber.toLowerCase().includes(searchTerm) ||
                         (p.scopeTitle || '').toLowerCase().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await proposalService.deleteProposal(confirmDeleteId);
      setProposals(proposals.filter(p => p.id !== confirmDeleteId));
      toast.success('Proposta excluída.');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir proposta.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const handleAddInteraction = async (id: string) => {
    if (!interactionNote.trim()) return;
    const newInteraction: ProposalInteraction = {
      id: crypto.randomUUID().split('-')[0],
      createdAt: new Date().toISOString(),
      note: interactionNote,
      user: user?.email || 'Vendedor'
    };
    
    const p = proposals.find(p => p.id === id);
    if (p) {
      const newInteractions = [...(p.interactions || []), newInteraction];
      await proposalService.updateProposal(id, {
        interactions: newInteractions
      });
      setProposals(proposals.map(item => item.id === id ? { ...item, interactions: newInteractions } : item));
    }
    setInteractionNote('');
    setInteractionId(null);
  };

  const handleDuplicateWithRevision = async (p: Proposal) => {
    const { id, createdAt, updatedAt, ...rest } = p;
    const baseRev = parseInt(rest.revision);
    const nextRev = String((Number.isFinite(baseRev) ? baseRev : 0) + 1).padStart(2, '0');
    const newProposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'> = {
      ...rest,
      revision: nextRev,
      status: ProposalStatus.DRAFT,
    };
    try {
      const newId = await proposalService.createProposal(newProposal);
      const createdProposal = await proposalService.getProposal(newId);
      if (createdProposal) {
        setProposals([createdProposal, ...proposals]);
      }
      toast.success(`Revisão ${nextRev} gerada com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao duplicar proposta.');
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: ProposalStatus) => {
    if (newStatus === ProposalStatus.LOST) {
      setLossReasonProposalId(id);
      return;
    }

    const p = proposals.find(p => p.id === id);
    if (p) {
      await proposalService.updateProposal(id, { status: newStatus });
      setProposals(proposals.map(item => item.id === id ? { ...item, status: newStatus } : item));
    }
  };

  const handleSaveLossReason = async () => {
    if (!lossReasonProposalId) return;
    const p = proposals.find(p => p.id === lossReasonProposalId);
    if (p) {
      const updates = { 
        status: ProposalStatus.LOST, 
        lossReason: lossReason 
      };
      await proposalService.updateProposal(lossReasonProposalId, updates);
      setProposals(proposals.map(item => item.id === lossReasonProposalId ? { ...item, ...updates } : item));
    }
    setLossReason('');
    setLossReasonProposalId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/40" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, número ou título..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full pl-12 pr-10 py-4 bg-white rounded-2xl border border-black/5 shadow-md focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-none text-sm transition-all placeholder:text-black/20"
          />
          {filter && (
            <button 
              onClick={() => setFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-orange-50 rounded-lg text-orange-400 hover:text-orange-600 transition-all"
              title="Limpar busca"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <Filter size={18} className="text-black/40" />
              <select 
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-white border border-black/5 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none shadow-sm"
              >
                <option value="all">Todos os Status</option>
                {Object.entries(STATUS_TAGS).map(([val, tag]) => (
                  <option key={val} value={val}>{tag.label}</option>
                ))}
              </select>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead className="bg-black/[0.02]">
            <tr className="text-[10px] font-bold uppercase tracking-widest opacity-40">
              <th className="px-8 py-4">ID & Rev</th>
              <th className="px-8 py-4">Cliente / Escopo</th>
              <th className="px-8 py-4">Valor</th>
              <th className="px-8 py-4 text-center">Status Comercial</th>
              <th className="px-8 py-4">Próximo Follow-up</th>
              <th className="px-8 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filteredProposals.map((p) => (
              <React.Fragment key={p.id}>
                <tr className={cn(
                  "group transition-colors",
                  expandedId === p.id ? "bg-black/[0.01]" : "hover:bg-black/[0.01] cursor-pointer"
                )} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-bold leading-none tracking-tighter opacity-80">{p.proposalNumber}</span>
                      <span className="text-[10px] opacity-40 font-bold mt-1">RV.{p.revision}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                     <div className="flex flex-col max-w-[200px]">
                       <span className="font-bold text-sm tracking-tight truncate">{p.clientName}</span>
                       <span className="text-[10px] opacity-40 uppercase truncate font-medium">{p.scopeTitle || 'Serviços de Engenharia'}</span>
                     </div>
                  </td>
                  <td className="px-8 py-5 font-bold text-sm">
                    {formatCurrency(p.commercialProposal?.totalValue || 0)}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <select 
                      value={p.status}
                      onChange={(e) => handleStatusUpdate(p.id, e.target.value as ProposalStatus)}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-tight px-3 py-1 rounded-full border-none cursor-pointer focus:ring-2 focus:ring-[var(--color-brand-primary)]",
                        STATUS_TAGS[p.status]?.color
                      )}
                    >
                      {Object.entries(ProposalStatus).map(([key, val]) => (
                        <option key={key} value={val}>{STATUS_TAGS[val as ProposalStatus]?.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-8 py-5">
                     <div className={cn(
                       "flex items-center gap-2 text-xs font-medium",
                       isOverdue(p.followUpDate) ? "text-red-500" : "opacity-60"
                     )}>
                       <Bell size={14} className={isOverdue(p.followUpDate) ? "animate-bounce" : ""} />
                       {p.followUpDate ? formatDate(p.followUpDate) : 'Não agendado'}
                     </div>
                  </td>
                  <td className="px-8 py-5 text-right relative">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); setActiveActionsMenu(activeActionsMenu === p.id ? null : p.id) }}
                        className="p-2 hover:bg-black/5 rounded-lg text-black/60 transition-all"
                       >
                         <MoreVertical size={18} />
                       </button>

                       {activeActionsMenu === p.id && (
                         <div 
                          className="absolute right-8 top-16 bg-white border border-black/5 shadow-2xl rounded-xl py-2 w-56 z-50 animate-in fade-in zoom-in-95"
                          onClick={(e) => e.stopPropagation()}
                         >
                            <button onClick={() => { onEdit(p.id); setActiveActionsMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-black/5 font-bold transition-colors">
                              <Edit size={14} className="opacity-40" /> Editar Proposta
                            </button>
                            <button onClick={() => handleDuplicateWithRevision(p)} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-black/5 font-bold transition-colors">
                              <History size={14} className="opacity-40" /> Gerar Nova Revisão
                            </button>
                            <button onClick={() => window.open(`/proposal/${p.id}`, '_blank')} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-black/5 font-bold transition-colors">
                              <ExternalLink size={14} className="opacity-40" /> Copiar Link Público
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-black/5 font-bold transition-colors">
                              <Download size={14} className="opacity-40" /> Baixar PDF
                            </button>
                            <button onClick={() => { setInteractionId(p.id); setActiveActionsMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] font-bold transition-colors">
                              <MessageSquare size={14} className="opacity-40" /> Registrar Interação
                            </button>
                            <div className="h-[1px] bg-black/5 my-1" />
                            <button onClick={() => handleDelete(p.id)} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-red-50 text-red-600 font-bold transition-colors">
                              <Trash2 size={14} className="opacity-40" /> Excluir
                            </button>
                         </div>
                       )}
                    </div>
                  </td>
                </tr>

                {/* Expanded Row: Detailed View */}
                <AnimatePresence>
                  {expandedId === p.id && (
                    <motion.tr 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-neutral-50/50"
                    >
                      <td colSpan={6} className="px-8 py-8">
                        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xl overflow-hidden">
                          {/* Inner Tabs Header */}
                          <div className="flex border-b border-neutral-100 bg-neutral-50/30">
                            {[
                              { id: 'overview', label: 'Visão Geral', icon: Layout },
                              { id: 'technical', label: 'Escopo Técnico', icon: ClipboardList },
                              { id: 'commercial', label: 'Comercial', icon: Briefcase },
                              { id: 'history', label: 'Interações', icon: MessageSquare },
                            ].map((tab) => {
                              const isActive = (activeTab[p.id] || 'overview') === tab.id;
                              const Icon = tab.icon;
                              return (
                                <button
                                  key={tab.id}
                                  onClick={(e) => { e.stopPropagation(); setProposalTab(p.id, tab.id as any); }}
                                  className={cn(
                                    "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative",
                                    isActive ? "text-neutral-900 border-b-2 border-orange-500" : "text-neutral-400 hover:text-neutral-600"
                                  )}
                                >
                                  <Icon size={14} className={isActive ? "text-orange-500" : ""} />
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="p-8">
                            <AnimatePresence mode="wait">
                              {/* Overview Tab */}
                              {(activeTab[p.id] || 'overview') === 'overview' && (
                                <motion.div 
                                  key="overview"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="grid grid-cols-1 md:grid-cols-3 gap-8"
                                >
                                  <div className="space-y-6">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Cliente</p>
                                      <p className="text-lg font-black text-neutral-900">{p.clientName}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Título do Projeto</p>
                                      <p className="text-sm font-bold text-neutral-700">{p.scopeTitle || 'Serviços de Engenharia'}</p>
                                    </div>
                                    <div className="pt-4 flex gap-4">
                                      <div className="p-4 bg-blue-50 rounded-2xl flex-1">
                                        <p className="text-[8px] font-black uppercase text-blue-500 mb-1">Criado em</p>
                                        <p className="text-xs font-bold">{formatDate(p.createdAt)}</p>
                                      </div>
                                      <div className="p-4 bg-orange-50 rounded-2xl flex-1">
                                        <p className="text-[8px] font-black uppercase text-orange-500 mb-1">Validade</p>
                                        <p className="text-xs font-bold">{p.validityDays} dias</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-6 md:col-span-2">
                                    <div className="p-6 bg-neutral-50 rounded-2xl border border-neutral-100">
                                      <div className="flex items-center gap-2 mb-4">
                                        <FileText size={16} className="text-neutral-400" />
                                        <h5 className="text-[10px] font-black uppercase tracking-widest">Resumo Operacional</h5>
                                      </div>
                                      <p className="text-sm text-neutral-600 leading-relaxed italic">
                                        "{p.technicalScope?.generalConsiderations || 'Nenhuma consideração geral registrada para esta proposta.'}"
                                      </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-4 border border-neutral-100 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                          <Target size={20} />
                                        </div>
                                        <div>
                                          <p className="text-[8px] font-black uppercase text-neutral-400">Probabilidade</p>
                                          <p className="text-sm font-bold">Alta (IA Calc)</p>
                                        </div>
                                      </div>
                                      <div className="p-4 border border-neutral-100 rounded-2xl flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                                          <Calendar size={20} />
                                        </div>
                                        <div>
                                          <p className="text-[8px] font-black uppercase text-neutral-400">Prazo Estimado</p>
                                          <p className="text-sm font-bold">{p.deadline || 'A definir'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* Technical Scope Tab */}
                              {(activeTab[p.id] || 'overview') === 'technical' && (
                                <motion.div 
                                  key="technical"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-8"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                      <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Itens Inclusos no Escopo</h5>
                                      <div className="space-y-2">
                                        {p.technicalScope?.items?.map((item, idx) => (
                                          <div key={idx} className="flex gap-3 p-3 rounded-xl hover:bg-neutral-50 transition-colors">
                                            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                                            <div>
                                              <p className="text-[8px] font-black uppercase text-neutral-400">{item.category}</p>
                                              <p className="text-xs font-medium text-neutral-700">{item.description}</p>
                                            </div>
                                          </div>
                                        ))}
                                        {(!p.technicalScope?.items || p.technicalScope.items.length === 0) && (
                                          <p className="text-xs opacity-40 italic">Nenhum item detalhado.</p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-6">
                                      <div className="space-y-4">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Normas de Referência</h5>
                                        <div className="flex flex-wrap gap-2">
                                          {p.technicalScope?.norms?.map((norm, idx) => (
                                            <span key={idx} className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-[9px] font-bold uppercase tracking-wider">
                                              {norm}
                                            </span>
                                          ))}
                                          {(!p.technicalScope?.norms || p.technicalScope.norms.length === 0) && (
                                            <p className="text-xs opacity-40 italic">Nenhuma norma especificada.</p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-4 pt-4">
                                        <h5 className="text-[10px] font-black uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">Exclusões de Escopo</h5>
                                        <ul className="space-y-1">
                                          {p.technicalScope?.exclusions?.map((ex, idx) => (
                                            <li key={idx} className="text-xs text-red-500/70 font-medium flex items-center gap-2">
                                              <X size={12} /> {ex}
                                            </li>
                                          ))}
                                          {(!p.technicalScope?.exclusions || p.technicalScope.exclusions.length === 0) && (
                                            <p className="text-xs opacity-40 italic">Nenhuma exclusão relevante.</p>
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* Commercial Tab */}
                              {(activeTab[p.id] || 'overview') === 'commercial' && (
                                <motion.div 
                                  key="commercial"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="space-y-8"
                                >
                                  <div className="overflow-hidden border border-neutral-100 rounded-2xl">
                                    <table className="w-full">
                                      <thead className="bg-neutral-50">
                                        <tr className="text-[8px] font-black uppercase tracking-[0.2em] text-neutral-400">
                                          <th className="px-6 py-3 text-left">Item Descritivo</th>
                                          <th className="px-6 py-3 text-center">Qtd / Un</th>
                                          <th className="px-6 py-3 text-right">Unitário</th>
                                          <th className="px-6 py-3 text-right">Total Item</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-neutral-50">
                                        {p.commercialProposal?.items?.map((item, idx) => (
                                          <tr key={idx} className="hover:bg-neutral-50/50">
                                            <td className="px-6 py-4 text-xs font-bold text-neutral-700">{item.description}</td>
                                            <td className="px-6 py-4 text-center text-xs font-medium text-neutral-500">{item.quantity} {item.unit}</td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-neutral-500">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-6 py-4 text-right text-xs font-black text-neutral-900">{formatCurrency(item.totalPrice)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-orange-50/50">
                                          <td colSpan={3} className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-neutral-500">Valor Total da Proposta</td>
                                          <td className="px-6 py-4 text-right text-base font-black text-[var(--color-brand-primary)]">
                                            {formatCurrency(p.commercialProposal?.totalValue || 0)}
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-5 bg-neutral-50 rounded-2xl space-y-1">
                                      <p className="text-[8px] font-black uppercase text-neutral-400">Condições de Pagamento</p>
                                      <p className="text-xs font-bold text-neutral-700">{p.commercialProposal?.paymentTerms || 'Conforme política da empresa'}</p>
                                    </div>
                                    <div className="p-5 bg-neutral-50 rounded-2xl space-y-1">
                                      <p className="text-[8px] font-black uppercase text-neutral-400">Validade dos Preços</p>
                                      <p className="text-xs font-bold text-neutral-700">{p.validityDays} dias consecutivos</p>
                                    </div>
                                    <div className="p-5 bg-neutral-50 rounded-2xl space-y-1">
                                      <p className="text-[8px] font-black uppercase text-neutral-400">Garantia / Suporte</p>
                                      <p className="text-xs font-bold text-neutral-700">{p.commercialProposal?.guarantee || '12 meses contra defeitos'}</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* History Tab */}
                              {(activeTab[p.id] || 'overview') === 'history' && (
                                <motion.div 
                                  key="history"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="max-w-3xl mx-auto space-y-6"
                                >
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Registro de Atividades</h5>
                                    <button 
                                      onClick={() => setInteractionId(p.id)}
                                      className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"
                                    >
                                      <Plus size={12} /> Adicionar Interação
                                    </button>
                                  </div>

                                  <div className="relative pl-6 border-l-2 border-neutral-100 space-y-8">
                                    {(p.interactions || []).length > 0 ? (
                                      (p.interactions || []).map((int, i) => (
                                        <div key={i} className="relative">
                                          <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-white border-2 border-orange-500 shadow-sm" />
                                          <div className="bg-neutral-50 p-5 rounded-2xl space-y-2 border border-neutral-100">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[8px] font-bold">
                                                  {int.user.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-900">{int.user}</span>
                                              </div>
                                              <span className="text-[10px] font-bold text-neutral-400">{formatDate(int.createdAt)}</span>
                                            </div>
                                            <p className="text-xs font-medium text-neutral-600 leading-relaxed">
                                              {int.note}
                                            </p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="py-12 text-center">
                                        <MessageSquare size={32} className="mx-auto text-neutral-200 mb-4" />
                                        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Nenhuma atividade registrada</p>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ))}
          </tbody>
        </table>
        
        {filteredProposals.length === 0 && (
          <div className="p-20 text-center space-y-4">
             <div className="mx-auto w-16 h-16 bg-black/5 rounded-full flex items-center justify-center opacity-40">
               <Search size={32} />
             </div>
             <p className="text-sm font-medium opacity-40">Nenhuma proposta encontrada com estes critérios.</p>
          </div>
        )}
      </div>

      {/* Interaction Modal */}
      {interactionId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6"
          >
            <div className="space-y-1">
               <h3 className="text-xl font-bold tracking-tight">Registrar Interação</h3>
               <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-none">Proposta #{proposals.find(p => p.id === interactionId)?.proposalNumber}</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Sua Anotação</label>
              <textarea 
                value={interactionNote}
                onChange={e => setInteractionNote(e.target.value)}
                autoFocus
                placeholder="Ex: Liguei para o cliente, ele pediu para retornar na sexta..."
                className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm transition-all"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-4">
               <button 
                onClick={() => setInteractionId(null)}
                className="flex-1 py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
               >
                 Cancelar
               </button>
               <button 
                onClick={() => handleAddInteraction(interactionId)}
                className="flex-[2] py-3 bg-[var(--color-brand-primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-primary)]/20 hover:opacity-90 transition-all"
               >
                 Salvar Nota <Send size={16} />
               </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loss Reason Modal */}
      {lossReasonProposalId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6"
          >
            <div className="space-y-1">
               <h3 className="text-xl font-bold tracking-tight text-red-600">Por que perdemos esta proposta?</h3>
               <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-none">Ajude a IA a analisar os motivos e melhorar a conversão</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Motivo da Perda</label>
              <select 
                value={lossReason}
                onChange={e => setLossReason(e.target.value)}
                className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
              >
                <option value="">Selecione um motivo...</option>
                <option value="Preço alto">Preço alto / Concorrência</option>
                <option value="Prazo de entrega">Prazo de entrega não atendido</option>
                <option value="Escopo técnico">Falta de conformidade técnica</option>
                <option value="Relacionamento">Perda por relacionamento / Indicação</option>
                <option value="Cancelado">Projeto cancelado pelo cliente</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
               <button 
                onClick={() => setLossReasonProposalId(null)}
                className="flex-1 py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
               >
                 Cancelar
               </button>
               <button 
                onClick={handleSaveLossReason}
                disabled={!lossReason}
                className="flex-[2] py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50"
               >
                 Confirmar Perda <AlertCircle size={16} />
               </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertCircle size={24} className="text-red-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg">Excluir proposta?</h3>
                  <p className="text-xs opacity-60">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-[2] py-3 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
