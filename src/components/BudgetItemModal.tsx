import React, { useState } from 'react';
import { Product } from '../types';
import { inventoryService } from '../services/inventoryService';
import { X, Save, ClipboardList, Tag, Hash, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryItemModalProps {
  onClose: () => void;
  onComplete: () => void;
  editingProduct?: Product | null;
}

export function BudgetItemModal({ onClose, onComplete, editingProduct }: InventoryItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [formData, setFormData] = useState({
    name: editingProduct?.name || '',
    brand: editingProduct?.brand || '',
    category: editingProduct?.category || '',
    description: editingProduct?.description || '',
    unit: editingProduct?.unit || 'UN',
    stockLevel: editingProduct?.stockLevel || 0,
    minStockLevel: editingProduct?.minStockLevel || 5,
    price: editingProduct?.price || 0,
    costPrice: editingProduct?.costPrice || 0,
    supplier: {
      name: editingProduct?.supplier?.name || '',
      contact: editingProduct?.supplier?.contact || '',
      leadTime: editingProduct?.supplier?.leadTime || '',
    },
    location: editingProduct?.location || '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.price <= 0) {
      setPriceError('O preço de venda deve ser maior que zero.');
      return;
    }
    
    setPriceError('');
    setLoading(true);
    try {
      if (editingProduct) {
        await inventoryService.updateProduct(editingProduct.id, formData as any);
      } else {
        await inventoryService.addProduct(formData as any);
      }
      onComplete();
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 bg-black text-white flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="bg-white/10 p-3 rounded-2xl">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">
                  {editingProduct ? 'Editar Insumo/Serviço' : 'Novo Insumo no Catálogo'}
                </h3>
                <p className="text-xs opacity-40 font-bold uppercase tracking-widest">Gestão de Custos e Orçamentos</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
             <X size={24} />
           </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Nome do Insumo / Serviço</label>
                <div className="relative">
                  <ClipboardList size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" />
                  <input 
                    required
                    type="text"
                    placeholder="Ex: Bomba Principal 60CV ou Serviço de Solda"
                    className="w-full p-4 pl-12 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
              </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Marca / Fabricante</label>
                <input 
                  required
                  type="text"
                  placeholder="Fabricante"
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-medium"
                  value={formData.brand}
                  onChange={e => setFormData({...formData, brand: e.target.value})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Categoria</label>
                <select 
                  required
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  <option value="">Selecione...</option>
                  <option value="Bombas">Bombas & Motores</option>
                  <option value="Hidráulica">Hidráulica & Tubulação</option>
                  <option value="Elétrica">Elétrica & Painéis</option>
                  <option value="Alarmes">Alarmes & Sensores</option>
                  <option value="Ferramentas">Ferramentas</option>
                  <option value="Consumíveis">Consumíveis</option>
                </select>
             </div>

             <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Descrição Técnica</label>
                <textarea 
                  rows={2}
                  placeholder="Detalhes adicionais do produto..."
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-medium"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Unidade</label>
                <select 
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                >
                  <option value="UN">Unidade (UN)</option>
                  <option value="MT">Metros (MT)</option>
                  <option value="KG">Quilos (KG)</option>
                  <option value="PC">Peça (PC)</option>
                  <option value="CX">Caixa (CX)</option>
                  <option value="L">Litros (L)</option>
                </select>
             </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Disponibilidade / Lead Time</label>
                <input 
                  type="text"
                  placeholder="Ex: Pronta entrega ou 5 dias"
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-medium"
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Estoque Atual</label>
                <input 
                  required
                  type="number"
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                  value={formData.stockLevel}
                  onChange={e => setFormData({...formData, stockLevel: parseInt(e.target.value) || 0})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Estoque Mínimo (Alerta)</label>
                <input 
                  required
                  type="number"
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                  value={formData.minStockLevel}
                  onChange={e => setFormData({...formData, minStockLevel: parseInt(e.target.value) || 0})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Preço de Custo (R$)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold"
                  value={formData.costPrice}
                  onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})}
                />
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Preço de Venda / Tabela (R$)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  className={`w-full p-4 bg-black/5 rounded-2xl border-transparent focus:ring-2 focus:ring-black text-sm font-bold text-[var(--color-brand-primary)] ${priceError ? 'ring-2 ring-red-500' : ''}`}
                  value={formData.price}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setFormData({...formData, price: val});
                    if (val > 0) setPriceError('');
                  }}
                />
                {priceError && (
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{priceError}</p>
                )}
             </div>

             <div className="space-y-4 col-span-1 md:col-span-2 pt-4 border-t border-black/5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest opacity-40">Informações do Fornecedor</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold opacity-30">Nome</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-black text-xs font-medium"
                      value={formData.supplier.name}
                      onChange={e => setFormData({...formData, supplier: {...formData.supplier, name: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold opacity-30">Contato / Tel</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-black text-xs font-medium"
                      value={formData.supplier.contact}
                      onChange={e => setFormData({...formData, supplier: {...formData.supplier, contact: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold opacity-30">Lead Time (Entrega)</label>
                    <input 
                      type="text"
                      placeholder="Ex: 5 dias"
                      className="w-full p-3 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-black text-xs font-medium"
                      value={formData.supplier.leadTime}
                      onChange={e => setFormData({...formData, supplier: {...formData.supplier, leadTime: e.target.value}})}
                    />
                  </div>
                </div>
             </div>
           </div>

           <div className="pt-6 flex gap-4">
              <button 
                type="button" 
                onClick={onClose}
                className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all shadow-xl shadow-black/10"
              >
                {loading ? 'Processando...' : (editingProduct ? 'Atualizar Insumo' : 'Adicionar ao Catálogo')}
                <Save size={18} />
              </button>
           </div>
        </form>
      </motion.div>
    </div>
  );
}
