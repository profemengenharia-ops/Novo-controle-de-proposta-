import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, X, Search, Users, Briefcase, Activity,
  Phone, Mail, MapPin, Building2, ChevronRight,
  Send, ClipboardList, FileText, CheckCircle2,
  Clock, AlertCircle, Trash2, Edit2, Check,
  TrendingUp, Eye, ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  CRMClient, CRMOpportunity, BudgetProject, BudgetStatus,
  ProposalStatus, Proposal,
} from '../types';
import { crmService } from '../services/crmService';
import { budgetProjectService } from '../services/budgetProjectService';
import { proposalService } from '../services/proposalService';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { confirmAction } from '../hooks/useConfirm';

// ─── Types ────────────────────────────────────────────────────────────────────

type HubTab = 'clientes' | 'obras' | 'monitoramento';

interface Props {
  onNavigate?: (tab: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  prospecting:   'Prospecção',
  qualification: 'Qualificação',
  proposal:      'Proposta',
  negotiation:   'Negociação',
  won:           'Ganho',
  lost:          'Perdido',
};

const STAGE_COLOR: Record<string, string> = {
  prospecting:   'bg-slate-100 text-slate-600',
  qualification: 'bg-violet-50 text-violet-700',
  proposal:      'bg-blue-50 text-blue-700',
  negotiation:   'bg-amber-50 text-amber-700',
  won:           'bg-green-50 text-green-700',
  lost:          'bg-red-50 text-red-500',
};

const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]:      'Em Elaboração',
  [BudgetStatus.APPROVED]:   'Pronto',
  [BudgetStatus.EXECUTING]:  'Em Execução',
  [BudgetStatus.COMPLETED]:  'Concluído',
  [BudgetStatus.CANCELLED]:  'Cancelado',
};

const BUDGET_STATUS_COLOR: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]:      'bg-amber-50 text-amber-700 border-amber-200',
  [BudgetStatus.APPROVED]:   'bg-green-50 text-green-700 border-green-200',
  [BudgetStatus.EXECUTING]:  'bg-blue-50 text-blue-700 border-blue-200',
  [BudgetStatus.COMPLETED]:  'bg-neutral-100 text-neutral-600 border-neutral-200',
  [BudgetStatus.CANCELLED]:  'bg-red-50 text-red-500 border-red-200',
};

const SERVICE_TYPES = [
  'Hidráulica',
  'PPCI / Incêndio',
  'Elétrica',
  'Civil / Estrutural',
  'Fornecimento de Materiais',
  'Consultoria / Projeto',
  'Manutenção Preventiva',
  'Outros',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function Avatar({ name, size = 'md', color = 'bg-neutral-900' }: { name: string; size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const sz = size === 'sm' ? 'w-8 h-8 text-[10px]' : size === 'md' ? 'w-10 h-10 text-xs' : 'w-14 h-14 text-base';
  return (
    <div className={cn('rounded-xl flex items-center justify-center font-black shrink-0 text-white', sz, color)}>
      {initials(name)}
    </div>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────────────────

interface ClientModalProps {
  client?: CRMClient | null;
  onClose: () => void;
  onSave: () => void;
}

function ClientModal({ client, onClose, onSave }: ClientModalProps) {
  const [form, setForm] = useState({
    name:    client?.name    ?? '',
    email:   client?.email   ?? '',
    phone:   client?.phone   ?? '',
    company: client?.company ?? '',
    segment: client?.segment ?? '',
    city:    client?.city    ?? '',
    notes:   client?.notes   ?? '',
  });
  const [saving, setSaving] = useState(false);

  const setF = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      if (client) {
        await crmService.updateClient(client.id, form);
        toast.success('Cliente atualizado');
      } else {
        await crmService.createClient(form);
        toast.success('Cliente cadastrado');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Erro ao salvar cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-8 pt-8 pb-6 bg-neutral-900 text-white flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">{client ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Cadastro de cliente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Nome / Razão Social *</label>
              <input required value={form.name} onChange={setF('name')} placeholder="Ex: Indústria ABC Ltda"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">E-mail</label>
              <input type="email" value={form.email} onChange={setF('email')} placeholder="contato@empresa.com"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Telefone</label>
              <input value={form.phone} onChange={setF('phone')} placeholder="(11) 99999-0000"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Segmento</label>
              <select value={form.segment} onChange={setF('segment')}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400">
                <option value="">— Selecionar —</option>
                {['Indústria','Construção Civil','Varejo','Saúde','Educação','Governo','Outros'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Cidade</label>
              <input value={form.city} onChange={setF('city')} placeholder="São Paulo"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Observações</label>
              <textarea value={form.notes} onChange={setF('notes')} rows={2} placeholder="Notas sobre o cliente..."
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-[2] py-3 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50 transition-colors">
              {saving ? 'Salvando…' : client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Obra Modal ───────────────────────────────────────────────────────────────

interface ObraModalProps {
  clients: CRMClient[];
  defaultClientName?: string;
  createdBy: string;
  onClose: () => void;
  onSave: () => void;
}

function ObraModal({ clients, defaultClientName, createdBy, onClose, onSave }: ObraModalProps) {
  const [form, setForm] = useState({
    clientName:   defaultClientName ?? '',
    title:        '',
    serviceType:  SERVICE_TYPES[0],
    notes:        '',
    requestBudget: true,
  });
  const [saving, setSaving] = useState(false);
  const [showClientSugg, setShowClientSugg] = useState(false);

  const clientSugg = form.clientName.length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(form.clientName.toLowerCase())).slice(0, 5)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.clientName.trim()) {
      toast.error('Cliente e título são obrigatórios');
      return;
    }
    setSaving(true);
    try {
      const oppId = await crmService.createOpportunity({
        title: form.title,
        clientName: form.clientName,
        value: 0,
        stage: 'prospecting',
        probability: 20,
        notes: form.notes,
        createdBy,
      });

      if (form.requestBudget) {
        const budgetId = await budgetProjectService.create(
          {
            title: form.title,
            clientName: form.clientName,
            address: '',
            responsible: '',
            notes: `Tipo: ${form.serviceType}${form.notes ? `\n${form.notes}` : ''}\n\nSolicitação via Central Comercial.`,
            originOpportunityId: oppId,
            requestedBy: createdBy,
          },
          createdBy,
        );
        await crmService.updateOpportunity(oppId, { linkedBudgetId: budgetId });
        toast.success('Obra registrada e solicitação de orçamento enviada!');
      } else {
        toast.success('Obra registrada no funil comercial!');
      }

      onSave();
      onClose();
    } catch {
      toast.error('Erro ao registrar obra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="px-8 pt-8 pb-6 bg-orange-500 text-white flex items-start justify-between">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tight">Nova Obra / Solicitação</h3>
            <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">Registrar escopo e cliente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {/* Client */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Cliente *</label>
            <div className="relative">
              <input
                required
                value={form.clientName}
                onChange={e => { setForm(f => ({ ...f, clientName: e.target.value })); setShowClientSugg(true); }}
                onFocus={() => setShowClientSugg(true)}
                onBlur={() => setTimeout(() => setShowClientSugg(false), 150)}
                placeholder="Nome do cliente ou empresa"
                autoComplete="off"
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
              />
              {showClientSugg && clientSugg.length > 0 && (
                <div className="absolute z-20 top-full mt-1.5 w-full bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden">
                  {clientSugg.map(c => (
                    <button key={c.id} type="button"
                      onMouseDown={() => { setForm(f => ({ ...f, clientName: c.name })); setShowClientSugg(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 text-left border-b last:border-0 border-black/5"
                    >
                      <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center text-orange-700 font-black text-[10px] shrink-0">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{c.name}</p>
                        {(c.segment || c.city) && (
                          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">
                            {[c.segment, c.city].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Nome da Obra / Escopo *</label>
            <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Reforma Hidráulica Galpão Norte"
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" />
          </div>

          {/* Service type */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Tipo de Serviço</label>
            <select value={form.serviceType} onChange={e => setForm(f => ({ ...f, serviceType: e.target.value }))}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400">
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Observações do Escopo</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              placeholder="Descreva detalhes do serviço, localização, urgência..."
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 resize-none" />
          </div>

          {/* Request budget toggle */}
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, requestBudget: !f.requestBudget }))}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
              form.requestBudget
                ? 'border-orange-400 bg-orange-50'
                : 'border-neutral-200 bg-white hover:border-neutral-300',
            )}
          >
            <div className={cn('w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
              form.requestBudget ? 'border-orange-500 bg-orange-500' : 'border-neutral-300')}>
              {form.requestBudget && <Check size={12} className="text-white" />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-neutral-800">Enviar solicitação de orçamento</p>
              <p className="text-[10px] text-neutral-400 font-medium mt-0.5">A equipe de orçamentos receberá esta solicitação automaticamente</p>
            </div>
          </button>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-[2] py-3 rounded-xl bg-orange-500 text-white text-xs font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {saving ? 'Registrando…' : 'Registrar Obra'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab({
  clients, opportunities, onUpdate, onNewObra,
}: {
  clients: CRMClient[];
  opportunities: CRMOpportunity[];
  onUpdate: () => void;
  onNewObra: (clientName: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState<CRMClient | null>(null);

  const filtered = useMemo(() =>
    clients.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.segment?.toLowerCase().includes(search.toLowerCase()) ||
      c.city?.toLowerCase().includes(search.toLowerCase())
    ),
  [clients, search]);

  const oppsByClient = useMemo(() => {
    const map: Record<string, number> = {};
    opportunities.forEach(o => { map[o.clientName] = (map[o.clientName] ?? 0) + 1; });
    return map;
  }, [opportunities]);

  const handleDelete = async (c: CRMClient) => {
    const ok = await confirmAction({ title: 'Excluir cliente?', description: 'O histórico de obras vinculadas permanecerá.', confirmLabel: 'Excluir' });
    if (!ok) return;
    await crmService.deleteClient(c.id);
    onUpdate();
    toast.success('Cliente removido');
  };

  const COLORS = ['bg-orange-500','bg-violet-600','bg-blue-600','bg-green-600','bg-red-500','bg-amber-500'];
  const colorFor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
        </div>
        <button
          onClick={() => { setEditClient(null); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-colors"
        >
          <Plus size={14} /> Novo Cliente
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-16 text-center">
          <Users size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold opacity-40">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow group">
              <div className="flex items-start gap-3">
                <Avatar name={c.name} color={colorFor(c.name)} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black tracking-tight truncate">{c.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.segment && (
                      <span className="px-2 py-0.5 bg-neutral-100 text-neutral-600 rounded-full text-[9px] font-black uppercase tracking-widest">{c.segment}</span>
                    )}
                    {c.city && (
                      <span className="flex items-center gap-0.5 text-[10px] text-neutral-400 font-bold">
                        <MapPin size={9} />{c.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditClient(c); setShowModal(true); }}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(c)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {c.email && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Mail size={11} className="shrink-0 text-neutral-300" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <Phone size={11} className="shrink-0 text-neutral-300" />
                    <span>{c.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  <Briefcase size={11} />
                  {oppsByClient[c.name] ?? 0} obra{(oppsByClient[c.name] ?? 0) !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => onNewObra(c.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
                >
                  <Plus size={11} /> Nova Obra
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <ClientModal
            client={editClient}
            onClose={() => { setShowModal(false); setEditClient(null); }}
            onSave={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Obras Tab ────────────────────────────────────────────────────────────────

interface WorkRowData {
  opp: CRMOpportunity;
  budget: BudgetProject | null;
  proposal: Proposal | null;
}

function ObrasTab({
  opps, budgets, proposals, clients, createdBy, onUpdate, onNavigate,
}: {
  opps: CRMOpportunity[];
  budgets: BudgetProject[];
  proposals: Proposal[];
  clients: CRMClient[];
  createdBy: string;
  onUpdate: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [defaultClient, setDefaultClient] = useState('');
  const [requesting, setRequesting] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const rows = useMemo((): WorkRowData[] =>
    opps.map(opp => ({
      opp,
      budget: budgets.find(b => b.id === opp.linkedBudgetId) ?? null,
      proposal: proposals.find(p => p.id === opp.linkedProposalId) ?? null,
    })),
  [opps, budgets, proposals]);

  const filtered = useMemo(() =>
    rows.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = !search || r.opp.title.toLowerCase().includes(q) || r.opp.clientName.toLowerCase().includes(q);
      const matchClient = !clientFilter || r.opp.clientName === clientFilter;
      return matchSearch && matchClient;
    }).sort((a, b) => new Date(b.opp.updatedAt).getTime() - new Date(a.opp.updatedAt).getTime()),
  [rows, search, clientFilter]);

  const uniqueClients = useMemo(() => [...new Set(opps.map(o => o.clientName))].sort(), [opps]);

  const handleRequestBudget = async (opp: CRMOpportunity) => {
    setRequesting(opp.id);
    try {
      const budgetId = await budgetProjectService.create(
        { title: opp.title, clientName: opp.clientName, address: '', responsible: '', notes: `Solicitação via Central Comercial.`, originOpportunityId: opp.id, requestedBy: createdBy },
        createdBy,
      );
      await crmService.updateOpportunity(opp.id, { linkedBudgetId: budgetId });
      onUpdate();
      toast.success('Solicitação enviada para a equipe de orçamentos!');
    } catch {
      toast.error('Erro ao solicitar orçamento');
    } finally {
      setRequesting(null);
    }
  };

  const handleGenerateProposal = async (row: WorkRowData) => {
    if (!row.budget || !onNavigate) return;
    setGenerating(row.opp.id);
    try {
      await budgetProjectService.update(row.budget.id, {
        ...row.budget,
        totalDirectCost: row.budget.totalDirectCost,
        totalIndirectCost: row.budget.totalIndirectCost,
        totalBDI: row.budget.totalBDI,
        finalPrice: row.budget.finalPrice,
      });

      // Distribui indiretos + BDI proporcionalmente sobre os itens, para que a
      // soma das linhas iguale o finalPrice sem expor o custo direto ao cliente.
      const markup = row.budget.totalDirectCost > 0 ? row.budget.finalPrice / row.budget.totalDirectCost : 1;
      const newId = await proposalService.createProposal({
        clientName: row.opp.clientName,
        proposalNumber: `PF-${new Date().getFullYear()}-${crypto.randomUUID().split('-')[0].toUpperCase().slice(0, 4)}`,
        revision: '00',
        status: ProposalStatus.DRAFT,
        validityDays: 30,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        createdBy,
        vendorId: row.opp.vendorId,
        technicalScope: {
          generalConsiderations: row.budget.notes ?? '',
          references: [], norms: [], items: [], safetyNotes: '', exclusions: [],
          contractorObligations: [], contracteeObligations: [],
        },
        commercialProposal: {
          totalValue: row.budget.finalPrice,
          paymentTerms: '', reajuste: '', guarantee: '',
          items: row.budget.stages.flatMap(st => st.items.map(i => ({
            id: i.id, description: i.description, quantity: i.quantity, unit: i.unit,
            unitPrice: i.unitCost * markup, totalPrice: i.totalCost * markup, source: 'engineering' as const,
          }))),
        },
        scopeTitle: row.opp.title,
      });

      await budgetProjectService.update(row.budget.id, { linkedProposalId: newId });
      await crmService.updateOpportunity(row.opp.id, { linkedProposalId: newId, stage: 'proposal' });
      onUpdate();
      toast.success('Proposta criada! Redirecionando...');
      onNavigate(`edit-${newId}`);
    } catch {
      toast.error('Erro ao gerar proposta');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar obra..."
              className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
          </div>
          <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
            className="border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400 max-w-[200px]">
            <option value="">Todos os clientes</option>
            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setDefaultClient(''); setShowModal(true); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
        >
          <Plus size={14} /> Nova Obra
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-16 text-center">
          <Briefcase size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-bold opacity-40">Nenhuma obra registrada</p>
          <p className="text-xs opacity-30 mt-1">Cadastre obras e envie solicitações de orçamento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ opp, budget, proposal }) => (
            <div key={opp.id} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <div className="flex items-start gap-4 flex-wrap">
                {/* Left: info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest', STAGE_COLOR[opp.stage])}>
                      {STAGE_LABEL[opp.stage]}
                    </span>
                    <h3 className="text-sm font-black tracking-tight">{opp.title}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-bold">
                    <Building2 size={12} />
                    <span>{opp.clientName}</span>
                  </div>
                </div>

                {/* Right: budget + proposal status */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {/* Budget status */}
                  {budget ? (
                    <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest', BUDGET_STATUS_COLOR[budget.status])}>
                      <ClipboardList size={11} />
                      {BUDGET_STATUS_LABEL[budget.status]}
                      {budget.finalPrice > 0 && ` · ${formatCurrency(budget.finalPrice)}`}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 text-[10px] font-black uppercase tracking-widest">
                      <Clock size={11} />
                      Sem Orçamento
                    </span>
                  )}

                  {/* Proposal status */}
                  {proposal && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                      <FileText size={11} />
                      Proposta
                    </span>
                  )}
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-100 flex-wrap">
                {/* No budget: request it */}
                {!budget && (
                  <button
                    onClick={() => handleRequestBudget(opp)}
                    disabled={requesting === opp.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    <Send size={11} />
                    {requesting === opp.id ? 'Enviando…' : 'Solicitar Orçamento'}
                  </button>
                )}

                {/* Budget exists: view it */}
                {budget && onNavigate && (
                  <button
                    onClick={() => onNavigate('estimates')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                  >
                    <Eye size={11} />
                    Ver Orçamento
                  </button>
                )}

                {/* Budget APPROVED + no proposal: generate proposal */}
                {budget?.status === BudgetStatus.APPROVED && !proposal && onNavigate && (
                  <button
                    onClick={() => handleGenerateProposal({ opp, budget, proposal })}
                    disabled={generating === opp.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <FileText size={11} />
                    {generating === opp.id ? 'Gerando…' : 'Gerar Proposta'}
                  </button>
                )}

                {/* Has proposal: view it */}
                {proposal && onNavigate && (
                  <button
                    onClick={() => onNavigate(`edit-${proposal.id}`)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                  >
                    <FileText size={11} />
                    Ver Proposta
                  </button>
                )}

                <span className="ml-auto text-[10px] text-neutral-300 font-bold">
                  {formatDate(opp.updatedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <ObraModal
            clients={clients}
            defaultClientName={defaultClient}
            createdBy={createdBy}
            onClose={() => setShowModal(false)}
            onSave={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Monitoring Tab ───────────────────────────────────────────────────────────

function MonitoramentoTab({
  opps, budgets, proposals, onNavigate, onUpdate, createdBy,
}: {
  opps: CRMOpportunity[];
  budgets: BudgetProject[];
  proposals: Proposal[];
  createdBy: string;
  onNavigate?: (tab: string) => void;
  onUpdate: () => void;
}) {
  const [generating, setGenerating] = useState<string | null>(null);

  const rows = useMemo(() =>
    opps
      .filter(o => o.stage !== 'lost')
      .map(opp => ({
        opp,
        budget: budgets.find(b => b.id === opp.linkedBudgetId) ?? null,
        proposal: proposals.find(p => p.id === opp.linkedProposalId) ?? null,
      }))
      .sort((a, b) => new Date(b.opp.updatedAt).getTime() - new Date(a.opp.updatedAt).getTime()),
  [opps, budgets, proposals]);

  const kpis = useMemo(() => ({
    total:              rows.length,
    awaitingBudget:     rows.filter(r => !r.budget).length,
    inProgress:         rows.filter(r => r.budget?.status === BudgetStatus.DRAFT).length,
    readyForProposal:   rows.filter(r => r.budget?.status === BudgetStatus.APPROVED && !r.proposal).length,
    proposalGenerated:  rows.filter(r => !!r.proposal).length,
  }), [rows]);

  const needsAction = useMemo(() =>
    rows.filter(r => !r.budget || (r.budget.status === BudgetStatus.APPROVED && !r.proposal)),
  [rows]);

  const handleGenerateProposal = async (row: { opp: CRMOpportunity; budget: BudgetProject; proposal: Proposal | null }) => {
    if (!onNavigate) return;
    setGenerating(row.opp.id);
    try {
      // Distribui indiretos + BDI proporcionalmente sobre os itens, para que a
      // soma das linhas iguale o finalPrice sem expor o custo direto ao cliente.
      const markup = row.budget.totalDirectCost > 0 ? row.budget.finalPrice / row.budget.totalDirectCost : 1;
      const newId = await proposalService.createProposal({
        clientName: row.opp.clientName,
        proposalNumber: `PF-${new Date().getFullYear()}-${crypto.randomUUID().split('-')[0].toUpperCase().slice(0, 4)}`,
        revision: '00',
        status: ProposalStatus.DRAFT,
        validityDays: 30,
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        createdBy,
        vendorId: row.opp.vendorId,
        technicalScope: {
          generalConsiderations: row.budget.notes ?? '',
          references: [], norms: [], items: [], safetyNotes: '', exclusions: [],
          contractorObligations: [], contracteeObligations: [],
        },
        commercialProposal: {
          totalValue: row.budget.finalPrice,
          paymentTerms: '', reajuste: '', guarantee: '',
          items: row.budget.stages.flatMap(st => st.items.map(i => ({
            id: i.id, description: i.description, quantity: i.quantity, unit: i.unit,
            unitPrice: i.unitCost * markup, totalPrice: i.totalCost * markup, source: 'engineering' as const,
          }))),
        },
        scopeTitle: row.opp.title,
      });
      await budgetProjectService.update(row.budget.id, { linkedProposalId: newId });
      await crmService.updateOpportunity(row.opp.id, { linkedProposalId: newId, stage: 'proposal' });
      onUpdate();
      toast.success('Proposta gerada!');
      onNavigate(`edit-${newId}`);
    } catch {
      toast.error('Erro ao gerar proposta');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Obras Ativas',        value: kpis.total,             icon: Briefcase,   color: 'text-neutral-900', bg: 'bg-white' },
          { label: 'Aguardando Orçamento',value: kpis.awaitingBudget,    icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Em Elaboração',        value: kpis.inProgress,        icon: ClipboardList, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Prontas p/ Proposta', value: kpis.readyForProposal,  icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(kpi => (
          <div key={kpi.label} className={cn('rounded-2xl border border-black/5 shadow-sm p-5', kpi.bg)}>
            <kpi.icon size={18} className={cn('mb-3', kpi.color)} />
            <p className="text-3xl font-black tracking-tight">{kpi.value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Needs attention */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle size={16} className="text-amber-500" />
          <h2 className="text-sm font-black uppercase tracking-widest">Requer Atenção ({needsAction.length})</h2>
        </div>

        {needsAction.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <CheckCircle2 size={28} className="mx-auto mb-2 text-green-500" />
            <p className="text-sm font-black text-green-700 uppercase tracking-widest">Tudo em dia!</p>
            <p className="text-xs text-green-600 opacity-70 mt-1">Nenhuma obra aguardando ação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {needsAction.map(({ opp, budget, proposal }) => {
              const isReadyForProposal = budget?.status === BudgetStatus.APPROVED && !proposal;
              return (
                <div key={opp.id}
                  className={cn(
                    'bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 flex-wrap',
                    isReadyForProposal ? 'border-green-200' : 'border-amber-200',
                  )}
                >
                  <div className={cn('w-2 h-10 rounded-full shrink-0', isReadyForProposal ? 'bg-green-400' : 'bg-amber-400')} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black tracking-tight truncate">{opp.title}</p>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{opp.clientName}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {isReadyForProposal ? (
                      <>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest">
                          <CheckCircle2 size={10} /> Orçamento Pronto · {formatCurrency(budget!.finalPrice)}
                        </span>
                        {onNavigate && (
                          <button
                            onClick={() => handleGenerateProposal({ opp, budget: budget!, proposal })}
                            disabled={generating === opp.id}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            <FileText size={11} />
                            {generating === opp.id ? 'Gerando…' : 'Gerar Proposta'}
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                          <Clock size={10} /> Aguardando Orçamento
                        </span>
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('estimates')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-[10px] font-black uppercase tracking-widest hover:bg-neutral-50 transition-colors"
                          >
                            <Eye size={11} /> Ver Orçamentos
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full pipeline */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest mb-3">Pipeline Completo</h2>
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 px-5 py-3">Obra</th>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-3 hidden md:table-cell">Cliente</th>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-3">Orçamento</th>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-3 hidden lg:table-cell">Proposta</th>
                <th className="text-left text-[10px] font-black uppercase tracking-widest text-neutral-400 px-3 py-3 hidden md:table-cell">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ opp, budget, proposal }) => (
                <tr key={opp.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STAGE_COLOR[opp.stage].split(' ')[0].replace('bg-', 'bg-'))} />
                      <span className="font-bold text-neutral-800 text-xs truncate max-w-[160px]">{opp.title}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-xs text-neutral-500 font-medium">{opp.clientName}</span>
                  </td>
                  <td className="px-3 py-3">
                    {budget ? (
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-widest', BUDGET_STATUS_COLOR[budget.status])}>
                        {BUDGET_STATUS_LABEL[budget.status]}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {proposal ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-widest">
                        Gerada
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <span className="text-xs font-bold text-neutral-700">
                      {budget?.finalPrice ? formatCurrency(budget.finalPrice) : opp.value ? formatCurrency(opp.value) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-sm text-neutral-400 font-bold">
                    Nenhuma obra ativa
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ComercialHub({ onNavigate }: Props) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>('monitoramento');
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [opps, setOpps] = useState<CRMOpportunity[]>([]);
  const [budgets, setBudgets] = useState<BudgetProject[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showObraModal, setShowObraModal] = useState(false);
  const [defaultClient, setDefaultClient] = useState('');

  const reload = async () => {
    const [c, o, b, p] = await Promise.all([
      crmService.getClients(),
      crmService.getOpportunities(),
      budgetProjectService.getAll(),
      proposalService.getAllProposals(),
    ]);
    setClients(c);
    setOpps(o);
    setBudgets(b);
    setProposals(p);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  const handleNewObra = (clientName: string) => {
    setDefaultClient(clientName);
    setShowObraModal(true);
    setActiveTab('obras');
  };

  const createdBy = user?.id ?? 'user';

  const TABS: { key: HubTab; label: string; icon: React.ElementType }[] = [
    { key: 'monitoramento', label: 'Monitoramento', icon: Activity },
    { key: 'obras',         label: 'Obras',         icon: Briefcase },
    { key: 'clientes',      label: 'Clientes',      icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase text-neutral-900">Central Comercial</h1>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mt-1">
            Clientes · Obras · Orçamentos · Propostas
          </p>
        </div>
        <button
          onClick={() => { setDefaultClient(''); setShowObraModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          <Plus size={16} /> Nova Obra
        </button>
      </div>

      {/* Pipeline progress indicator */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4">
        <div className="flex items-center gap-0 text-[10px] font-black uppercase tracking-widest">
          {[
            { label: 'Cliente', color: 'bg-neutral-900', count: clients.length },
            { label: 'Obra', color: 'bg-violet-500', count: opps.filter(o => o.stage !== 'lost').length },
            { label: 'Orçamento', color: 'bg-amber-500', count: budgets.filter(b => opps.some(o => o.linkedBudgetId === b.id)).length },
            { label: 'Proposta', color: 'bg-green-500', count: proposals.length },
          ].map((step, i, arr) => (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-2 flex-1">
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0', step.color)}>
                  {step.count}
                </div>
                <span className="text-neutral-500 hidden sm:block">{step.label}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight size={16} className="text-neutral-200 mx-1 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Inner tabs */}
      <div className="flex border-b border-neutral-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'flex items-center gap-2 py-3 px-5 text-[11px] font-black uppercase tracking-widest border-b-2 transition-colors',
              activeTab === t.key
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-neutral-400 hover:text-neutral-700 hover:border-neutral-300',
            )}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'clientes' && (
            <ClientsTab
              clients={clients}
              opportunities={opps}
              onUpdate={reload}
              onNewObra={handleNewObra}
            />
          )}
          {activeTab === 'obras' && (
            <ObrasTab
              opps={opps}
              budgets={budgets}
              proposals={proposals}
              clients={clients}
              createdBy={createdBy}
              onUpdate={reload}
              onNavigate={onNavigate}
            />
          )}
          {activeTab === 'monitoramento' && (
            <MonitoramentoTab
              opps={opps}
              budgets={budgets}
              proposals={proposals}
              createdBy={createdBy}
              onNavigate={onNavigate}
              onUpdate={reload}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Global obra modal (triggered from clients tab) */}
      <AnimatePresence>
        {showObraModal && (
          <ObraModal
            clients={clients}
            defaultClientName={defaultClient}
            createdBy={createdBy}
            onClose={() => setShowObraModal(false)}
            onSave={reload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
