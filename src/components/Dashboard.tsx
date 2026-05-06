import React, { useEffect, useState } from 'react';
import { proposalService } from '../services/proposalService';
import { Proposal, ProposalStatus } from '../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  FileCheck, 
  Clock,
  ExternalLink,
  ArrowRight,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { ProposalStatusCard } from './ProposalStatusCard';


interface DashboardProps {
  setActiveTab: (tab: string) => void;
  onShowRadar?: () => void;
}

export function Dashboard({ setActiveTab, onShowRadar }: DashboardProps) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await proposalService.getAllProposals();
      setProposals(data);
      setLoading(false);
    }
    load();
  }, []);

  const stats = [
    { label: 'Propostas Enviadas', value: proposals.filter(p => p.status === ProposalStatus.SENT).length, icon: Clock, color: 'text-blue-500' },
    { label: 'Em Negociação', value: proposals.filter(p => p.status === ProposalStatus.NEGOTIATING).length, icon: MessageSquare, color: 'text-yellow-500' },
    { label: 'Ganhos (Total)', value: formatCurrency(proposals.filter(p => p.status === ProposalStatus.WON).reduce((acc, p) => acc + (p.commercialProposal?.totalValue || 0), 0)), icon: FileCheck, color: 'text-green-500' },
    { label: 'Valor Total Pipeline', value: formatCurrency(proposals.reduce((acc, p) => acc + (p.commercialProposal?.totalValue || 0), 0)), icon: TrendingUp, color: 'text-orange-500' },
  ];

  const overdueFollowUps = proposals.filter(p => 
    p.status !== ProposalStatus.WON && p.status !== ProposalStatus.LOST &&
    p.followUpDate && new Date(p.followUpDate) < new Date()
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--color-brand-dark)]">Painel de Controle</h2>
          <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-none">Visão Geral de Operações e Vendas</p>
        </div>
        <button 
          onClick={onShowRadar}
          className="bg-[var(--color-brand-dark)] text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-90 shadow-xl transition-all shadow-[var(--color-brand-dark)]/20"
        >
          <Sparkles size={18} className="text-[var(--color-brand-primary)] animate-pulse" />
          Radar do Dia
        </button>
      </div>

      {/* Follow-up Alerts */}
      {overdueFollowUps.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
             <div className="bg-red-500 text-white p-3 rounded-xl animate-pulse">
               <AlertTriangle size={24} />
             </div>
             <div>
               <p className="text-base font-bold text-red-900">Alerta de Fechamento: {overdueFollowUps.length} Follow-ups Críticos</p>
               <p className="text-xs text-red-700">Seus clientes estão aguardando o seu contato. Use a IA para gerar uma mensagem agora!</p>
             </div>
          </div>
          <button onClick={() => setActiveTab('proposals')} className="px-6 py-3 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200">
            Resolver Agora
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-black/5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
               <div className={cn("p-2 rounded-lg bg-black/5", stat.color)}>
                 <stat.icon size={24} />
               </div>
               <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status</span>
            </div>
            <div>
              <p className="text-sm font-medium opacity-60 uppercase tracking-tighter">{stat.label}</p>
              <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Proposals */}
        <div className="bg-white rounded-xl border border-black/5 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-black/5 flex items-center justify-between">
            <h3 className="font-bold tracking-tight uppercase text-sm">Propostas Recentes</h3>
            <button onClick={() => setActiveTab('proposals')} className="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline flex items-center">
              Ver todas <ArrowRight size={12} className="ml-1" />
            </button>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase opacity-40 border-b border-black/5">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {proposals.slice(0, 5).map((p) => (
                  <tr key={p.id} className="hover:bg-black/5 transition-colors group cursor-pointer" onClick={() => setActiveTab(`edit-${p.id}`)}>
                    <td className="px-6 py-4">
                      <span className="font-medium text-sm">{p.clientName}</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs opacity-60">#{p.proposalNumber}</td>
                    <td className="px-6 py-4 text-xs opacity-60">{formatDate(p.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-tighter px-2 py-1 rounded",
                        p.status === ProposalStatus.WON ? "bg-green-100 text-green-700" :
                        p.status === ProposalStatus.SENT ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      )}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Processing Monitoring */}
        {proposals.some(p => (p.status as string) === 'calculando' || (p.status as string) === 'pendente') && (
          <div className="lg:col-span-1 space-y-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Engenharia em Tempo Real</h3>
             <div className="space-y-4">
                {proposals
                  .filter(p => (p.status as string) === 'calculando' || (p.status as string) === 'pendente')
                  .slice(0, 2)
                  .map(p => (
                    <ProposalStatusCard key={p.id} proposalId={p.id} initialProposal={p} />
                  ))
                }
             </div>
          </div>
        )}

        {/* Quick Actions / AI Insights */}
        <div className="space-y-6">
           <div className="bg-[var(--color-brand-dark)] text-white p-8 rounded-xl space-y-6 relative overflow-hidden">
             <div className="relative z-10 space-y-4">
               <div className="bg-white/10 w-fit p-3 rounded-xl backdrop-blur-sm">
                 <TrendingUp className="text-[var(--color-brand-primary)]" />
               </div>
               <h3 className="text-2xl font-bold tracking-tight">Potencialize suas Propostas</h3>
               <p className="text-sm text-white/60 leading-relaxed max-w-xs">
                 Use nossa IA para gerar o escopo técnico a partir de memoriais descritivos em segundos.
               </p>
               <button 
                onClick={() => setActiveTab('new-proposal')}
                className="bg-white text-black px-6 py-3 rounded-lg font-bold text-sm tracking-tight hover:bg-[var(--color-brand-primary)] hover:text-white transition-all flex items-center gap-2"
               >
                 Começar Agora <ArrowRight size={16} />
               </button>
             </div>
             {/* Abstract Decor */}
             <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-[var(--color-brand-primary)] rounded-full blur-[100px] opacity-20" />
           </div>

           <div className="bg-white p-6 rounded-xl border border-black/5">
             <h4 className="font-bold uppercase text-[10px] tracking-widest opacity-40 mb-4">Lembretes de Validade</h4>
             <div className="space-y-4">
                {proposals.filter(p => p.status === ProposalStatus.SENT).slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-8 bg-orange-500 rounded-full" />
                      <div>
                        <p className="text-sm font-semibold">{p.clientName}</p>
                        <p className="text-[10px] opacity-50 uppercase">{p.proposalNumber} • Vence em 12 dias</p>
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-black/5 rounded-md">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
