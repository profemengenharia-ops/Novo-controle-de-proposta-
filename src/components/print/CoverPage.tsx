import React from 'react';
import { Proposal } from '../../types';
import { formatDate } from '../../lib/utils';
import { companyInfo } from '../../config/companyInfo';
import { Logo } from '../Logo';

interface CoverPageProps {
  proposal: Proposal;
}

export function CoverPage({ proposal }: CoverPageProps) {
  return (
    <div className="h-[28.5cm] flex flex-col justify-between p-12 bg-white relative">
      <div className="relative z-10 flex flex-col h-full">
        {/* Brand Header */}
        <div className="flex justify-between items-start mb-32">
          <div className="flex flex-col gap-1">
            <Logo size={60} />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-neutral-400 mt-1">
              Soluções contra incêndio
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-neutral-900">{companyInfo.city}, {formatDate(proposal.createdAt || new Date().toISOString())}</p>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Ref: {proposal.proposalNumber} - Rev.{proposal.revision.toString().padStart(2, '0')}</p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col justify-center py-20">
          <div className="mb-16">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4">Destinatário</p>
            <h1 className="text-8xl font-black tracking-tighter text-neutral-900 leading-none">
              {proposal.clientName}
            </h1>
          </div>

          <div className="max-w-2xl">
            <div className="bg-neutral-50/50 border-l-4 border-orange-500 p-12 space-y-8 rounded-r-2xl">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-neutral-900 mb-4">Escopo Base:</p>
                <p className="text-2xl font-bold text-neutral-700 leading-tight">
                  {proposal.scopeTitle || 'Serviços de Engenharia de Incêndio'}
                </p>
              </div>

              <div className="pt-8 border-t border-neutral-200">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Assinatura</p>
                <p className="text-lg font-black text-neutral-900">{formatDate(proposal.createdAt || new Date().toISOString())}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto border-t border-neutral-100 pt-8">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-base font-black text-neutral-900 leading-none">{companyInfo.signatory}</p>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{companyInfo.signatoryRole}</p>
            </div>
            
            <div className="text-right space-y-1">
              <p className="text-[9px] font-bold text-neutral-400 leading-tight uppercase max-w-[40ch]">
                {companyInfo.address}
              </p>
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                TEL: {companyInfo.phone}
              </p>
            </div>
          </div>
          <div className="h-1 bg-orange-500 mt-8 w-full" />
        </div>
      </div>
    </div>
  );
}
