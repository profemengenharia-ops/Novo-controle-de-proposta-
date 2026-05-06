import React, { useState, useEffect } from 'react';
import { Search, X, FileText, User, MapPin, ChevronRight, Check } from 'lucide-react';
import { BudgetProject } from '../types';
import { budgetProjectService } from '../services/budgetProjectService';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onSelect: (project: BudgetProject) => void;
  onClose: () => void;
}

export function BudgetSelector({ onSelect, onClose }: Props) {
  const [projects, setProjects] = useState<BudgetProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await budgetProjectService.getAll();
      setProjects(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = projects.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="p-6 bg-black text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Selecionar Orçamento</h3>
            <p className="text-xs opacity-40 font-bold uppercase tracking-widest">Importar itens para a proposta</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-black/5 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
            <input 
              type="text" 
              placeholder="Buscar orçamento por obra ou cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm opacity-40 italic">
              Nenhum orçamento encontrado.
            </div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="w-full bg-white border border-black/5 rounded-2xl p-4 flex items-center gap-4 hover:border-black hover:shadow-md transition-all text-left group"
              >
                <div className="bg-black/5 p-3 rounded-xl text-black group-hover:bg-black group-hover:text-white transition-colors">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{p.title}</h4>
                  <div className="flex items-center gap-3 mt-1 opacity-40">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                      <User size={10} /> {p.clientName}
                    </span>
                    {p.address && (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
                        <MapPin size={10} /> {p.address}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 pr-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Valor</p>
                  <p className="text-sm font-black">{formatCurrency(p.finalPrice)}</p>
                </div>
                <ChevronRight size={18} className="opacity-20 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-black/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
