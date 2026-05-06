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

export function formatDate(dateInput: any) {
  if (!dateInput) return 'N/A';
  
  let date: Date;
  
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === 'string') {
    date = new Date(dateInput);
  } else if (dateInput && typeof dateInput.toDate === 'function') {
    // Handle Firestore Timestamp
    date = dateInput.toDate();
  } else if (dateInput && dateInput.seconds) {
    // Handle plain object representation of Timestamp
    date = new Date(dateInput.seconds * 1000);
  } else {
    return 'Data inválida';
  }

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
  
  // Convert percentages to decimals if needed (assuming user inputs 5 for 5%)
  const fac = ac / 100;
  const fsg = sg / 100;
  const fr = r / 100;
  const fdf = df / 100;
  const fl = l / 100;
  const fi = i / 100;

  // Formula implementation
  const numerator = (1 + fac + fsg + fr) * (1 + fdf) * (1 + fl);
  const denominator = (1 - fi);
  
  if (denominator === 0) return 0;
  
  const bdiValue = (numerator / denominator) - 1;
  return bdiValue;
}

export function safeParseJSON<T>(text: string, defaultValue: T): T {
  try {
    // Try clean parse first
    return JSON.parse(text.trim());
  } catch (e) {
    try {
      // Try to find the first '{' or '[' and last '}' or ']'
      const firstBrace = text.indexOf('{');
      const firstBracket = text.indexOf('[');
      const start = (firstBrace !== -1 && firstBracket !== -1) 
        ? Math.min(firstBrace, firstBracket) 
        : (firstBrace !== -1 ? firstBrace : firstBracket);
      
      const lastBrace = text.lastIndexOf('}');
      const lastBracket = text.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);
      
      if (start !== -1 && end !== -1 && end > start) {
        const jsonPart = text.substring(start, end + 1);
        return JSON.parse(jsonPart);
      }
    } catch (innerError) {
      console.error("Failed to parse JSON even with recovery:", innerError);
    }
    return defaultValue;
  }
}
