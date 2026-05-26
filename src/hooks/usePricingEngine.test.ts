import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePricingEngine } from './usePricingEngine';
import { BDIConfig } from '../types';

const baseBDI: BDIConfig = {
  centralAdmin: 4,
  financialExpenses: 1.2,
  insuranceAndGuarantees: 0.8,
  risks: 1,
  profit: 7.5,
  taxes: 8.65,
};

describe('usePricingEngine', () => {
  it('zera saídas para itens vazios', () => {
    const { result } = renderHook(() => usePricingEngine([], 0, baseBDI));
    expect(result.current.directCost).toBe(0);
    expect(result.current.totalCost).toBe(0);
    expect(result.current.suggestedPrice).toBe(0);
  });

  it('soma custos diretos e indiretos', () => {
    const items = [
      { unitCost: 100, quantity: 2 },
      { unitCost: 50, quantity: 4 },
    ];
    const { result } = renderHook(() => usePricingEngine(items, 100, baseBDI));
    expect(result.current.directCost).toBe(400); // 100*2 + 50*4
    expect(result.current.totalCost).toBe(500);
  });

  it('aplica BDI usando a fórmula multiplicativa do TCU', () => {
    const items = [{ unitCost: 1000, quantity: 1 }];
    const { result } = renderHook(() => usePricingEngine(items, 0, baseBDI));
    // BDI ~25.99% → preço ~ 1259.9
    expect(result.current.suggestedPrice).toBeCloseTo(1259.9, 0);
    expect(result.current.calculatedBDI).toBeCloseTo(25.99, 1);
  });

  it('classifica status pela margem real', () => {
    // Sem lucro/BDI → margem crítica
    const noBDI: BDIConfig = { ...baseBDI, profit: 0, taxes: 0, centralAdmin: 0, financialExpenses: 0, insuranceAndGuarantees: 0, risks: 0 };
    const { result } = renderHook(() => usePricingEngine([{ unitCost: 1000, quantity: 1 }], 0, noBDI));
    expect(result.current.status).toBe('CRITICAL');
  });
});
