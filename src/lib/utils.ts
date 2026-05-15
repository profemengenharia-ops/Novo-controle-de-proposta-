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

/**
 * Mascara CNPJ para exibicao na UI - ex: 12.345.678/0001-90 -> 12.***.***\/0001-90
 * Preserva apenas suficiente para identificacao sem expor o numero completo.
 */
export function maskCNPJ(cnpj: string | undefined | null): string {
  if (!cnpj) return '-';
  // Remove formatação
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return cnpj; // retorna original se formato inesperado
  // Mostra apenas os 2 primeiros dígitos, mascara os 6 do meio, mostra filial e dígitos
  return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/**
 * Mascara CPF para exibicao na UI - ex: 123.456.789-01 -> ***.456.***-01
 */
export function maskCPF(cpf: string | undefined | null): string {
  if (!cpf) return '-';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `***.${digits.slice(3, 6)}.***-${digits.slice(9)}`;
}

/**
 * Mascara telefone para exibicao - mantem DDD e ultimos 4 digitos.
 * Ex: (11) 99999-0001 -> (11) *****-0001
 */
export function maskPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone;
  const ddd = digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `(${ddd}) *****-${last4}`;
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
