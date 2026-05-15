import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, HardHat, Users, Send, Columns3 } from 'lucide-react';
import { Client } from '../types';
import { clientService } from '../services/clientService';
import { obraService } from '../services/obraService';
import { ClientManager } from './ClientManager';
import { ObraList } from './ObraList';
import { PropostasInboxComercial } from './PropostasInboxComercial';
import { CRMKanban } from './CRMKanban';
import { cn } from '../lib/utils';

type Tab = 'clientes' | 'propostas' | 'kanban';

interface Props {
  /** Navigate to edit a proposal (passed down from App.tsx) */
  onOpenProposal?: (proposalId: string) => void;
}

export function CommercialHub({ onOpenProposal }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('kanban');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [propostasCount, setPropostasCount] = useState(0);

  // Load selected client details whenever id changes
  useEffect(() => {
    let cancelled = false;
    if (!selectedClientId) { setSelectedClient(null); return; }
    clientService.getById(selectedClientId).then(c => {
      if (!cancelled) setSelectedClient(c);
    });
    return () => { cancelled = true; };
  }, [selectedClientId, refreshKey]);

  // Count propostas prontas for badge
  const refreshPropostasCount = useCallback(async () => {
    const obras = await obraService.getAll();
    setPropostasCount(obras.filter(o => o.status === 'proposta_enviada').length);
  }, []);

  useEffect(() => { refreshPropostasCount(); }, [refreshPropostasCount, refreshKey]);

  const tabs = [
    { id: 'kanban' as Tab, label: 'Pipeline CRM', icon: <Columns3 size={14} /> },
    { id: 'clientes' as Tab, label: 'Clientes & Obras', icon: <Users size={14} /> },
    {
      id: 'propostas' as Tab,
      label: 'Propostas Prontas',
      icon: <Send size={14} />,
      badge: propostasCount,
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Page header */}
      <div className="mb-5 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-black p-2.5 rounded-xl text-white">
            <Briefcase size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">Comercial</h1>
            <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
              Gestão de clientes, obras e fechamento de negócios
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-2 p-1.5 bg-black/[0.04] rounded-2xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                activeTab === tab.id
                  ? 'bg-white text-black shadow-md'
                  : 'text-black/50 hover:text-black hover:bg-white/50'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-green-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Pipeline CRM (Kanban) */}
      {activeTab === 'kanban' && (
        <div className="flex-1 min-h-0">
          <CRMKanban />
        </div>
      )}

      {/* Tab: Clientes & Obras */}
      {activeTab === 'clientes' && (
        <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
          {/* Coluna Clientes */}
          <div className="col-span-5 bg-black/[0.02] rounded-3xl p-5 flex flex-col min-h-0">
            <ClientManager
              selectedClientId={selectedClientId}
              onSelectClient={setSelectedClientId}
              onClientsChanged={() => setRefreshKey(k => k + 1)}
            />
          </div>

          {/* Coluna Obras */}
          <div className="col-span-7 bg-black/[0.02] rounded-3xl p-5 flex flex-col min-h-0">
            {selectedClient ? (
              <ObraList key={selectedClient.id} client={selectedClient} />
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}

      {/* Tab: Propostas Prontas */}
      {activeTab === 'propostas' && (
        <div className="flex-1 overflow-y-auto">
          <PropostasInboxComercial
            refreshSignal={refreshKey}
            onOpenProposal={onOpenProposal}
          />
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-6">
      <div className="relative mb-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5">
          <HardHat size={32} className="opacity-30" />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-2xl shadow-lg">
          <Users size={14} />
        </div>
      </div>
      <h3 className="text-sm font-black uppercase tracking-tight mb-1">Selecione um cliente</h3>
      <p className="text-xs opacity-50 font-medium max-w-xs">
        Escolha um cliente na lista à esquerda para gerenciar suas obras e enviar solicitações de orçamento.
      </p>
    </div>
  );
}
