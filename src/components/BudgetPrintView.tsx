import React, { useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer } from 'lucide-react';
import { BudgetProject, BudgetLineType, BudgetStatus } from '../types';
import { formatCurrency, calculateBDI } from '../lib/utils';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange: '#f97316',
  dark:   '#111111',
  n50:    '#fafafa',
  n100:   '#f5f5f5',
  n200:   '#e5e5e5',
  n400:   '#a3a3a3',
  n600:   '#525252',
  n700:   '#404040',
  white:  '#ffffff',
};

const font: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

const PAGE_STYLE = `
  @page { size: A4 portrait; margin: 1.8cm; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pfm-page-break { break-before: page; }
    .pfm-no-break   { break-inside: avoid; }
  }
`;

// ─── Label maps ───────────────────────────────────────────────────────────────
const TYPE_LABEL: Record<BudgetLineType, string> = {
  material:    'Material',
  mao_de_obra: 'Mão de Obra',
  servico:     'Serviço',
  equipamento: 'Equipamento',
};

const TYPE_COLOR: Record<BudgetLineType, string> = {
  material:    '#2563eb',
  mao_de_obra: '#ea580c',
  servico:     '#7c3aed',
  equipamento: '#16a34a',
};

const STATUS_LABEL: Record<BudgetStatus, string> = {
  [BudgetStatus.DRAFT]:      'Rascunho',
  [BudgetStatus.APPROVED]:   'Aprovado',
  [BudgetStatus.EXECUTING]:  'Em Execução',
  [BudgetStatus.COMPLETED]:  'Concluído',
  [BudgetStatus.CANCELLED]:  'Cancelado',
};

const INDIRECT_LABELS: Record<string, string> = {
  administration: 'Administração de Obra',
  mobilization:   'Mobilização',
  transport:      'Transporte',
  food:           'Alimentação',
  lodging:        'Hospedagem',
  others:         'Outros',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ title, clientName }: { title: string; clientName: string }) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div style={{ marginBottom: 24, ...font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 900, color: C.orange }}>ProFem</div>
          <div style={{ fontSize: 6.5, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 3 }}>
            Soluções Contra Incêndio
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: C.n400 }}>{today}</div>
          <div style={{ fontSize: 7, color: C.n400, marginTop: 2 }}>{clientName}</div>
        </div>
      </div>
      <div style={{ height: 1.5, background: C.orange, marginTop: 8 }} />
      <div style={{ fontSize: 16, fontWeight: 900, color: C.dark, marginTop: 10, letterSpacing: '-0.02em' }}>{title}</div>
      <div style={{ fontSize: 7, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: 3 }}>
        Orçamento Analítico de Obra
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 22, marginBottom: 8, ...font }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: C.orange, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        {children}
      </div>
      <div style={{ height: 1, background: C.n200, marginTop: 4 }} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 8, ...font, marginBottom: 4 }}>
      <span style={{ color: C.n400, fontWeight: 700, minWidth: 110 }}>{label}</span>
      <span style={{ color: C.dark, fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}

function FinRow({ label, value, bold, orange, large }: { label: string; value: string; bold?: boolean; orange?: boolean; large?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      fontSize: large ? 10 : 8, fontWeight: bold ? 800 : 600,
      color: orange ? C.orange : C.dark, ...font,
      padding: '3px 0',
    }}>
      <span style={{ color: bold ? C.dark : C.n600 }}>{label}</span>
      <span style={{ fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

// ─── Main printable content ───────────────────────────────────────────────────

interface ContentProps {
  project: BudgetProject;
  totalDirectCost: number;
  totalIndirectCost: number;
  totalBDI: number;
  finalPrice: number;
  calculatedBDIPct: number;
  byType: Record<BudgetLineType, number>;
}

const PrintableContent = React.forwardRef<HTMLDivElement, ContentProps>(
  ({ project, totalDirectCost, totalIndirectCost, totalBDI, finalPrice, calculatedBDIPct, byType }, ref) => {
    const stageTotals = project.stages.map(s => ({
      ...s,
      total: s.items.reduce((sum, i) => sum + i.totalCost, 0),
    }));

    return (
      <div ref={ref} style={{ padding: '0 2px', ...font }}>
        {/* Cover info */}
        <PageHeader title={project.title} clientName={project.clientName} />

        <SectionTitle>Identificação da Obra</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <InfoRow label="Cliente" value={project.clientName} />
          <InfoRow label="Status" value={STATUS_LABEL[project.status]} />
          <InfoRow label="Endereço" value={project.address ?? ''} />
          <InfoRow label="Responsável" value={project.responsible ?? ''} />
          {project.notes && <InfoRow label="Observações" value={project.notes} />}
        </div>

        {/* Síntese por etapa */}
        <SectionTitle>Síntese por Etapa</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8, ...font }}>
          <thead>
            <tr style={{ background: C.dark, color: C.white }}>
              {['Etapa', 'Itens', 'Total (R$)', '% do CD'].map(h => (
                <th key={h} style={{ padding: '5px 8px', fontWeight: 700, textAlign: h === 'Etapa' ? 'left' : 'right', letterSpacing: '0.05em', fontSize: 7 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stageTotals.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? C.n50 : C.white }}>
                <td style={{ padding: '5px 8px', fontWeight: 700 }}>{s.name}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: C.n600 }}>{s.items.length}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(s.total)}</td>
                <td style={{ padding: '5px 8px', textAlign: 'right', color: C.n600, fontFamily: 'monospace' }}>
                  {totalDirectCost > 0 ? ((s.total / totalDirectCost) * 100).toFixed(1) + '%' : '—'}
                </td>
              </tr>
            ))}
            <tr style={{ background: C.orange }}>
              <td colSpan={2} style={{ padding: '5px 8px', fontWeight: 900, color: C.white, fontSize: 8.5 }}>TOTAL CUSTO DIRETO</td>
              <td colSpan={2} style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 900, color: C.white, fontFamily: 'monospace', fontSize: 9 }}>{formatCurrency(totalDirectCost)}</td>
            </tr>
          </tbody>
        </table>

        {/* Detalhamento por etapa */}
        {project.stages.map(stage => {
          if (stage.items.length === 0) return null;
          return (
            <div key={stage.id} className="pfm-no-break" style={{ marginTop: 18 }}>
              <div style={{ fontSize: 9, fontWeight: 900, color: C.dark, marginBottom: 6, ...font }}>
                {stage.name}
                <span style={{ fontSize: 7, fontWeight: 600, color: C.n400, marginLeft: 8 }}>
                  {formatCurrency(stage.items.reduce((s, i) => s + i.totalCost, 0))}
                </span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 7.5, ...font }}>
                <thead>
                  <tr style={{ background: C.n100 }}>
                    {['Tipo', 'Descrição', 'Und.', 'Qtd.', 'Custo Unit.', 'Total'].map(h => (
                      <th key={h} style={{
                        padding: '4px 6px', fontWeight: 700, textAlign: h === 'Tipo' || h === 'Descrição' ? 'left' : 'right',
                        color: C.n600, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.05em',
                        borderBottom: `1px solid ${C.n200}`,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stage.items.map((item, idx) => (
                    <tr key={item.id} style={{ background: idx % 2 === 0 ? C.white : C.n50, borderBottom: `1px solid ${C.n200}` }}>
                      <td style={{ padding: '4px 6px' }}>
                        <span style={{ fontSize: 6.5, fontWeight: 700, color: TYPE_COLOR[item.type], background: `${TYPE_COLOR[item.type]}18`, padding: '1px 4px', borderRadius: 3 }}>
                          {TYPE_LABEL[item.type]}
                        </span>
                      </td>
                      <td style={{ padding: '4px 6px', fontWeight: 600, maxWidth: 200 }}>{item.description}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', color: C.n600, fontFamily: 'monospace' }}>{item.unit}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace' }}>{item.quantity}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontFamily: 'monospace', color: C.n600 }}>{formatCurrency(item.unitCost)}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Resumo por tipo */}
        <div className="pfm-page-break">
          <SectionTitle>Composição por Tipo de Custo</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8, ...font }}>
            <thead>
              <tr style={{ background: C.dark, color: C.white }}>
                {['Tipo', 'Total (R$)', '% do CD'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', fontWeight: 700, textAlign: h === 'Tipo' ? 'left' : 'right', fontSize: 7 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(byType) as BudgetLineType[]).map((type, i) => byType[type] > 0 && (
                <tr key={type} style={{ background: i % 2 === 0 ? C.n50 : C.white }}>
                  <td style={{ padding: '5px 8px', fontWeight: 700, color: TYPE_COLOR[type] }}>{TYPE_LABEL[type]}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(byType[type])}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: C.n600, fontFamily: 'monospace' }}>
                    {totalDirectCost > 0 ? ((byType[type] / totalDirectCost) * 100).toFixed(1) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Custos indiretos */}
        {totalIndirectCost > 0 && (
          <>
            <SectionTitle>Custos Indiretos</SectionTitle>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8, ...font }}>
              <tbody>
                {(Object.entries(project.indirectCosts) as [string, number][]).filter(([, v]) => v > 0).map(([key, val], i) => (
                  <tr key={key} style={{ background: i % 2 === 0 ? C.n50 : C.white }}>
                    <td style={{ padding: '4px 8px', fontWeight: 600, color: C.n700 }}>{INDIRECT_LABELS[key] ?? key}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{formatCurrency(val)}</td>
                  </tr>
                ))}
                <tr style={{ background: C.n100 }}>
                  <td style={{ padding: '5px 8px', fontWeight: 800 }}>Total Indiretos</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>{formatCurrency(totalIndirectCost)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* BDI */}
        <SectionTitle>BDI — Benefícios e Despesas Indiretas</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {[
            ['Administração Central (AC)', project.bdi.centralAdmin + '%'],
            ['Despesas Financeiras (DF)',  project.bdi.financialExpenses + '%'],
            ['Seguros e Garantias (SG)',   project.bdi.insuranceAndGuarantees + '%'],
            ['Riscos (R)',                 project.bdi.risks + '%'],
            ['Lucro (L)',                  project.bdi.profit + '%'],
            ['Tributos ISS/PIS (I)',       project.bdi.taxes + '%'],
          ].map(([l, v]) => <InfoRow key={l} label={l} value={v} />)}
        </div>

        {/* Financial summary */}
        <SectionTitle>Demonstrativo de Preço</SectionTitle>
        <div style={{ background: C.n50, border: `1px solid ${C.n200}`, borderRadius: 8, padding: '10px 14px', ...font }}>
          <FinRow label="Custo Direto (CD)"     value={formatCurrency(totalDirectCost)} />
          <FinRow label="Custos Indiretos (CI)" value={formatCurrency(totalIndirectCost)} />
          <div style={{ height: 1, background: C.n200, margin: '5px 0' }} />
          <FinRow label="Base de Cálculo (CD + CI)" value={formatCurrency(totalDirectCost + totalIndirectCost)} bold />
          <FinRow label={`BDI (${calculatedBDIPct.toFixed(2)}%)`} value={formatCurrency(totalBDI)} />
          <div style={{ height: 1.5, background: C.dark, margin: '6px 0' }} />
          <FinRow label="PREÇO TOTAL DA OBRA" value={formatCurrency(finalPrice)} bold orange large />
        </div>

        <div style={{ marginTop: 30, fontSize: 7, color: C.n400, textAlign: 'center', ...font }}>
          Documento gerado em {new Date().toLocaleDateString('pt-BR')} — ProFem Engenharia
        </div>
      </div>
    );
  }
);

PrintableContent.displayName = 'PrintableContent';

// ─── Export button component ──────────────────────────────────────────────────

interface Props {
  project: BudgetProject;
  totalDirectCost: number;
  totalIndirectCost: number;
  totalBDI: number;
  finalPrice: number;
  calculatedBDIPct: number;
  byType: Record<BudgetLineType, number>;
  className?: string;
}

export function BudgetPrintView(props: Props) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Orçamento — ${props.project.title}`,
    pageStyle: PAGE_STYLE,
  });

  return (
    <>
      <button
        onClick={() => handlePrint()}
        className={props.className ?? 'flex items-center gap-2 px-5 py-2.5 bg-black/5 hover:bg-black/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all'}
      >
        <Printer size={14} /> Exportar PDF
      </button>

      {/* Hidden printable content */}
      <div style={{ display: 'none' }}>
        <PrintableContent ref={contentRef} {...props} />
      </div>
    </>
  );
}
