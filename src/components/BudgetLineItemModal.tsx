import React, { useState, useEffect } from 'react';
import { X, Save, Search, Package, Wrench, HardHat, Truck, List } from 'lucide-react';
import { motion } from 'motion/react';
import { BudgetLineItem, BudgetLineType, LaborRate, Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { laborRateService } from '../services/laborRateService';
import { formatCurrency, cn } from '../lib/utils';

interface Props {
  onClose: () => void;
  onAdd: (item: Omit<BudgetLineItem, 'id'>) => void;
  editingItem?: BudgetLineItem | null;
}

type ModalTab = 'manual' | 'catalogo';
type CatalogTypeFilter = 'todos' | 'material' | 'servico' | 'equipamento' | 'mao_de_obra';

const TYPE_OPTIONS: { value: BudgetLineType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'material',    label: 'Material',    icon: <Package size={14} />,  color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'mao_de_obra', label: 'Mão de Obra', icon: <HardHat size={14} />,  color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'servico',     label: 'Serviço',     icon: <Wrench size={14} />,   color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'equipamento', label: 'Equipamento', icon: <Truck size={14} />,    color: 'bg-green-50 text-green-700 border-green-200' },
];

const CATALOG_TYPE_TABS: { value: CatalogTypeFilter; label: string; icon: React.ReactNode }[] = [
  { value: 'todos',       label: 'Todos',       icon: <List size={13} /> },
  { value: 'material',    label: 'Materiais',   icon: <Package size={13} /> },
  { value: 'servico',     label: 'Serviços',    icon: <Wrench size={13} /> },
  { value: 'equipamento', label: 'Equip.',      icon: <Truck size={13} /> },
  { value: 'mao_de_obra', label: 'Mão de Obra', icon: <HardHat size={13} /> },
];

const UNITS = ['UN', 'M²', 'M³', 'MT', 'KG', 'L', 'H', 'DIA', 'VB', 'PC', 'CX', 'SC', 'TON'];

const EMPTY_FORM = {
  type: 'material' as BudgetLineType,
  description: '',
  unit: 'UN',
  quantity: 1,
  unitCost: 0,
  notes: '',
};

export function BudgetLineItemModal({ onClose, onAdd, editingItem }: Props) {
  const [tab, setTab] = useState<ModalTab>('manual');
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(editingItem ?? {}) });
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [laborRates, setLaborRates] = useState<LaborRate[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<CatalogTypeFilter>('todos');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    setLoadingCatalog(true);
    Promise.all([
      inventoryService.getAllProducts(),
      laborRateService.getAll(),
    ]).then(([products, rates]) => {
      setCatalogProducts(products);
      setLaborRates(rates);
      setLoadingCatalog(false);
    });
  }, []);

  const getFilteredProducts = (): Product[] => {
    let items = catalogProducts;
    if (catalogTypeFilter === 'material') {
      items = items.filter(p => {
        const cat = p.category?.toLowerCase() ?? '';
        return !cat.includes('servi') && !cat.includes('equip');
      });
    } else if (catalogTypeFilter === 'servico') {
      items = items.filter(p => p.category?.toLowerCase().includes('servi'));
    } else if (catalogTypeFilter === 'equipamento') {
      items = items.filter(p => p.category?.toLowerCase().includes('equip'));
    }
    const q = catalogSearch.toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q)
    );
  };

  const getFilteredLaborRates = (): LaborRate[] => {
    const q = catalogSearch.toLowerCase();
    if (!q) return laborRates;
    return laborRates.filter(r => r.role.toLowerCase().includes(q));
  };

  const selectFromCatalog = (product: Product) => {
    let type: BudgetLineType = 'material';
    const cat = product.category?.toLowerCase() ?? '';
    if (cat.includes('servi')) type = 'servico';
    else if (cat.includes('equip')) type = 'equipamento';

    setForm({
      type,
      description: product.name,
      unit: product.unit,
      quantity: 1,
      unitCost: product.costPrice ?? product.price,
      notes: product.brand ? `Marca: ${product.brand}` : '',
    });
    setTab('manual');
  };

  const selectLaborRate = (rate: LaborRate) => {
    setForm({
      type: 'mao_de_obra',
      description: rate.role,
      unit: rate.unit,
      quantity: 1,
      unitCost: rate.totalCostPerHour,
      notes: `Encargos sociais: ${(rate.laborCharges * 100).toFixed(0)}%`,
    });
    setTab('manual');
  };

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

  const showLaborRates = catalogTypeFilter === 'mao_de_obra';
  const filteredProducts = showLaborRates ? [] : getFilteredProducts();
  const filteredRates = showLaborRates ? getFilteredLaborRates() : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-black text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">{editingItem ? 'Editar Item' : 'Adicionar Item'}</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Linha do Orçamento</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs Manual / Catálogo */}
        {!editingItem && (
          <div className="flex border-b border-black/5">
            {(['manual', 'catalogo'] as ModalTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all',
                  tab === t
                    ? 'border-b-2 border-black text-black'
                    : 'text-black/30 hover:text-black/60'
                )}
              >
                {t === 'manual' ? 'Manual' : 'Do Catálogo'}
              </button>
            ))}
          </div>
        )}

        {/* ── Catálogo ─────────────────────────────────────── */}
        {tab === 'catalogo' && (
          <div className="flex flex-col" style={{ maxHeight: '70vh' }}>

            {/* Guia de tipos */}
            <div className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto shrink-0">
              {CATALOG_TYPE_TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => { setCatalogTypeFilter(t.value); setCatalogSearch(''); }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0',
                    catalogTypeFilter === t.value
                      ? 'bg-black text-white border-black'
                      : 'bg-black/5 text-black/50 border-transparent hover:bg-black/10'
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Busca */}
            <div className="px-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={15} />
                <input
                  type="text"
                  placeholder={showLaborRates ? 'Buscar função ou cargo...' : 'Buscar insumo no catálogo...'}
                  className="w-full pl-9 pr-4 py-2.5 bg-black/5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1.5">
              {loadingCatalog ? (
                <div className="py-10 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto" />
                </div>
              ) : showLaborRates ? (
                filteredRates.length === 0 ? (
                  <p className="text-sm opacity-40 text-center py-10">Nenhuma função encontrada.</p>
                ) : filteredRates.map(rate => (
                  <button
                    key={rate.id}
                    onClick={() => selectLaborRate(rate)}
                    className="w-full flex items-center justify-between p-4 bg-black/[0.02] hover:bg-orange-50 rounded-xl border border-transparent hover:border-orange-200 transition-all text-left"
                  >
                    <div>
                      <p className="text-sm font-bold">{rate.role}</p>
                      <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                        Encargos {(rate.laborCharges * 100).toFixed(0)}% · {rate.unit}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-orange-600">{formatCurrency(rate.totalCostPerHour)}</p>
                      <p className="text-[10px] opacity-40">c/ encargos / {rate.unit}</p>
                    </div>
                  </button>
                ))
              ) : (
                filteredProducts.length === 0 ? (
                  <p className="text-sm opacity-40 text-center py-10">Nenhum item encontrado.</p>
                ) : filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectFromCatalog(p)}
                    className="w-full flex items-center justify-between p-4 bg-black/[0.02] hover:bg-orange-50 rounded-xl border border-transparent hover:border-orange-200 transition-all text-left"
                  >
                    <div>
                      <p className="text-sm font-bold">{p.name}</p>
                      <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">{p.category} · {p.brand}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono font-bold text-orange-600">{formatCurrency(p.costPrice ?? p.price)}</p>
                      <p className="text-[10px] opacity-40">{p.unit}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Formulário Manual ────────────────────────────── */}
        {tab === 'manual' && (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Tipo</label>
              <div className="flex gap-2 flex-wrap">
                {TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: opt.value })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all',
                      form.type === opt.value
                        ? opt.color + ' border-current'
                        : 'bg-black/5 text-black/40 border-transparent hover:bg-black/10'
                    )}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Descrição *</label>
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
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Unidade</label>
                <select
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.unit}
                  onChange={e => setForm({ ...form, unit: e.target.value })}
                >
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Quantidade</label>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Custo Unit. (R$)</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full p-3.5 bg-black/5 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black text-orange-600"
                  value={form.unitCost}
                  onChange={e => setForm({ ...form, unitCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Total preview */}
            <div className="flex items-center justify-between p-4 bg-black/[0.03] rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-widest opacity-40">Total do Item</span>
              <span className="font-mono text-xl font-black">
                {formatCurrency(Number(form.quantity) * Number(form.unitCost))}
              </span>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Obs. / Especificação</label>
              <textarea
                rows={2}
                placeholder="Normas, marca, especificação técnica..."
                className="w-full p-3 bg-black/5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-black resize-none"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex gap-4 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity">
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
              >
                <Save size={16} /> {editingItem ? 'Salvar Alterações' : 'Adicionar Item'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
