import React, { useState, useEffect } from 'react';
import { X, Save, Search, Package, Wrench, HardHat, Truck, Plus, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BudgetLineItem, BudgetLineType, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { formatCurrency, cn } from '../lib/utils';

interface Props {
  onClose: () => void;
  onAdd: (item: Omit<BudgetLineItem, 'id'>) => void;
  editingItem?: BudgetLineItem | null;
}

type ModalTab = 'manual' | 'catalogo';

const TYPE_OPTIONS: {
  value: BudgetLineType;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
  badgeClass: string;
}[] = [
  {
    value: 'material',
    label: 'Material',
    icon: <Package size={12} />,
    activeClass: 'bg-blue-50 text-blue-700 border-blue-300',
    badgeClass: 'bg-blue-50 text-blue-600',
  },
  {
    value: 'mao_de_obra',
    label: 'Mão de Obra',
    icon: <HardHat size={12} />,
    activeClass: 'bg-orange-50 text-orange-700 border-orange-300',
    badgeClass: 'bg-orange-50 text-orange-600',
  },
  {
    value: 'servico',
    label: 'Serviço',
    icon: <Wrench size={12} />,
    activeClass: 'bg-purple-50 text-purple-700 border-purple-300',
    badgeClass: 'bg-purple-50 text-purple-600',
  },
  {
    value: 'equipamento',
    label: 'Equipamento',
    icon: <Truck size={12} />,
    activeClass: 'bg-green-50 text-green-700 border-green-300',
    badgeClass: 'bg-green-50 text-green-600',
  },
];

const UNITS = ['UN', 'M', 'M²', 'M³', 'MT', 'KG', 'L', 'H', 'DIA', 'VB', 'PC', 'CX', 'SC', 'TON'];

const EMPTY_FORM = {
  type: 'material' as BudgetLineType,
  description: '',
  unit: 'UN',
  quantity: 1,
  unitCost: 0,
  notes: '',
};

/** Infer BudgetLineType from a catalog Product's category / brand */
function inferType(p: Product): BudgetLineType {
  const cat = (p.category ?? '').toLowerCase();
  const brand = (p.brand ?? '').toLowerCase();
  if (
    cat.includes('serviç') ||
    cat.includes('servic') ||
    brand.includes('interno') ||
    brand.includes('serviço')
  )
    return 'servico';
  if (
    cat.includes('mão de obra') ||
    cat.includes('mao de obra') ||
    cat.includes('mao_de_obra') ||
    cat.includes('trabalho')
  )
    return 'mao_de_obra';
  if (
    cat.includes('equipamento') ||
    cat.includes('máquina') ||
    cat.includes('maquina') ||
    cat.includes('ferramenta')
  )
    return 'equipamento';
  return 'material';
}

export function AddBudgetItemModal({ onClose, onAdd, editingItem }: Props) {
  const [tab, setTab] = useState<ModalTab>('manual');
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(editingItem ?? {}) });

  // Catalog state
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<BudgetLineType | 'all'>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Inline quick-add state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [quickQty, setQuickQty] = useState(1);
  const [flashedId, setFlashedId] = useState<string | null>(null);

  // Fetch catalog on first tab switch
  useEffect(() => {
    if (tab === 'catalogo' && catalogProducts.length === 0) {
      setLoadingCatalog(true);
      inventoryService.getAllProducts().then(data => {
        setCatalogProducts(data);
        setLoadingCatalog(false);
      });
    }
  }, [tab]);

  // ── Filtered + grouped catalog ───────────────────────────────────────────────
  const filteredCatalog = catalogProducts.filter(p => {
    const matchSearch =
      !catalogSearch ||
      p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes(catalogSearch.toLowerCase());
    const matchType =
      catalogTypeFilter === 'all' || inferType(p) === catalogTypeFilter;
    return matchSearch && matchType;
  });

  const showGroups = catalogTypeFilter === 'all' && !catalogSearch;

  const groupedCatalog = showGroups
    ? TYPE_OPTIONS.map(opt => ({
        opt,
        items: filteredCatalog.filter(p => inferType(p) === opt.value),
      })).filter(g => g.items.length > 0)
    : [{ opt: null, items: filteredCatalog }];

  // ── Catalog actions ──────────────────────────────────────────────────────────
  const handleQuickAdd = (p: Product, qty: number) => {
    const type = inferType(p);
    const unitCost = p.costPrice ?? p.price;
    onAdd({
      type,
      description: p.name,
      unit: p.unit,
      quantity: qty,
      unitCost,
      totalCost: qty * unitCost,
      notes:
        p.brand && p.brand !== 'Serviço Interno' ? `Marca: ${p.brand}` : '',
      catalogRefId: p.id,
    });
    setFlashedId(p.id);
    setExpandedId(null);
    setTimeout(() => setFlashedId(null), 1800);
  };

  const handleEditFromCatalog = (p: Product) => {
    setForm({
      type: inferType(p),
      description: p.name,
      unit: p.unit,
      quantity: 1,
      unitCost: p.costPrice ?? p.price,
      notes:
        p.brand && p.brand !== 'Serviço Interno' ? `Marca: ${p.brand}` : '',
    });
    setTab('manual');
  };

  // ── Manual form submit ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || form.unitCost <= 0) return;
    onAdd({
      type: form.type,
      description: form.description.trim(),
      unit: form.unit,
      quantity: Number(form.quantity),
      unitCost: Number(form.unitCost),
      totalCost: Number(form.quantity) * Number(form.unitCost),
      notes: form.notes,
    });
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="p-6 bg-black text-white flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold">
              {editingItem ? 'Editar Item' : 'Adicionar Item'}
            </h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              Linha do Orçamento
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        {!editingItem && (
          <div className="flex border-b border-black/5 flex-shrink-0">
            {(['manual', 'catalogo'] as ModalTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all',
                  tab === t
                    ? 'border-b-2 border-black text-black'
                    : 'text-black/30 hover:text-black/60',
                )}
              >
                {t === 'manual' ? 'Manual' : 'Do Catálogo'}
              </button>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            CATÁLOGO TAB
        ═══════════════════════════════════════════════════════════════════════ */}
        {tab === 'catalogo' && (
          <div className="flex flex-col flex-1 overflow-hidden p-5 gap-3">
            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar por nome, categoria ou marca..."
                className="w-full pl-9 pr-4 py-2.5 bg-black/5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Type filter chips */}
            <div className="flex gap-1.5 flex-wrap flex-shrink-0">
              <button
                onClick={() => setCatalogTypeFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                  catalogTypeFilter === 'all'
                    ? 'bg-black text-white border-black'
                    : 'bg-black/5 text-black/50 border-transparent hover:bg-black/10',
                )}
              >
                Todos
              </button>
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setCatalogTypeFilter(prev =>
                      prev === opt.value ? 'all' : opt.value,
                    )
                  }
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                    catalogTypeFilter === opt.value
                      ? opt.activeClass
                      : 'bg-black/5 text-black/50 border-transparent hover:bg-black/10',
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Products list */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {loadingCatalog ? (
                <div className="py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto" />
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="py-12 text-center space-y-1">
                  <p className="text-sm font-bold opacity-30">
                    Nenhum item encontrado
                  </p>
                  <p className="text-xs opacity-20">
                    Tente outra busca ou use a aba Manual
                  </p>
                </div>
              ) : (
                groupedCatalog.map(group => (
                  <div key={group.opt?.value ?? 'all'} className="space-y-1">
                    {/* Group header (only in grouped mode) */}
                    {showGroups && group.opt && (
                      <div
                        className={cn(
                          'flex items-center gap-2 px-2.5 py-1 rounded-lg',
                          group.opt.activeClass,
                        )}
                      >
                        {group.opt.icon}
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {group.opt.label}s
                        </span>
                        <span className="ml-auto text-[9px] font-bold opacity-60">
                          {group.items.length}
                        </span>
                      </div>
                    )}

                    {group.items.map(p => {
                      const typeOpt = TYPE_OPTIONS.find(
                        t => t.value === inferType(p),
                      )!;
                      const isExpanded = expandedId === p.id;
                      const isFlashed = flashedId === p.id;

                      return (
                        <div key={p.id}>
                          {/* Product row */}
                          <button
                            onClick={() => {
                              if (isExpanded) {
                                setExpandedId(null);
                              } else {
                                setExpandedId(p.id);
                                setQuickQty(1);
                              }
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left',
                              isFlashed
                                ? 'bg-green-50 border-green-300'
                                : isExpanded
                                  ? 'bg-orange-50 border-orange-200 rounded-b-none'
                                  : 'bg-black/[0.02] hover:bg-orange-50 border-transparent hover:border-orange-200',
                            )}
                          >
                            {/* Type icon badge */}
                            <span
                              className={cn(
                                'flex-shrink-0 p-1.5 rounded-lg',
                                typeOpt.badgeClass,
                              )}
                            >
                              {typeOpt.icon}
                            </span>

                            {/* Name + category */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">
                                {p.name}
                              </p>
                              <p className="text-[10px] opacity-40 font-semibold uppercase tracking-wider truncate">
                                {p.category}
                                {p.brand && p.brand !== 'Serviço Interno'
                                  ? ` · ${p.brand}`
                                  : ''}
                              </p>
                            </div>

                            {/* Price + unit */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-mono font-bold text-orange-600">
                                {formatCurrency(p.costPrice ?? p.price)}
                              </p>
                              <p className="text-[10px] opacity-40">
                                /{p.unit}
                              </p>
                            </div>

                            {/* Flash check */}
                            {isFlashed && (
                              <CheckCircle
                                size={18}
                                className="text-green-500 flex-shrink-0"
                              />
                            )}
                          </button>

                          {/* Inline quick-add panel */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 border border-t-0 border-orange-200 rounded-b-2xl">
                                  {/* Qty label + input */}
                                  <span className="text-[10px] font-bold opacity-50 uppercase whitespace-nowrap">
                                    Qtd.
                                  </span>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    autoFocus
                                    value={quickQty}
                                    onChange={e =>
                                      setQuickQty(
                                        parseFloat(e.target.value) || 1,
                                      )
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleQuickAdd(p, quickQty);
                                      }
                                      if (e.key === 'Escape')
                                        setExpandedId(null);
                                    }}
                                    className="w-20 p-1.5 bg-white rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-orange-400 border border-orange-200"
                                  />
                                  <span className="text-[10px] font-bold opacity-40">
                                    {p.unit}
                                  </span>

                                  {/* Total preview */}
                                  <span className="flex-1 text-xs font-mono font-bold text-orange-700 text-right whitespace-nowrap">
                                    ={' '}
                                    {formatCurrency(
                                      quickQty * (p.costPrice ?? p.price),
                                    )}
                                  </span>

                                  {/* Add button */}
                                  <button
                                    onClick={() => handleQuickAdd(p, quickQty)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
                                  >
                                    <Plus size={13} />
                                    Adicionar
                                  </button>

                                  {/* Edit button → switches to manual */}
                                  <button
                                    onClick={() => handleEditFromCatalog(p)}
                                    className="px-3 py-1.5 bg-black/10 text-black/60 rounded-xl text-xs font-bold hover:bg-black/20 transition-colors whitespace-nowrap"
                                  >
                                    Editar
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <p className="flex-shrink-0 text-[9px] text-center opacity-25 font-medium pt-1 border-t border-black/5">
              Clique para definir quantidade · Enter para adicionar · Esc para
              fechar
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MANUAL FORM TAB
        ═══════════════════════════════════════════════════════════════════════ */}
        {tab === 'manual' && (
          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-5 overflow-y-auto"
          >
            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                Tipo
              </label>
              <div className="flex gap-2 flex-wrap">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: opt.value })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all',
                      form.type === opt.value
                        ? opt.activeClass
                        : 'bg-black/5 text-black/40 border-transparent hover:bg-black/10',
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                Descrição *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Concreto usinado fck=25MPa"
                className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                autoFocus
              />
            </div>

            {/* Unidade + Quantidade + Custo */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Unidade
                </label>
                <select
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map(u => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Quantidade
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.quantity}
                  onChange={e =>
                    setForm({
                      ...form,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                  Custo Unit. (R$)
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.unitCost}
                  onChange={e =>
                    setForm({
                      ...form,
                      unitCost: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            {/* Total preview */}
            <div className="flex items-center justify-between p-4 bg-black/[0.03] rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                Total do Item
              </span>
              <span className="font-mono text-xl font-black">
                {formatCurrency(Number(form.quantity) * Number(form.unitCost))}
              </span>
            </div>

            {/* Obs / Especificação */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                Obs. / Especificação
              </label>
              <input
                type="text"
                placeholder="Marca, modelo, especificação técnica..."
                className="w-full p-3 bg-black/5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
              >
                <Save size={16} />
                {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
