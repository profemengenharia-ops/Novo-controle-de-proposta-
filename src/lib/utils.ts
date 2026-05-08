import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Calculates BDI (Benefícios e Despesas Indiretas)
 * Formula: BDI = { [ (1 + AC + S + R + G) * (1 + DF) * (1 + L) ] / (1 - I) } - 1
 * 
 * AC: Administração Central
 * S+G: Seguros e Garantias
 * R: Riscos e Contingências
 * DF: Despesas Financeiras
 * L: Lucro
 * I: Tributos (ISS, PIS/COFINS, CPRB)
 */
export function calculateBDI(config: {
  ac: number; // Administracao Central %
  sg: number; // Seguros e Garantias %
  r: number;  // Riscos %
  df: number; // Despesas Financeiras %
  l: number;  // Lucro %
  i: number;  // Impostos %
}): number {
  const { ac, sg, r, df, l, i } = config;
  
  const fac = ac / 100;
  const fsg = sg / 100;
  const fr = r / 100;
  const fdf = df / 100;
  const fl = l / 100;
  const fi = i / 100;

  const numerator = (1 + fac + fsg + fr) * (1 + fdf) * (1 + fl);
  const denominator = (1 - fi);
  
  if (denominator === 0) return 0;
  return (numerator / denominator) - 1;
}

/**
 * Tenta extrair o primeiro bloco JSON balanceado da string.
 * Útil para respostas de IA com texto cercando o JSON.
 */
function extractBalancedJSON(text: string): string | null {
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '{' && ch !== '[') continue;
    const open = ch;
    const close = ch === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === open) depth++;
      else if (c === close) {
        depth--;
        if (depth === 0) return text.slice(i, j + 1);
      }
    }
  }
  return null;
}

export function safeParseJSON<T>(text: string, defaultValue: T): T {
  if (!text) return defaultValue;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const candidate = extractBalancedJSON(trimmed);
    if (candidate) {
      try {
        return JSON.parse(candidate);
      } catch (innerError) {
        console.error('Failed to parse JSON even after extraction:', innerError);
      }
    }
    return defaultValue;
  }
}
