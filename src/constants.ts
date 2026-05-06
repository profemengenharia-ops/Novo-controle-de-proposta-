import { ProposalStatus } from './types';

export const STATUS_TAGS: Record<ProposalStatus, { label: string, color: string }> = {
  [ProposalStatus.DRAFT]: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700' },
  [ProposalStatus.SENT]: { label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  [ProposalStatus.NEGOTIATING]: { label: 'Em Negociação', color: 'bg-yellow-100 text-yellow-700' },
  [ProposalStatus.WON]: { label: 'Ganha', color: 'bg-green-100 text-green-700' },
  [ProposalStatus.LOST]: { label: 'Perdida', color: 'bg-red-100 text-red-700' },
  [ProposalStatus.EXPIRED]: { label: 'Expirada', color: 'bg-orange-100 text-orange-700' },
};
