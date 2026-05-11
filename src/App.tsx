/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProposalList } from './components/ProposalList';
import { ProposalWizard } from './components/ProposalWizard';
import { BudgetManager } from './components/BudgetManager';
import { NormsManager } from './components/NormsManager';
import { PublicProposalView } from './components/PublicProposalView';
import { ManualProposalModal } from './components/ManualProposalModal';
import { DailyBriefing } from './components/DailyBriefing';
import { Reports } from './components/Reports';
import { ComercialHub } from './components/ComercialHub';
import { Proposal } from './types';
import { proposalService } from './services/proposalService';
import { LogIn } from 'lucide-react';
import { Logo } from './components/Logo';

function AppContent() {
  const { user, loading, signIn } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isPublic, setIsPublic] = useState(false);
  const [publicId, setPublicId] = useState('');
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showRadar, setShowRadar] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/proposal/')) {
      setIsPublic(true);
      setPublicId(path.replace('/proposal/', ''));
    }
  }, []);

  useEffect(() => {
    if (user) {
      proposalService.getAllProposals().then(setProposals);
      
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
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-brand-dark)]">
        <div className="max-w-md w-full bg-white p-12 rounded-2xl shadow-2xl space-y-12 border border-white/10">
          <div className="flex flex-col items-center gap-4">
            <Logo size={80} />
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-black tracking-tighter text-neutral-900 uppercase">Sistema de Gestão</h1>
              <p className="text-[10px] opacity-40 uppercase tracking-[0.3em] font-bold">Proposal Management System</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={signIn}
              className="w-full bg-orange-500 text-white py-4 px-10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-orange-600 transition-all shadow-xl shadow-orange-200 active:scale-95"
            >
              <LogIn size={20} />
              Acessar com Google
            </button>
            <p className="text-[9px] text-center text-neutral-400 font-bold uppercase tracking-tighter">
              Acesso restrito à equipe ProFem Engenharia
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard setActiveTab={setActiveTab} onShowRadar={() => setShowRadar(true)} />;
      case 'proposals': return <ProposalList onEdit={(id) => { setActiveTab(`edit-${id}`); }} />;
      case 'new-proposal': return <ProposalWizard onComplete={() => setActiveTab('proposals')} />;
      case 'manual-proposal': return (
        <React.Fragment>
          <Dashboard setActiveTab={setActiveTab} onShowRadar={() => setShowRadar(true)} />
          <ManualProposalModal onClose={() => setActiveTab('dashboard')} onComplete={() => setActiveTab('proposals')} />
        </React.Fragment>
      );
      case 'comercial':  return <ComercialHub onNavigate={setActiveTab} />;
      case 'estimates':  return <BudgetManager onNavigate={setActiveTab} />;
      case 'norms':      return <NormsManager />;
      case 'reports': return <Reports onNavigate={setActiveTab} />;
      default: 
        if (activeTab.startsWith('edit-')) {
          return <ProposalWizard proposalId={activeTab.replace('edit-', '')} onComplete={() => setActiveTab('proposals')} />;
        }
        return <Dashboard setActiveTab={setActiveTab} onShowRadar={() => setShowRadar(true)} />;
    }
  };

  return (
    <Layout activeTab={activeTab.includes('new-proposal') || activeTab === 'manual-proposal' || activeTab.startsWith('edit-') ? 'proposals' : activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
      
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
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
