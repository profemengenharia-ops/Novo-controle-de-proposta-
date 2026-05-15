import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Send, Building2, HardHat, FileText, CheckCircle2, XCircle,
  RefreshCw, Trophy, ThumbsDown, ExternalLink, Clock, Ruler, Calendar,
  Calculator, ChevronRight, Hourglass, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { BudgetProject, Client, Obra, Proposal, ProposalStatus } from '../types';
import { obraService } from '../services/obraService';
import { clientService } from '../services/clientService';
import { proposalService } from '../services/proposalService';
import { budgetProjectService } from '../services/budgetProjectService';
import { cn, formatCurrency, formatDate } from '../lib/utils';

interface Props {
  refreshSignal?: number;
  /** Navigate to edit a specific proposal */
  onOpenProposal?: (proposalId: string) => void;
}

interface InboxItem {
  obra: Obra;
  client: Client;
  proposal: Proposal | null;
  budget: BudgetProject | null;
}

type Section = 'elaboracao' | 'prontas';
type ClosingAction = { obraId: string; type: 'ganha' | 'perdida' } | null;
type ConfirmSend = { obraId: string } | null;

export function PropostasInboxComercial({ refreshSignal, onOpenProposal }: Props) {
  const [emElaboracao, setEmElaboracao] = useState<InboxItem[]>([]);
  const [prontas, setProntas] = useState<InboxItem[]>([]);
  const [section, setSection] = useState<Section>('prontas');
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState<ClosingAction>(null);
  const [confirmSend, setConfirmSend] = useState<ConfirmSend>(null);
  const [lossReason, setLossReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [allObras, allClients] = await Promise.all([
        obraService.getAll(),
        clientService.getAll(),
      ]);
      const clientMap = new Map(allClients.map(c => [c.id, c]));

      const byStatus = (statuses: string[]) =>
        allObras.filter(o => statuses.includes(o.status));

      const enrich = async (obras: Obra[]): Promise<InboxItem[]> => {
        const enriched = await Promise.all(
          obras.map(async obra => {
            const client = clientMap.get(obra.clientId);
            if (!client) return null;
            const [proposal, budget] = await Promise.all([
              obra.proposalId
                ? proposalService.getProposal(obra.proposalId).catch(() => null)
                : Promise.resolve(null),
              obra.budgetProjectId
                ? budgetProjectService.getById(obra.budgetProjectId).catch(() => null)
                : Promise.resolve(null),
            ]);
            return { obra, client, proposal, budget };
          }),
        );
        return enriched
          .filter((x): x is InboxItem => x !== null)
          .sort(
            (a, b) =>
              new Date(b.obra.updatedAt).getTime() - new Date(a.obra.updatedAt).getTime(),
          );
      };

      const [elaboracaoItems, prontasItems] = await Promise.all([
        enrich(byStatus(['em_proposta'])),
        enrich(byStatus(['proposta_enviada'])),
      ]);

      setEmElaboracao(elaboracaoItems);
      setProntas(prontasItems);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshSignal]);

  const handleClose = async (
    item: InboxItem,
    type: 'ganha' | 'perdida',
    reason?: string,
  ) => {
    try {
      const obraStatus = type === 'ganha' ? 'ganha' : 'perdida';
      const proposalStatus = type === 'ganha' ? ProposalStatus.WON : ProposalStatus.LOST;

      await obraService.update(item.obra.id, { status: obraStatus as any });

      if (item.obra.proposalId) {
        await proposalService.updateProposal(item.obra.proposalId, {
          status: proposalStatus,
          ...(reason ? { lossReason: reason } : {}),
        });
      }

      toast.success(
        type === 'ganha'
          ? `🏆 Obra "${item.obra.name}" marcada como GANHA!`
          : `Obra "${item.obra.name}" marcada como perdida.`,
      );
      setClosing(null);
      setLossReason('');
      await load();
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      console.error(err);
    }
  };

  /** Avança obra de em_proposta → proposta_enviada e proposta → SENT */
  const handleMarkReady = async (item: InboxItem) => {
    try {
      await obraService.update(item.obra.id, { status: 'proposta_enviada' });
      if (item.obra.proposalId) {
        await proposalService.updateProposal(item.obra.proposalId, {
          status: ProposalStatus.SENT,
        });
      }
      toast.success(`✅ Proposta de "${item.obra.name}" enviada ao Comercial!`);
      setConfirmSend(null);
      setSection('prontas'); // vai para aba prontas para ver o resultado
      await load();
    } catch (err) {
      toast.error('Erro ao atualizar status.');
      console.error(err);
    }
  };

  const items = section === 'elaboracao' ? emElaboracao : prontas;

  // ── Pipeline steps ──────────────────────────────────────────────────────────
  const pipelineSteps: Array<
    | { label: string; color: string; active?: boolean; count?: number; onClick?: () => void }
    | { arrow: true }
  > = [
    { label: 'Follow-UP', color: 'bg-gray-400' },
    { arrow: true },
    { label: 'Orçamento', color: 'bg-blue-400' },
    { arrow: true },
    {
      label: 'Em Proposta',
      color: 'bg-orange-400',
      active: section === 'elaboracao',
      count: emElaboracao.length,
      onClick: () => setSection('elaboracao'),
    },
    { arrow: true },
    {
      label: 'Pronta p/ Envio',
      color: 'bg-green-500',
      active: section === 'prontas',
      count: prontas.length,
      onClick: () => setSection('prontas'),
    },
    { arrow: true },
    { label: 'Fechamento', color: 'bg-purple-400' },
  ];

  return (
    <div className="space-y-4">
      {/* Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-green-500/10 p-2.5 rounded-xl text-green-600">
              <Send size={18} />
            </div>
            {prontas.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {prontas.length > 9 ? '9+' : prontas.length}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Gestão de Propostas</h3>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              Pipeline comercial · Orçamento → Proposta → Fechamento
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

      {/* Pipeline breadcrumb ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-black/[0.02] rounded-2xl p-3 overflow-x-auto">
        {pipelineSteps.map((step, i) => {
          if ('arrow' in step) {
            return <ChevronRight key={i} size={13} className="opacity-20 shrink-0" />;
          }
          return (
            <button
              key={i}
              onClick={step.onClick}
              disabled={!step.onClick}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0',
                step.active
                  ? 'bg-white shadow-md text-black'
                  : step.onClick
                    ? 'text-black/40 hover:text-black hover:bg-white/60'
                    : 'text-black/25 cursor-default',
              )}
            >
              <span className={cn('w-2 h-2 rounded-full shrink-0', step.color)} />
              {step.label}
              {step.count != null && (
                <span
                  className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full font-black',
                    step.active ? 'bg-black/10' : 'bg-black/5',
                  )}
                >
                  {step.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Loading ────────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="py-16 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto" />
        </div>
      )}

      {/* Empty state ────────────────────────────────────────────────────────── */}
      {!loading && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-black/10 p-16 text-center">
          {section === 'elaboracao' ? (
            <>
              <Hourglass size={32} className="mx-auto opacity-20 mb-3 text-orange-500" />
              <p className="text-sm font-black opacity-40">Nenhuma proposta em elaboração.</p>
              <p className="text-xs opacity-30 mt-1 font-bold">
                Quando um orçamento avançar para proposta, aparecerá aqui.
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 size={32} className="mx-auto opacity-20 mb-3 text-green-500" />
              <p className="text-sm font-black opacity-40">Nenhuma proposta aguardando envio.</p>
              <p className="text-xs opacity-30 mt-1 font-bold">
                Quando a equipe de Propostas finalizar, as obras aparecerão aqui.
              </p>
            </>
          )}
        </div>
      )}

      {/* Cards ──────────────────────────────────────────────────────────────── */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => (
            <InboxCard
              key={item.obra.id}
              item={item}
              section={section}
              closing={closing}
              confirmSend={confirmSend}
              lossReason={lossReason}
              onLossReasonChange={setLossReason}
              onStartClose={(obraId, type) => setClosing({ obraId, type })}
              onCancelClose={() => { setClosing(null); setLossReason(''); }}
              onConfirmClose={(type, reason) => handleClose(item, type, reason)}
              onRequestSend={obraId => setConfirmSend({ obraId })}
              onCancelSend={() => setConfirmSend(null)}
              onConfirmSend={() => handleMarkReady(item)}
              onOpenProposal={onOpenProposal}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

interface CardProps {
  item: InboxItem;
  section: Section;
  closing: ClosingAction;
  confirmSend: ConfirmSend;
  lossReason: string;
  onLossReasonChange: (v: string) => void;
  onStartClose: (obraId: string, type: 'ganha' | 'perdida') => void;
  onCancelClose: () => void;
  onConfirmClose: (type: 'ganha' | 'perdida', reason?: string) => void;
  onRequestSend: (obraId: string) => void;
  onCancelSend: () => void;
  onConfirmSend: () => void;
  onOpenProposal?: (id: string) => void;
}

function InboxCard({
  item,
  section,
  closing,
  confirmSend,
  lossReason,
  onLossReasonChange,
  onStartClose,
  onCancelClose,
  onConfirmClose,
  onRequestSend,
  onCancelSend,
  onConfirmSend,
  onOpenProposal,
}: CardProps) {
  const { obra, client, proposal, budget } = item;
  const isClosing   = closing?.obraId    === obra.id;
  const isSending   = confirmSend?.obraId === obra.id;

  const isElaboracao = section === 'elaboracao';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white rounded-2xl border shadow-sm overflow-hidden',
        isElaboracao ? 'border-orange-200' : 'border-green-200',
      )}
    >
      {/* Top accent strip */}
      <div
        className={cn(
          'h-1 bg-gradient-to-r',
          isElaboracao ? 'from-orange-400 to-amber-400' : 'from-green-400 to-emerald-500',
        )}
      />

      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Icon */}
          <div
            className={cn(
              'p-3 rounded-xl shrink-0',
              isElaboracao ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600',
            )}
          >
            <HardHat size={20} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-3 mb-1">
              <h4 className="text-sm font-black tracking-tight leading-snug">{obra.name}</h4>
              <span
                className={cn(
                  'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md shrink-0',
                  isElaboracao
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700',
                )}
              >
                {isElaboracao ? 'Em Elaboração' : 'Pronta p/ Envio'}
              </span>
            </div>

            {/* Client */}
            <div className="flex items-center gap-1.5 text-xs font-bold opacity-60 mb-3">
              <Building2 size={12} />
              <span>{client.companyName}</span>
              {client.tradeName && (
                <span className="opacity-50">· {client.tradeName}</span>
              )}
            </div>

            {/* ── Origin badge ─────────────────────────────────────────────── */}
            {budget ? (
              <div className="flex items-center gap-3 mb-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <div className="bg-blue-500/10 p-1.5 rounded-lg shrink-0">
                  <Calculator size={13} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-0.5">
                    Originado de Orçamento
                  </p>
                  <p className="text-xs font-black text-blue-900 truncate">{budget.title}</p>
                  {budget.responsible && (
                    <p className="text-[10px] text-blue-400 font-medium">
                      Resp.: {budget.responsible}
                    </p>
                  )}
                </div>
                {budget.finalPrice > 0 && (
                  <div className="text-right shrink-0 border-l border-blue-100 pl-3">
                    <p className="text-[9px] text-blue-400 font-black uppercase tracking-wider mb-0.5">
                      Valor Orç.
                    </p>
                    <p className="text-sm font-black text-blue-700">
                      {formatCurrency(budget.finalPrice)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-3 bg-black/[0.025] border border-black/5 rounded-xl px-3 py-2">
                <AlertTriangle size={12} className="opacity-25 shrink-0" />
                <p className="text-[10px] font-bold opacity-30">
                  Proposta avulsa — sem vínculo com orçamento
                </p>
              </div>
            )}

            {/* Meta details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] opacity-50 font-medium mb-3">
              {obra.estimatedArea && (
                <span className="flex items-center gap-1">
                  <Ruler size={10} /> {obra.estimatedArea} m²
                </span>
              )}
              {obra.deadline && (
                <span className="flex items-center gap-1">
                  <Calendar size={10} /> Prazo obra: {formatDate(obra.deadline)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {isElaboracao ? 'Em elaboração desde' : 'Disponível desde'}{' '}
                {formatDate(obra.updatedAt)}
              </span>
            </div>

            {/* Proposal summary box */}
            {proposal ? (
              <div className="flex items-center justify-between bg-black/[0.02] rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-1 mb-0.5">
                    <FileText size={9} /> Proposta
                  </p>
                  <p className="text-sm font-black">{proposal.proposalNumber}</p>
                  {proposal.scopeTitle && (
                    <p className="text-[10px] opacity-50 font-medium">{proposal.scopeTitle}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                    Valor total
                  </p>
                  <p
                    className={cn(
                      'text-base font-black',
                      isElaboracao ? 'text-orange-700' : 'text-green-700',
                    )}
                  >
                    {formatCurrency(proposal.commercialProposal?.totalValue ?? 0)}
                  </p>
                </div>
                {onOpenProposal && (
                  <button
                    onClick={() => onOpenProposal(proposal.id)}
                    className="ml-3 p-2 hover:bg-black/5 rounded-lg text-black/40 hover:text-black transition-colors"
                    title="Abrir proposta"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            ) : (
              isElaboracao && (
                <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                  <Hourglass size={14} className="text-orange-400 animate-pulse shrink-0" />
                  <p className="text-xs font-bold text-orange-600">
                    Aguardando elaboração da proposta pelo setor responsável…
                  </p>
                </div>
              )
            )}

            {/* Primary contact */}
            {client.contacts.length > 0 &&
              (() => {
                const ct =
                  client.contacts.find(c => c.isPrimary) ?? client.contacts[0];
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
        </div>

        {/* ── Action bar ──────────────────────────────────────────────────── */}
        {isElaboracao ? (
          /* Em Elaboração: revisar + botão principal de envio */
          <div className="flex items-center gap-2 pt-4 border-t border-black/5">
            {proposal && onOpenProposal && (
              <button
                onClick={() => onOpenProposal(proposal.id)}
                className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-1.5 border border-orange-200 text-orange-600 hover:bg-orange-50 transition-all"
              >
                <ExternalLink size={12} /> Revisar
              </button>
            )}
            <div className="flex-1" />
            {proposal ? (
              <button
                onClick={() => onRequestSend(obra.id)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 transition-all shadow-md shadow-green-600/20 active:scale-95"
              >
                <Send size={13} /> Enviar p/ Comercial
              </button>
            ) : (
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-30">
                Aguardando elaboração da proposta…
              </p>
            )}
          </div>
        ) : (
          /* Pronta p/ Envio: win / loss closing */
          <div className="flex items-center gap-3 pt-4 border-t border-black/5">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 flex-1">
              Resultado da negociação:
            </p>
            <button
              onClick={() => onStartClose(obra.id, 'perdida')}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 transition-all"
            >
              <ThumbsDown size={13} /> Perdida
            </button>
            <button
              onClick={() => onConfirmClose('ganha')}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-green-700 transition-all shadow-md shadow-green-600/20 active:scale-95"
            >
              <Trophy size={13} /> Ganha!
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm send inline panel ────────────────────────────────────── */}
      {isSending && (
        <div className="border-t border-green-100 bg-green-50/60 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-green-800 flex items-center gap-2">
            <Send size={13} /> Confirmar envio ao Comercial
          </p>
          <p className="text-xs text-green-700 font-medium leading-relaxed">
            A proposta será marcada como <span className="font-black">Pronta p/ Envio</span> e
            ficará visível para o Comercial fechar o negócio. Confirmar?
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancelSend}
              className="flex-1 py-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirmSend}
              className="flex-[2] py-2 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow shadow-green-600/20 flex items-center justify-center gap-2"
            >
              <Send size={12} /> Confirmar Envio
            </button>
          </div>
        </div>
      )}

      {/* ── Loss reason inline panel ─────────────────────────────────────── */}
      {isClosing && closing?.type === 'perdida' && (
        <div className="border-t border-red-100 bg-red-50/50 p-4 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-red-700 flex items-center gap-2">
            <XCircle size={13} /> Motivo da perda
          </p>
          <select
            value={lossReason}
            onChange={e => onLossReasonChange(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-white border border-red-200 rounded-xl focus:outline-none focus:border-red-400"
          >
            <option value="">Selecione um motivo…</option>
            <option value="Preço alto">Preço alto / Concorrência</option>
            <option value="Prazo de entrega">Prazo de entrega não atendido</option>
            <option value="Escopo técnico">Falta de conformidade técnica</option>
            <option value="Relacionamento">Perda por relacionamento / Indicação</option>
            <option value="Cancelado">Projeto cancelado pelo cliente</option>
            <option value="Outros">Outros motivos</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={onCancelClose}
              className="flex-1 py-2 text-xs font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirmClose('perdida', lossReason)}
              disabled={!lossReason}
              className="flex-[2] py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-40"
            >
              Confirmar Perda
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
