import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, MapPin, User, Trash2, ChevronRight, X, FolderOpen, ArrowUpDown } from 'lucide-react';
import { BudgetProject, BudgetStatus } from '../types';
import { budgetProjectService } from '../services/budgetProjectService';
import { useAuth } from '../hooks/useAuth';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { confirmAction } from '../hooks/useConfirm';

interface Props {
  onOpen: (project: BudgetProject) => void;
}

const STATUS_LABEL: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]: 'Rascunho',
  [BudgetStatus.APPROVED]: 'Aprovado',
  [BudgetStatus.EXECUTING]: 'Em Execução',
  [BudgetStatus.COMPLETED]: 'Concluído',
  [BudgetStatus.CANCELLED]: 'Cancelado',
};

const STATUS_COLOR: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]: 'bg-black/5 text-black/60',
  [BudgetStatus.APPROVED]: 'bg-blue-50 text-blue-700',
  [BudgetStatus.EXECUTING]: 'bg-orange-50 text-orange-700',
  [BudgetStatus.COMPLETED]: 'bg-green-50 text-green-700',
  [BudgetStatus.CANCELLED]: 'bg-red-50 text-red-500',
};

interface NewProjectForm {
  title: string;
  clientName: string;
  address: string;
  responsible: string;
  notes: string;
}

const EMPTY_FORM: NewProjectForm = {
  title: '',
  clientName: '',
  address: '',
  responsible: '',
  notes: '',
};

export function BudgetProjectList({ onOpen }: Props) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<BudgetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BudgetStatus | null>(null);
  const [sortBy, setSortBy] = useState<'updated' | 'price_desc' | 'price_asc' | 'name'>('updated');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewProjectForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await budgetProjectService.getAll();
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = projects
    .filter(p => !statusFilter || p.status === statusFilter)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.clientName.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'price_desc') return b.finalPrice - a.finalPrice;
      if (sortBy === 'price_asc') return a.finalPrice - b.finalPrice;
      if (sortBy === 'name') return a.title.localeCompare(b.title);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.clientName.trim()) return;
    setSaving(true);
    try {
      const id = await budgetProjectService.create(form, user?.id ?? '');
      toast.success('Orçamento criado!');
      setShowModal(false);
      setForm(EMPTY_FORM);
      await load();
      const created = await budgetProjectService.getById(id);
      if (created) onOpen(created);
    } catch {
      toast.error('Erro ao criar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const ok = await confirmAction({
      title: 'Excluir orçamento?',
      description: 'Esta ação é permanente.',
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    try {
      await budgetProjectService.delete(id);
      toast.success('Orçamento excluído.');
      load();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir.');
    }
  };

  const totalItems = (p: BudgetProject) => p.stages.reduce((s, st) => s + st.items.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-3 flex-1 max-w-2xl w-full">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/40" size={18} />
            <input
              type="text"
              placeholder="Buscar por obra ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-white border border-black/5 rounded-2xl text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-black/20 font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-orange-50 rounded-lg text-orange-400 transition-all">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={15} />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="pl-9 pr-4 py-4 bg-white border border-black/5 rounded-2xl text-xs font-bold shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 appearance-none cursor-pointer"
            >
              <option value="updated">Mais recentes</option>
              <option value="price_desc">Maior valor</option>
              <option value="price_asc">Menor valor</option>
              <option value="name">Nome A–Z</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={saving}
          aria-label="Criar novo orçamento"
          className={cn(
            "w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl shadow-lg transition-all",
            saving
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] text-white hover:opacity-90"
          )}
        >
          {saving ? (
            <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />
          ) : (
            <Plus size={18} />
          )}
          Novo Orçamento
        </button>
      </div>

      {/* Summary cards — click to filter */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[BudgetStatus.DRAFT, BudgetStatus.APPROVED, BudgetStatus.EXECUTING, BudgetStatus.COMPLETED].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(f => f === s ? null : s)}
            className={cn(
              'bg-white rounded-2xl border shadow-sm p-5 text-left transition-all hover:shadow-md',
              statusFilter === s
                ? 'border-orange-400 ring-1 ring-orange-400 bg-orange-50'
                : 'border-black/5 hover:border-orange-200'
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{STATUS_LABEL[s]}</p>
            <p className="text-3xl font-black mt-1">{projects.filter(p => p.status === s).length}</p>
          </button>
        ))}
      </div>
      {statusFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold opacity-40">Filtrando por:</span>
          <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full">{STATUS_LABEL[statusFilter]}</span>
          <button onClick={() => setStatusFilter(null)} className="text-xs font-bold text-orange-500 hover:underline">Limpar</button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-20 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-black/5 rounded-full flex items-center justify-center opacity-40">
            <FolderOpen size={24} />
          </div>
          <p className="text-sm font-bold opacity-60">Nenhum orçamento encontrado.</p>
          <p className="text-xs opacity-40">Crie um novo orçamento para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map(p => (
            <motion.div
              key={p.id}
              layout
              onClick={() => onOpen(p)}
              className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 flex items-center gap-6 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group"
            >
              <div className="bg-orange-50 p-4 rounded-2xl text-orange-500 shrink-0">
                <FileText size={24} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-black tracking-tight truncate">{p.title}</h3>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest', STATUS_COLOR[p.status])}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs font-medium opacity-50">
                    <User size={12} /> {p.clientName}
                  </span>
                  {p.address && (
                    <span className="flex items-center gap-1 text-xs font-medium opacity-50">
                      <MapPin size={12} /> {p.address}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                    {p.stages.length} etapa{p.stages.length !== 1 ? 's' : ''} · {totalItems(p)} iten{totalItems(p) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Preço Final</p>
                <p className="text-lg font-black tracking-tight text-orange-600">{formatCurrency(p.finalPrice)}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={e => handleDelete(e, p.id)}
                  className="p-2 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={20} className="opacity-20 group-hover:opacity-60 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal novo orçamento */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 bg-black text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Novo Orçamento de Obra</h3>
                  <p className="text-xs opacity-40 font-bold uppercase tracking-widest">Identificação</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Nome da Obra *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Reforma Elétrica Galpão Leste"
                    className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Cliente *</label>
                  <input
                    required
                    type="text"
                    placeholder="Nome do cliente ou empresa"
                    className="w-full p-4 bg-black/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                    value={form.clientName}
                    onChange={e => setForm({ ...form, clientName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Endereço</label>
                    <input
                      type="text"
                      placeholder="Local da obra"
                      className="w-full p-4 bg-black/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Responsável</label>
                    <input
                      type="text"
                      placeholder="Engenheiro / Técnico"
                      className="w-full p-4 bg-black/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                      value={form.responsible}
                      onChange={e => setForm({ ...form, responsible: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Notas iniciais..."
                    className="w-full p-4 bg-black/5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black resize-none"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
                  >
                    {saving ? 'Criando...' : 'Criar Orçamento'}
                    <Plus size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
