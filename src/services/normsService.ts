import { supabase, isMockMode } from '../lib/supabase';

export interface Norm {
  id: string;
  title: string;
  description: string;
}

export interface Block {
  id: string;
  type: string;
  text: string;
}

const NORMS_STORE_KEY = 'mock_norms_v1';
const BLOCKS_STORE_KEY = 'mock_blocks_v1';

const SEED_NORMS: Norm[] = [
  { id: 'seed-norm-1', title: 'Decreto Estadual SP nº 56.819/2011', description: 'Regulamento de Segurança contra Incêndio das edificações e áreas de risco do Estado de São Paulo.' },
  { id: 'seed-norm-2', title: 'NR 10', description: 'Segurança em Instalações e Serviços em Eletricidade.' },
  { id: 'seed-norm-3', title: 'NR 33', description: 'Segurança e Saúde em Espaços Confinados.' },
  { id: 'seed-norm-4', title: 'NR 35', description: 'Segurança em Trabalhos em Altura.' },
  { id: 'seed-norm-5', title: 'NR 06', description: 'Equipamentos de Proteção Individual (EPI).' },
];

const SEED_BLOCKS: Block[] = [
  { id: 'seed-block-1', type: 'Obrigações Contratada', text: 'Fornecer todos os equipamentos de segurança (EPIs), refeição e transporte para os funcionários alocados na execução dos serviços.' },
  { id: 'seed-block-2', type: 'Obrigações Contratante', text: 'Liberar e desobstruir as áreas, fornecer ponto de energia 220V em até 25 metros do local de execução.' },
];

function loadStore<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch (e) {
    console.warn(`Mock store ${key} parse failed.`, e);
  }
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}

function saveStore<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export const normsService = {
  async getNorms(): Promise<Norm[]> {
    if (isMockMode) return loadStore(NORMS_STORE_KEY, SEED_NORMS);
    const { data, error } = await supabase
      .from('norms')
      .select('id, title, description')
      .order('title', { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return data as Norm[];
  },

  async addNorm(norm: Omit<Norm, 'id'>): Promise<string> {
    if (isMockMode) {
      const newNorm = { ...norm, id: crypto.randomUUID() };
      const store = loadStore(NORMS_STORE_KEY, SEED_NORMS);
      store.push(newNorm);
      saveStore(NORMS_STORE_KEY, store);
      return newNorm.id;
    }
    const { data, error } = await supabase
      .from('norms')
      .insert([{ title: norm.title, description: norm.description }])
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async deleteNorm(id: string): Promise<void> {
    if (isMockMode) {
      const store = loadStore(NORMS_STORE_KEY, SEED_NORMS).filter(n => n.id !== id);
      saveStore(NORMS_STORE_KEY, store);
      return;
    }
    const { error } = await supabase.from('norms').delete().eq('id', id);
    if (error) throw error;
  },

  async getBlocks(): Promise<Block[]> {
    if (isMockMode) return loadStore(BLOCKS_STORE_KEY, SEED_BLOCKS);
    const { data, error } = await supabase
      .from('blocks')
      .select('id, type, text')
      .order('type', { ascending: true });
    if (error) {
      console.error(error);
      return [];
    }
    return data as Block[];
  },

  async addBlock(block: Omit<Block, 'id'>): Promise<string> {
    if (isMockMode) {
      const newBlock = { ...block, id: crypto.randomUUID() };
      const store = loadStore(BLOCKS_STORE_KEY, SEED_BLOCKS);
      store.push(newBlock);
      saveStore(BLOCKS_STORE_KEY, store);
      return newBlock.id;
    }
    const { data, error } = await supabase
      .from('blocks')
      .insert([{ type: block.type, text: block.text }])
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async deleteBlock(id: string): Promise<void> {
    if (isMockMode) {
      const store = loadStore(BLOCKS_STORE_KEY, SEED_BLOCKS).filter(b => b.id !== id);
      saveStore(BLOCKS_STORE_KEY, store);
      return;
    }
    const { error } = await supabase.from('blocks').delete().eq('id', id);
    if (error) throw error;
  }
};
