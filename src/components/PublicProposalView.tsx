import React, { useEffect, useState } from 'react';
import { Proposal, ProposalStatus } from '../types';
import { proposalService } from '../services/proposalService';
import { formatDate, formatCurrency, cn, itemContractValue, proposalItemsTotal } from '../lib/utils';
import {
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Calendar,
  Download,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STATUS_TAGS } from '../constants';
import { toast } from 'sonner';

interface PublicViewProps {
  id: string;
}

export function PublicProposalView({ id }: PublicViewProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvedTech, setApprovedTech] = useState(false);
  const [approvedComm, setApprovedComm] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await proposalService.getProposal(id);
      setProposal(data);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle size={48} className="text-red-500" />
        <h1 className="text-xl font-bold">Proposta não encontrada</h1>
        <p className="text-sm opacity-50">O link pode ter expirado ou estar incorreto.</p>
      </div>
    );
  }

  const handleFinalApproval = () => {
    if (!approvedTech || !approvedComm) return;
    setShowApproval(true);
  };

  const submitApproval = async () => {
    if (signature.trim().length < 5) {
      toast.error('Informe seu nome completo (mínimo 5 caracteres).');
      return;
    }
    setSubmitting(true);
    try {
      await proposalService.updateProposal(id, { status: ProposalStatus.WON });
      setProposal(prev => prev ? { ...prev, status: ProposalStatus.WON } : null);
      toast.success('Proposta aprovada com sucesso!');
      setShowApproval(false);
      setSignature('');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar aprovação.');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans">
      {/* Utility Nav */}
      <nav className="h-16 bg-white border-b border-black/5 flex items-center justify-between px-8 sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tighter text-orange-500 uppercase">ProFem</span>
          <span className="text-[10px] opacity-40 uppercase tracking-widest font-bold">Soluções Contra Incêndio</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Ref: {proposal.proposalNumber}</span>
          <button
            onClick={() => window.open(`/proposal/${id}?print=1`, '_blank')}
            className="flex items-center gap-2 text-xs font-bold bg-neutral-100 px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <Download size={14} /> PDF
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto mt-12 px-6 space-y-12">
        {/* Header Block */}
        <header className="bg-white p-12 rounded-3xl shadow-xl border border-black/5 text-center space-y-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <FileText size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-neutral-900">Olá, {proposal.clientName}</h1>
            <p className="text-neutral-500 max-w-xl mx-auto">
              Apresentamos nossa proposta técnica e comercial para o sistema de proteção e combate a incêndio.
            </p>
          </div>
          <div className="flex items-center justify-center gap-8 pt-4">
             <div className="text-center">
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">Emitido em</p>
               <p className="font-bold text-neutral-800">{formatDate(proposal.createdAt)}</p>
             </div>
             <div className="w-[1px] h-8 bg-neutral-100" />
             <div className="text-center">
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 px-4">Status da Proposta</p>
               <div className="mt-2">
                 <span className={cn(
                    "text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full shadow-sm border border-black/5",
                    STATUS_TAGS[proposal.status]?.color || "bg-neutral-100 text-neutral-600"
                 )}>
                   {STATUS_TAGS[proposal.status]?.label || proposal.status}
                 </span>
               </div>
             </div>
          </div>
        </header>

        {/* Technical Section */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
             <ShieldCheck size={24} className="text-orange-500" />
             <h2 className="text-2xl font-bold tracking-tight">Proposta Técnica</h2>
           </div>

           <div className="bg-white rounded-3xl border border-black/5 p-12 space-y-12">
              <div className="space-y-6">
                 <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Escopo de Fornecimento</h3>
                 <div className="space-y-8">
                   {proposal.technicalScope?.items?.map((item, i) => (
                     <div key={i} className="space-y-2">
                       <h4 className="text-sm font-bold text-orange-500 uppercase tracking-wider">{item.category}</h4>
                       <p className="text-neutral-600 leading-relaxed text-lg">{item.description}</p>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-neutral-100">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Normas Técnicas Aplicadas</h3>
                  <ul className="space-y-2">
                    {proposal.technicalScope?.norms?.map((norm, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-neutral-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        {norm}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-4 text-sm text-neutral-500 italic leading-relaxed">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 not-italic">Considerações</h3>
                  {proposal.technicalScope?.generalConsiderations || "Nenhuma consideração adicional."}
                </div>
              </div>
           </div>

           <label className={cn(
             "flex items-center gap-4 p-6 rounded-2xl border cursor-pointer transition-all",
             approvedTech ? "bg-orange-500 text-white border-orange-600" : "bg-white border-neutral-200 hover:border-orange-500"
           )}>
             <input type="checkbox" className="hidden" checked={approvedTech} onChange={() => setApprovedTech(!approvedTech)} />
             <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", approvedTech ? "border-white" : "border-neutral-300")}>
                {approvedTech && <CheckCircle2 size={16} />}
             </div>
             <span className="font-bold text-sm">Li e aprovo a Proposta Técnica</span>
           </label>
        </section>

        {/* Commercial Section */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
             <Calendar size={24} className="text-orange-500" />
             <h2 className="text-2xl font-bold tracking-tight">Condições Comerciais</h2>
           </div>

           <div className="bg-white rounded-3xl border border-black/5 overflow-hidden">
              <div className="bg-neutral-900 text-white p-12 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="space-y-1">
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Investimento Total</p>
                   <h3 className="text-5xl font-bold tracking-tighter">
                     {formatCurrency(proposal.commercialProposal?.items && proposal.commercialProposal.items.length > 0
                      ? proposalItemsTotal(proposal.commercialProposal.items)
                      : (proposal.commercialProposal?.totalValue || 0))}
                   </h3>
                 </div>
                 <div className="text-center md:text-right space-y-1">
                   <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Validade</p>
                   <p className="font-medium text-lg italic text-orange-400">{proposal.validityDays} dias corridos</p>
                 </div>
              </div>

              {(proposal.commercialProposal?.items?.length ?? 0) > 0 && (
                <div className="px-12 py-8 border-b border-neutral-100">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold opacity-30 border-b border-neutral-100">
                        <th className="py-2">Item / Descrição</th>
                        <th className="py-2 text-center">Quant.</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {proposal.commercialProposal.items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-4 font-medium text-neutral-700">
                            {item.description}
                            {item.billingType === 'monthly' && (
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-500">Mensal × {item.contractMonths || 12} meses</span>
                            )}
                          </td>
                          <td className="py-4 text-center text-neutral-500">{item.quantity} {item.unit}</td>
                          <td className="py-4 text-right font-bold text-neutral-900">
                            {formatCurrency(itemContractValue(item))}
                            {item.billingType === 'monthly' && (
                              <span className="block text-[10px] font-normal text-neutral-400">{formatCurrency(item.totalPrice)}/mês</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(proposal.commercialProposal?.onDemandServices?.length ?? 0) > 0 && (
                <div className="px-12 py-8 border-b border-neutral-100">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400 mb-4">Serviços sob Demanda</h3>
                  <table className="w-full text-left text-sm">
                    <tbody className="divide-y divide-neutral-50">
                      {proposal.commercialProposal!.onDemandServices!.map((s, i) => (
                        <tr key={i}>
                          <td className="py-3 font-medium text-neutral-700">{s.description}</td>
                          <td className="py-3 text-center text-neutral-500">{s.unit}</td>
                          <td className="py-3 text-right font-bold text-neutral-900">{formatCurrency(s.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-[10px] text-neutral-400 italic mt-3">Valores cobrados por evento/acionamento — não inclusos no investimento total.</p>
                </div>
              )}

              <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Condições de Pagamento</h3>
                   <p className="text-neutral-600 text-sm leading-relaxed">{proposal.commercialProposal?.paymentTerms || "A combinar"}</p>
                 </div>
                 <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-400">Garantia Técnica</h3>
                   <p className="text-neutral-600 text-sm leading-relaxed">{proposal.commercialProposal?.guarantee || "Conforme fabricante"}</p>
                 </div>
              </div>
           </div>

           <label className={cn(
             "flex items-center gap-4 p-6 rounded-2xl border cursor-pointer transition-all",
             approvedComm ? "bg-orange-500 text-white border-orange-600" : "bg-white border-neutral-200 hover:border-orange-500"
           )}>
             <input type="checkbox" className="hidden" checked={approvedComm} onChange={() => setApprovedComm(!approvedComm)} />
             <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center", approvedComm ? "border-white" : "border-neutral-300")}>
                {approvedComm && <CheckCircle2 size={16} />}
             </div>
             <span className="font-bold text-sm">Li e aprovo as Condições Comerciais</span>
           </label>
        </section>

        {/* Final Action */}
        <div className="pt-12 text-center space-y-6">
           <button 
             disabled={!approvedTech || !approvedComm || proposal.status === ProposalStatus.WON}
             onClick={handleFinalApproval}
             className={cn(
               "w-full max-w-md py-6 rounded-2xl text-lg font-bold tracking-tight shadow-2xl transition-all",
               approvedTech && approvedComm && proposal.status !== ProposalStatus.WON 
                ? "bg-neutral-900 text-white hover:scale-[1.02] shadow-orange-500/20" 
                : "bg-neutral-200 text-neutral-400 pointer-events-none"
             )}
           >
             {proposal.status === ProposalStatus.WON ? "Esta Proposta já foi Aprovada" : "Finalizar Aprovação da Proposta"}
           </button>
           <p className="text-xs text-neutral-400 px-12">
             Ao clicar em finalizar, você formaliza o aceite deste escopo. <br />
             Em caso de dúvidas, entre em contato: <span className="text-neutral-600 font-bold">comercial@profemsolucoes.com.br</span>
           </p>
        </div>
      </div>

      <AnimatePresence>
        {showApproval && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 bg-black text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Aprovação Formal</h3>
                <button onClick={() => setShowApproval(false)} className="hover:bg-white/20 p-2 rounded-full"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-neutral-600">
                  Você está aprovando a proposta <span className="font-bold">{proposal.proposalNumber}</span>.
                  Esta ação é equivalente a uma assinatura.
                </p>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-60">Nome Completo (assinatura)</label>
                  <input
                    autoFocus
                    type="text"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitApproval(); }}
                    className="w-full p-4 bg-black/5 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowApproval(false)}
                    className="flex-1 py-3 text-xs font-bold uppercase tracking-widest opacity-60 hover:opacity-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitApproval}
                    disabled={submitting || signature.trim().length < 5}
                    className="flex-[2] py-3 bg-orange-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-orange-600 disabled:opacity-40"
                  >
                    {submitting ? 'Enviando...' : 'Confirmar Aprovação'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
