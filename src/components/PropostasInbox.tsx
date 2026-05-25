import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  FileText, HardHat, Building2, MapPin, Ruler,
  Calendar, Calculator, CheckCircle2, Clock, ChevronRight, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { BudgetProject, Client, Obra } from '../types';
import { obraService } from '../services/obraService';
import { clientService } from '../services/clientService';
import { budgetProjectService } from '../services/budgetProjectService';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import { useConfirm } from './ConfirmDialog';

interface Props {
  /** Called after "Assumir" — caller opens ProposalWizard with this obraId */
  onAssume: (obraId: string) => void;
  refreshSignal?: number;
}

interface InboxItem {
  obra: Obra;
  client: Client;
  budget: BudgetProject | null;
}

export function PropostasInbox({ onAssume, refreshSignal }: Props) {
  const confirm = useConfirm();
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

      // Obras com orçamento concluído (orcada) aguardando proposta
      const pending = allObras.filter(o => o.status === 'orcada');

      const enriched = await Promise.all(
        pending.map(async obra => {
          const client = clientMap.get(obra.clientId);
          if (!client) return null;
          const budget = obra.budgetProjectId
            ? await budgetProjectService.getById(obra.budgetProjectId).catch(() => null)
            : null;
          return { obra, client, budget };
        }),
      );

      setItems(
        enriched
          .filter((x): x is InboxItem => x !== null)
          // Mais antigos primeiro (prioridade de atendimento)
          .sort((a, b) =>
            new Date(a.obra.updatedAt).getTime() - new Date(b.obra.updatedAt).getTime(),
          ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const handleAssume = async (item: InboxItem) => {
    const ok = await confirm({
      title: 'Assumir proposta',
      message: <>Assumir a elaboração da proposta para <b>{item.obra.name}</b> ({item.client.companyName})?</>,
      confirmLabel: 'Assumir',
    });
    if (!ok) return;

    setAssuming(item.obra.id);
    try {
      // Avança obra: orcada → em_proposta
      await obraService.update(item.obra.id, { status: 'em_proposta' });
      toast.success(`Proposta iniciada: "${item.obra.name}"`);
      onAssume(item.obra.id);
    } catch (err) {
      toast.error('Erro ao assumir proposta.');
      console.error(err);
      setAssuming(null);
      await load();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-600">
              <FileText size={18} />
            </div>
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {items.length > 9 ? '9+' : items.length}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Caixa de Entrada</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              Orçamentos concluídos aguardando elaboração de proposta
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

      {/* Loading ─────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
        </div>
      )}

      {/* Empty ───────────────────────────────────────────────────────────── */}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-black/10 p-16 text-center">
          <CheckCircle2 size={32} className="mx-auto opacity-20 mb-3 text-blue-400" />
          <p className="text-sm font-black opacity-40">Tudo em dia!</p>
          <p className="text-xs opacity-30 mt-1 font-bold">
            Nenhum orçamento concluído aguardando proposta no momento.
          </p>
        </div>
      )}

      {/* Items ───────────────────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <motion.div
              key={item.obra.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden"
            >
              {/* Top accent */}
              <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />

              <div className="p-5 flex items-start gap-5">
                {/* Icon */}
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 shrink-0 mt-0.5">
                  <HardHat size={20} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h4 className="text-sm font-black tracking-tight leading-tight">
                      {item.obra.name}
                    </h4>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md shrink-0">
                      Aguardando Proposta
                    </span>
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-1.5 text-xs font-bold opacity-60 mb-2">
                    <Building2 size={12} />
                    <span>{item.client.companyName}</span>
                    {item.client.tradeName && (
                      <span className="opacity-50">· {item.client.tradeName}</span>
                    )}
                  </div>

                  {/* Budget origin badge */}
                  {item.budget ? (
                    <div className="flex items-center gap-3 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                      <div className="bg-blue-500/10 p-1.5 rounded-lg shrink-0">
                        <Calculator size={13} className="text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-0.5">
                          Orçamento de Referência
                        </p>
                        <p className="text-xs font-black text-blue-900 truncate">
                          {item.budget.title}
                        </p>
                        {item.budget.responsible && (
                          <p className="text-[10px] text-blue-400 font-medium">
                            Resp.: {item.budget.responsible}
                          </p>
                        )}
                      </div>
                      {item.budget.finalPrice > 0 && (
                        <div className="text-right shrink-0 border-l border-blue-100 pl-3">
                          <p className="text-[9px] text-blue-400 font-black uppercase tracking-wider mb-0.5">
                            Valor Orç.
                          </p>
                          <p className="text-sm font-black text-blue-700">
                            {formatCurrency(item.budget.finalPrice)}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-3 bg-black/[0.025] border border-black/5 rounded-xl px-3 py-2 text-[10px] font-bold opacity-30">
                      Sem orçamento vinculado
                    </div>
                  )}

                  {/* Meta */}
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
                      <Clock size={10} /> Orçado em {formatDate(item.obra.updatedAt)}
                    </span>
                  </div>

                  {/* Scope briefing */}
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

                  {/* Contact */}
                  {item.client.contacts.length > 0 &&
                    (() => {
                      const ct =
                        item.client.contacts.find(c => c.isPrimary) ??
                        item.client.contacts[0];
                      return (
                        <div className="mt-2 text-[10px] opacity-50 font-medium">
                          Contato:{' '}
                          <span className="font-bold">{ct.name}</span>
                          {ct.phone && ` · ${ct.phone}`}
                          {ct.email && ` · ${ct.email}`}
                        </div>
                      );
                    })()}
                </div>

                {/* Assumir CTA */}
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
