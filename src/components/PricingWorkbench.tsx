import React, { useState } from 'react';
import { usePricingEngine, PricingSettings, PricingItem } from '../hooks/usePricingEngine';
import { formatCurrency, cn } from '../lib/utils';

// Tipos de dados esperados
interface ProposalItem {
  description: string;
  quantity: number;
  unitCost: number;
}

interface ProposalData {
  items: ProposalItem[];
  logisticsCost?: number; // custos indiretos (frete, alimentação, etc.)
}

export function PricingWorkbench({ proposalData }: { proposalData: ProposalData }) {
  // Estados de controle BDI
  const [desiredMargin, setDesiredMargin] = useState(0.20); // 20%
  const [taxRate, setTaxRate] = useState(0.15); // Simples (15%) padrão
  const [adminOverhead, setAdminOverhead] = useState(0.10); // 10%

  // Converte items para o formato esperado pelo hook
  const pricingItems: PricingItem[] = proposalData.items.map(item => ({
    unitCost: item.unitCost,
    quantity: item.quantity,
  }));

  const pricing = usePricingEngine(pricingItems, {
    taxRate,
    adminOverhead,
    desiredMargin,
    indirectCosts: proposalData.logisticsCost ?? 0,
  });

  // Tax regimes mapping (simplified)
  const taxOptions = [
    { label: 'Simples (12%)', value: 0.12 },
    { label: 'Lucro Presumido (15%)', value: 0.15 },
    { label: 'Regime Normal (20%)', value: 0.20 },
  ];

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-gray-50 min-h-screen">
      {/* ===================== LEFT: INSUMOS ===================== */}
      <section className="col-span-4 bg-white rounded-xl shadow-sm p-6 overflow-auto max-h-[calc(100vh-2rem)]">
        <h2 className="text-xl font-bold mb-4">Insumos Identificados</h2>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-gray-400 text-sm">
              <th className="pb-2">Item / Sistema</th>
              <th className="pb-2">Qtd</th>
              <th className="pb-2">Custo Unit.</th>
              <th className="pb-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {proposalData.items.map((item, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-3 font-medium">{item.description}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3">R$ {item.unitCost.toFixed(2)}</td>
                <td className="py-3 text-right font-semibold">
                  R$ {(item.quantity * item.unitCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ===================== CENTER: CONTROLES BDI ===================== */}
      <section className="col-span-4 space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-600">
          <h3 className="text-lg font-bold mb-6">Controle de BDI</h3>

          {/* Margem de Lucro */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Margem de Lucro: {(desiredMargin * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.01"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              value={desiredMargin}
              onChange={e => setDesiredMargin(parseFloat(e.target.value))}
            />
          </div>

          {/* Regime Tributário */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Regime Tributário
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value))}
            >
              {taxOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custos Fixos / Administrativo */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custos Fixos / Adm (% da estrutura)
            </label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={adminOverhead}
              onChange={e => setAdminOverhead(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </section>

      {/* ===================== RIGHT: RESULTADO STICKY ===================== */}
      <aside className="col-span-4 sticky top-8 self-start max-h-[calc(100vh-2rem)] overflow-auto">
        <div className={`p-6 rounded-xl shadow-xl ${pricing.status === 'HEALTHY' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} `}>
          <h3 className="text-xl font-bold mb-4">Resumo Comercial</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Custo Direto</span><span>R$ {formatCurrency(pricing.directCost)}</span></div>
            <div className="flex justify-between"><span>Custos Indiretos</span><span>R$ {formatCurrency(pricing.indirectCosts)}</span></div>
            <div className="flex justify-between"><span>Total de Execução</span><span>R$ {formatCurrency(pricing.totalCost)}</span></div>
            <div className="flex justify-between"><span>Impostos ({(pricing.taxRate * 100).toFixed(0)}%)</span><span>R$ {formatCurrency(pricing.taxesValue)}</span></div>
            <div className="flex justify-between"><span>Adm/Overhead ({(pricing.adminOverhead * 100).toFixed(0)}%)</span><span>R$ {formatCurrency(pricing.adminValue)}</span></div>
            <div className="flex justify-between font-medium"><span>Lucro Líquido</span><span>R$ {formatCurrency(pricing.netProfit)}</span></div>
            <div className="flex justify-between text-xl font-black text-blue-700"><span>Preço de Venda</span><span>R$ {formatCurrency(pricing.suggestedPrice)}</span></div>
          </div>
          <div className="mt-4 p-2 text-center rounded-md "
               style={{ backgroundColor: pricing.status === 'HEALTHY' ? '#d1fae5' : '#fee2e2' }}>
            <span className={`font-bold ${pricing.status === 'HEALTHY' ? 'text-green-800' : 'text-red-800'}`}>Status: {pricing.status}</span>
          </div>
          <button className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
            Gerar PDF & Enviar
          </button>
        </div>
      </aside>
    </div>
  );
}
