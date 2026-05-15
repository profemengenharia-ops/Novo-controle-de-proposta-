import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Inbox, HardHat, Building2, MapPin, Ruler, Calendar, FileText,
  CheckCircle2, Clock, ChevronRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { BudgetProject, Client, Obra } from '../types';
import { obraService } from '../services/obraService';
import { clientService } from '../services/clientService';
import { budgetProjectService } from '../services/budgetProjectService';
import { useAuth } from '../hooks/useAuth';
import { cn, formatDate } from '../lib/utils';

interface Props {
  /** Called after "Assumir" — opens the new BudgetProject in the editor */
  onAssume: (project: BudgetProject) => void;
  /** Refreshed externally to force re-fetch */
  refreshSignal?: number;
}

interface InboxItem {
  obra: Obra;
  client: Client;
}

export function OrcamentosInbox({ onAssume, refreshSignal }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assuming, setAssuming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allObras, allClients] = await Promise.all([
        obraService.getAll(),
        clientService.getAll(),
      ]);

      const clientMap = new Map(allClients.map(c => [c.id, c]));

      const pending = allObras
        .filter(o => o.status === 'aguardando_orcamento')
        .map(o => {
          const client = clientMap.get(o.clientId);
          return client ? { obra: o, client } : null;
        })
        .filter((x): x is InboxItem => x !== null)
        .sort((a, b) =>
          new Date(a.obra.updatedAt).getTime() - new Date(b.obra.updatedAt).getTime(), // mais antigos primeiro
        );

      setItems(pending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const handleAssume = async (item: InboxItem) => {
    if (!confirm(`Assumir orçamento da obra "${item.obra.name}" (${item.client.companyName})?`)) return;
    setAssuming(item.obra.id);
    try {
      // 1. Cria o BudgetProject com os FKs do cliente e da obra
      const projectId = await budgetProjectService.create(
        {
          title: item.obra.name,
          clientName: item.client.tradeName ?? item.client.companyName,
          address: [item.obra.address, item.obra.city, item.obra.state].filter(Boolean).join(', '),
          responsible: '',
          notes: item.obra.scopeSummary ?? '',
          clientId: item.client.id,
          obraId: item.obra.id,
        },
        user?.id ?? 'mock-user',
      );

      // 2. Atualiza a Obra: status → em_orcamento, vincula o BudgetProject
      await obraService.update(item.obra.id, {
        status: 'em_orcamento',
        budgetProjectId: projectId,
      });

      // 3. Busca o projeto criado para passar ao editor
      const project = await budgetProjectService.getById(projectId);
      if (!project) throw new Error('Projeto não encontrado após criação.');

      toast.success(`Orçamento iniciado: "${item.obra.name}"`);
      onAssume(project);
    } catch (err) {
      toast.error('Erro ao assumir orçamento.');
      console.error(err);
      setAssuming(null);
      await load();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-600">
              <Inbox size={18} />
            </div>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Caixa de Entrada</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              Obras aguardando orçamento
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="p-2 hover:bg-black/5 rounded-xl transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={15} className={cn('opacity-40', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-black/10 p-16 text-center">
          <CheckCircle2 size={32} className="mx-auto opacity-20 mb-3 text-green-500" />
          <p className="text-sm font-black opacity-40">Tudo em dia!</p>
          <p className="text-xs opacity-30 mt-1 font-bold">
            Nenhuma obra aguardando orçamento no momento.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto" />
        </div>
      )}

      {/* Items */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div
              key={item.obra.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden"
            >
              {/* Faixa de urgência */}
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-400" />

              <div className="p-5 flex items-start gap-5">
                {/* Ícone */}
                <div className="bg-amber-50 p-3 rounded-xl text-amber-600 shrink-0 mt-0.5">
                  <HardHat size={20} />
                </div>

                {/* Dados */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h4 className="text-sm font-black tracking-tight leading-tight">{item.obra.name}</h4>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md shrink-0">
                      Aguardando
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="flex items-center gap-1.5 text-xs font-bold opacity-60 mb-2">
                    <Building2 size={12} />
                    <span>{item.client.companyName}</span>
                    {item.client.tradeName && (
                      <span className="opacity-50">· {item.client.tradeName}</span>
                    )}
                  </div>

                  {/* Detalhes em linha */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] opacity-50 font-medium">
                    {(item.obra.city || item.obra.state) && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {[item.obra.city, item.obra.state].filter(Boolean).join('/')}
                      </span>
                    )}
                    {item.obra.estimatedArea && (
                      <span className="flex items-center gap-1">
                        <Ruler size={10} /> {item.obra.estimatedArea} m²
                      </span>
                    )}
                    {item.obra.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> Prazo: {formatDate(item.obra.deadline)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={10} /> Solicitado em {formatDate(item.obra.updatedAt)}
                    </span>
                  </div>

                  {/* Briefing */}
                  {item.obra.scopeSummary && (
                    <div className="mt-3 p-3 bg-black/[0.03] rounded-xl">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1 flex items-center gap-1">
                        <FileText size={9} /> Briefing do Comercial
                      </p>
                      <p className="text-xs opacity-70 leading-relaxed line-clamp-3">
                        {item.obra.scopeSummary}
                      </p>
                    </div>
                  )}

                  {/* Contato do cliente */}
                  {item.client.contacts.length > 0 && (() => {
                    const ct = item.client.contacts.find(c => c.isPrimary) ?? item.client.contacts[0];
                    return (
                      <div className="mt-2 text-[10px] opacity-50 font-medium">
                        Contato: <span className="font-bold">{ct.name}</span>
                        {ct.phone && ` · ${ct.phone}`}
                        {ct.email && ` · ${ct.email}`}
                      </div>
                    );
                  })()}
                </div>

                {/* Ação */}
                <div className="shrink-0">
                  <button
                    onClick={() => handleAssume(item)}
                    disabled={assuming === item.obra.id}
                    className={cn(
                      'px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-md',
                      assuming === item.obra.id
                        ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-neutral-800 shadow-black/10',
                    )}
                  >
                    {assuming === item.obra.id ? (
                      <span className="animate-spin rounded-full w-3 h-3 border-2 border-neutral-400 border-t-transparent" />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    {assuming === item.obra.id ? 'Iniciando…' : 'Assumir'}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
