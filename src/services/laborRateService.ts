import { supabase, isMockMode } from '../lib/supabase';
import { LaborRate } from '../types';
import { logger } from '../lib/logger';

const TABLE = 'labor_rates';

const mapFromDb = (row: any): LaborRate => ({
  id: row.id,
  role: row.role,
  unit: row.unit as 'H' | 'DIA',
  costPerHour: Number(row.cost_per_hour),
  laborCharges: Number(row.labor_charges),
  totalCostPerHour: Number(row.total_cost_per_hour),
});

const mapToDb = (r: Partial<LaborRate>) => {
  const data: any = {};
  if (r.role !== undefined) data.role = r.role;
  if (r.unit !== undefined) data.unit = r.unit;
  if (r.costPerHour !== undefined) data.cost_per_hour = r.costPerHour;
  if (r.laborCharges !== undefined) data.labor_charges = r.laborCharges;
  if (r.totalCostPerHour !== undefined) data.total_cost_per_hour = r.totalCostPerHour;
  return data;
};

let MOCK_RATES: LaborRate[] = [
  { id: 'mo-1', role: 'Encarregado de Obras',  unit: 'H',   costPerHour: 35.00, laborCharges: 0.72, totalCostPerHour: 60.20 },
  { id: 'mo-2', role: 'Pedreiro',               unit: 'H',   costPerHour: 22.00, laborCharges: 0.72, totalCostPerHour: 37.84 },
  { id: 'mo-3', role: 'Servente',               unit: 'H',   costPerHour: 15.00, laborCharges: 0.72, totalCostPerHour: 25.80 },
  { id: 'mo-4', role: 'Eletricista',            unit: 'H',   costPerHour: 32.00, laborCharges: 0.72, totalCostPerHour: 55.04 },
  { id: 'mo-5', role: 'Soldador',               unit: 'H',   costPerHour: 38.00, laborCharges: 0.72, totalCostPerHour: 65.36 },
  { id: 'mo-6', role: 'Encanador',              unit: 'H',   costPerHour: 28.00, laborCharges: 0.72, totalCostPerHour: 48.16 },
  { id: 'mo-7', role: 'Técnico de Segurança',   unit: 'DIA', costPerHour: 280.00, laborCharges: 0.72, totalCostPerHour: 481.60 },
  { id: 'mo-8', role: 'Engenheiro Residente',   unit: 'DIA', costPerHour: 600.00, laborCharges: 0.30, totalCostPerHour: 780.00 },
];

export const laborRateService = {
  async getAll(): Promise<LaborRate[]> {
    if (isMockMode) return MOCK_RATES;
    const { data, error } = await supabase.from(TABLE).select('*').order('role');
    if (error) { logger.error('laborRateService.getAll', error); return []; }
    return data.map(mapFromDb);
  },

  async create(rate: Omit<LaborRate, 'id'>): Promise<string> {
    if (isMockMode) {
      const newRate = { ...rate, id: crypto.randomUUID() };
      MOCK_RATES = [...MOCK_RATES, newRate];
      return newRate.id;
    }
    const { data, error } = await supabase.from(TABLE).insert([mapToDb(rate)]).select('id').single();
    if (error) throw error;
    return data.id;
  },

  async update(id: string, updates: Partial<LaborRate>): Promise<void> {
    if (isMockMode) {
      MOCK_RATES = MOCK_RATES.map(r => r.id === id ? { ...r, ...updates } : r);
      return;
    }
    const { error } = await supabase.from(TABLE).update(mapToDb(updates)).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    if (isMockMode) {
      MOCK_RATES = MOCK_RATES.filter(r => r.id !== id);
      return;
    }
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  },
};
