import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, FunnelChart, Funnel, LabelList,
} from 'recharts';
import {
  Plus, X, Phone, Mail, Users, FileText, Send, Calendar,
  Check, Trash2, Edit2, TrendingUp, CheckCircle2, AlertCircle,
  BarChart3, Download, Clock, Briefcase, Building2, MapPin,
  UserPlus, Activity, DollarSign,
  LayoutGrid, Target,
} from 'lucide-react';
import {
  Proposal, ProposalStatus, Vendor, CRMOpportunity, CRMClient,
  OpportunityStage, ActivityType, CRMActivity, CRMTask,
} from '../types';
import { formatCurrency, cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { proposalService } from '../services/proposalService';
import { crmService } from '../services/crmService';
import { toast } from 'sonner';

// ─── Constants ────────────────────────────────────────────────────────────────

type CRMTab = 'dashboard' | 'funnel' | 'clients' | 'activities' | 'vendors';

const STAGES: {
  key: OpportunityStage;
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}[] = [
  { key: 'prospecting',   label: 'Prospecção',   color: 'text-slate-700',  bg: 'bg-slate-50',   border: 'border-slate-200', dot: 'bg-slate-400' },
  { key: 'qualification', label: 'Qualificação', color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-200', dot: 'bg-violet-400' },
  { key: 'proposal',      label: 'Proposta',     color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200',   dot: 'bg-blue-400' },
  { key: 'negotiation',   label: 'Negociação',   color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200',  dot: 'bg-amber-400' },
  { key: 'won',           label: 'Ganho',        color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200',  dot: 'bg-green-500' },
  { key: 'lost',          label: 'Perdido',      color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200',    dot: 'bg-red-400' },
];

const stageConfig = Object.fromEntries(STAGES.map(s => [s.key, s])) as Record<OpportunityStage, typeof STAGES[number]>;

const ACTIVITY_TYPES: { key: ActivityType; label: string }[] = [
  { key: 'call',          label: 'Ligação' },
  { key: 'email',         label: 'E-mail' },
  { key: 'meeting',       label: 'Reunião' },
  { key: 'note',          label: 'Nota' },
  { key: 'proposal_sent', label: 'Proposta Enviada' },
];

// ─── Small utilities ─────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'md' ? 'w-9 h-9 text-xs' : 'w-12 h-12 text-sm';
  return (
    <div className={cn('rounded-full bg-neutral-900 text-white flex items-center justify-center font-black shrink-0', sz)}>
      {initials(name)}
    </div>
  );
}

function StageBadge({ stage }: { stage: OpportunityStage }) {
  const s = stageConfig[stage];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest', s.color, s.bg)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const icons: Record<ActivityType, React.ReactNode> = {
    call:          <Phone size={12} />,
    email:         <Mail size={12} />,
    meeting:       <Users size={12} />,
    note:          <FileText size={12} />,
    proposal_sent: <Send size={12} />,
  };
  return <>{icons[type]}</>;
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

// ─── Vendor Form Modal ────────────────────────────────────────────────────────

interface VendorFormModalProps {
  vendor?: Vendor | null;
  onClose: () => void;
  onSave: () => void;
}

function VendorFormModal({ vendor, onClose, onSave }: VendorFormModalProps) {
  const [form, setForm] = useState({
    name: vendor?.name ?? '',
    email: vendor?.email ?? '',
    phone: vendor?.phone ?? '',
    role: vendor?.role ?? '',
    active: vendor?.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      if (vendor) {
        await crmService.updateVendor(vendor.id, form);
        toast.success('Vendedor atualizado');
      } else {
        await crmService.createVendor(form);
        toast.success('Vendedor cadastrado');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">
            {vendor ? 'Editar Vendedor' : 'Novo Vendedor'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Nome *', key: 'name', placeholder: 'João da Silva' },
            { label: 'E-mail', key: 'email', placeholder: 'joao@profem.com.br' },
            { label: 'Telefone', key: 'phone', placeholder: '(11) 99999-0000' },
            { label: 'Cargo', key: 'role', placeholder: 'Eng. Comercial' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</label>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={set(key as keyof typeof form)}
                placeholder={placeholder}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                form.active ? 'bg-green-500' : 'bg-neutral-200',
              )}
            >
              <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all', form.active ? 'left-5' : 'left-1')} />
            </button>
            <span className="text-xs font-bold text-neutral-600">{form.active ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-widest hover:bg-neutral-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </ModalOverlay>
  );
}

// ─── Client Form Modal ────────────────────────────────────────────────────────

interface ClientFormModalProps {
  client?: CRMClient | null;
  onClose: () => void;
  onSave: () => void;
}

function ClientFormModal({ client, onClose, onSave }: ClientFormModalProps) {
  const [form, setForm] = useState({
    name: client?.name ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    company: client?.company ?? '',
    segment: client?.segment ?? '',
    city: client?.city ?? '',
    notes: client?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
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
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nome *', key: 'name', col: 2 },
            { label: 'Empresa', key: 'company', col: 1 },
            { label: 'Segmento', key: 'segment', col: 1 },
            { label: 'E-mail', key: 'email', col: 1 },
            { label: 'Telefone', key: 'phone', col: 1 },
            { label: 'Cidade', key: 'city', col: 1 },
          ].map(({ label, key, col }) => (
            <div key={key} className={col === 2 ? 'col-span-2' : ''}>
              <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</label>
              <input
                value={form[key as keyof typeof form] as string}
                onChange={set(key as keyof typeof form)}
                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-widest hover:bg-neutral-50">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </ModalOverlay>
  );
}

// ─── Opportunity Modal ────────────────────────────────────────────────────────

type OppModalTab = 'info' | 'activities' | 'tasks';

interface OpportunityModalProps {
  opportunity?: CRMOpportunity | null;
  vendors: Vendor[];
  clients: CRMClient[];
  defaultStage?: OpportunityStage;
  createdBy: string;
  onClose: () => void;
  onSave: () => void;
}

function OpportunityModal({
  opportunity, vendors, clients, defaultStage, createdBy, onClose, onSave,
}: OpportunityModalProps) {
  const [tab, setTab] = useState<OppModalTab>('info');
  const [saving, setSaving] = useState(false);

  // Info form
  const [form, setForm] = useState({
    title:              opportunity?.title ?? '',
    clientName:         opportunity?.clientName ?? '',
    value:              opportunity?.value?.toString() ?? '0',
    stage:              opportunity?.stage ?? defaultStage ?? 'prospecting',
    vendorId:           opportunity?.vendorId ?? '',
    probability:        opportunity?.probability?.toString() ?? '50',
    expectedCloseDate:  opportunity?.expectedCloseDate ? opportunity.expectedCloseDate.slice(0, 10) : '',
    notes:              opportunity?.notes ?? '',
    lossReason:         opportunity?.lossReason ?? '',
  });

  // Activity add
  const [actType, setActType] = useState<ActivityType>('note');
  const [actDesc, setActDesc] = useState('');
  const [addingAct, setAddingAct] = useState(false);

  // Task add
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskAssign, setTaskAssign] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const [localOpp, setLocalOpp] = useState<CRMOpportunity | undefined>(opportunity ?? undefined);

  const refreshLocal = async () => {
    if (!localOpp) return;
    const opps = await crmService.getOpportunities();
    setLocalOpp(opps.find(o => o.id === localOpp.id));
  };

  const setF = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSaveInfo = async () => {
    if (!form.title.trim()) { toast.error('Título obrigatório'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        clientName: form.clientName,
        value: parseFloat(form.value) || 0,
        stage: form.stage as OpportunityStage,
        vendorId: form.vendorId || undefined,
        probability: parseInt(form.probability) || 0,
        expectedCloseDate: form.expectedCloseDate || undefined,
        notes: form.notes,
        lossReason: form.lossReason || undefined,
        createdBy,
      };
      if (opportunity) {
        await crmService.updateOpportunity(opportunity.id, payload);
        toast.success('Oportunidade atualizada');
      } else {
        await crmService.createOpportunity(payload);
        toast.success('Oportunidade criada');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddActivity = async () => {
    if (!actDesc.trim() || !localOpp) return;
    setAddingAct(true);
    const activity: CRMActivity = {
      id: crypto.randomUUID(),
      opportunityId: localOpp.id,
      type: actType,
      description: actDesc,
      createdAt: new Date().toISOString(),
      createdBy: vendors.find(v => v.id === localOpp.createdBy)?.name ?? createdBy,
    };
    const updated = [...(localOpp.activities ?? []), activity];
    await crmService.updateOpportunity(localOpp.id, { activities: updated });
    await refreshLocal();
    setActDesc('');
    setAddingAct(false);
    toast.success('Atividade registrada');
    onSave();
  };

  const handleDeleteActivity = async (actId: string) => {
    if (!localOpp) return;
    const updated = (localOpp.activities ?? []).filter(a => a.id !== actId);
    await crmService.updateOpportunity(localOpp.id, { activities: updated });
    await refreshLocal();
    onSave();
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !localOpp) return;
    setAddingTask(true);
    const task: CRMTask = {
      id: crypto.randomUUID(),
      opportunityId: localOpp.id,
      title: taskTitle,
      dueDate: taskDue || undefined,
      completed: false,
      assignedTo: taskAssign || undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...(localOpp.tasks ?? []), task];
    await crmService.updateOpportunity(localOpp.id, { tasks: updated });
    await refreshLocal();
    setTaskTitle('');
    setTaskDue('');
    setTaskAssign('');
    setAddingTask(false);
    toast.success('Tarefa adicionada');
    onSave();
  };

  const handleToggleTask = async (taskId: string) => {
    if (!localOpp) return;
    const updated = (localOpp.tasks ?? []).map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t,
    );
    await crmService.updateOpportunity(localOpp.id, { tasks: updated });
    await refreshLocal();
    onSave();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!localOpp) return;
    const updated = (localOpp.tasks ?? []).filter(t => t.id !== taskId);
    await crmService.updateOpportunity(localOpp.id, { tasks: updated });
    await refreshLocal();
    onSave();
  };

  const pendingTasks = (localOpp?.tasks ?? []).filter(t => !t.completed).length;
  const actCount = (localOpp?.activities ?? []).length;

  return (
    <ModalOverlay onClose={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-100">
          <h3 className="text-sm font-black uppercase tracking-wider">
            {opportunity ? 'Oportunidade' : 'Nova Oportunidade'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-100"><X size={16} /></button>
        </div>

        {/* Inner tabs (only for existing opps) */}
        {opportunity && (
          <div className="flex border-b border-neutral-100 px-6">
            {([
              { key: 'info',       label: 'Informações' },
              { key: 'activities', label: `Atividades${actCount > 0 ? ` (${actCount})` : ''}` },
              { key: 'tasks',      label: `Tarefas${pendingTasks > 0 ? ` (${pendingTasks})` : ''}` },
            ] as { key: OppModalTab; label: string }[]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'py-3 px-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors',
                  tab === t.key ? 'border-black text-black' : 'border-transparent text-neutral-400 hover:text-neutral-700',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Info tab ──────────────────────────────────────────────────── */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Título *</label>
                <input value={form.title} onChange={setF('title')}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Cliente</label>
                  <input
                    list="crm-clients-datalist"
                    value={form.clientName}
                    onChange={setF('clientName')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400"
                  />
                  <datalist id="crm-clients-datalist">
                    {clients.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Valor (R$)</label>
                  <input type="number" value={form.value} onChange={setF('value')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Estágio</label>
                  <select value={form.stage} onChange={setF('stage')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400">
                    {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Probabilidade %</label>
                  <input type="number" min={0} max={100} value={form.probability} onChange={setF('probability')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Responsável</label>
                  <select value={form.vendorId} onChange={setF('vendorId')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400">
                    <option value="">— Sem responsável —</option>
                    {vendors.filter(v => v.active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Previsão de Fechamento</label>
                  <input type="date" value={form.expectedCloseDate} onChange={setF('expectedCloseDate')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
                </div>
              </div>

              {form.stage === 'lost' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Motivo da Perda</label>
                  <input value={form.lossReason} onChange={setF('lossReason')}
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Observações</label>
                <textarea value={form.notes} onChange={setF('notes')} rows={3}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-neutral-200 text-xs font-black uppercase tracking-widest hover:bg-neutral-50">
                  Cancelar
                </button>
                <button
                  onClick={handleSaveInfo}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-50"
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* ── Activities tab ─────────────────────────────────────────────── */}
          {tab === 'activities' && (
            <div className="space-y-4">
              {/* Add activity form */}
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Registrar Atividade</p>
                <div className="flex gap-2 flex-wrap">
                  {ACTIVITY_TYPES.map(at => (
                    <button key={at.key} onClick={() => setActType(at.key)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors',
                        actType === at.key ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 border border-neutral-200 hover:border-neutral-400',
                      )}>
                      {at.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={actDesc}
                  onChange={e => setActDesc(e.target.value)}
                  placeholder="Descreva o que aconteceu..."
                  rows={2}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400 resize-none"
                />
                <button
                  onClick={handleAddActivity}
                  disabled={addingAct || !actDesc.trim()}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-40"
                >
                  {addingAct ? 'Salvando…' : 'Registrar'}
                </button>
              </div>

              {/* Activity timeline */}
              <div className="space-y-3">
                {[...(localOpp?.activities ?? [])].reverse().map(act => (
                  <div key={act.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                        <ActivityIcon type={act.type} />
                      </div>
                      <div className="w-px flex-1 bg-neutral-100 mt-1" />
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-neutral-700">{act.description}</p>
                        <button
                          onClick={() => handleDeleteActivity(act.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-opacity shrink-0"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        {ACTIVITY_TYPES.find(a => a.key === act.type)?.label} · {act.createdBy} · {formatDate(act.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {(localOpp?.activities ?? []).length === 0 && (
                  <p className="text-sm text-neutral-400 text-center py-6">Nenhuma atividade registrada</p>
                )}
              </div>
            </div>
          )}

          {/* ── Tasks tab ─────────────────────────────────────────────────── */}
          {tab === 'tasks' && (
            <div className="space-y-4">
              {/* Add task form */}
              <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Nova Tarefa</p>
                <input
                  value={taskTitle}
                  onChange={e => setTaskTitle(e.target.value)}
                  placeholder="Descreva a tarefa..."
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 focus:border-neutral-400"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Prazo</label>
                    <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Responsável</label>
                    <input value={taskAssign} onChange={e => setTaskAssign(e.target.value)}
                      placeholder="Nome"
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                </div>
                <button
                  onClick={handleAddTask}
                  disabled={addingTask || !taskTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-widest hover:bg-neutral-800 disabled:opacity-40"
                >
                  {addingTask ? 'Salvando…' : 'Adicionar Tarefa'}
                </button>
              </div>

              {/* Task list */}
              <div className="space-y-2">
                {(localOpp?.tasks ?? []).map(task => (
                  <div key={task.id} className={cn('flex items-start gap-3 p-3 rounded-xl border group', task.completed ? 'bg-neutral-50 border-neutral-100' : 'bg-white border-neutral-200')}>
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={cn('mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                        task.completed ? 'bg-green-500 border-green-500' : 'border-neutral-300 hover:border-green-400')}
                    >
                      {task.completed && <Check size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', task.completed && 'line-through text-neutral-400')}>{task.title}</p>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        {task.dueDate && (
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <Calendar size={10} />{formatDate(task.dueDate)}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="text-[10px] text-neutral-400">{task.assignedTo}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-red-400 transition-opacity shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {(localOpp?.tasks ?? []).length === 0 && (
                  <p className="text-sm text-neutral-400 text-center py-6">Nenhuma tarefa criada</p>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </ModalOverlay>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function MetricCard({ label, value, icon: Icon, color, description, trend }: {
  label: string; value: string; icon: React.ElementType; color: string;
  description: string; trend?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-xl bg-neutral-50', color)}><Icon size={20} /></div>
        {trend && <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">{trend}</span>}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
        <h4 className="text-2xl font-black text-neutral-900 tracking-tighter">{value}</h4>
        <p className="text-[10px] font-medium text-neutral-400">{description}</p>
      </div>
    </div>
  );
}

function DashboardTab({
  proposals, opportunities, vendors,
}: { proposals: Proposal[]; opportunities: CRMOpportunity[]; vendors: Vendor[] }) {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const filtered = useMemo(() => {
    const now = new Date();
    return proposals.filter(p => {
      const d = new Date(p.createdAt);
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });
  }, [proposals, period]);

  const stats = useMemo(() => {
    const won  = filtered.filter(p => p.status === ProposalStatus.WON).length;
    const lost = filtered.filter(p => p.status === ProposalStatus.LOST).length;
    const total = filtered.length;
    const rate = total > 0 ? (won / total) * 100 : 0;
    return { total, won, lost, rate };
  }, [filtered]);

  const pipeline = useMemo(() => {
    return STAGES.filter(s => s.key !== 'won' && s.key !== 'lost').map(s => ({
      name: s.label,
      count: opportunities.filter(o => o.stage === s.key).length,
      value: opportunities.filter(o => o.stage === s.key).reduce((acc, o) => acc + o.value, 0),
      fill: s.dot.replace('bg-', '#'),
    }));
  }, [opportunities]);

  const pipelineTotal = useMemo(() =>
    opportunities
      .filter(o => o.stage !== 'lost')
      .reduce((acc, o) => acc + o.value * (o.probability / 100), 0),
  [opportunities]);

  const byVendor = useMemo(() => {
    const map: Record<string, { name: string; total: number; won: number; value: number }> = {};
    filtered.forEach(p => {
      const k = p.createdBy ?? 'Sistema';
      if (!map[k]) map[k] = { name: k, total: 0, won: 0, value: 0 };
      map[k].total++;
      if (p.status === ProposalStatus.WON) {
        map[k].won++;
        map[k].value += p.commercialProposal?.totalValue ?? 0;
      }
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filtered]);

  const funnelData = useMemo(() => STAGES.map(s => ({
    name: s.label,
    value: opportunities.filter(o => o.stage === s.key).length,
    fill:
      s.key === 'won' ? '#22c55e' :
      s.key === 'lost' ? '#ef4444' :
      s.key === 'negotiation' ? '#f59e0b' :
      s.key === 'proposal' ? '#3b82f6' :
      s.key === 'qualification' ? '#8b5cf6' :
      '#94a3b8',
  })), [opportunities]);

  return (
    <div className="space-y-8">
      {/* Period filter */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Inteligência Comercial</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Pipeline e performance de equipe</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {(['month', 'quarter', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all',
                  period === p ? 'bg-white text-black shadow-sm' : 'text-neutral-500 hover:text-black')}>
                {p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
          <button className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50">
            <Download size={16} className="text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Pipeline Ponderado" value={formatCurrency(pipelineTotal)}
          icon={DollarSign} color="text-orange-500" description="Valor × probabilidade" />
        <MetricCard label="Taxa de Conversão" value={`${stats.rate.toFixed(1)}%`}
          icon={TrendingUp} color="text-green-500" description="Propostas ganhas / total" />
        <MetricCard label="Propostas Ganhas" value={stats.won.toString()}
          icon={CheckCircle2} color="text-emerald-500" description="Contratos concretizados" />
        <MetricCard label="Oportunidades Ativas" value={opportunities.filter(o => o.stage !== 'lost').length.toString()}
          icon={Target} color="text-blue-500" description="Excluindo perdidas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Funnel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Activity size={16} className="text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Funil de Oportunidades</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 10, fontWeight: 'bold' }} />
                <Funnel data={funnelData} dataKey="value" isAnimationActive>
                  <LabelList position="right" fill="#666" content={(props: any) => {
                    const { x, y, width, value, name } = props;
                    return (
                      <text x={x + width + 8} y={y + 18} fill="#666" fontSize={9} fontWeight="bold">
                        {name}: {value}
                      </text>
                    );
                  }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance by vendor */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Performance por Vendedor</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byVendor}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={36} />
                <Bar dataKey="won"   name="Ganhas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline by stage */}
        <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <LayoutGrid size={16} className="text-violet-500" />
            <h3 className="text-xs font-black uppercase tracking-widest">Pipeline por Estágio</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STAGES.filter(s => s.key !== 'won' && s.key !== 'lost').map(s => {
              const opps = opportunities.filter(o => o.stage === s.key);
              const val  = opps.reduce((a, o) => a + o.value, 0);
              return (
                <div key={s.key} className={cn('rounded-xl p-4 border', s.bg, s.border)}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', s.color)}>{s.label}</span>
                  </div>
                  <p className="text-xl font-black text-neutral-900">{opps.length}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{formatCurrency(val)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Funnel Tab (Kanban) ──────────────────────────────────────────────────────

function FunnelTab({
  opportunities, vendors, onUpdate,
}: { opportunities: CRMOpportunity[]; vendors: Vendor[]; onUpdate: () => void }) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<CRMOpportunity | null>(null);
  const [newOppStage, setNewOppStage] = useState<OpportunityStage | null>(null);
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => { crmService.getClients().then(setClients); }, []);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggingId(id);
  };
  const handleDragEnd = () => { setDraggingId(null); setDragOverStage(null); };
  const handleDragOver = (e: React.DragEvent, stage: OpportunityStage) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const handleDrop = async (e: React.DragEvent, stage: OpportunityStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverStage(null);
    if (id) {
      await crmService.updateOpportunity(id, { stage });
      onUpdate();
    }
  };

  const handleDelete = async (id: string) => {
    await crmService.deleteOpportunity(id);
    onUpdate();
    toast.success('Oportunidade removida');
  };

  const filtered = useMemo(() =>
    search
      ? opportunities.filter(o =>
          o.title.toLowerCase().includes(search.toLowerCase()) ||
          o.clientName.toLowerCase().includes(search.toLowerCase()))
      : opportunities,
  [opportunities, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Funil de Vendas</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Arraste os cards para mover estágios</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar oportunidade..."
            className="border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 w-56"
          />
          <button
            onClick={() => setNewOppStage('prospecting')}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800"
          >
            <Plus size={14} /> Nova
          </button>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const colOpps = filtered.filter(o => o.stage === stage.key);
          const colVal  = colOpps.reduce((a, o) => a + o.value, 0);
          const isOver  = dragOverStage === stage.key;

          return (
            <div
              key={stage.key}
              onDragOver={e => handleDragOver(e, stage.key)}
              onDrop={e => handleDrop(e, stage.key)}
              onDragLeave={() => setDragOverStage(null)}
              className={cn(
                'flex-shrink-0 w-64 rounded-2xl border-2 transition-colors',
                isOver ? `${stage.border} ${stage.bg}` : 'border-neutral-200 bg-neutral-50',
              )}
            >
              {/* Column header */}
              <div className={cn('p-3 rounded-t-2xl', stage.bg)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', stage.dot)} />
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', stage.color)}>{stage.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-neutral-500 bg-white px-2 py-0.5 rounded-full">{colOpps.length}</span>
                    <button
                      onClick={() => setNewOppStage(stage.key)}
                      className="w-5 h-5 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center"
                    >
                      <Plus size={10} className="text-neutral-500" />
                    </button>
                  </div>
                </div>
                {colVal > 0 && (
                  <p className="text-[9px] text-neutral-400 mt-1 font-bold">{formatCurrency(colVal)}</p>
                )}
              </div>

              {/* Cards */}
              <div className="p-2 space-y-2 min-h-[120px]">
                {colOpps.map(opp => {
                  const vendor = vendors.find(v => v.id === opp.vendorId);
                  const pendingTasks = (opp.tasks ?? []).filter(t => !t.completed).length;
                  return (
                    <div
                      key={opp.id}
                      draggable
                      onDragStart={e => handleDragStart(e, opp.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedOpp(opp)}
                      className={cn(
                        'bg-white rounded-xl p-3 border border-neutral-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-all select-none',
                        draggingId === opp.id && 'opacity-40 scale-95',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-neutral-900 leading-snug">{opp.title}</p>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(opp.id); }}
                          className="p-1 rounded hover:bg-red-50 text-neutral-300 hover:text-red-400 shrink-0"
                        >
                          <X size={10} />
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-1">
                        <Building2 size={9} />{opp.clientName}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-black text-neutral-900">{formatCurrency(opp.value)}</span>
                        <span className={cn(
                          'text-[9px] font-black px-1.5 py-0.5 rounded-full',
                          opp.probability >= 70 ? 'bg-green-100 text-green-700' :
                          opp.probability >= 40 ? 'bg-amber-100 text-amber-700' :
                          'bg-neutral-100 text-neutral-500',
                        )}>{opp.probability}%</span>
                      </div>
                      {(vendor || pendingTasks > 0 || opp.expectedCloseDate) && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-100">
                          {vendor ? <Avatar name={vendor.name} size="sm" /> : <span />}
                          <div className="flex items-center gap-2">
                            {pendingTasks > 0 && (
                              <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
                                <Clock size={9} />{pendingTasks}
                              </span>
                            )}
                            {opp.expectedCloseDate && (
                              <span className="text-[9px] text-neutral-400 flex items-center gap-0.5">
                                <Calendar size={9} />{formatDate(opp.expectedCloseDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedOpp && (
          <OpportunityModal
            opportunity={selectedOpp}
            vendors={vendors}
            clients={clients}
            createdBy={selectedOpp.createdBy}
            onClose={() => setSelectedOpp(null)}
            onSave={() => { onUpdate(); setSelectedOpp(null); }}
          />
        )}
        {newOppStage && (
          <OpportunityModal
            defaultStage={newOppStage}
            vendors={vendors}
            clients={clients}
            createdBy="user"
            onClose={() => setNewOppStage(null)}
            onSave={() => { onUpdate(); setNewOppStage(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Clients Tab ──────────────────────────────────────────────────────────────

function ClientsTab({
  clients, opportunities, proposals, onUpdate,
}: { clients: CRMClient[]; opportunities: CRMOpportunity[]; proposals: Proposal[]; onUpdate: () => void }) {
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState<CRMClient | null | 'new'>('new' as any);
  const [showForm, setShowForm] = useState(false);
  const [formClient, setFormClient] = useState<CRMClient | null>(null);

  const filtered = useMemo(() =>
    clients.filter(c =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (c.city ?? '').toLowerCase().includes(search.toLowerCase()),
    ),
  [clients, search]);

  const handleDelete = async (id: string) => {
    await crmService.deleteClient(id);
    onUpdate();
    toast.success('Cliente removido');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Clientes</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{clients.length} cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="border border-neutral-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-black/5 w-56"
          />
          <button
            onClick={() => { setFormClient(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800"
          >
            <Plus size={14} /> Novo Cliente
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4 hidden md:table-cell">Segmento</th>
              <th className="px-6 py-4 hidden lg:table-cell text-center">Oportunidades</th>
              <th className="px-6 py-4 text-right hidden lg:table-cell">Pipeline</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filtered.map(client => {
              const opps    = opportunities.filter(o => o.clientName === client.name);
              const pipeline = opps.filter(o => o.stage !== 'lost').reduce((a, o) => a + o.value, 0);
              return (
                <tr key={client.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={client.name} size="md" />
                      <div>
                        <p className="text-sm font-bold text-neutral-900">{client.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {client.city && (
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                              <MapPin size={9} />{client.city}
                            </span>
                          )}
                          {client.email && (
                            <span className="text-[10px] text-neutral-400 hidden sm:inline">{client.email}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 hidden md:table-cell">
                    {client.segment && (
                      <span className="text-[10px] font-bold bg-neutral-100 text-neutral-600 px-2 py-1 rounded-lg">{client.segment}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center hidden lg:table-cell">
                    <span className="text-sm font-bold text-neutral-900">{opps.length}</span>
                  </td>
                  <td className="px-6 py-4 text-right hidden lg:table-cell">
                    <span className="text-sm font-black text-neutral-900">{formatCurrency(pipeline)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setFormClient(client); setShowForm(true); }}
                        className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-neutral-400">
                  {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <ClientFormModal
            client={formClient}
            onClose={() => setShowForm(false)}
            onSave={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Activities Tab ───────────────────────────────────────────────────────────

function ActivitiesTab({
  opportunities, vendors, onUpdate,
}: { opportunities: CRMOpportunity[]; vendors: Vendor[]; onUpdate: () => void }) {
  const [filterVendor, setFilterVendor] = useState('all');
  const [filterOpp, setFilterOpp] = useState('all');

  const allActivities = useMemo(() => {
    return opportunities
      .flatMap(o =>
        (o.activities ?? []).map(a => ({ ...a, oppTitle: o.title, oppId: o.id, vendorId: o.vendorId })),
      )
      .filter(a =>
        (filterVendor === 'all' || a.vendorId === filterVendor) &&
        (filterOpp === 'all' || a.oppId === filterOpp),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [opportunities, filterVendor, filterOpp]);

  const pendingTasks = useMemo(() => {
    return opportunities
      .flatMap(o =>
        (o.tasks ?? [])
          .filter(t => !t.completed)
          .map(t => ({ ...t, oppTitle: o.title, oppId: o.id })),
      )
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [opportunities]);

  const handleCompleteTask = async (oppId: string, taskId: string) => {
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;
    const updated = (opp.tasks ?? []).map(t => t.id === taskId ? { ...t, completed: true } : t);
    await crmService.updateOpportunity(oppId, { tasks: updated });
    onUpdate();
    toast.success('Tarefa concluída');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Atividades & Tarefas</h2>
        <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Histórico e pendências do pipeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest">Tarefas Pendentes</h3>
              </div>
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                {pendingTasks.length}
              </span>
            </div>
            <div className="divide-y divide-neutral-50 max-h-[480px] overflow-y-auto">
              {pendingTasks.map(task => {
                const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className="p-4 hover:bg-neutral-50/50 group">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleCompleteTask(task.oppId, task.id)}
                        className="mt-0.5 w-4 h-4 rounded-full border-2 border-neutral-300 hover:border-green-400 shrink-0 flex items-center justify-center"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900">{task.title}</p>
                        <p className="text-[10px] text-neutral-400 truncate">{task.oppTitle}</p>
                        {task.dueDate && (
                          <p className={cn('text-[10px] font-bold mt-0.5 flex items-center gap-1', isOverdue ? 'text-red-500' : 'text-neutral-400')}>
                            <Clock size={9} />{formatDate(task.dueDate)}{isOverdue && ' — Atrasada'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {pendingTasks.length === 0 && (
                <div className="p-8 text-center">
                  <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-neutral-400">Nenhuma tarefa pendente</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Activity timeline */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-neutral-100">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Histórico de Atividades</h3>
                </div>
                <div className="flex items-center gap-2">
                  <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)}
                    className="text-[10px] font-black uppercase border border-neutral-200 rounded-lg px-2 py-1.5 outline-none">
                    <option value="all">Todos vendedores</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  <select value={filterOpp} onChange={e => setFilterOpp(e.target.value)}
                    className="text-[10px] font-black uppercase border border-neutral-200 rounded-lg px-2 py-1.5 outline-none">
                    <option value="all">Todas oportunidades</option>
                    {opportunities.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-1 max-h-[480px] overflow-y-auto">
              {allActivities.map((act, i) => (
                <div key={act.id} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 shrink-0">
                      <ActivityIcon type={act.type} />
                    </div>
                    {i < allActivities.length - 1 && <div className="w-px flex-1 bg-neutral-100 mt-1" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-xs text-neutral-700">{act.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-bold text-neutral-500">{act.oppTitle}</span>
                      <span className="text-[10px] text-neutral-400">·</span>
                      <span className="text-[10px] text-neutral-400">
                        {ACTIVITY_TYPES.find(a => a.key === act.type)?.label}
                      </span>
                      <span className="text-[10px] text-neutral-400">·</span>
                      <span className="text-[10px] text-neutral-400">{formatDate(act.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {allActivities.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-12">Nenhuma atividade registrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

function VendorsTab({
  vendors, opportunities, onUpdate,
}: { vendors: Vendor[]; opportunities: CRMOpportunity[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState<Vendor | null>(null);

  const vendorStats = useMemo(() => {
    return vendors.map(v => {
      const opps  = opportunities.filter(o => o.vendorId === v.id);
      const won   = opps.filter(o => o.stage === 'won');
      const wonValue = won.reduce((a, o) => a + o.value, 0);
      const pipeline = opps.filter(o => o.stage !== 'lost' && o.stage !== 'won').reduce((a, o) => a + o.value, 0);
      const rate = opps.length > 0 ? (won.length / opps.length) * 100 : 0;
      return { ...v, totalOpps: opps.length, wonOpps: won.length, wonValue, pipeline, rate };
    });
  }, [vendors, opportunities]);

  const handleToggleActive = async (v: Vendor) => {
    await crmService.updateVendor(v.id, { active: !v.active });
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    await crmService.deleteVendor(id);
    onUpdate();
    toast.success('Vendedor removido');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Equipe Comercial</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
            {vendors.filter(v => v.active).length} vendedores ativos
          </p>
        </div>
        <button
          onClick={() => { setEditVendor(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800"
        >
          <UserPlus size={14} /> Novo Vendedor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vendorStats.map(v => (
          <div key={v.id} className={cn('bg-white rounded-2xl border border-neutral-200 shadow-sm p-5', !v.active && 'opacity-60')}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar name={v.name} size="lg" />
                <div>
                  <p className="text-sm font-black text-neutral-900">{v.name}</p>
                  {v.role && (
                    <p className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <Briefcase size={9} />{v.role}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditVendor(v); setShowForm(true); }}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {v.email && (
                <p className="text-[10px] text-neutral-500 flex items-center gap-2">
                  <Mail size={11} className="text-neutral-300" />{v.email}
                </p>
              )}
              {v.phone && (
                <p className="text-[10px] text-neutral-500 flex items-center gap-2">
                  <Phone size={11} className="text-neutral-300" />{v.phone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-100">
              <div className="text-center">
                <p className="text-lg font-black text-neutral-900">{v.totalOpps}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Opor.</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-green-600">{v.wonOpps}</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Ganhas</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-black text-neutral-900">{v.rate.toFixed(0)}%</p>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Conversão</p>
              </div>
            </div>

            {v.pipeline > 0 && (
              <div className="mt-3 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase">Pipeline</span>
                  <span className="text-xs font-black text-neutral-900">{formatCurrency(v.pipeline)}</span>
                </div>
              </div>
            )}

            <button
              onClick={() => handleToggleActive(v)}
              className={cn(
                'mt-3 w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors',
                v.active
                  ? 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100'
                  : 'bg-green-50 text-green-600 hover:bg-green-100',
              )}
            >
              {v.active ? 'Desativar' : 'Reativar'}
            </button>
          </div>
        ))}

        {vendors.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <UserPlus size={32} className="text-neutral-300 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">Nenhum vendedor cadastrado</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <VendorFormModal
            vendor={editVendor}
            onClose={() => setShowForm(false)}
            onSave={onUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CRM Header ───────────────────────────────────────────────────────────────

const TAB_CONFIG: { key: CRMTab; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard',  label: 'Dashboard',  icon: BarChart3 },
  { key: 'funnel',     label: 'Funil',      icon: LayoutGrid },
  { key: 'clients',    label: 'Clientes',   icon: Building2 },
  { key: 'activities', label: 'Atividades', icon: Activity },
  { key: 'vendors',    label: 'Vendedores', icon: Users },
];

function CRMHeader({
  activeTab, onTabChange, opportunityCount,
}: { activeTab: CRMTab; onTabChange: (t: CRMTab) => void; opportunityCount: number }) {
  return (
    <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
      <div className="px-4 md:px-6 pt-5 pb-0">
        <div className="flex items-end justify-between mb-0">
          <div>
            <h1 className="text-xl font-black tracking-tight text-neutral-900 uppercase">CRM</h1>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {opportunityCount} oportunidades ativas
            </p>
          </div>
        </div>
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
                activeTab === key
                  ? 'border-neutral-900 text-neutral-900'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700',
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function Reports() {
  const [activeTab, setActiveTab] = useState<CRMTab>('dashboard');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [clients, setClients] = useState<CRMClient[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [v, o, c, p] = await Promise.all([
      crmService.getVendors(),
      crmService.getOpportunities(),
      crmService.getClients(),
      proposalService.getAllProposals(),
    ]);
    setVendors(v);
    setOpportunities(o);
    setClients(c);
    setProposals(p);
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>
    );
  }

  const activeOpps = opportunities.filter(o => o.stage !== 'lost').length;

  return (
    <div className="min-h-screen bg-neutral-50/30">
      <CRMHeader activeTab={activeTab} onTabChange={setActiveTab} opportunityCount={activeOpps} />
      <div className="p-4 md:p-6">
        {activeTab === 'dashboard'  && <DashboardTab  proposals={proposals} opportunities={opportunities} vendors={vendors} />}
        {activeTab === 'funnel'     && <FunnelTab      opportunities={opportunities} vendors={vendors} onUpdate={reload} />}
        {activeTab === 'clients'    && <ClientsTab     clients={clients} opportunities={opportunities} proposals={proposals} onUpdate={reload} />}
        {activeTab === 'activities' && <ActivitiesTab  opportunities={opportunities} vendors={vendors} onUpdate={reload} />}
        {activeTab === 'vendors'    && <VendorsTab     vendors={vendors} opportunities={opportunities} onUpdate={reload} />}
      </div>
    </div>
  );
}
