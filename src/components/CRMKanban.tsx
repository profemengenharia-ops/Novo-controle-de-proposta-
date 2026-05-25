import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Target, XCircle,
  CheckCircle, Clock, MapPin, Ruler,
  Calendar, RefreshCw, Loader2, GripVertical,
  Percent, Briefcase, Trophy, AlertTriangle,
  Send,
} from 'lucide-react';
import { Obra, ObraStatus, Client, Proposal, ProposalStatus } from '../types';
import { obraService } from '../services/obraService';
import { clientService } from '../services/clientService';
import { proposalService } from '../services/proposalService';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// ─── Column definitions ───────────────────────────────────────────────────────

type ColumnId = 'followup' | 'orcamento' | 'proposta' | 'negociacao' | 'fechado' | 'perdido';

interface KanbanColumn {
  id: ColumnId;
  label: string;
  statuses: ObraStatus[];
  targetStatus: ObraStatus;
  accent: string;       // bg color for top bar
  headerBg: string;
  headerText: string;
  cardBorder: string;
  cardBg: string;
  tagBg: string;
  tagText: string;
  countBg: string;
  countText: string;
  valueBg: string;
  valueText: string;
  icon: React.ReactNode;
  dropRing: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'followup',
    label: 'Follow-Up',
    statuses: ['prospeccao'],
    targetStatus: 'prospeccao',
    accent: 'bg-slate-400',
    headerBg: 'bg-slate-50',
    headerText: 'text-slate-600',
    cardBorder: 'border-slate-100 hover:border-slate-300',
    cardBg: 'bg-white',
    tagBg: 'bg-slate-100',
    tagText: 'text-slate-600',
    countBg: 'bg-slate-200',
    countText: 'text-slate-700',
    valueBg: 'bg-slate-50',
    valueText: 'text-slate-700',
    icon: <Clock size={12} />,
    dropRing: 'ring-slate-400',
  },
  {
    id: 'orcamento',
    label: 'Orçamento',
    statuses: ['aguardando_orcamento', 'em_orcamento', 'orcada'],
    targetStatus: 'em_orcamento',
    accent: 'bg-amber-400',
    headerBg: 'bg-amber-50',
    headerText: 'text-amber-700',
    cardBorder: 'border-amber-100 hover:border-amber-300',
    cardBg: 'bg-white',
    tagBg: 'bg-amber-100',
    tagText: 'text-amber-700',
    countBg: 'bg-amber-200',
    countText: 'text-amber-800',
    valueBg: 'bg-amber-50',
    valueText: 'text-amber-700',
    icon: <DollarSign size={12} />,
    dropRing: 'ring-amber-400',
  },
  {
    id: 'proposta',
    label: 'Proposta',
    statuses: ['em_proposta'],
    targetStatus: 'em_proposta',
    accent: 'bg-blue-500',
    headerBg: 'bg-blue-50',
    headerText: 'text-blue-700',
    cardBorder: 'border-blue-100 hover:border-blue-300',
    cardBg: 'bg-white',
    tagBg: 'bg-blue-100',
    tagText: 'text-blue-700',
    countBg: 'bg-blue-200',
    countText: 'text-blue-800',
    valueBg: 'bg-blue-50',
    valueText: 'text-blue-700',
    icon: <Target size={12} />,
    dropRing: 'ring-blue-400',
  },
  {
    id: 'negociacao',
    label: 'Negociação',
    statuses: ['proposta_enviada'],
    targetStatus: 'proposta_enviada',
    accent: 'bg-violet-500',
    headerBg: 'bg-violet-50',
    headerText: 'text-violet-700',
    cardBorder: 'border-violet-100 hover:border-violet-300',
    cardBg: 'bg-white',
    tagBg: 'bg-violet-100',
    tagText: 'text-violet-700',
    countBg: 'bg-violet-200',
    countText: 'text-violet-800',
    valueBg: 'bg-violet-50',
    valueText: 'text-violet-700',
    icon: <TrendingUp size={12} />,
    dropRing: 'ring-violet-400',
  },
  {
    id: 'fechado',
    label: 'Fechado',
    statuses: ['ganha'],
    targetStatus: 'ganha',
    accent: 'bg-emerald-500',
    headerBg: 'bg-emerald-50',
    headerText: 'text-emerald-700',
    cardBorder: 'border-emerald-100 hover:border-emerald-300',
    cardBg: 'bg-white',
    tagBg: 'bg-emerald-100',
    tagText: 'text-emerald-700',
    countBg: 'bg-emerald-200',
    countText: 'text-emerald-800',
    valueBg: 'bg-emerald-50',
    valueText: 'text-emerald-700',
    icon: <Trophy size={12} />,
    dropRing: 'ring-emerald-400',
  },
  {
    id: 'perdido',
    label: 'Perdido',
    statuses: ['perdida', 'cancelada'],
    targetStatus: 'perdida',
    accent: 'bg-rose-400',
    headerBg: 'bg-rose-50',
    headerText: 'text-rose-600',
    cardBorder: 'border-rose-100 hover:border-rose-200',
    cardBg: 'bg-white',
    tagBg: 'bg-rose-100',
    tagText: 'text-rose-600',
    countBg: 'bg-rose-200',
    countText: 'text-rose-700',
    valueBg: 'bg-rose-50',
    valueText: 'text-rose-600',
    icon: <XCircle size={12} />,
    dropRing: 'ring-rose-400',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OBRA_TYPE_LABEL: Record<string, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  industrial: 'Industrial',
  reforma: 'Reforma',
  manutencao: 'Manutenção',
  infraestrutura: 'Infra',
  outro: 'Outro',
};

const STATUS_SUBLABEL: Partial<Record<ObraStatus, string>> = {
  prospeccao: 'Prospecção',
  aguardando_orcamento: 'Aguardando',
  em_orcamento: 'Em orçamento',
  orcada: 'Orçada',
  em_proposta: 'Em proposta',
  proposta_enviada: 'Proposta enviada',
  ganha: 'Ganha',
  perdida: 'Perdida',
  cancelada: 'Cancelada',
};

const fmtCompact = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    notation: 'compact', maximumFractionDigits: 1,
  }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

/** Two-letter avatar from a string */
const initials = (s: string) =>
  s.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

/** Deterministic hue from string (for avatar bg) */
const avatarHue = (s: string) =>
  s.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

// ─── ObraCard ─────────────────────────────────────────────────────────────────

interface CardProps {
  obra: Obra;
  col: KanbanColumn;
  client?: Client;
  proposal?: Proposal;
  isDragging: boolean;
  isUpdating: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onAdvance?: () => void; // quick-action: move to next stage
}

function ObraCard({ obra, col, client, proposal, isDragging, isUpdating, onDragStart, onDragEnd, onAdvance }: CardProps) {
  const name = client?.companyName ?? 'Cliente';
  const ini = initials(name);
  const hue = avatarHue(name);
  const proposalValue = proposal?.commercialProposal?.totalValue;
  const hasValue = proposalValue != null && proposalValue > 0;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'group relative bg-white rounded-2xl border shadow-sm',
        'transition-all duration-150 cursor-grab active:cursor-grabbing select-none',
        col.cardBorder,
        isDragging  && 'opacity-30 scale-95 shadow-none',
        isUpdating  && 'opacity-50 pointer-events-none',
        !isDragging && !isUpdating && 'hover:shadow-md',
      )}
    >
      {/* Left accent bar */}
      <div className={cn('absolute left-0 top-3 bottom-3 w-0.5 rounded-full', col.accent)} />

      <div className="pl-4 pr-3 pt-3 pb-3">
        {/* Client row */}
        <div className="flex items-start gap-2.5 mb-2.5">
          {/* Avatar */}
          <div
            className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center text-white text-[9px] font-black"
            style={{ backgroundColor: `hsl(${hue},50%,45%)` }}
          >
            {ini}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-black/40 truncate leading-none mb-0.5">
              {client?.tradeName || name}
            </p>
            <p className="text-[11px] font-black text-black leading-snug line-clamp-2">
              {obra.name}
            </p>
          </div>

          {/* Drag handle */}
          <GripVertical
            size={13}
            className="shrink-0 mt-0.5 text-black/15 group-hover:text-black/35 transition-colors"
          />
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-1 mb-2">
          {obra.type && (
            <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide', col.tagBg, col.tagText)}>
              {OBRA_TYPE_LABEL[obra.type] ?? obra.type}
            </span>
          )}
          <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-black/5 text-black/40 uppercase tracking-wide">
            {STATUS_SUBLABEL[obra.status] ?? obra.status}
          </span>
        </div>

        {/* Meta info */}
        <div className="space-y-0.5">
          {(obra.city || obra.state) && (
            <div className="flex items-center gap-1 text-[9px] text-black/35">
              <MapPin size={8} className="shrink-0" />
              <span className="truncate">{[obra.city, obra.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {obra.estimatedArea != null && (
            <div className="flex items-center gap-1 text-[9px] text-black/35">
              <Ruler size={8} className="shrink-0" />
              <span>{obra.estimatedArea.toLocaleString('pt-BR')} m²</span>
            </div>
          )}
          {obra.deadline && (
            <div className="flex items-center gap-1 text-[9px] text-black/35">
              <Calendar size={8} className="shrink-0" />
              <span>
                {isNaN(Date.parse(obra.deadline))
                  ? obra.deadline
                  : new Date(obra.deadline).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          )}
        </div>

        {/* Proposal value */}
        {hasValue && (
          <div className={cn('mt-2.5 -mx-3 px-3 py-2 rounded-b-2xl rounded-t-xl border-t flex items-center justify-between', col.valueBg, 'border-black/5')}>
            <span className="text-[8px] font-black uppercase tracking-wider text-black/30">Proposta</span>
            <span className={cn('text-[11px] font-black tabular-nums', col.valueText)}>
              {fmtFull(proposalValue!)}
            </span>
          </div>
        )}

        {/* Quick-advance button — only for Proposta column */}
        {onAdvance && !isUpdating && (
          <button
            onClick={e => { e.stopPropagation(); onAdvance(); }}
            onMouseDown={e => e.stopPropagation()}
            draggable={false}
            className={cn(
              'mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl',
              'text-[9px] font-black uppercase tracking-widest transition-all',
              'bg-green-50 text-green-600 border border-green-200',
              'hover:bg-green-600 hover:text-white hover:border-green-600',
              'opacity-0 group-hover:opacity-100',
            )}
          >
            <Send size={9} /> Enviar p/ Comercial
          </button>
        )}

        {/* Updating indicator */}
        {isUpdating && (
          <div className="flex items-center gap-1 mt-1.5 text-[9px] text-black/30">
            <Loader2 size={9} className="animate-spin" />
            <span>Movendo…</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  col: KanbanColumn;
  items: Obra[];
  clientMap: Record<string, Client>;
  proposalMap: Record<string, Proposal>;
  dragOverColId: ColumnId | null;
  draggedId: string | null;
  updatingId: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onCardDragStart: (e: React.DragEvent, id: string) => void;
  onCardDragEnd: () => void;
  onAdvance?: (obraId: string) => void;
}

function Column({ col, items, clientMap, proposalMap, dragOverColId, draggedId, updatingId,
  onDragOver, onDrop, onDragLeave, onCardDragStart, onCardDragEnd, onAdvance }: ColumnProps) {

  const isDragOver = dragOverColId === col.id;

  const colValue = items.reduce((sum, o) => {
    const p = o.proposalId ? proposalMap[o.proposalId] : undefined;
    return sum + (p?.commercialProposal?.totalValue ?? 0);
  }, 0);

  return (
    <div
      className={cn(
        'flex flex-col min-h-0 rounded-2xl bg-black/[0.025] transition-all duration-150',
        isDragOver && `ring-2 ring-offset-1 ${col.dropRing} bg-white/70 scale-[1.015]`,
      )}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
    >
      {/* Colored top bar */}
      <div className={cn('h-1 rounded-t-2xl', col.accent)} />

      {/* Header */}
      <div className={cn('flex items-center justify-between px-3 py-2.5', col.headerBg, 'rounded-none')}>
        <div className={cn('flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest', col.headerText)}>
          {col.icon}
          {col.label}
        </div>
        <div className="flex items-center gap-1.5">
          {colValue > 0 && (
            <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-full', col.tagBg, col.tagText)}>
              {fmtCompact(colValue)}
            </span>
          )}
          <span className={cn(
            'min-w-[20px] h-5 rounded-full flex items-center justify-center text-[10px] font-black px-1',
            items.length > 0 ? `${col.countBg} ${col.countText}` : 'bg-black/8 text-black/30',
          )}>
            {items.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-[80px]">
        {items.length === 0 && (
          <div className={cn(
            'flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed gap-1',
            isDragOver ? `border-current ${col.headerText} bg-white/60` : 'border-black/8 text-black/20',
          )}>
            <span className={cn('text-[9px] font-black uppercase tracking-widest', isDragOver ? col.headerText : '')}>
              {isDragOver ? 'Soltar aqui ↓' : 'Sem registros'}
            </span>
          </div>
        )}

        {items.map(obra => (
          <ObraCard
            key={obra.id}
            obra={obra}
            col={col}
            client={clientMap[obra.clientId]}
            proposal={obra.proposalId ? proposalMap[obra.proposalId] : undefined}
            isDragging={draggedId === obra.id}
            isUpdating={updatingId === obra.id}
            onDragStart={e => onCardDragStart(e, obra.id)}
            onDragEnd={onCardDragEnd}
            onAdvance={onAdvance ? () => onAdvance(obra.id) : undefined}
          />
        ))}

        {isDragOver && items.length > 0 && (
          <div className={cn(
            'h-10 rounded-xl border-2 border-dashed flex items-center justify-center',
            `border-current ${col.headerText} bg-white/60`,
          )}>
            <span className="text-[9px] font-black uppercase tracking-widest">Soltar aqui ↓</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
}

function KPICard({ label, value, sub, icon, iconBg, trend }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl border border-black/6 p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          {icon}
        </div>
        {trend && (
          <span className={cn(
            'text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider',
            trend === 'up'      ? 'bg-emerald-100 text-emerald-700'
            : trend === 'down'  ? 'bg-rose-100 text-rose-600'
            : 'bg-black/5 text-black/40',
          )}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
          </span>
        )}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-black/35 mb-0.5">{label}</p>
        <p className="text-2xl font-black text-black tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[10px] text-black/35 font-medium mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Pipeline funnel bar ───────────────────────────────────────────────────────

interface FunnelBarProps {
  columns: KanbanColumn[];
  obras: Obra[];
}

function FunnelBar({ columns, obras }: FunnelBarProps) {
  const total = obras.length;
  if (total === 0) return null;

  const activeColumns = columns.filter(c => c.id !== 'perdido');

  return (
    <div className="bg-white rounded-2xl border border-black/6 px-5 py-3 flex items-center gap-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-black/30 shrink-0">Pipeline</p>
      <div className="flex-1 flex items-center h-2 rounded-full overflow-hidden gap-px">
        {activeColumns.map(col => {
          const count = obras.filter(o => col.statuses.includes(o.status)).length;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={col.id}
              className={cn('h-full transition-all', col.accent)}
              style={{ width: `${pct}%` }}
              title={`${col.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {activeColumns.map(col => {
          const count = obras.filter(o => col.statuses.includes(o.status)).length;
          if (count === 0) return null;
          return (
            <div key={col.id} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', col.accent)} />
              <span className="text-[9px] font-bold text-black/40">{col.label} <span className="font-black text-black/60">{count}</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CRMKanban() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [clientMap, setClientMap] = useState<Record<string, Client>>({});
  const [proposalMap, setProposalMap] = useState<Record<string, Proposal>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<ColumnId | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lossModal, setLossModal] = useState<{ obraId: string; prevStatus: ObraStatus } | null>(null);
  const [lossReason, setLossReason] = useState('');

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const [allObras, allClients, allProposals] = await Promise.all([
        obraService.getAll(),
        clientService.getAll(),
        proposalService.getAllProposals(),
      ]);
      const cMap: Record<string, Client> = {};
      allClients.forEach(c => { cMap[c.id] = c; });
      const pMap: Record<string, Proposal> = {};
      allProposals.forEach(p => { pMap[p.id] = p; });
      setObras(allObras);
      setClientMap(cMap);
      setProposalMap(pMap);
    } catch {
      toast.error('Erro ao carregar dados do pipeline');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Stats ────────────────────────────────────────────────────────────────────
  const activeStatuses: ObraStatus[] = [
    'prospeccao', 'aguardando_orcamento', 'em_orcamento',
    'orcada', 'em_proposta', 'proposta_enviada',
  ];
  const activeObras = obras.filter(o => activeStatuses.includes(o.status));
  const wonObras    = obras.filter(o => o.status === 'ganha');
  const lostObras   = obras.filter(o => o.status === 'perdida' || o.status === 'cancelada');

  const pipelineValue = activeObras.reduce((s, o) => {
    return s + (o.proposalId ? (proposalMap[o.proposalId]?.commercialProposal?.totalValue ?? 0) : 0);
  }, 0);
  const wonValue = wonObras.reduce((s, o) => {
    return s + (o.proposalId ? (proposalMap[o.proposalId]?.commercialProposal?.totalValue ?? 0) : 0);
  }, 0);
  const convRate = (wonObras.length + lostObras.length) > 0
    ? Math.round((wonObras.length / (wonObras.length + lostObras.length)) * 100)
    : 0;

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleCardDragStart = (e: React.DragEvent, obraId: string) => {
    setDraggedId(obraId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColId(colId);
  };
  const handleDragLeave = () => {};

  /** Mapeia o status da Obra para o status equivalente da Proposta vinculada. */
  const proposalStatusForObra = (s: ObraStatus): ProposalStatus | null => {
    switch (s) {
      case 'em_proposta':      return ProposalStatus.DRAFT;
      case 'proposta_enviada': return ProposalStatus.SENT;
      case 'ganha':            return ProposalStatus.WON;
      case 'perdida':          return ProposalStatus.LOST;
      default:                 return null;
    }
  };

  /** Aplica a mudança de status na Obra e sincroniza a Proposta vinculada. */
  const applyStatusChange = async (
    obraId: string,
    newStatus: ObraStatus,
    prevStatus: ObraStatus,
    opts?: { lossReason?: string; label?: string },
  ) => {
    const obra = obras.find(o => o.id === obraId);
    setObras(prev => prev.map(o => o.id === obraId ? { ...o, status: newStatus } : o));
    setUpdatingId(obraId);
    try {
      await obraService.update(obraId, { status: newStatus });

      // Sincroniza o status da Proposta vinculada (se houver)
      const proposalId = obra?.proposalId;
      const mappedStatus = proposalStatusForObra(newStatus);
      if (proposalId && mappedStatus) {
        const updates: Partial<Proposal> = { status: mappedStatus };
        if (opts?.lossReason) updates.lossReason = opts.lossReason;
        await proposalService.updateProposal(proposalId, updates);
        setProposalMap(prev =>
          prev[proposalId] ? { ...prev, [proposalId]: { ...prev[proposalId], ...updates } } : prev,
        );
      }

      toast.success(`Movido para ${opts?.label ?? newStatus}`, { description: obra?.name });
    } catch {
      toast.error('Erro ao mover obra');
      setObras(prev => prev.map(o => o.id === obraId ? { ...o, status: prevStatus } : o));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, col: KanbanColumn) => {
    e.preventDefault();
    setDragOverColId(null);
    const droppedId = draggedId;
    if (!droppedId) return;
    const obra = obras.find(o => o.id === droppedId);
    if (!obra || col.statuses.includes(obra.status)) { setDraggedId(null); return; }
    const prevStatus = obra.status;
    setDraggedId(null);

    // Coluna "Perdido": captura o motivo antes de aplicar
    if (col.id === 'perdido') {
      setLossReason('');
      setLossModal({ obraId: droppedId, prevStatus });
      return;
    }

    await applyStatusChange(droppedId, col.targetStatus, prevStatus, { label: col.label });
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverColId(null); };

  /** Quick-advance: Proposta (em_proposta) → Negociação (proposta_enviada) */
  const handleAdvanceCard = async (obraId: string) => {
    const obra = obras.find(o => o.id === obraId);
    if (!obra || obra.status !== 'em_proposta') return;
    const prev = obra.status;
    // Optimistic update
    setObras(p => p.map(o => o.id === obraId ? { ...o, status: 'proposta_enviada' } : o));
    setUpdatingId(obraId);
    try {
      await obraService.update(obraId, { status: 'proposta_enviada' });
      if (obra.proposalId) {
        await proposalService.updateProposal(obra.proposalId, { status: ProposalStatus.SENT });
      }
      toast.success('✅ Proposta enviada ao Comercial!', { description: obra.name });
    } catch {
      toast.error('Erro ao avançar obra');
      setObras(p => p.map(o => o.id === obraId ? { ...o, status: prev } : o));
    } finally {
      setUpdatingId(null);
    }
  };

  /** Confirma a perda capturada no modal e sincroniza a proposta. */
  const confirmLoss = async () => {
    if (!lossModal) return;
    const { obraId, prevStatus } = lossModal;
    const reason = lossReason;
    setLossModal(null);
    await applyStatusChange(obraId, 'perdida', prevStatus, { lossReason: reason, label: 'Perdido' });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={28} className="animate-spin text-black/20" />
        <p className="text-xs text-black/30 font-bold uppercase tracking-widest">Carregando pipeline…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full min-h-0">

      {/* ── KPI row ── */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <KPICard
          label="Em Pipeline"
          value={activeObras.length}
          sub={`${obras.length} oportunidades no total`}
          icon={<Briefcase size={16} className="text-white" />}
          iconBg="bg-black"
          trend="neutral"
        />
        <KPICard
          label="Valor em Pipeline"
          value={fmtCompact(pipelineValue)}
          sub={pipelineValue > 0 ? fmtFull(pipelineValue) : 'Associe propostas para ver'}
          icon={<DollarSign size={16} className="text-white" />}
          iconBg="bg-blue-600"
          trend={pipelineValue > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          label="Contratos Fechados"
          value={wonObras.length}
          sub={wonValue > 0 ? fmtFull(wonValue) + ' em contratos' : 'Nenhum ganho ainda'}
          icon={<Trophy size={16} className="text-white" />}
          iconBg="bg-emerald-600"
          trend={wonObras.length > 0 ? 'up' : 'neutral'}
        />
        <KPICard
          label="Taxa de Conversão"
          value={`${convRate}%`}
          sub={`${wonObras.length} ganhos · ${lostObras.length} perdidos`}
          icon={<Percent size={16} className="text-white" />}
          iconBg={convRate >= 50 ? 'bg-emerald-600' : convRate >= 25 ? 'bg-amber-500' : 'bg-rose-500'}
          trend={convRate >= 50 ? 'up' : convRate >= 25 ? 'neutral' : 'down'}
        />
      </div>

      {/* ── Funnel bar + refresh ── */}
      <div className="shrink-0 flex items-center gap-3">
        <div className="flex-1">
          <FunnelBar columns={COLUMNS} obras={obras} />
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          title="Atualizar"
          className={cn(
            'flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-black/6 text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black hover:border-black/20 transition-all',
            refreshing && 'opacity-50 pointer-events-none',
          )}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* ── Kanban board ── */}
      <div className="flex-1 min-h-0 overflow-x-auto pb-2">
        <div className="grid grid-cols-6 gap-3 h-full min-w-[960px]">
          {COLUMNS.map(col => {
            const colItems = obras.filter(o => col.statuses.includes(o.status));
            return (
              <Column
                key={col.id}
                col={col}
                items={colItems}
                clientMap={clientMap}
                proposalMap={proposalMap}
                dragOverColId={dragOverColId}
                draggedId={draggedId}
                updatingId={updatingId}
                onDragOver={e => handleDragOver(e, col.id)}
                onDrop={e => handleDrop(e, col)}
                onDragLeave={handleDragLeave}
                onCardDragStart={handleCardDragStart}
                onCardDragEnd={handleDragEnd}
                onAdvance={col.id === 'proposta' ? handleAdvanceCard : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Modal de motivo da perda (ao arrastar para "Perdido") */}
      {lossModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setLossModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6"
          >
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-rose-600">Por que perdemos esta oportunidade?</h3>
              <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-none">O motivo é salvo na proposta vinculada</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase opacity-40 tracking-widest">Motivo da Perda</label>
              <select
                value={lossReason}
                onChange={e => setLossReason(e.target.value)}
                className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-rose-400 text-sm font-medium"
              >
                <option value="">Selecione um motivo...</option>
                <option value="Preço alto">Preço alto / Concorrência</option>
                <option value="Prazo de entrega">Prazo de entrega não atendido</option>
                <option value="Escopo técnico">Falta de conformidade técnica</option>
                <option value="Relacionamento">Perda por relacionamento / Indicação</option>
                <option value="Cancelado">Projeto cancelado pelo cliente</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setLossModal(null)}
                className="flex-1 py-3 text-sm font-bold opacity-40 hover:opacity-100 transition-opacity"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLoss}
                disabled={!lossReason}
                className="flex-[2] py-3 bg-rose-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-50"
              >
                Confirmar Perda <AlertTriangle size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
