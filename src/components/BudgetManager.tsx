import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  MoreVertical,
  ArrowUpRight,
  Edit,
  Trash2,
  PackageSearch,
  RefreshCcw,
  X,
  Layers,
  HardHat,
  Inbox,
} from 'lucide-react';
import { Product, BudgetProject } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { usePricingEngine, PricingSettings, PricingItem } from '../hooks/usePricingEngine';
import { inventoryService } from '../services/inventoryService';
import { supplierService } from '../services/supplierService';
import { obraService } from '../services/obraService';
import { BudgetItemModal } from './BudgetItemModal';
import { BudgetProjectList } from './BudgetProjectList';
import { BudgetEditor } from './BudgetEditor';
import { LaborRateManager } from './LaborRateManager';
import { OrcamentosInbox } from './OrcamentosInbox';

type Tab = 'inbox' | 'orcamentos' | 'catalogo' | 'mao_de_obra';

interface BudgetManagerProps {
  onNavigateToProposal?: (proposalId: string) => void;
}

export function BudgetManager({ onNavigateToProposal }: BudgetManagerProps = {}) {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [openProject, setOpenProject] = useState<BudgetProject | null>(null);
  const [inboxCount, setInboxCount] = useState(0);
  const [inboxRefresh, setInboxRefresh] = useState(0);

  // Fetch inbox count for badge
  useEffect(() => {
    obraService.getAll().then(obras => {
      setInboxCount(obras.filter(o => o.status === 'aguardando_orcamento').length);
    });
  }, [inboxRefresh]);

  const handleOpenProject = (project: BudgetProject) => {
    setOpenProject(project);
  };

  const handleAssumeFromInbox = (project: BudgetProject) => {
    setInboxRefresh(r => r + 1);
    setOpenProject(project);
  };

  if (openProject) {
    return (
      <BudgetEditor
        project={openProject}
        onBack={() => { setOpenProject(null); setInboxRefresh(r => r + 1); }}
        onSendToProposal={onNavigateToProposal}
      />
    );
  }

  const tabs = [
    { id: 'inbox' as Tab, label: 'Inbox', icon: <Inbox size={14} />, badge: inboxCount },
    { id: 'orcamentos' as Tab, label: 'Orçamentos', icon: <Layers size={14} /> },
    { id: 'catalogo' as Tab, label: 'Catálogo', icon: <Package size={14} /> },
    { id: 'mao_de_obra' as Tab, label: 'Mão de Obra', icon: <HardHat size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Abas internas */}
      <motion.div
        className="flex items-center gap-2 p-2 bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tabs.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors relative',
              activeTab === item.id
                ? 'bg-white text-[var(--color-brand-primary)] shadow-md'
                : 'text-white hover:bg-white/20'
            )}
          >
            {item.icon} {item.label}
            {item.badge != null && item.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-amber-400 text-black text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow">
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {activeTab === 'inbox' && (
        <OrcamentosInbox
          onAssume={handleAssumeFromInbox}
          refreshSignal={inboxRefresh}
        />
      )}

      {activeTab === 'orcamentos' && (
        <BudgetProjectList onOpen={handleOpenProject} />
      )}

      {activeTab === 'catalogo' && (
        <CatalogoInsumos />
      )}

      {activeTab === 'mao_de_obra' && (
        <LaborRateManager />
      )}
    </div>
  );
}

// ─── Catálogo de Insumos (conteúdo original do BudgetManager) ────────────────

function CatalogoInsumos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const pricingSettings: PricingSettings = {
    taxRate: 0.15,
    adminOverhead: 0.10,
    desiredMargin: 0.20,
    indirectCosts: 1500,
  };

  const pricingItems: PricingItem[] = products.map(p => ({
    unitCost: p.costPrice ?? 0,
    quantity: p.stockLevel,
  }));

  const pricingResult = usePricingEngine(pricingItems, pricingSettings);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['all', ...cats];
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);
    const data = await inventoryService.getAllProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este insumo/serviço do catálogo?')) {
      await inventoryService.deleteProduct(id);
      loadProducts();
    }
  };

  const handleSyncWithSupplier = async () => {
    const baseUrl = prompt('Digite a URL base da API do fornecedor:', 'https://api.supplier.com/v1');
    const apiKey = prompt('Digite a chave da API:');
    if (!baseUrl || !apiKey) { alert('Configuração de fornecedor incompleta.'); return; }
    setIsSyncing(true);
    try {
      const supplierData = await supplierService.fetchSupplierStock({ baseUrl, apiKey, supplierName: 'Fornecedor Integrado' });
      alert(`${supplierData.length} insumos encontrados. Sincronizando...`);
      const updatesList: {id: string, updates: Partial<Product>}[] = [];
      for (const item of supplierData) {
        const local = products.find(p => p.name.toLowerCase() === item.name?.toLowerCase());
        if (local) {
          updatesList.push({
            id: local.id,
            updates: {
              price: item.price,
              costPrice: item.costPrice,
              supplier: { ...local.supplier, name: item.supplier?.name || '', leadTime: item.supplier?.leadTime },
            }
          });
        }
      }
      if (updatesList.length > 0) {
        await inventoryService.updateProductsBatch(updatesList);
      }
      await loadProducts();
      alert('Sincronização concluída!');
    } catch (error) {
      console.error(error);
      alert('Erro ao sincronizar com fornecedor.');
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500/40" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, marca ou fornecedor..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-10 py-4 bg-white border border-black/5 rounded-2xl text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-black/20 font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-orange-50 rounded-lg text-orange-400 hover:text-orange-600 transition-all">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSyncWithSupplier}
            disabled={isSyncing}
            className="flex-1 md:flex-none px-4 py-3 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Sincronizando...' : 'Sinc. Fornecedor'}
          </button>
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex-[2] md:flex-none bg-black text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/10 hover:opacity-90 transition-all"
          >
            <Plus size={18} /> Novo Insumo/Serviço
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap',
              selectedCategory === cat
                ? 'bg-black text-white shadow-lg shadow-black/10'
                : 'bg-black/5 text-black hover:bg-black/10 opacity-60'
            )}
          >
            {cat === 'all' ? 'Todos' : cat}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest opacity-40 border-b border-black/5 bg-black/[0.01]">
                <th className="px-8 py-5">Insumo/Serviço</th>
                <th className="px-8 py-5">Categoria</th>
                <th className="px-8 py-5">Marca</th>
                <th className="px-8 py-5">Disponibilidade</th>
                <th className="px-8 py-5">Preço Unit.</th>
                <th className="px-8 py-5">Margem</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filteredProducts.map(p => {
                const profit = p.price - (p.costPrice || 0);
                const marginPercent = p.price > 0 ? (profit / p.price) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-black/[0.01] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="space-y-1">
                        <p className="font-bold text-sm tracking-tight">{p.name}</p>
                        {p.supplier?.name && (
                          <p className="text-[10px] opacity-40 font-bold uppercase tracking-[0.2em]">{p.supplier.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-0.5 bg-black/5 text-[10px] font-bold uppercase rounded-md">{p.category || 'N/A'}</span>
                    </td>
                    <td className="px-8 py-5 text-xs font-medium uppercase opacity-60">{p.brand}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <span className={cn('font-mono font-bold px-2 py-0.5 rounded', p.stockLevel <= (p.minStockLevel || 5) ? 'bg-red-50 text-red-500' : 'bg-black/5 text-black')}>
                          {p.stockLevel} {p.unit}
                        </span>
                        {p.stockLevel <= (p.minStockLevel || 5) && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-8 py-5 font-mono text-sm font-bold">{formatCurrency(p.price)}</td>
                    <td className="px-8 py-5">
                      <span className={cn('text-xs font-bold px-2 py-1 rounded-full', marginPercent > 30 ? 'bg-green-50 text-green-600' : marginPercent > 15 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600')}>
                        {marginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right relative">
                      <button onClick={() => setActiveMenu(activeMenu === p.id ? null : p.id)} className="p-2 hover:bg-black/5 rounded-lg opacity-40 group-hover:opacity-100 transition-all">
                        <MoreVertical size={18} />
                      </button>
                      {activeMenu === p.id && (
                        <div className="absolute right-8 top-12 bg-white border border-black/5 shadow-2xl rounded-xl py-2 w-40 z-50 animate-in fade-in zoom-in-95" onMouseLeave={() => setActiveMenu(null)}>
                          <button onClick={() => { setEditingProduct(p); setIsModalOpen(true); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-black/5 font-bold transition-colors">
                            <Edit size={14} className="opacity-40" /> Editar
                          </button>
                          <button onClick={() => { handleDelete(p.id); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-red-50 text-red-600 font-bold transition-colors">
                            <Trash2 size={14} className="opacity-40" /> Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredProducts.length === 0 && !loading && (
          <div className="p-20 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-black/5 rounded-full flex items-center justify-center opacity-40"><PackageSearch size={24} /></div>
            <div>
              <p className="text-sm font-bold opacity-60">Nenhum insumo/serviço encontrado.</p>
              <p className="text-xs opacity-40">Tente ajustar sua busca ou adicione um novo.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Preço Sugerido (BDI)</p>
            <h4 className="text-3xl font-bold text-blue-900 tracking-tight">{pricingResult ? formatCurrency(pricingResult.suggestedPrice) : '-'}</h4>
            <p className="text-xs opacity-60">Margem Real: {pricingResult ? pricingResult.realMarginPercent + '%' : '-'} | Status: {pricingResult ? pricingResult.status : '-'}</p>
          </div>
          <div className="bg-blue-100 p-4 rounded-2xl text-blue-600"><ArrowUpRight size={24} /></div>
        </div>
        <div className="p-8 bg-red-50 rounded-3xl border border-red-100 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">Insumos com Baixa Disponibilidade</p>
            <h4 className="text-3xl font-bold text-red-900 tracking-tight">{products.filter(p => p.stockLevel <= (p.minStockLevel || 5)).length}</h4>
          </div>
          <div className="bg-red-100 p-4 rounded-2xl text-red-600">
            <AlertTriangle className={products.filter(p => p.stockLevel <= (p.minStockLevel || 5)).length > 0 ? 'animate-pulse' : ''} size={24} />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <BudgetItemModal
          editingProduct={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onComplete={() => { loadProducts(); setIsModalOpen(false); }}
        />
      )}
    </div>
  );
}
