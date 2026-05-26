import React from 'react';
import { Proposal, ProposalStatus } from '../types';
import { Clock, AlertCircle, Send, MessageSquare, ExternalLink, X, Coffee, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { aiService } from '../services/aiService';

interface DailyBriefingProps {
  proposals: Proposal[];
  onClose: () => void;
  onAction: (id: string) => void;
}

export function DailyBriefing({ proposals, onClose, onAction }: DailyBriefingProps) {
  const [aiLoading, setAiLoading] = React.useState<string | null>(null);
  const [suggestedMessage, setSuggestedMessage] = React.useState<{id: string, text: string} | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);

  const overdue = proposals.filter(p => 
    p.status !== ProposalStatus.WON && p.status !== ProposalStatus.LOST &&
    p.followUpDate && new Date(p.followUpDate) < new Date()
  );

  const today = proposals.filter(p => {
    if (!p.followUpDate) return false;
    const fDate = new Date(p.followUpDate);
    const now = new Date();
    return fDate.getDate() === now.getDate() && 
           fDate.getMonth() === now.getMonth() && 
           fDate.getFullYear() === now.getFullYear();
  });

  const unviewed = proposals.filter(p => p.status === ProposalStatus.SENT);

  const handleGenerateAI = async (p: Proposal) => {
    setAiLoading(p.id);
    try {
      const msg = await aiService.generateFollowUpMessage(p);
      setSuggestedMessage({ id: p.id, text: msg });
    } catch (e) {
      console.error(e);
    }
    setAiLoading(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header Section */}
        <div className="p-10 bg-[var(--color-brand-dark)] text-white relative">
           <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
           </button>
           
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5">
                <Coffee size={32} className="text-[var(--color-brand-primary)]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold tracking-tight">Bom dia, Vendedor! ☕</h3>
                <p className="text-sm opacity-60 font-bold uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} className="text-[var(--color-brand-primary)]" />
                  Radar de Vendas e Fechamento • {new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12">
            
            {/* 1. Atrazados Sector */}
            {overdue.length > 0 && (
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-red-500">Atrasados (Alta Prioridade)</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {overdue.map(p => (
                      <div key={p.id} className="bg-red-50/50 border border-red-100 p-6 rounded-2xl space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold font-mono opacity-50">{p.proposalNumber}</span>
                            <span className="text-[10px] font-bold text-red-600 uppercase">Atrasado faz {Math.floor((new Date().getTime() - new Date(p.followUpDate!).getTime()) / (1000 * 3600 * 24))} dias</span>
                         </div>
                         <div className="space-y-1">
                            <p className="font-bold text-lg leading-tight truncate">{p.clientName}</p>
                            <p className="text-xs opacity-60 truncate">{p.scopeTitle || 'Instalação de Sistemas'}</p>
                         </div>
                         <div className="flex items-center justify-between pt-2">
                            <span className="text-lg font-bold tracking-tighter">{formatCurrency(p.commercialProposal?.totalValue || 0)}</span>
                            <div className="flex gap-2">
                               <button 
                                onClick={() => handleGenerateAI(p)}
                                className="p-2 bg-white border border-red-200 rounded-lg text-[var(--color-brand-primary)] hover:shadow-md transition-all"
                                title="Gerar Mensagem de Cobrança IA"
                               >
                                 <Sparkles size={16} />
                               </button>
                               <button 
                                onClick={() => onAction(p.id)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                               >
                                 Agir Agora
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            )}

            {/* 2. Today's Sector */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Follow-ups para Hoje</h4>
                </div>
                {today.length > 0 ? (
                  <div className="space-y-3">
                    {today.map(p => (
                      <div key={p.id} className="bg-white border border-black/5 p-4 rounded-2xl flex items-center justify-between hover:border-[var(--color-brand-primary)]/20 transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="bg-black/5 p-3 rounded-xl group-hover:bg-[var(--color-brand-primary)]/5 group-hover:text-[var(--color-brand-primary)] transition-colors">
                               <MessageSquare size={18} />
                            </div>
                            <div>
                               <p className="text-sm font-bold tracking-tight">{p.clientName}</p>
                               <p className="text-[10px] opacity-40 font-bold uppercase">{p.proposalNumber} • Ligar para alinhar condições</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <span className="text-sm font-bold font-mono">{formatCurrency(p.commercialProposal?.totalValue || 0)}</span>
                            <button onClick={() => handleGenerateAI(p)} className="p-2 hover:bg-black/5 rounded-lg text-[var(--color-brand-primary)]">
                               <Sparkles size={18} />
                            </button>
                            <button onClick={() => onAction(p.id)} className="p-2 hover:bg-black/5 rounded-lg opacity-40">
                               <ExternalLink size={18} />
                            </button>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs opacity-20 italic">Nada agendado especialmente para hoje.</p>
                )}
            </div>

            {/* 3. Unviewed Sector */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-widest opacity-40">Aguardando Abertura (Enviadas)</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   {unviewed.map(p => (
                     <div key={p.id} className="border border-black/5 p-4 rounded-xl space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                        <p className="text-xs font-bold truncate">{p.clientName}</p>
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-mono">{formatCurrency(p.commercialProposal?.totalValue || 0)}</span>
                           <span className="text-[9px] uppercase font-bold opacity-40">Env. {formatDate(p.createdAt)}</span>
                        </div>
                     </div>
                   ))}
                </div>
            </div>
        </div>

        {/* AI Message Drawer */}
        <AnimatePresence>
          {(aiLoading || suggestedMessage) && (
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-[var(--color-brand-dark)] text-white p-8 border-t border-white/5 shadow-2xl relative z-50"
            >
              <button 
                onClick={() => {setSuggestedMessage(null); setAiLoading(null);}}
                className="absolute top-4 right-4 text-white/40 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="bg-[var(--color-brand-primary)] p-2 rounded-lg text-white">
                       <Sparkles size={16} />
                    </div>
                    <h4 className="text-xs font-bold uppercase tracking-widest">Rascunho de Cobrança Inteligente</h4>
                 </div>

                 {aiLoading ? (
                   <div className="h-24 flex items-center justify-center">
                     <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--color-brand-primary)]" />
                   </div>
                 ) : (
                   <div className="space-y-4">
                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl italic text-sm leading-relaxed text-white/80">
                        "{suggestedMessage?.text}"
                      </div>
                      <div className="flex items-center gap-4">
                         <button 
                          onClick={() => copyToClipboard(suggestedMessage?.text || '')}
                          className="flex-1 bg-[var(--color-brand-primary)] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                         >
                           {isCopied ? <Check size={18} /> : <Copy size={18} />}
                           {isCopied ? 'Copiado para o Clipboard' : 'Copiar e Abrir WhatsApp'}
                         </button>
                         <button 
                          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(suggestedMessage?.text || '')}`, '_blank')}
                          className="px-6 py-4 border border-white/10 rounded-xl font-bold text-sm hover:bg-white/5 transition-colors"
                         >
                           <Send size={18} />
                         </button>
                      </div>
                      <p className="text-[10px] opacity-40 text-center uppercase tracking-widest font-bold">
                        Dica: O texto acima foi personalizado para o status atual da negociação.
                      </p>
                   </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-8 border-t border-black/5 bg-black/[0.01] flex flex-col sm:flex-row items-center justify-center gap-4">
           <button
            onClick={onClose}
            className="text-xs font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
           >
             Fechar Radar e Ir para o Painel
           </button>
           <span className="hidden sm:block opacity-20">·</span>
           <button
            onClick={() => { localStorage.setItem('radarDisabled', '1'); onClose(); }}
            className="text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
            title="Você pode reativar limpando os dados do navegador"
           >
             Não abrir automaticamente
           </button>
        </div>
      </motion.div>
    </div>
  );
}
