/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmProvider } from './components/ConfirmDialog';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProposalList } from './components/ProposalList';
import { ProposalManager } from './components/ProposalManager';
import { ProposalWizard } from './components/ProposalWizard';
import { BudgetManager } from './components/BudgetManager';
import { CommercialHub } from './components/CommercialHub';
import { NormsManager } from './components/NormsManager';
import { PublicProposalView } from './components/PublicProposalView';
import { ManualProposalModal } from './components/ManualProposalModal';
import { DailyBriefing } from './components/DailyBriefing';
import { Reports } from './components/Reports';
import { LoginPage } from './components/LoginPage';
import { Proposal } from './types';
import { proposalService } from './services/proposalService';

function AppContent() {
  const { user, loading, signIn, signInLoading, signInError, clearSignInError } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPublic, setIsPublic] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showRadar, setShowRadar] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/proposal/')) {
      setIsPublic(true);
      setPublicId(path.replace('/proposal/', ''));
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Bug #1: sem catch a Promise rejeitada ficava silenciosa
      proposalService.getAllProposals().then(setProposals).catch(() => {});
      
      const lastRadar = localStorage.getItem('lastRadarShow');
      const today = new Date().toDateString();
      if (lastRadar !== today) {
        setShowRadar(true);
        localStorage.setItem('lastRadarShow', today);
      }
    }
  }, [user]);

  if (isPublic) {
    return <PublicProposalView id={publicId} />;
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-brand-light)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-brand-primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onSignIn={signIn}
        loading={signInLoading}
        error={signInError}
        onClearError={clearSignInError}
      />
    );
  }

  // Bug #2: interceptar 'manual-proposal' para abrir modal sem remontar o Dashboard
  const handleSetActiveTab = (tab: string) => {
    if (tab === 'manual-proposal') {
      setShowManualModal(true);
      return;
    }
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={handleSetActiveTab} onShowRadar={() => setShowRadar(true)} />;
      case 'proposals': return <ProposalManager />;
      case 'new-proposal': return <ProposalWizard onComplete={() => setActiveTab('proposals')} />;
      case 'commercial': return (
        <CommercialHub
          onOpenProposal={(proposalId) => setActiveTab(`edit-${proposalId}`)}
        />
      );
      case 'estimates': return (
        <BudgetManager
          onNavigateToProposal={(proposalId) => setActiveTab(`edit-${proposalId}`)}
        />
      );
      case 'norms': return <NormsManager />;
      case 'reports': return <Reports />;
      default:
        if (activeTab.startsWith('edit-')) {
          return <ProposalWizard proposalId={activeTab.replace('edit-', '')} onComplete={() => setActiveTab('proposals')} />;
        }
        return <Dashboard setActiveTab={handleSetActiveTab} onShowRadar={() => setShowRadar(true)} />;
    }
  };

  return (
    <Layout activeTab={activeTab.includes('new-proposal') || activeTab.startsWith('edit-') ? 'proposals' : activeTab} setActiveTab={handleSetActiveTab}>
      {renderContent()}

      {/* Bug #2: ManualProposalModal fora de renderContent — não remonta o Dashboard */}
      {showManualModal && (
        <ManualProposalModal
          onClose={() => setShowManualModal(false)}
          onComplete={() => { setShowManualModal(false); setActiveTab('proposals'); }}
        />
      )}

      {showRadar && (
        <DailyBriefing
          proposals={proposals}
          onClose={() => setShowRadar(false)}
          onAction={(id) => {
            setActiveTab(`edit-${id}`);
            setShowRadar(false);
          }}
        />
      )}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster position="top-right" expand={false} richColors />
      <AuthProvider>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
