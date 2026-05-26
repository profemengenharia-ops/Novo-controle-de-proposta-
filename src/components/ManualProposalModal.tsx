import React, { useState } from 'react';
import { ProposalStatus, Proposal } from '../types';
import { proposalService } from '../services/proposalService';
import { useAuth } from '../hooks/useAuth';
import { X, Save, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { STATUS_TAGS } from '../constants';

interface ManualProposalModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export function ManualProposalModal({ onClose, onComplete }: ManualProposalModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    scopeTitle: '',
    totalValue: 0,
    status: ProposalStatus.SENT,
    followUpDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    contractNumber: '',
    signingDate: '',
    executionDeadline: ''
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newProposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'> = {
        clientName: formData.clientName,
        scopeTitle: formData.scopeTitle,
        proposalNumber: `PF-${new Date().getFullYear()}-${crypto.randomUUID().split('-')[0].toUpperCase().slice(0, 4)}`,
        revision: '00',
        status: formData.status,
        validityDays: 30,
        deadline: '',
        createdBy: user?.id || 'manual',
        followUpDate: formData.followUpDate,
        contractDetails: {
          contractNumber: formData.contractNumber,
          signingDate: formData.signingDate,
          executionDeadline: formData.executionDeadline
        },
        commercialProposal: {
          totalValue: formData.totalValue,
          paymentTerms: 'A combinar',
          reajuste: 'N/A',
          guarantee: '1 ano',
          items: [],
          pricingMode: 'manual'
        },
        technicalScope: {
          generalConsiderations: formData.scopeTitle,
          references: [],
          norms: [],
          items: [],
          safetyNotes: '',
          exclusions: [],
          contractorObligations: [],
          contracteeObligations: []
        }
      };

      await proposalService.createProposal(newProposal);
      toast.success('Proposta registrada com sucesso!');
      onComplete();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao registrar proposta manual.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        className="w-full max-w-lg h-full bg-white shadow-2xl p-10 flex flex-col"
      >
        <div className="flex items-center justify-between mb-8">
           <div className="space-y-1">
             <h3 className="text-2xl font-bold tracking-tight">Registro Manual Rápido</h3>
             <p className="text-xs opacity-40 font-bold uppercase tracking-widest">Adicione propostas externas ao fluxo</p>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full">
             <X size={24} />
           </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 flex-1 overflow-y-auto pr-2">
           <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Cliente / Empresa</label>
              <input 
                required
                type="text"
                placeholder="Ex: FRACAZA ADMINISTRACAO..."
                className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                value={formData.clientName}
                onChange={e => setFormData({...formData, clientName: e.target.value})}
              />
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Título do Escopo</label>
              <input 
                required
                type="text"
                placeholder="Ex: Instalação de Sistema de Incêndio"
                className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                value={formData.scopeTitle}
                onChange={e => setFormData({...formData, scopeTitle: e.target.value})}
              />
           </div>

           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Valor da Proposta</label>
                <input 
                  required
                  type="number"
                  placeholder="0.00"
                  className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-mono"
                  value={formData.totalValue}
                  onChange={e => setFormData({...formData, totalValue: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status Comercial</label>
                <select 
                  className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                >
                  {Object.entries(ProposalStatus).map(([key, val]) => (
                    <option key={key} value={val}>{STATUS_TAGS[val as ProposalStatus]?.label || val}</option>
                  ))}
                </select>
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Próximo Follow-up</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20" size={18} />
                <input 
                  type="date"
                  className="w-full p-4 pl-12 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                  value={formData.followUpDate}
                  onChange={e => setFormData({...formData, followUpDate: e.target.value})}
                />
              </div>
           </div>

           <div className="space-y-4 pt-4 border-t border-black/5">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-brand-primary)]">Detalhes do Contrato</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Número do Contrato</label>
                  <input 
                    type="text"
                    placeholder="Ex: CT-2024-001"
                    className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                    value={formData.contractNumber}
                    onChange={e => setFormData({...formData, contractNumber: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Data de Assinatura</label>
                    <input 
                      type="date"
                      className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                      value={formData.signingDate}
                      onChange={e => setFormData({...formData, signingDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Prazo de Execução</label>
                    <input 
                      type="text"
                      placeholder="Ex: 60 dias"
                      className="w-full p-4 bg-black/5 rounded-xl border-transparent focus:ring-2 focus:ring-[var(--color-brand-primary)] text-sm font-medium"
                      value={formData.executionDeadline}
                      onChange={e => setFormData({...formData, executionDeadline: e.target.value})}
                    />
                  </div>
                </div>
              </div>
           </div>

        </form>

        <div className="mt-8 pt-8 border-t border-black/5 flex gap-4">
           <button 
            type="button" 
            onClick={onClose}
            className="flex-1 py-4 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
           >
             Cancelar
           </button>
           <button 
            onClick={handleSave}
            disabled={loading}
            className="flex-[2] py-4 bg-[var(--color-brand-dark)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-xl transition-all"
           >
             {loading ? 'Salvando...' : 'Registrar Proposta'}
             <Save size={18} />
           </button>
        </div>
      </motion.div>
    </div>
  );
}
