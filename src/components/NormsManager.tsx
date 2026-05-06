import React, { useState, useEffect } from 'react';
import { Book, Plus, ShieldCheck, FileText, X } from 'lucide-react';
import { normsService, Norm, Block } from '../services/normsService';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export function NormsManager() {
  const [norms, setNorms] = useState<Norm[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  
  const [showNormModal, setShowNormModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  
  const [normForm, setNormForm] = useState({ title: '', description: '' });
  const [blockForm, setBlockForm] = useState({ type: '', text: '' });

  const loadData = async () => {
    const loadedNorms = await normsService.getNorms();
    const loadedBlocks = await normsService.getBlocks();
    setNorms(loadedNorms);
    setBlocks(loadedBlocks);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!normForm.title.trim()) return;
    await normsService.addNorm(normForm);
    toast.success('Norma técnica criada com sucesso!');
    setNormForm({ title: '', description: '' });
    setShowNormModal(false);
    loadData();
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.text.trim()) return;
    await normsService.addBlock(blockForm);
    toast.success('Bloco padrão criado com sucesso!');
    setBlockForm({ type: '', text: '' });
    setShowBlockModal(false);
    loadData();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
      {/* NORMAS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[var(--color-brand-primary)]" />
            <h3 className="font-bold tracking-tight uppercase text-sm">Biblioteca de Normas</h3>
          </div>
          <button 
            onClick={() => setShowNormModal(true)}
            className="flex items-center gap-1 text-xs font-bold bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-brand-primary)] hover:text-white transition-all"
          >
            <Plus size={14} /> Nova
          </button>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {norms.map(n => (
            <div key={n.id} className="bg-white p-4 rounded-xl border border-black/5 hover:border-[var(--color-brand-primary)] transition-all cursor-pointer group shadow-sm">
              <h4 className="font-bold text-sm">{n.title}</h4>
              <p className="text-xs opacity-50 mt-1">{n.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* BLOCOS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-[var(--color-brand-primary)]" />
            <h3 className="font-bold tracking-tight uppercase text-sm">Blocos Padrão (Cláusulas)</h3>
          </div>
          <button 
            onClick={() => setShowBlockModal(true)}
            className="flex items-center gap-1 text-xs font-bold bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] px-3 py-1.5 rounded-lg hover:bg-[var(--color-brand-primary)] hover:text-white transition-all"
          >
            <Plus size={14} /> Novo
          </button>
        </div>
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          {blocks.map(b => (
            <div key={b.id} className="bg-white p-4 rounded-xl border border-black/5 flex flex-col gap-2 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-tighter bg-black/5 px-2 py-1 rounded w-fit">{b.type}</span>
              <p className="text-[11px] opacity-60 leading-relaxed italic line-clamp-3">"{b.text}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNormModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 bg-black text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Nova Norma</h3>
                <button onClick={() => setShowNormModal(false)} className="hover:bg-white/20 p-2 rounded-full"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveNorm} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Título / Sigla</label>
                  <input autoFocus required type="text" value={normForm.title} onChange={e => setNormForm({...normForm, title: e.target.value})} className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black" placeholder="Ex: NR 10" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Descrição</label>
                  <textarea value={normForm.description} onChange={e => setNormForm({...normForm, description: e.target.value})} className="w-full p-4 bg-black/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="Ex: Segurança em Instalações..." rows={3} />
                </div>
                <button type="submit" className="w-full py-4 bg-[var(--color-brand-primary)] text-white font-bold rounded-2xl hover:opacity-90">Salvar Norma</button>
              </form>
            </motion.div>
          </div>
        )}

        {showBlockModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 bg-black text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Novo Bloco Padrão</h3>
                <button onClick={() => setShowBlockModal(false)} className="hover:bg-white/20 p-2 rounded-full"><X size={18} /></button>
              </div>
              <form onSubmit={handleSaveBlock} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Tipo / Categoria</label>
                  <input autoFocus required type="text" value={blockForm.type} onChange={e => setBlockForm({...blockForm, type: e.target.value})} className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black" placeholder="Ex: Obrigações Contratada" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Texto da Cláusula</label>
                  <textarea required value={blockForm.text} onChange={e => setBlockForm({...blockForm, text: e.target.value})} className="w-full p-4 bg-black/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-black" placeholder="Digite o texto padrão..." rows={4} />
                </div>
                <button type="submit" className="w-full py-4 bg-[var(--color-brand-primary)] text-white font-bold rounded-2xl hover:opacity-90">Salvar Bloco</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
