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
    // Bug #19: strings no formato YYYY-MM-DD (sem hora) são interpretadas como UTC midnight,
    // causando exibição do dia anterior em timezone BRT (UTC-3).
    // Forçar interpretação local adicionando T00:00:00 se não houver componente de hora.
    date = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput);
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

// ─── Máscaras de input (formatam progressivamente enquanto o usuário digita) ──

/** Aplica máscara de CNPJ: 00.000.000/0000-00 */
export function maskCNPJInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

/** Aplica máscara de CPF: 000.000.000-00 */
export function maskCPFInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
}

/** Aplica máscara de CEP: 00000-000 */
export function maskCEPInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Aplica máscara de telefone: (00) 0000-0000 ou (00) 00000-0000 */
export function maskPhoneInput(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ─── Validadores (dígito verificador) ────────────────────────────────────────

/** Valida CPF pelos dígitos verificadores. */
export function isValidCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i], 10) * (10 - i);
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  if (check !== parseInt(d[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i], 10) * (11 - i);
  check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === parseInt(d[10], 10);
}

/** Valida CNPJ pelos dígitos verificadores. */
export function isValidCNPJ(cnpj: string): boolean {
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const digit = (len: number): number => {
    const weights = len === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(d[i], 10) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return digit(12) === parseInt(d[12], 10) && digit(13) === parseInt(d[13], 10);
}

/** Validação simples de e-mail. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Busca de endereço por CEP (ViaCEP) ──────────────────────────────────────

export interface CepAddress {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

/**
 * Consulta o ViaCEP e retorna o endereço, ou null se o CEP for inválido,
 * não encontrado, ou em caso de falha de rede.
 */
export async function fetchAddressByCEP(cep: string): Promise<CepAddress | null> {
  const d = cep.replace(/\D/g, '');
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return {
      street: data.logradouro || undefined,
      neighborhood: data.bairro || undefined,
      city: data.localidade || undefined,
      state: data.uf || undefined,
    };
  } catch {
    return null;
  }
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
