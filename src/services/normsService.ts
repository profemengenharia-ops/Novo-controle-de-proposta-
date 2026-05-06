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

let MOCK_NORMS: Norm[] = [
  { id: '1', title: 'Decreto Estadual SP nº 56.819/2011', description: 'Regulamento de Segurança contra Incêndio das edificações e áreas de risco do Estado de São Paulo.' },
  { id: '2', title: 'NR 10', description: 'Segurança em Instalações e Serviços em Eletricidade.' },
  { id: '3', title: 'NR 33', description: 'Segurança e Saúde em Espaços Confinados.' },
  { id: '4', title: 'NR 35', description: 'Segurança em Trabalhos em Altura.' },
  { id: '5', title: 'NR 06', description: 'Equipamentos de Proteção Individual (EPI).' },
];

let MOCK_BLOCKS: Block[] = [
  { id: '1', type: 'Obrigações Contratada', text: 'Fornecer todos os equipamentos de segurança (EPIs), refeição e transporte para os funcionários...' },
  { id: '2', type: 'Obrigações Contratante', text: 'Liberar e desobstruir as áreas, fornecer ponto de energia 220V em até 25 metros...' },
];

export const normsService = {
  async getNorms(): Promise<Norm[]> {
    if (isMockMode) return MOCK_NORMS;
    // Real implementation would go here
    return MOCK_NORMS;
  },

  async addNorm(norm: Omit<Norm, 'id'>): Promise<string> {
    const newNorm = { ...norm, id: crypto.randomUUID() };
    if (isMockMode) {
      MOCK_NORMS = [...MOCK_NORMS, newNorm];
    }
    // Real implementation
    return newNorm.id;
  },

  async getBlocks(): Promise<Block[]> {
    if (isMockMode) return MOCK_BLOCKS;
    // Real implementation
    return MOCK_BLOCKS;
  },

  async addBlock(block: Omit<Block, 'id'>): Promise<string> {
    const newBlock = { ...block, id: crypto.randomUUID() };
    if (isMockMode) {
      MOCK_BLOCKS = [...MOCK_BLOCKS, newBlock];
    }
    // Real implementation
    return newBlock.id;
  }
};
