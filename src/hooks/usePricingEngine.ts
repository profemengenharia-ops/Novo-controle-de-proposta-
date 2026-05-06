import { useMemo } from 'react';

export interface PricingSettings {
  taxRate: number;        // Ex: 0.15 para 15%
  adminOverhead: number;  // Custos fixos/adm (Ex: 0.10)
  desiredMargin: number;  // Lucro líquido pretendido (Ex: 0.20)
  indirectCosts: number;  // Valor nominal de logística/EPIs (Ex: 1500)
}

export interface PricingItem {
  unitCost: number;
  quantity: number;
}

/**
 * usePricingEngine
 * 
 * Este hook calcula o preço de venda usando o método do Markup Divisor, 
 * que é o padrão para garantir que as porcentagens de impostos e lucro 
 * incidam sobre o preço final, e não apenas sobre o custo.
 */
export const usePricingEngine = (items: PricingItem[], settings: PricingSettings) => {
  const calculation = useMemo(() => {
    // 1. Custo Direto (Soma de Materiais e Mão de Obra)
    const directCost = items.reduce(
      (acc, item) => acc + (item.unitCost * item.quantity),
      0
    );

    // 2. Custo Total de Execução
    const totalCost = directCost + settings.indirectCosts;

    /**
     * 3. Cálculo do BDI Divisor
     * Fórmula: Preço = Custo / (1 - Σ taxas)
     * Onde taxas = Impostos + Adm + Margem Desejada
     */
    const totalFeesRate = settings.taxRate + settings.adminOverhead + settings.desiredMargin;
    
    // Trava de segurança para evitar divisão por zero ou negativa
    const divisor = totalFeesRate >= 1 ? 0.01 : 1 - totalFeesRate;
    
    const suggestedPrice = totalCost / divisor;

    // 4. Detalhamento dos Resultados
    const taxesValue = suggestedPrice * settings.taxRate;
    const adminValue = suggestedPrice * settings.adminOverhead;
    const netProfit = suggestedPrice - totalCost - taxesValue - adminValue;
    
    // 5. Indicadores de Saúde Financeira
    const markup = totalCost > 0 ? suggestedPrice / totalCost : 0;
    const realMarginPercent = suggestedPrice > 0 ? (netProfit / suggestedPrice) * 100 : 0;

    return {
      directCost,
      indirectCosts: settings.indirectCosts,
      totalCost,
      suggestedPrice,
      taxesValue,
      adminValue,
      netProfit,
      markup: markup.toFixed(2),
      realMarginPercent: realMarginPercent.toFixed(2),
      // Alerta de saúde financeira
      status: realMarginPercent < 5 ? 'CRITICAL' : realMarginPercent < 15 ? 'WARNING' : 'HEALTHY'
    };
  }, [items, settings]);

  return calculation;
};
