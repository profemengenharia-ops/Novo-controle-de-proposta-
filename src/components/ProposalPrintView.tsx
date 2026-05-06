import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Proposal } from '../types';
import { formatCurrency } from '../lib/utils';
import { Printer } from 'lucide-react';

interface PrintViewProps {
  proposal: Proposal;
}

const C = {
  orange:  '#f97316',
  dark:    '#111111',
  n50:     '#fafafa',
  n100:    '#f5f5f5',
  n200:    '#e5e5e5',
  n300:    '#d4d4d4',
  n400:    '#a3a3a3',
  n600:    '#525252',
  n700:    '#404040',
  n900:    '#171717',
  white:   '#ffffff',
};

const PAGE_STYLE = `
  @page { size: A4 portrait; margin: 2cm; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pfm-page-break { break-before: page; }
    .pfm-no-break { break-inside: avoid; }
  }
`;

const font: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

// ── Reusable print sub-components ──────────────────────────────────────────

function PageHeader({ proposalNumber, revision }: { proposalNumber: string; revision: string }) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div style={{ marginBottom: 20, ...font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.orange }}>ProFem</div>
          <div style={{ fontSize: 6.5, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 3 }}>
            Soluções Contra Incêndio
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 8, color: C.n400 }}>Cabreúva, {today}</div>
          <div style={{ fontSize: 7, color: C.n400, marginTop: 2 }}>Ref: {proposalNumber} — Rev.{revision}</div>
        </div>
      </div>
      <div style={{ height: 1.5, background: C.orange, marginTop: 6 }} />
    </div>
  );
}

function PageFooter() {
  return (
    <div style={{ marginTop: 32, paddingTop: 6, borderTop: `0.4px solid ${C.n200}`, ...font }}>
      <div style={{ fontSize: 6.5, color: C.n400, textAlign: 'right' }}>
        Rua Esmeralda, 120 - Colina da Serra&nbsp;&nbsp;|&nbsp;&nbsp;Cabreúva, SP 13318-000&nbsp;&nbsp;|&nbsp;&nbsp;
        comercial@profemsolucoes.com.br&nbsp;&nbsp;|&nbsp;&nbsp;Tel: 011-4529-3379
      </div>
    </div>
  );
}

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="pfm-no-break" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px', ...font }}>
      <div style={{ width: 4, height: 20, background: C.orange, borderRadius: 2, flexShrink: 0 }} />
      <h3 style={{ fontSize: 11, fontWeight: 700, color: C.dark, margin: 0, textTransform: 'uppercase' }}>
        {number}.&nbsp;&nbsp;{title}
      </h3>
    </div>
  );
}

function BigSectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, ...font }}>
      <div style={{ width: 4, height: 28, background: C.orange, borderRadius: 2, flexShrink: 0 }} />
      <h2 style={{ fontSize: 15, fontWeight: 700, color: C.dark, margin: 0, textTransform: 'uppercase' }}>
        {title}
      </h2>
    </div>
  );
}

function SubSection({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.orange, margin: '10px 0 4px', ...font }}>
      {children}
    </div>
  );
}

function Body({ children, justify = true }: { children: React.ReactNode; justify?: boolean }) {
  return (
    <p style={{ fontSize: 9.5, color: C.n700, lineHeight: 1.55, margin: '0 0 5px', textAlign: justify ? 'justify' : 'left', ...font }}>
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 3, marginLeft: 10 }}>
      <span style={{ color: C.n400, fontSize: 9.5, flexShrink: 0, marginTop: 1 }}>•</span>
      <p style={{ fontSize: 9.5, color: C.n700, lineHeight: 1.55, margin: 0, textAlign: 'justify', ...font }}>{children}</p>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function ProposalPrintView({ proposal }: PrintViewProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Proposta_${proposal.clientName}_${proposal.proposalNumber}`,
    pageStyle: PAGE_STYLE,
  });

  const sc  = proposal.technicalScope;
  const com = proposal.commercialProposal;
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* ── Toolbar ── */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* ── Print document ── */}
      <div
        ref={componentRef}
        style={{ background: C.white, color: C.dark, ...font }}
      >
        {/* ════════════════════════════════════════════
            PAGE 1 — COVER
        ════════════════════════════════════════════ */}
        <div style={{ minHeight: 'calc(29.7cm - 4cm)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* Top bar: logo + date/ref */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.orange }}>ProFem</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.18em', marginTop: 5 }}>
                SOLUÇÕES CONTRA INCÊNDIO
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.n600 }}>Cabreúva, {today}</div>
              <div style={{ fontSize: 8, color: C.n400, marginTop: 3 }}>Ref: {proposal.proposalNumber} — Rev.{proposal.revision}</div>
            </div>
          </div>

          {/* Recipient + scope box */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 12 }}>
              DESTINATÁRIO
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>
              {proposal.clientName.toUpperCase()}
            </div>

            {/* Scope box */}
            <div style={{ display: 'flex', marginTop: 32, border: `0.5px solid ${C.n200}`, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: 5, background: C.orange, flexShrink: 0 }} />
              <div style={{ flex: 1, background: C.n50, padding: '14px 18px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.dark, marginBottom: 6 }}>ESCOPO BASE:</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.n600 }}>
                  {(proposal.scopeTitle || 'INSTALAÇÃO DO SISTEMA DE PROTEÇÃO E COMBATE A INCÊNDIO.').toUpperCase()}
                </div>
                <div style={{ height: 0.5, background: C.n200, margin: '12px 0' }} />
                {/* Meta grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                  {[
                    ['PROPOSTA Nº', proposal.proposalNumber],
                    ['REVISÃO',     `Rev. ${proposal.revision}`],
                    ['VALIDADE',    `${proposal.validityDays} dias`],
                    ['LOCAL',       'Cabreúva/SP'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 7, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, marginTop: 4 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: orange rule + signer + address */}
          <div>
            <div style={{ height: 2, background: C.orange, marginBottom: 14 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.dark }}>Marcus Paulo Gonçalves Lopes</div>
                <div style={{ fontSize: 8, color: C.n400, marginTop: 3 }}>Diretoria de Engenharia</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 7, color: C.n400, lineHeight: 1.7 }}>
                Rua Esmeralda, 120 - Colina da Serra<br />
                Cabreúva, SP | 13318-000<br />
                comercial@profemsolucoes.com.br<br />
                Tel: 011-4529-3379
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════
            PAGE 2 — PROPOSTA TÉCNICA
        ════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader proposalNumber={proposal.proposalNumber} revision={proposal.revision} />
          <BigSectionHeader title="Proposta Técnica" />

          {/* 1. Considerações Gerais */}
          <SectionTitle number="1" title="Considerações Gerais" />
          {sc.generalConsiderations ? (
            <Body>{sc.generalConsiderations}</Body>
          ) : null}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, marginTop: 6, marginBottom: 14 }}>
            <tbody>
              {([
                ['Proponente:',        'PROFEM SOLUÇÕES CONTRA INCÊNDIO.'],
                ['Contratante:',       proposal.clientName.toUpperCase()],
                ['Local de Trabalho:', 'CABREÚVA/SP.'],
                ['Escopo:',            (proposal.scopeTitle || 'INSTALAÇÃO DE SISTEMA DE INCÊNDIO').toUpperCase()],
                ['Vigência:',          new Date().getFullYear().toString()],
              ] as [string, string][]).map(([label, value], i) => (
                <tr key={i} style={{ background: C.n50 }}>
                  <td style={{ padding: '7px 9px', fontWeight: 700, color: C.dark, width: '28%', borderBottom: `0.4px solid ${C.n200}`, ...font }}>
                    {label}
                  </td>
                  <td style={{ padding: '7px 9px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, ...font }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 2. Referências */}
          {sc.references.length > 0 && (
            <>
              <SectionTitle number="2" title="Referências" />
              <Body>Solicitação: Pela Contratante através de projetos e documentos fornecidos.</Body>
              {sc.references.map((r, i) => <Bullet key={i}>{r}</Bullet>)}
            </>
          )}

          {/* 3. Normas */}
          {sc.norms.length > 0 && (
            <>
              <SectionTitle number="3" title="Normas Técnicas Aplicáveis" />
              {sc.norms.map((n, i) => <Body key={i}>{n}</Body>)}
            </>
          )}

          {/* 4. Escopo de Fornecimento */}
          {sc.items.length > 0 && (
            <>
              <SectionTitle number="4" title="Escopo de Fornecimento" />
              {sc.items.map((item, i) => (
                <div key={i} className="pfm-no-break">
                  <SubSection>{`4.${i + 1}.  ${item.category.toUpperCase()}`}</SubSection>
                  <Body>{item.description}</Body>
                </div>
              ))}
            </>
          )}

          {/* 5. Segurança */}
          {sc.safetyNotes && (
            <>
              <SectionTitle number="5" title="Segurança do Trabalho" />
              <Body>{sc.safetyNotes}</Body>
            </>
          )}

          {/* 7. Exclusões */}
          {sc.exclusions.length > 0 && (
            <>
              <SectionTitle number="7" title="Exclusões do Escopo" />
              {sc.exclusions.map((e, i) => <Bullet key={i}>{e}</Bullet>)}
            </>
          )}

          {/* 8. Obrigações Contratada */}
          {sc.contractorObligations.length > 0 && (
            <>
              <SectionTitle number="8" title="Obrigações da Contratada" />
              {sc.contractorObligations.map((o, i) => <Bullet key={i}>{o}</Bullet>)}
            </>
          )}

          {/* 9. Obrigações Contratante */}
          {sc.contracteeObligations.length > 0 && (
            <>
              <SectionTitle number="9" title="Obrigações da Contratante" />
              {sc.contracteeObligations.map((o, i) => <Bullet key={i}>{o}</Bullet>)}
            </>
          )}

          <PageFooter />
        </div>

        {/* ════════════════════════════════════════════
            PAGE 3 — PROPOSTA COMERCIAL
        ════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader proposalNumber={proposal.proposalNumber} revision={proposal.revision} />
          <BigSectionHeader title="Proposta Comercial" />

          {/* 12. Valores */}
          <SectionTitle number="12" title="Valores (Material e Mão de Obra)" />

          {/* Items table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, marginTop: 8 }}>
            <thead>
              <tr style={{ background: C.n100 }}>
                <th style={{ padding: '8px 10px', textAlign: 'left',   fontSize: 8, fontWeight: 700, color: C.n400, borderBottom: `0.4px solid ${C.n200}`, width: '5%',  ...font }}>ITEM</th>
                <th style={{ padding: '8px 10px', textAlign: 'left',   fontSize: 8, fontWeight: 700, color: C.n400, borderBottom: `0.4px solid ${C.n200}`, width: '50%', ...font }}>DESCRIÇÃO DO SERVIÇO</th>
                <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 8, fontWeight: 700, color: C.n400, borderBottom: `0.4px solid ${C.n200}`, width: '15%', ...font }}>QUANT.</th>
                <th style={{ padding: '8px 10px', textAlign: 'right',  fontSize: 8, fontWeight: 700, color: C.n400, borderBottom: `0.4px solid ${C.n200}`, width: '15%', ...font }}>UNIT.</th>
                <th style={{ padding: '8px 10px', textAlign: 'right',  fontSize: 8, fontWeight: 700, color: C.n400, borderBottom: `0.4px solid ${C.n200}`, width: '15%', ...font }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(com.items || []).map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.n50 }}>
                  <td style={{ padding: '8px 10px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'center', ...font }}>
                    {String(i + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '8px 10px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, fontWeight: 500, ...font }}>
                    {item.description}
                  </td>
                  <td style={{ padding: '8px 10px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'center', ...font }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '8px 10px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'right', ...font }}>
                    {item.unit}
                  </td>
                  <td style={{ padding: '8px 10px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'right', fontWeight: 600, ...font }}>
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total row */}
          <div style={{ background: C.n900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.06em', ...font }}>
              Investimento Total (Material + Mão de Obra)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.white, ...font }}>
              {formatCurrency(com.totalValue || 0)}
            </div>
          </div>

          {/* Note */}
          <div style={{ fontSize: 7.5, color: C.n400, marginTop: 6, marginBottom: 16, ...font }}>
            * Plataformas elevatórias e andaimes para trabalhos em altura deverão ser fornecidos pela Contratante.
          </div>

          {/* Conditions grid — 4 columns */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: C.n50 }}>
                {[
                  '13. FORMA DE PAGAMENTO',
                  '14. REAJUSTE',
                  '15. GARANTIA',
                  '16. VALIDADE DA PROPOSTA',
                ].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 8, fontWeight: 700, color: C.n400, border: `0.4px solid ${C.n200}`, width: '25%', ...font }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px 10px', color: C.n700, border: `0.4px solid ${C.n200}`, verticalAlign: 'top', ...font }}>
                  {com.paymentTerms || '—'}
                </td>
                <td style={{ padding: '8px 10px', color: C.n700, border: `0.4px solid ${C.n200}`, verticalAlign: 'top', ...font }}>
                  {com.reajuste || 'Não aplicável durante a validade da proposta.'}
                </td>
                <td style={{ padding: '8px 10px', color: C.n700, border: `0.4px solid ${C.n200}`, verticalAlign: 'top', ...font }}>
                  {com.guarantee || '—'}
                </td>
                <td style={{ padding: '8px 10px', color: C.n700, border: `0.4px solid ${C.n200}`, verticalAlign: 'top', ...font }}>
                  {proposal.validityDays} dias a partir da data de emissão.
                </td>
              </tr>
            </tbody>
          </table>

          {/* 17. Considerações Finais */}
          <SectionTitle number="17" title="Considerações Finais" />
          <Body>Para quaisquer esclarecimentos, entrar em contato com nossos departamentos.</Body>
          <Body justify={false}><em>Agradecendo desde já sua atenção, subscrevemo-nos.</em></Body>
          <Body justify={false}>Atenciosamente,</Body>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48 }}>
            {/* ProFem */}
            <div>
              <div style={{ height: 0.8, background: C.n300, marginBottom: 8 }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, ...font }}>PROFEM SOLUÇÕES CONTRA INCÊNDIO</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, marginTop: 6, ...font }}>Marcus Paulo G. Lopes</div>
              <div style={{ fontSize: 8, color: C.n400, marginTop: 3, ...font }}>Engº Civil</div>
              <div style={{ fontSize: 8, color: C.n400, ...font }}>marcus.lopes@profemsolucoes.com.br</div>
              <div style={{ fontSize: 7, color: C.n400, fontStyle: 'italic', marginTop: 8, ...font }}>Assinatura Digital Verificada</div>
            </div>
            {/* Client */}
            <div>
              <div style={{ height: 0.8, background: C.n300, marginBottom: 8 }} />
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, ...font }}>{proposal.clientName.toUpperCase()}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.dark, marginTop: 6, ...font }}>&nbsp;</div>
              <div style={{ fontSize: 8, color: C.n400, marginTop: 3, ...font }}>Responsável</div>
              <div style={{ fontSize: 7, color: C.n400, marginTop: 8, ...font }}>Aceite do Cliente</div>
            </div>
          </div>

          <PageFooter />
        </div>
      </div>
    </div>
  );
}
