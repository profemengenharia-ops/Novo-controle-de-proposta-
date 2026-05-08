import { useMemo } from 'react';
import { BDIConfig } from '../types';
import { calculateBDI } from '../lib/utils';

export interface PricingItem {
  unitCost: number;
  quantity: number;
}

export interface PricingEngineResult {
  directCost: number;
  indirectCosts: number;
  totalCost: number;
  bdiRate: number;
  calculatedBDI: number;
  suggestedPrice: number;
  taxesValue: number;
  netProfit: number;
  realMarginPercent: string;
  markup: string;
  status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
}

/**
 * Engine de preço canônico.
 * Usa a fórmula multiplicativa do TCU (Acórdão 2622/2013) implementada em calculateBDI().
 *
 *   BDI = [(1 + AC + S+G + R) * (1 + DF) * (1 + L)] / (1 - I) - 1
 *   Preço = CustoTotal * (1 + BDI)
 */
export const usePricingEngine = (
  items: PricingItem[],
  indirectCosts: number,
  bdi: BDIConfig,
): PricingEngineResult => {
  return useMemo(() => {
    const directCost = items.reduce((acc, i) => acc + i.unitCost * i.quantity, 0);
    const totalCost = directCost + indirectCosts;

    const bdiRate = calculateBDI({
      ac: bdi.centralAdmin,
      sg: bdi.insuranceAndGuarantees,
      r: bdi.risks,
      df: bdi.financialExpenses,
      l: bdi.profit,
      i: bdi.taxes,
    });

    const suggestedPrice = totalCost * (1 + bdiRate);
    const taxesValue = suggestedPrice * (bdi.taxes / 100);
    const netProfit = suggestedPrice - totalCost - taxesValue;

    const calculatedBDI = bdiRate * 100;
    const markup = totalCost > 0 ? suggestedPrice / totalCost : 0;
    const realMarginPercent = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;

    const status: 'CRITICAL' | 'WARNING' | 'HEALTHY' =
      realMarginPercent < 5 ? 'CRITICAL' : realMarginPercent < 15 ? 'WARNING' : 'HEALTHY';

    return {
      directCost,
      indirectCosts,
      totalCost,
      bdiRate,
      calculatedBDI,
      suggestedPrice,
      taxesValue,
      netProfit,
      markup: markup.toFixed(2),
      realMarginPercent: realMarginPercent.toFixed(2),
      status,
    };
  }, [items, indirectCosts, bdi]);
};
