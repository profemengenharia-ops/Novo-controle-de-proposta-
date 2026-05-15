import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Inbox, Layers } from 'lucide-react';
import { cn } from '../lib/utils';
import { obraService } from '../services/obraService';
import { PropostasInbox } from './PropostasInbox';
import { ProposalList } from './ProposalList';
import { ProposalWizard } from './ProposalWizard';

type Tab = 'inbox' | 'propostas';

/**
 * ProposalManager — top-level shell for the Proposals section.
 *
 * Pattern mirrors BudgetManager:
 *   Inbox  → PropostasInbox   (obras com status 'orcada' aguardando proposta)
 *   Propostas → ProposalList  (todas as propostas)
 *
 * When the user "Assume" an obra OR clicks "Proposta" in the list, the
 * ProposalWizard is rendered in-place (replacing this shell), just like
 * BudgetEditor replaces BudgetManager.
 */
export function ProposalManager() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [inboxCount, setInboxCount] = useState(0);
  const [inboxRefresh, setInboxRefresh] = useState(0);

  // When set: open wizard for a new proposal pre-linked to an obra (from Inbox)
  const [openedObraId, setOpenedObraId] = useState<string | null>(null);
  // When set: open wizard for editing an existing proposal (from ProposalList)
  const [editingProposalId, setEditingProposalId] = useState<string | null>(null);

  // Badge: count of obras with 'orcada' (budget done, awaiting proposal)
  useEffect(() => {
    obraService.getAll().then(obras => {
      setInboxCount(obras.filter(o => o.status === 'orcada').length);
    });
  }, [inboxRefresh]);

  // ── Wizard is open ──────────────────────────────────────────────────────────
  const isWizardOpen = openedObraId !== null || editingProposalId !== null;

  if (isWizardOpen) {
    const fromInbox = openedObraId !== null;
    return (
      <ProposalWizard
        proposalId={editingProposalId ?? undefined}
        initialObraId={openedObraId ?? undefined}
        onComplete={() => {
          setOpenedObraId(null);
          setEditingProposalId(null);
          setInboxRefresh(r => r + 1);
          // After saving from inbox → jump to Propostas to see the result
          if (fromInbox) setActiveTab('propostas');
        }}
      />
    );
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────────
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={14} />, badge: inboxCount },
    { id: 'propostas', label: 'Propostas', icon: <Layers size={14} /> },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center gap-2 p-2 bg-gradient-to-r from-[var(--color-brand-primary)] to-[var(--color-brand-secondary)] rounded-2xl shadow-lg"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest transition-colors relative',
              activeTab === tab.id
                ? 'bg-white text-[var(--color-brand-primary)] shadow-md'
                : 'text-white hover:bg-white/20',
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.badge != null && tab.badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-blue-400 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Inbox ─────────────────────────────────────────────────────────── */}
      {activeTab === 'inbox' && (
        <PropostasInbox
          onAssume={obraId => setOpenedObraId(obraId)}
          refreshSignal={inboxRefresh}
        />
      )}

      {/* ── Lista de Propostas ─────────────────────────────────────────────── */}
      {activeTab === 'propostas' && (
        <ProposalList onEdit={id => setEditingProposalId(id)} />
      )}
    </div>
  );
}
