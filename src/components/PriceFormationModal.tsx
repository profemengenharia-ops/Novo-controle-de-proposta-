import React from 'react';
import { X, Calculator, PieChart, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react';
import { PriceFormation } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { usePricingEngine } from '../hooks/usePricingEngine';
import { motion, AnimatePresence } from 'motion/react';

interface PriceFormationModalProps {
  initialData?: PriceFormation;
  onSave: (data: PriceFormation) => void;
  onClose: () => void;
  itemDescription: string;
}

export function PriceFormationModal({ initialData, onSave, onClose, itemDescription }: PriceFormationModalProps) {
  const [cd, setCd] = React.useState(initialData?.directCosts || {
    materials: 0,
    labor: 0,
    equipment: 0,
    subcontractors: 0
  });

  const [ci, setCi] = React.useState(initialData?.indirectCosts || {
    localAdmin: 0,
    mobilization: 0,
    siteOffice: 0
  });

  const [bdiConfig, setBdiConfig] = React.useState(initialData?.bdi || {
    centralAdmin: 3,
    financialExpenses: 1.5,
    insuranceAndGuarantees: 1,
    risks: 2,
    profit: 15,
    taxes: 13.15
  });

  const totalCD = Object.values(cd).reduce((a, b) => a + b, 0);
  const totalCI = Object.values(ci).reduce((a, b) => a + b, 0);
  const totalCost = totalCD + totalCI;

  const {
    suggestedPrice: finalPrice,
    netProfit,
    realMarginPercent: marginPercent,
    status
  } = usePricingEngine(
    [
      { unitCost: cd.materials, quantity: 1 },
      { unitCost: cd.labor, quantity: 1 },
      { unitCost: cd.equipment, quantity: 1 },
      { unitCost: cd.subcontractors, quantity: 1 }
    ],
    {
      taxRate: bdiConfig.taxes / 100,
      adminOverhead: (bdiConfig.centralAdmin + bdiConfig.financialExpenses + bdiConfig.insuranceAndGuarantees + bdiConfig.risks) / 100,
      desiredMargin: bdiConfig.profit / 100,
      indirectCosts: totalCI
    }
  );

  const calculatedBDI = totalCost > 0 ? (finalPrice / totalCost) - 1 : 0;
  const marginHealth = status === 'CRITICAL' ? 'critical' : status === 'WARNING' ? 'warning' : 'healthy';

  const handleSave = () => {
    onSave({
      directCosts: cd,
      indirectCosts: ci,
      bdi: bdiConfig,
      calculatedBDI,
      totalDirectCost: totalCD,
      totalIndirectCost: totalCI,
      finalPrice
    });
  };

  const healthColors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };

  const healthTexts = {
    healthy: 'Margem Saudável',
    warning: 'Margem em Risco',
    critical: 'Margem Crítica - Erosão de Lucro'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[2.5rem] shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-neutral-900 uppercase">Engenharia de Custos</h2>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{itemDescription}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors text-neutral-400 hover:text-neutral-900">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Column: Direct and Indirect Costs */}
          <div className="space-y-10">
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <PieChart size={18} className="text-orange-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">1. Custos Diretos (CD)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CostInput label="Materiais" value={cd.materials} onChange={val => setCd({...cd, materials: val})} />
                <CostInput label="Mão de Obra (MO)" value={cd.labor} onChange={val => setCd({...cd, labor: val})} />
                <CostInput label="Equipamentos" value={cd.equipment} onChange={val => setCd({...cd, equipment: val})} />
                <CostInput label="Subempreiteiros" value={cd.subcontractors} onChange={val => setCd({...cd, subcontractors: val})} />
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total CD</span>
                <span className="text-sm font-black text-neutral-900">{formatCurrency(totalCD)}</span>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <TrendingUp size={18} className="text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">2. Custos Indiretos (CI)</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <CostInput label="Administração Local" value={ci.localAdmin} onChange={val => setCi({...ci, localAdmin: val})} />
                <CostInput label="Mobilização / Desmobilização" value={ci.mobilization} onChange={val => setCi({...ci, mobilization: val})} />
                <CostInput label="Canteiro de Obras" value={ci.siteOffice} onChange={val => setCi({...ci, siteOffice: val})} />
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total CI</span>
                <span className="text-sm font-black text-neutral-900">{formatCurrency(totalCI)}</span>
              </div>
            </section>
          </div>

          {/* Right Column: BDI and Final Result */}
          <div className="space-y-10">
            <section className="space-y-6">
              <div className="flex items-center gap-2 border-b border-neutral-100 pb-2">
                <ShieldCheck size={18} className="text-green-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">3. BDI e Tributos (%)</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <PercentInput label="Adm. Central (AC)" value={bdiConfig.centralAdmin} onChange={val => setBdiConfig({...bdiConfig, centralAdmin: val})} />
                <PercentInput label="Desp. Financeiras (DF)" value={bdiConfig.financialExpenses} onChange={val => setBdiConfig({...bdiConfig, financialExpenses: val})} />
                <PercentInput label="Seguros/Garanti (S+G)" value={bdiConfig.insuranceAndGuarantees} onChange={val => setBdiConfig({...bdiConfig, insuranceAndGuarantees: val})} />
                <PercentInput label="Riscos (R)" value={bdiConfig.risks} onChange={val => setBdiConfig({...bdiConfig, risks: val})} />
                <PercentInput label="Lucro (L)" value={bdiConfig.profit} onChange={val => setBdiConfig({...bdiConfig, profit: val})} />
                <PercentInput label="Tributos (I)" value={bdiConfig.taxes} onChange={val => setBdiConfig({...bdiConfig, taxes: val})} />
              </div>
              
              <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-500">BDI Calculado</span>
                <span className="text-4xl font-black text-orange-600 tracking-tighter">{(calculatedBDI * 100).toFixed(2)}%</span>
              </div>
            </section>

            <section className="p-8 bg-neutral-900 text-white rounded-[2rem] space-y-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">Preço de Venda Final (PV)</h3>
                  <p className="text-4xl font-black tracking-tighter tabular-nums">{formatCurrency(finalPrice)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2", healthColors[marginHealth])}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    {healthTexts[marginHealth]}
                  </div>
                  <span className="text-xs font-bold opacity-40 uppercase tracking-widest">{marginPercent}% de Margem</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-6 border-t border-white/10">
                <div className="flex justify-between text-xs opacity-50">
                  <span>Custo Base (CD + CI)</span>
                  <span className="font-mono">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-50">
                  <span>Lucro Líquido Previsto</span>
                  <span className="font-mono text-green-400">{formatCurrency(netProfit)}</span>
                </div>
                <div className="flex justify-between text-xs opacity-50">
                  <span>Margem BDI Aplicada</span>
                  <span className="font-mono">{formatCurrency(finalPrice - totalCost)}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="p-8 bg-neutral-50 flex items-center justify-between border-t border-neutral-100">
          <div className="flex items-center gap-3 text-neutral-400">
            <AlertCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider italic">Clique em salvar para aplicar este preço ao item.</span>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-8 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest text-neutral-500 hover:bg-black/5 transition-all">
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="px-8 py-3 bg-black text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-xl shadow-black/10 hover:opacity-90 transition-all active:scale-95"
            >
              Confirmar Preço
            </button>
          </div>
        </div>
      </motion.div>
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
