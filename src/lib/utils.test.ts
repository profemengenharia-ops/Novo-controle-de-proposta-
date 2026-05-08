import { describe, it, expect } from 'vitest';
import { calculateBDI, safeParseJSON, formatDate, formatCurrency } from './utils';

describe('calculateBDI', () => {
  it('aplica a fórmula multiplicativa do TCU', () => {
    // AC=4, S+G=0.8, R=1, DF=1.2, L=7.5, I=8.65
    // (1.058 × 1.012 × 1.075) / 0.9135 - 1 ≈ 0.2599 (~25.99%)
    const bdi = calculateBDI({ ac: 4, sg: 0.8, r: 1, df: 1.2, l: 7.5, i: 8.65 });
    expect(bdi).toBeCloseTo(0.2599, 3);
  });

  it('retorna zero se denominador zero (impostos = 100%)', () => {
    const bdi = calculateBDI({ ac: 0, sg: 0, r: 0, df: 0, l: 0, i: 100 });
    expect(bdi).toBe(0);
  });

  it('cresce monotônico com o lucro', () => {
    const a = calculateBDI({ ac: 3, sg: 1, r: 2, df: 1.5, l: 5, i: 13.15 });
    const b = calculateBDI({ ac: 3, sg: 1, r: 2, df: 1.5, l: 15, i: 13.15 });
    const c = calculateBDI({ ac: 3, sg: 1, r: 2, df: 1.5, l: 25, i: 13.15 });
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('retorna zero quando todos os parâmetros são zero', () => {
    const bdi = calculateBDI({ ac: 0, sg: 0, r: 0, df: 0, l: 0, i: 0 });
    expect(bdi).toBeCloseTo(0, 8);
  });
});

describe('safeParseJSON', () => {
  it('parseia JSON válido', () => {
    expect(safeParseJSON('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeParseJSON('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('extrai JSON balanceado quando há texto antes/depois', () => {
    const text = 'Aqui está: {"answer": [1,2,3]} fim.';
    expect(safeParseJSON(text, null)).toEqual({ answer: [1, 2, 3] });
  });

  it('escolhe o primeiro bloco balanceado quando há múltiplos', () => {
    const text = '{"meta":"x"} mas o array é: [1,2,3]';
    expect(safeParseJSON(text, null)).toEqual({ meta: 'x' });
  });

  it('ignora chaves dentro de strings', () => {
    expect(safeParseJSON('{"key":"valor com }"}', null)).toEqual({ key: 'valor com }' });
  });

  it('retorna default para texto inválido', () => {
    expect(safeParseJSON('totalmente quebrado', { fallback: true })).toEqual({ fallback: true });
    expect(safeParseJSON('', [])).toEqual([]);
  });
});

describe('formatDate', () => {
  it('formata strings ISO em pt-BR', () => {
    expect(formatDate('2026-05-06T10:00:00.000Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('aceita objeto Date', () => {
    expect(formatDate(new Date('2024-01-15'))).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('retorna N/A para falsy', () => {
    expect(formatDate(null)).toBe('N/A');
    expect(formatDate(undefined)).toBe('N/A');
    expect(formatDate('')).toBe('N/A');
  });

  it('retorna "Data inválida" para entrada inválida', () => {
    expect(formatDate('not-a-date')).toBe('Data inválida');
  });
});

describe('formatCurrency', () => {
  it('formata R$ com 2 casas decimais', () => {
    expect(formatCurrency(1234.5)).toMatch(/R\$\s?1\.234,50/);
    expect(formatCurrency(0)).toMatch(/R\$\s?0,00/);
  });
});
