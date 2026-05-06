import React, { useMemo } from 'react';
import { X, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { BudgetStage, BudgetLineType } from '../types';
import { formatCurrency, cn } from '../lib/utils';

interface Props {
  stages: BudgetStage[];
  totalDirectCost: number;
  onClose: () => void;
}

type ABCClass = 'A' | 'B' | 'C';

const CLASS_COLOR: Record<ABCClass, string> = {
  A: 'bg-red-50 text-red-700 border-red-200',
  B: 'bg-orange-50 text-orange-700 border-orange-200',
  C: 'bg-green-50 text-green-700 border-green-200',
};

const CLASS_BAR: Record<ABCClass, string> = {
  A: 'bg-red-500',
  B: 'bg-orange-400',
  C: 'bg-green-500',
};

const TYPE_LABEL: Record<BudgetLineType, string> = {
  material:    'Material',
  mao_de_obra: 'Mão de Obra',
  servico:     'Serviço',
  equipamento: 'Equipamento',
};

function getClass(cumulative: number): ABCClass {
  if (cumulative <= 80) return 'A';
  if (cumulative <= 95) return 'B';
  return 'C';
}

export function BudgetCurvaABC({ stages, totalDirectCost, onClose }: Props) {
  const ranked = useMemo(() => {
    // Flatten all items across stages, annotate with stage name
    const all = stages.flatMap(s =>
      s.items.map(i => ({ ...i, stageName: s.name }))
    );
    // Sort descending by totalCost
    all.sort((a, b) => b.totalCost - a.totalCost);

    // Compute cumulative percentage
    let cumSum = 0;
    return all.map((item, idx) => {
      cumSum += item.totalCost;
      const pct = totalDirectCost > 0 ? (item.totalCost / totalDirectCost) * 100 : 0;
      const cumPct = totalDirectCost > 0 ? (cumSum / totalDirectCost) * 100 : 0;
      const cls = getClass(cumPct);
      return { ...item, rank: idx + 1, pct, cumPct, cls };
    });
  }, [stages, totalDirectCost]);

  const counts = useMemo(() => ({
    A: ranked.filter(r => r.cls === 'A').length,
    B: ranked.filter(r => r.cls === 'B').length,
    C: ranked.filter(r => r.cls === 'C').length,
  }), [ranked]);

  const totals = useMemo(() => ({
    A: ranked.filter(r => r.cls === 'A').reduce((s, r) => s + r.totalCost, 0),
    B: ranked.filter(r => r.cls === 'B').reduce((s, r) => s + r.totalCost, 0),
    C: ranked.filter(r => r.cls === 'C').reduce((s, r) => s + r.totalCost, 0),
  }), [ranked]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 bg-black text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl"><BarChart2 size={20} /></div>
            <div>
              <h3 className="text-lg font-bold">Curva ABC de Insumos</h3>
              <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">Classificação por impacto no custo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-black/5 shrink-0">
          {(['A', 'B', 'C'] as ABCClass[]).map(cls => (
            <div key={cls} className={cn('rounded-2xl border p-5', CLASS_COLOR[cls])}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-widest">Classe {cls}</span>
                <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border', CLASS_COLOR[cls])}>
                  {cls}
                </span>
              </div>
              <p className="text-2xl font-black">{counts[cls]} iten{counts[cls] !== 1 ? 's' : ''}</p>
              <p className="text-xs font-mono mt-0.5 opacity-70">{formatCurrency(totals[cls])}</p>
              <p className="text-[10px] font-bold mt-1 opacity-60">
                {cls === 'A' ? 'Concentram ~80% do custo' : cls === 'B' ? '80–95% acumulado' : '95–100% acumulado'}
              </p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-6 py-3 bg-black/[0.01] border-b border-black/5 text-[10px] font-bold uppercase tracking-widest opacity-40 shrink-0">
          <span>Rank</span>
          <span className="flex-1">Descrição</span>
          <span className="w-24 text-right">Etapa</span>
          <span className="w-20 text-right">Tipo</span>
          <span className="w-24 text-right">Total</span>
          <span className="w-16 text-right">%</span>
          <span className="w-20 text-right">Acumulado</span>
          <span className="w-16 text-right">Classe</span>
          <span className="w-32">Barra</span>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1">
          {ranked.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm opacity-40 font-bold">Nenhum item no orçamento.</p>
            </div>
          ) : ranked.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-6 px-6 py-3.5 border-b border-black/[0.04] hover:bg-black/[0.01] transition-colors"
            >
              {/* Rank */}
              <span className="text-sm font-black w-8 text-black/30">#{item.rank}</span>

              {/* Description */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{item.description}</p>
                {item.notes && <p className="text-[10px] opacity-30 truncate">{item.notes}</p>}
              </div>

              {/* Stage */}
              <span className="w-24 text-right text-[10px] font-bold opacity-40 truncate">{item.stageName}</span>

              {/* Type */}
              <span className="w-20 text-right text-[10px] font-bold opacity-50">{TYPE_LABEL[item.type as BudgetLineType]}</span>

              {/* Total */}
              <span className="w-24 text-right font-mono text-sm font-bold">{formatCurrency(item.totalCost)}</span>

              {/* Pct */}
              <span className="w-16 text-right text-xs font-mono font-bold opacity-60">{item.pct.toFixed(1)}%</span>

              {/* Cumulative */}
              <span className="w-20 text-right text-xs font-mono font-bold opacity-60">{item.cumPct.toFixed(1)}%</span>

              {/* Class badge */}
              <span className={cn('w-16 text-center text-xs font-black px-2 py-1 rounded-lg border', CLASS_COLOR[item.cls])}>
                {item.cls}
              </span>

              {/* Bar */}
              <div className="w-32 bg-black/5 rounded-full h-2 overflow-hidden">
                <div
                  className={cn('h-2 rounded-full', CLASS_BAR[item.cls])}
                  style={{ width: `${Math.min(item.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/5 flex items-center justify-between shrink-0">
          <p className="text-[10px] opacity-30 font-bold uppercase tracking-widest">
            Método Pareto · {ranked.length} itens · CD = {formatCurrency(totalDirectCost)}
          </p>
          <button onClick={onClose} className="px-5 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-all">
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
