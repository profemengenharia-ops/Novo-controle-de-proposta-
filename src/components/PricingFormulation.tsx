import React from 'react';
import { Proposal, GlobalPriceFormation, PricingBudgetItem } from '../types';
import { Plus, Trash2, Calculator, TrendingUp, DollarSign, PieChart, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';
import { usePricingEngine } from '../hooks/usePricingEngine';

interface PricingFormulationProps {
  proposal: Partial<Proposal>;
  onChange: (pricing: GlobalPriceFormation) => void;
  onApply: (totalValue: number) => void;
}

export function PricingFormulation({ proposal, onChange, onApply }: PricingFormulationProps) {
  const [isApplied, setIsApplied] = React.useState(false);
  const pricing = proposal.pricing || {
    items: [],
    indirectCosts: {
      administration: 0,
      mobilization: 0,
      transport: 0,
      food: 0,
      lodging: 0,
      others: 0
    },
    bdi: {
      centralAdmin: 3,
      financialExpenses: 1.5,
      insuranceAndGuarantees: 1,
      risks: 2,
      profit: 15,
      taxes: 13.15
    }
  };

  const addItem = () => {
    const newItem: PricingBudgetItem = {
      id: crypto.randomUUID(),
      name: '',
      type: 'Material',
      unit: 'UN',
      quantity: 1,
      unitCost: 0,
      totalCost: 0
    };
    onChange({ ...pricing, items: [...pricing.items, newItem] });
    setTimeout(() => document.getElementById(`pf-item-${newItem.id}`)?.focus(), 50);
  };

  const removeItem = (id: string) => {
    onChange({ ...pricing, items: pricing.items.filter(item => item.id !== id) });
  };

  const updateItem = (id: string, updates: Partial<PricingBudgetItem>) => {
    const nextItems = pricing.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };
        updated.totalCost = updated.quantity * updated.unitCost;
        return updated;
      }
      return item;
    });
    onChange({ ...pricing, items: nextItems });
  };

  const updateIndirect = (key: keyof GlobalPriceFormation['indirectCosts'], value: number) => {
    onChange({
      ...pricing,
      indirectCosts: { ...pricing.indirectCosts, [key]: value }
    });
  };

  const updateBdi = (key: keyof GlobalPriceFormation['bdi'], value: number) => {
    onChange({
      ...pricing,
      bdi: { ...pricing.bdi, [key]: value }
    });
  };

  const totalIndirectCost = Object.values(pricing.indirectCosts).reduce((acc, val) => acc + val, 0);

  const {
    suggestedPrice,
    netProfit,
    realMarginPercent,
    status,
    calculatedBDI
  } = usePricingEngine(
    pricing.items.map(i => ({ unitCost: i.unitCost, quantity: i.quantity })),
    totalIndirectCost,
    pricing.bdi
  );

  const totalDirectCost = pricing.items.reduce((acc, i) => acc + i.totalCost, 0);
  const totalBaseCost = totalDirectCost + totalIndirectCost;

  const totalsByType = pricing.items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.totalCost;
    return acc;
  }, {} as Record<string, number>);

  const realMargin = Number(realMarginPercent) || 0;

  // Use values from hook
  const salePrice = suggestedPrice;
  const profitValue = netProfit;
  
  const getMarginIndicator = () => {
    if (status === 'CRITICAL') return { color: 'text-red-500', bg: 'bg-red-50', icon: AlertTriangle, label: 'Margem Crítica' };
    if (status === 'WARNING') return { color: 'text-yellow-500', bg: 'bg-yellow-50', icon: Info, label: 'Margem em Risco' };
    return { color: 'text-green-500', bg: 'bg-green-50', icon: CheckCircle2, label: 'Margem Saudável' };
  };

  const indicator = getMarginIndicator();

  React.useEffect(() => {
    // Sync external pricing to internal BDI if needed, 
    // but PricingFormulation is controlled by 'onChange'.
    // Here we just use the calculation results.
  }, [pricing]);

  React.useEffect(() => {
    if (isApplied) {
      const timer = setTimeout(() => setIsApplied(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isApplied]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-neutral-900 uppercase">Formação de Preço</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Estruturação de custos e definição de preço de venda</p>
        </div>
        <button 
          onClick={() => {
            onApply(salePrice);
            setIsApplied(true);
          }}
          disabled={isApplied}
          className={cn(
            "px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-xl active:scale-95",
            isApplied 
              ? "bg-green-500 text-white shadow-green-200 cursor-default" 
              : "bg-black text-white shadow-black/10 hover:opacity-90"
          )}
        >
          {isApplied ? (
            <>
              <CheckCircle2 size={16} />
              Aplicado!
            </>
          ) : (
            <>
              <DollarSign size={16} />
              Aplicar à Proposta
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Budget Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-4 bg-neutral-50/50 border-b border-black/5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <PieChart size={18} className="text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Itens do Orçamento</h3>
              </div>
              <button 
                onClick={addItem}
                className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-primary)] flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Adicionar Item
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase opacity-40 font-bold border-b border-black/5">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 w-32">Tipo</th>
                    <th className="px-4 py-3 w-20 text-center">Unid.</th>
                    <th className="px-4 py-3 w-20 text-center">Qtd.</th>
                    <th className="px-4 py-3 w-32 text-right">Custo Unit.</th>
                    <th className="px-4 py-3 w-32 text-right">Total</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {pricing.items.map((item) => (
                    <tr key={item.id} className="group">
                      <td className="px-4 py-2">
                        <input 
                          id={`pf-item-${item.id}`}
                          type="text" 
                          value={item.name}
                          onChange={e => updateItem(item.id, { name: e.target.value })}
                          className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 font-medium"
                          placeholder="Nome do insumo ou serviço..."
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select 
                          value={item.type}
                          onChange={e => updateItem(item.id, { type: e.target.value as any })}
                          className="w-full bg-transparent border-none p-0 text-xs font-bold uppercase tracking-widest focus:ring-0"
                        >
                          <option value="Material">Material</option>
                          <option value="Mão de Obra">Mão de Obra</option>
                          <option value="Equipamento">Equipamento</option>
                          <option value="Serviço">Serviço</option>
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={item.unit}
                          onChange={e => updateItem(item.id, { unit: e.target.value })}
                          className="w-full bg-transparent border-none p-0 text-center text-xs font-bold uppercase focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-center text-sm font-mono focus:ring-0 font-bold"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          step="0.01"
                          value={item.unitCost}
                          onChange={e => updateItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-transparent border-none p-0 text-right text-sm font-mono focus:ring-0 font-bold"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm font-bold">
                        {formatCurrency(item.totalCost)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => removeItem(item.id)}>
                          <Trash2 size={14} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pricing.items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs opacity-40 italic">
                        Nenhum item adicionado à formação de preço.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Costs Summary */}
        <div className="space-y-8">
          {/* Direct Costs Card */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <PieChart size={18} className="text-orange-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Custos Diretos</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(totalsByType).map(([type, total]) => (
                <div key={type} className="flex justify-between items-center text-sm">
                  <span className="opacity-50 font-bold uppercase text-[10px] tracking-widest">{type}</span>
                  <span className="font-mono font-bold">{formatCurrency(total)}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">Custo Direto Total</span>
                <span className="text-lg font-black tracking-tight">{formatCurrency(totalDirectCost)}</span>
              </div>
            </div>
          </div>

          {/* Indirect Costs Card */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <TrendingUp size={18} className="text-blue-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Custos Indiretos</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CostInput label="Administração" value={pricing.indirectCosts.administration} onChange={v => updateIndirect('administration', v)} />
              <CostInput label="Mobilização" value={pricing.indirectCosts.mobilization} onChange={v => updateIndirect('mobilization', v)} />
              <CostInput label="Transporte" value={pricing.indirectCosts.transport} onChange={v => updateIndirect('transport', v)} />
              <CostInput label="Alimentação" value={pricing.indirectCosts.food} onChange={v => updateIndirect('food', v)} />
              <CostInput label="Hospedagem" value={pricing.indirectCosts.lodging} onChange={v => updateIndirect('lodging', v)} />
              <CostInput label="Outros" value={pricing.indirectCosts.others} onChange={v => updateIndirect('others', v)} />
            </div>
            <div className="pt-3 border-t border-black/5 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Total Indireto</span>
              <span className="text-sm font-bold">{formatCurrency(totalIndirectCost)}</span>
            </div>
          </div>
        </div>

        {/* BDI and Results */}
        <div className="space-y-8">
          {/* BDI Card */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <Calculator size={18} className="text-green-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">BDI (Benefícios e Despesas Indiretas)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PercentInput label="Adm. Central" value={pricing.bdi.centralAdmin} onChange={v => updateBdi('centralAdmin', v)} />
              <PercentInput label="Despesas Financeiras" value={pricing.bdi.financialExpenses} onChange={v => updateBdi('financialExpenses', v)} />
              <PercentInput label="Seguros & Garantias" value={pricing.bdi.insuranceAndGuarantees} onChange={v => updateBdi('insuranceAndGuarantees', v)} />
              <PercentInput label="Riscos" value={pricing.bdi.risks} onChange={v => updateBdi('risks', v)} />
              <PercentInput label="Tributos" value={pricing.bdi.taxes} onChange={v => updateBdi('taxes', v)} />
              <PercentInput label="Margem de Lucro" value={pricing.bdi.profit} onChange={v => updateBdi('profit', v)} />
            </div>
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100/50 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">BDI Calculado (Real)</p>
              <p className="text-2xl font-black text-orange-600 tracking-tighter">{calculatedBDI.toFixed(2)}%</p>
            </div>
            <button className="w-full py-2 text-[8px] font-black uppercase tracking-[0.2em] text-neutral-400 hover:text-neutral-900 transition-colors">
              Salvar Configuração como Padrão
            </button>
          </div>

          {/* Final Result Card */}
          <div className="bg-neutral-900 text-white rounded-2xl shadow-xl p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs opacity-50 uppercase tracking-widest font-bold">
                <span>Custo Direto</span>
                <span>{formatCurrency(totalDirectCost)}</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-50 uppercase tracking-widest font-bold">
                <span>Custo Indireto</span>
                <span>{formatCurrency(totalIndirectCost)}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[10px] opacity-70 uppercase tracking-widest font-bold">
                <span>= Custo Total</span>
                <span>{formatCurrency(totalBaseCost)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Preço de Venda Final</p>
              <h2 className="text-5xl font-black tracking-tighter tabular-nums">{formatCurrency(salePrice)}</h2>
            </div>

              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/10">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Lucro (R$)</p>
                  <p className="text-lg font-black text-green-400">{formatCurrency(netProfit)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mb-1">Margem (%)</p>
                  <p className="text-lg font-black text-green-400">{realMarginPercent}%</p>
                </div>
              </div>

            {/* Visual Chart: Cost vs Profit */}
            <div className="pt-6 space-y-2">
              <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest opacity-40">
                <span>Composição do Preço</span>
                <span>{formatCurrency(salePrice)}</span>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-orange-500 transition-all duration-500" 
                  style={{ width: `${(totalBaseCost / salePrice) * 100 || 0}%` }} 
                  title="Custo"
                />
                <div 
                  className="h-full bg-green-500 transition-all duration-500" 
                  style={{ width: `${(profitValue / salePrice) * 100 || 0}%` }} 
                  title="Lucro"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Custo ({((totalBaseCost / salePrice) * 100 || 0).toFixed(0)}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Lucro ({((profitValue / salePrice) * 100 || 0).toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Card */}
        <div className="lg:col-span-2">
          <div className={cn(
            "p-6 rounded-2xl border flex items-center gap-6 transition-all",
            indicator.bg,
            "border-black/5"
          )}>
            <div className={cn("p-4 rounded-xl bg-white/50", indicator.color)}>
              <indicator.icon size={32} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-xs font-black uppercase tracking-widest", indicator.color)}>
                  {indicator.label}
                </span>
                <span className="w-1 h-1 bg-black/20 rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Análise de Formação</span>
              </div>
              <p className="text-sm font-medium text-neutral-700">
                {realMargin < 10 && "Atenção: Margem abaixo do ideal para este tipo de projeto. Reconsidere os custos diretos ou o BDI."}
                {realMargin >= 10 && realMargin < 20 && "Sua margem está no intervalo de mercado. Verifique os riscos para garantir o lucro."}
                {realMargin >= 20 && "Excelente formação! Margem saudável que permite negociação se necessário."}
              </p>
              {realMargin < 15 && salePrice > 0 && (
                <p className="mt-2 text-xs font-bold text-orange-600">
                  💡 Sugestão: Ajustar preço em {((totalBaseCost / 0.85 - salePrice) / salePrice * 100).toFixed(1)}% para atingir 15% de margem.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostInput({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400 ml-1">{label}</label>
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 group-focus-within:text-neutral-900 transition-colors">R$</span>
        <input 
          type="number" 
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pl-8 pr-3 py-3 bg-neutral-50 border-transparent rounded-xl text-sm font-bold focus:ring-1 focus:ring-neutral-200 focus:bg-white transition-all outline-none"
        />
      </div>
    </div>
  );
}

function PercentInput({ label, value, onChange }: { label: string, value: number, onChange: (val: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400 ml-1">{label}</label>
      <div className="relative group">
        <input 
          type="number" 
          step="0.01"
          value={value === 0 ? '' : value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-full pl-3 pr-8 py-3 bg-neutral-50 border-transparent rounded-xl text-sm font-bold focus:ring-1 focus:ring-neutral-200 focus:bg-white transition-all outline-none"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-neutral-400 group-focus-within:text-neutral-900 transition-colors">%</span>
      </div>
    </div>
  );
}
