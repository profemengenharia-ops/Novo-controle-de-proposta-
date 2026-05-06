import React, { useEffect, useState } from 'react';
import { proposalService } from '../services/proposalService';
import { Proposal } from '../types';
import { SalesReports as SalesInfo } from './SalesReports';

export function Reports() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await proposalService.getAllProposals();
      setProposals(data);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-brand-primary)]"></div>
    </div>
  );

  return <SalesInfo proposals={proposals} />;
}
