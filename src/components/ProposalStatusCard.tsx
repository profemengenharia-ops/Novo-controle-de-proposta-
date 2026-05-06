import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Proposal } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface ProposalStatusCardProps {
  proposalId: string;
  initialProposal?: Proposal;
}

export function ProposalStatusCard({ proposalId, initialProposal }: ProposalStatusCardProps) {
  const [proposal, setProposal] = useState<Proposal | null>(initialProposal || null);
  const [loading, setLoading] = useState(!initialProposal);

  useEffect(() => {
    // 1. Fetch initial state if not provided
    if (!initialProposal) {
      const fetchProposal = async () => {
        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', proposalId)
          .single();
        
        if (data && !error) {
          // Note: mapFromDb logic would go here if we used the service, 
          // but for realtime we might need a direct mapping
          setProposal(data as any); 
        }
        setLoading(false);
      };
      fetchProposal();
    }

    // 2. Realtime subscription for this specific proposal
    const channel = supabase
      .channel(`proposal_update_${proposalId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'proposals',
          filter: `id=eq.${proposalId}`,
        },
        (payload) => {
          console.log('[Realtime] Mudança detectada!', payload.new);
          const updated = payload.new as any;
          setProposal(updated);
          
          // Notifications based on new status
          if (updated.status === 'calculado') {
            toast.success('Engenharia financeira concluída com sucesso!');
          } else if (updated.status === 'estimado_manualmente') {
            toast.warning('IA indisponível. Usando valores estimados de segurança.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, initialProposal]);

  if (loading || !proposal) {
    return (
      <div className="p-6 bg-neutral-50 rounded-2xl animate-pulse flex items-center justify-center">
        <Loader2 className="animate-spin text-neutral-300" />
      </div>
    );
  }

  const isCalculated = proposal.status === 'calculado';
  const isPending = proposal.status === 'calculando' || proposal.status === 'pendente';

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-6 rounded-[2rem] border transition-all duration-500 shadow-xl",
        isCalculated ? "bg-green-50/50 border-green-100" : "bg-white border-black/5"
      )}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors",
            isCalculated ? "bg-green-500 text-white" : "bg-black text-white"
          )}>
            {isCalculated ? <CheckCircle2 size={24} /> : <Calculator size={24} />}
          </div>
          <div>
            <h3 className="text-sm font-black tracking-tight uppercase text-neutral-900">
              Proposta {proposal.proposalNumber || 'S/N'}
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
              {proposal.clientName}
            </p>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-2",
          isCalculated ? "bg-green-500" : "bg-neutral-900"
        )}>
          {isPending && <Loader2 size={10} className="animate-spin" />}
          {proposal.status.replace('_', ' ')}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isPending ? (
          <motion.div 
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100"
          >
            <Loader2 className="animate-spin text-blue-500" size={16} />
            <p className="text-xs font-bold text-blue-700 italic">
              O cérebro financeiro está processando os dados de vistoria...
            </p>
          </motion.div>
        ) : isCalculated ? (
          <motion.div 
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Preço de Venda Sugerido</span>
                <p className="text-3xl font-black text-green-600 tracking-tighter">
                  {formatCurrency((proposal as any).pricing_details?.total_estimated || 0)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Margem Estimada</span>
                <p className="text-sm font-black text-neutral-900">15.00%</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-neutral-100 rounded-2xl">
             <AlertCircle size={16} className="text-neutral-400" />
             <p className="text-xs font-bold text-neutral-500">Aguardando início do processamento.</p>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Minimal cn helper if not available globally
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
