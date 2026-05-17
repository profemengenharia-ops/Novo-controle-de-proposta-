import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HardHat, Plus, Edit3, Trash2, X, Save, MapPin, Calendar, Ruler,
  FileText, Send, ClipboardList, FileSignature,
} from 'lucide-react';
import { toast } from 'sonner';
import { Client, Obra, ObraStatus, ObraType } from '../types';
import { obraService } from '../services/obraService';
import { useAuth } from '../hooks/useAuth';
import { cn, formatDate } from '../lib/utils';

interface Props {
  client: Client;
}

const TYPE_LABEL: Record<ObraType, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
  manutencao: 'Manutenção',
  infraestrutura: 'Infraestrutura',
  outro: 'Outro',
};

const STATUS_LABEL: Record<ObraStatus, string> = {
  prospeccao: 'Prospecção',
  aguardando_orcamento: 'Aguardando Orçamento',
  em_orcamento: 'Em Orçamento',
  orcada: 'Orçada',
  em_proposta: 'Em Proposta',
  proposta_enviada: 'Proposta Enviada',
  ganha: 'Ganha',
  perdida: 'Perdida',
  cancelada: 'Cancelada',
};

const STATUS_STYLE: Record<ObraStatus, string> = {
  prospeccao: 'bg-neutral-100 text-neutral-700',
  aguardando_orcamento: 'bg-amber-100 text-amber-800',
  em_orcamento: 'bg-blue-100 text-blue-800',
  orcada: 'bg-indigo-100 text-indigo-800',
  em_proposta: 'bg-purple-100 text-purple-800',
  proposta_enviada: 'bg-cyan-100 text-cyan-800',
  ganha: 'bg-green-100 text-green-800',
  perdida: 'bg-red-100 text-red-700',
  cancelada: 'bg-neutral-200 text-neutral-500',
};

const emptyObraFor = (clientId: string): Obra => ({
  id: '',
  clientId,
  name: '',
  type: 'reforma',
  status: 'prospeccao',
  address: '',
  city: '',
  state: '',
  cep: '',
  estimatedArea: undefined,
  startDate: '',
  deadline: '',
  scopeSummary: '',
  notes: '',
  createdAt: '',
  updatedAt: '',
  createdBy: '',
});

export function ObraList({ client }: Props) {
  const { user } = useAuth();
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Obra | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Bug #21: load como useCallback para ser reutilizada em handlers sem recrear a função
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obraService.getByClient(client.id);
      setObras(data);
    } catch {
      // erro já logado no service
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    obraService.getByClient(client.id)
      .then(data => { if (!cancelled) setObras(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [client.id]);

  const handleNew = () => {
    setEditing(emptyObraFor(client.id));
    setShowModal(true);
  };

  const handleEdit = (o: Obra) => {
    setEditing({ ...o });
    setShowModal(true);
  };

  const handleDelete = async (o: Obra) => {
    if (!confirm(`Excluir obra "${o.name}"?`)) return;
    try {
      await obraService.delete(o.id);
      toast.success('Obra excluída');
      await load();
    } catch (err) {
      toast.error('Erro ao excluir obra');
      console.error(err);
    }
  };

  const handleRequestBudget = async (o: Obra) => {
    if (!confirm(`Enviar a obra "${o.name}" para o setor de Orçamentos?`)) return;
    try {
      await obraService.update(o.id, { status: 'aguardando_orcamento' });
      toast.success('Obra enviada para Orçamentos');
      await load();
    } catch (err) {
      toast.error('Erro ao enviar solicitação');
      console.error(err);
    }
  };

  const stats = useMemo(() => ({
    total: obras.length,
    aguardando: obras.filter(o => o.status === 'aguardando_orcamento').length,
    emAndamento: obras.filter(o =>
      ['em_orcamento', 'orcada', 'em_proposta', 'proposta_enviada'].includes(o.status),
    ).length,
    ganhas: obras.filter(o => o.status === 'ganha').length,
  }), [obras]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header com info do cliente */}
      <div className="mb-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Cliente</p>
            <h3 className="text-lg font-black tracking-tight truncate">{client.companyName}</h3>
            {client.tradeName && (
              <p className="text-xs opacity-60 font-bold truncate">{client.tradeName}</p>
            )}
          </div>
          <button
            onClick={handleNew}
            className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 transition-all active:scale-95 shadow-lg shrink-0"
          >
            <Plus size={14} /> Nova Obra
          </button>
        </div>

        {/* Stats compactas */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <StatCard label="Obras" value={stats.total} />
          <StatCard label="Aguardando" value={stats.aguardando} color="amber" />
          <StatCard label="Em andamento" value={stats.emAndamento} color="blue" />
          <StatCard label="Ganhas" value={stats.ganhas} color="green" />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto -mr-2 pr-2 min-h-0">
        {loading ? (
          <div className="py-16 text-center text-xs opacity-40 font-bold uppercase tracking-widest">
            Carregando…
          </div>
        ) : obras.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-black/10">
            <HardHat size={32} className="mx-auto opacity-20 mb-3" />
            <p className="text-sm opacity-40 font-bold mb-1">Nenhuma obra cadastrada para este cliente.</p>
            <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest mb-4">
              Cadastre a primeira para poder solicitar orçamento
            </p>
            <button
              onClick={handleNew}
              className="text-xs font-black text-orange-500 hover:text-orange-600 uppercase tracking-widest"
            >
              + Cadastrar primeira obra
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {obras.map(o => (
              <motion.div
                key={o.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-2xl border border-black/5 p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <HardHat size={14} className="opacity-40 shrink-0" />
                      <p className="text-sm font-black truncate">{o.name}</p>
                      <span className={cn('text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0', STATUS_STYLE[o.status])}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    {o.scopeSummary && (
                      <p className="text-[11px] opacity-60 line-clamp-2 ml-6">{o.scopeSummary}</p>
                    )}
                    <div className="ml-6 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] opacity-60 font-medium">
                      {o.type && (
                        <span className="inline-flex items-center gap-1">
                          <ClipboardList size={10} /> {TYPE_LABEL[o.type]}
                        </span>
                      )}
                      {(o.city || o.state) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} /> {[o.city, o.state].filter(Boolean).join('/')}
                        </span>
                      )}
                      {o.estimatedArea ? (
                        <span className="inline-flex items-center gap-1">
                          <Ruler size={10} /> {o.estimatedArea} m²
                        </span>
                      ) : null}
                      {o.deadline && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} /> {formatDate(o.deadline)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleEdit(o)}
                      className="p-1.5 hover:bg-black/5 rounded-lg"
                      title="Editar"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(o)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Ações de fluxo */}
                <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] opacity-40 font-bold uppercase tracking-widest">
                    <FileSignature size={11} />
                    {o.budgetProjectId ? 'Orçamento vinculado' : 'Sem orçamento'}
                    {o.proposalId && ' · Proposta vinculada'}
                  </div>
                  {o.status === 'prospeccao' && (
                    <button
                      onClick={() => handleRequestBudget(o)}
                      className="px-3 py-1.5 bg-black text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-neutral-800 transition-all flex items-center gap-1.5"
                    >
                      <Send size={11} /> Solicitar Orçamento
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && editing && (
          <ObraFormModal
            initial={editing}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSaved={load}
            userId={user?.id ?? 'mock-user'}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: 'amber' | 'blue' | 'green' }) {
  const colorMap = {
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
  };
  return (
    <div className="bg-white rounded-xl border border-black/5 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest opacity-50">{label}</p>
      <p className={cn('text-xl font-black mt-0.5', color ? colorMap[color] : '')}>{value}</p>
    </div>
  );
}

// ─── Modal de cadastro/edição de obra ────────────────────────────────────────

interface ModalProps {
  initial: Obra;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

function ObraFormModal({ initial, onClose, onSaved, userId }: ModalProps) {
  const isNew = !initial.id;
  const [form, setForm] = useState<Obra>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Obra>(k: K, v: Obra[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Informe o nome da obra.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        clientId: form.clientId,
        name: form.name.trim(),
        type: form.type,
        status: form.status,
        address: form.address?.trim() || undefined,
        city: form.city?.trim() || undefined,
        state: form.state?.trim() || undefined,
        cep: form.cep?.trim() || undefined,
        estimatedArea: form.estimatedArea,
        startDate: form.startDate || undefined,
        deadline: form.deadline || undefined,
        scopeSummary: form.scopeSummary?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      };
      if (isNew) {
        await obraService.create(payload, userId);
        toast.success('Obra cadastrada');
      } else {
        await obraService.update(form.id, payload);
        toast.success('Obra atualizada');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar obra');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 16 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 bg-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl"><HardHat size={18} /></div>
            <div>
              <h3 className="text-base font-black">{isNew ? 'Nova Obra' : 'Editar Obra'}</h3>
              <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Cadastro de Obra</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Identificação</h4>
            <div className="grid grid-cols-6 gap-3">
              <Field label="Nome da obra *" col={6}>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Ex.: Edifício Aurora — Torre B"
                  className={inputCls}
                />
              </Field>
              <Field label="Tipo" col={3}>
                <select
                  value={form.type ?? 'reforma'}
                  onChange={e => set('type', e.target.value as ObraType)}
                  className={inputCls}
                >
                  {Object.entries(TYPE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status" col={3}>
                <select
                  value={form.status}
                  onChange={e => set('status', e.target.value as ObraStatus)}
                  className={inputCls}
                >
                  {Object.entries(STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Localização</h4>
            <div className="grid grid-cols-6 gap-3">
              <Field label="Endereço" col={4}>
                <input
                  value={form.address ?? ''}
                  onChange={e => set('address', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="CEP" col={2}>
                <input
                  value={form.cep ?? ''}
                  onChange={e => set('cep', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Cidade" col={4}>
                <input
                  value={form.city ?? ''}
                  onChange={e => set('city', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="UF" col={2}>
                <input
                  value={form.state ?? ''}
                  onChange={e => set('state', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50">Cronograma & Porte</h4>
            <div className="grid grid-cols-6 gap-3">
              <Field label="Área estimada (m²)" col={2}>
                <input
                  type="number"
                  step="0.01"
                  value={form.estimatedArea ?? ''}
                  onChange={e => set('estimatedArea', e.target.value === '' ? undefined : Number(e.target.value))}
                  className={inputCls}
                />
              </Field>
              <Field label="Início previsto" col={2}>
                <input
                  type="date"
                  value={form.startDate ?? ''}
                  onChange={e => set('startDate', e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Prazo final" col={2}>
                <input
                  type="date"
                  value={form.deadline ?? ''}
                  onChange={e => set('deadline', e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
              <FileText size={11} /> Escopo / Briefing
            </h4>
            <textarea
              value={form.scopeSummary ?? ''}
              onChange={e => set('scopeSummary', e.target.value)}
              rows={4}
              placeholder="O que o cliente quer construir/reformar? Inclua referências essenciais para o Orçamentos."
              className="w-full px-3 py-2 text-sm bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 resize-none"
            />
            <textarea
              value={form.notes ?? ''}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder="Observações internas (não vão para o orçamento)."
              className="w-full px-3 py-2 text-xs bg-black/[0.02] border border-black/10 rounded-xl focus:outline-none focus:border-black/30 resize-none"
            />
          </section>
        </div>

        <div className="p-4 border-t border-black/5 flex items-center justify-end gap-2 shrink-0 bg-black/[0.01]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-black/10 text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black/5 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-neutral-800 transition-all active:scale-95 disabled:opacity-40 flex items-center gap-2"
          >
            <Save size={13} /> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm bg-white border border-black/10 rounded-xl focus:outline-none focus:border-black/30 transition-colors';

function Field({ label, col = 1, children }: { label: string; col?: number; children: React.ReactNode }) {
  const colCls =
    col === 2 ? 'col-span-2' :
    col === 3 ? 'col-span-3' :
    col === 4 ? 'col-span-4' :
    col === 6 ? 'col-span-6' : '';
  return (
    <div className={cn('flex flex-col gap-1.5', colCls)}>
      <label className="text-[10px] font-black uppercase tracking-widest opacity-50">{label}</label>
      {children}
    </div>
  );
}
