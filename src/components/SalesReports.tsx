import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  FunnelChart, Funnel, Cell, LabelList, Legend 
} from 'recharts';
import { 
  Filter, Calendar, User, TrendingUp, Target, CheckCircle2, 
  AlertCircle, ChevronDown, Download, PieChart, BarChart3, Users
} from 'lucide-react';
import { Proposal, ProposalStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SalesReportsProps {
  proposals: Proposal[];
}

type Period = 'month' | 'quarter' | 'year';

export function SalesReports({ proposals }: SalesReportsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('month');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Extract unique users for filter
  const salesUsers = useMemo(() => {
    const users = Array.from(new Set(proposals.map(p => p.createdBy || 'Sistema')));
    return ['all', ...users];
  }, [proposals]);

  // Filter proposals based on selection
  const filteredProposals = useMemo(() => {
    const now = new Date();
    return proposals.filter(p => {
      const matchesUser = selectedUser === 'all' || p.createdBy === selectedUser;
      
      const proposalDate = new Date(p.createdAt);
      let matchesPeriod = true;

      if (selectedPeriod === 'month') {
        matchesPeriod = proposalDate.getMonth() === now.getMonth() && 
                        proposalDate.getFullYear() === now.getFullYear();
      } else if (selectedPeriod === 'quarter') {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        const propQuarter = Math.floor(proposalDate.getMonth() / 3);
        matchesPeriod = currentQuarter === propQuarter && 
                        proposalDate.getFullYear() === now.getFullYear();
      } else if (selectedPeriod === 'year') {
        matchesPeriod = proposalDate.getFullYear() === now.getFullYear();
      }

      return matchesUser && matchesPeriod;
    });
  }, [proposals, selectedUser, selectedPeriod]);

  // Funnel Data Calculation
  const funnelData = useMemo(() => {
    const counts = {
      [ProposalStatus.DRAFT]: filteredProposals.length,
      [ProposalStatus.SENT]: filteredProposals.filter(p => [ProposalStatus.SENT, ProposalStatus.NEGOTIATING, ProposalStatus.WON, ProposalStatus.LOST].includes(p.status)).length,
      [ProposalStatus.NEGOTIATING]: filteredProposals.filter(p => [ProposalStatus.NEGOTIATING, ProposalStatus.WON, ProposalStatus.LOST].includes(p.status)).length,
      [ProposalStatus.WON]: filteredProposals.filter(p => p.status === ProposalStatus.WON).length,
    };

    return [
      { value: counts[ProposalStatus.DRAFT], name: 'Início (Draft/All)', fill: '#94a3b8' },
      { value: counts[ProposalStatus.SENT], name: 'Enviadas', fill: '#60a5fa' },
      { value: counts[ProposalStatus.NEGOTIATING], name: 'Negociação', fill: '#fbbf24' },
      { value: counts[ProposalStatus.WON], name: 'Fechadas', fill: '#22c55e' },
    ];
  }, [filteredProposals]);

  // Conversion rates calculation
  const conversionStats = useMemo(() => {
    const total = filteredProposals.length;
    const won = filteredProposals.filter(p => p.status === ProposalStatus.WON).length;
    const lost = filteredProposals.filter(p => p.status === ProposalStatus.LOST).length;
    const rate = total > 0 ? (won / total) * 100 : 0;

    return { total, won, lost, rate };
  }, [filteredProposals]);

  // Performance by Salesperson
  const performanceByUser = useMemo(() => {
    const userStats: Record<string, { name: string, total: number, won: number, value: number }> = {};

    filteredProposals.forEach(p => {
      const user = p.createdBy || 'Sistema';
      if (!userStats[user]) {
        userStats[user] = { name: user, total: 0, won: 0, value: 0 };
      }
      userStats[user].total += 1;
      if (p.status === ProposalStatus.WON) {
        userStats[user].won += 1;
        userStats[user].value += p.commercialProposal?.totalValue || 0;
      }
    });

    return Object.values(userStats).sort((a, b) => b.value - a.value);
  }, [filteredProposals]);

  return (
    <div className="space-y-8 p-4">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-neutral-900 uppercase">Relatórios de Vendas</h2>
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Inteligência comercial e performance de equipe</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            {(['month', 'quarter', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPeriod(p)}
                className={cn(
                  "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  selectedPeriod === p ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"
                )}
              >
                {p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>

          {/* User Filter */}
          <div className="relative">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="appearance-none pl-10 pr-10 py-3 bg-white border border-neutral-200 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-black/5 outline-none"
            >
              <option value="all">Todos Vendedores</option>
              {salesUsers.filter(u => u !== 'all').map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <Users size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          </div>

          <button className="p-3 bg-white border border-neutral-200 rounded-xl hover:bg-neutral-50 transition-colors">
            <Download size={18} className="text-neutral-600" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          label="Total de Propostas" 
          value={conversionStats.total.toString()} 
          icon={BarChart3} 
          color="text-blue-500" 
          description="Volume total no período"
        />
        <MetricCard 
          label="Taxa de Conversão" 
          value={`${conversionStats.rate.toFixed(1)}%`} 
          icon={TrendingUp} 
          color="text-green-500" 
          description="Eficiência de fechamento"
          trend="+2.4%"
        />
        <MetricCard 
          label="Vendas (Won)" 
          value={conversionStats.won.toString()} 
          icon={CheckCircle2} 
          color="text-emerald-500" 
          description="Contratos concretizados"
        />
        <MetricCard 
          label="Perdas (Lost)" 
          value={conversionStats.lost.toString()} 
          icon={AlertCircle} 
          color="text-red-500" 
          description="Oportunidades não ganhas"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Funnel Chart */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <PieChart size={18} className="text-orange-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Funil de Vendas</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }} 
                />
                <Funnel
                  data={funnelData}
                  dataKey="value"
                  isAnimationActive
                >
                  <LabelList position="right" fill="#666" content={(props: any) => {
                    const { x, y, width, value, name } = props;
                    return (
                      <text x={x + width + 10} y={y + 20} fill="#666" fontSize={10} fontWeight="bold" textAnchor="start">
                        {name}: {value}
                      </text>
                    );
                  }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-neutral-50 rounded-xl">
             <div className="flex justify-between items-end">
               <div>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Passagem Funil</p>
                 <p className="text-sm font-black text-neutral-900">Negociação para Ganho</p>
               </div>
               <p className="text-lg font-black text-green-500">
                 {funnelData[2].value > 0 ? ((funnelData[3].value / funnelData[2].value) * 100).toFixed(1) : 0}%
               </p>
             </div>
          </div>
        </div>

        {/* Bar Chart - Conversion by Monthly Volume (Simulated context) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 size={18} className="text-blue-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Performance de Conversão</h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceByUser}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 'bold' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar 
                  dataKey="total" 
                  name="Total Propostas" 
                  fill="#e2e8f0" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
                <Bar 
                  dataKey="won" 
                  name="Ganhas" 
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Salesperson Performance Table */}
        <div className="lg:col-span-12 bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-neutral-900" />
              <h3 className="text-xs font-black uppercase tracking-widest text-neutral-900">Performance por Vendedor</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Total {performanceByUser.length} vendedores
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  <th className="px-6 py-4">Vendedor</th>
                  <th className="px-6 py-4 text-center">Propostas</th>
                  <th className="px-6 py-4 text-center">Fechamentos</th>
                  <th className="px-6 py-4 text-center">Taxa Conversão</th>
                  <th className="px-6 py-4 text-right">Valor em Contratos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {performanceByUser.map((user, idx) => {
                  const rate = (user.won / user.total) * 100;
                  return (
                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-black">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-neutral-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-neutral-600">{user.total}</td>
                      <td className="px-6 py-4 text-center text-sm font-bold text-neutral-600">{user.won}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-sm font-black text-neutral-900">{rate.toFixed(1)}%</span>
                          <div className="w-20 h-1 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${rate}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-neutral-900">{formatCurrency(user.value)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, description, trend }: { 
  label: string; 
  value: string; 
  icon: any; 
  color: string;
  description: string;
  trend?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-2 rounded-xl bg-neutral-50", color)}>
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-1 rounded-lg">
            {trend}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</p>
        <h4 className="text-2xl font-black text-neutral-900 tracking-tighter">{value}</h4>
        <p className="text-[10px] font-medium text-neutral-400">{description}</p>
      </div>
    </div>
  );
}
