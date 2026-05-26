/**
 * ProposalPremiumView — Prévia/PDF da proposta no design premium da ProFem.
 *
 * Reproduz o mesmo layout do documento Word (.docx) e do template HTML de
 * referência: masthead com logo, capa com cartão do destinatário, Proposta
 * Técnica (01–04) e Proposta Comercial (05–07), tabela de valores, faixa de
 * total, card de condições, callout e bloco de assinatura/aceite.
 *
 * Usa estilos inline (fidelidade na impressão) e react-to-print.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, AlertCircle } from 'lucide-react';
import { Proposal, TechnicalScope, CommercialProposal } from '../types';
import { formatCurrency, itemContractValue } from '../lib/utils';
import { PROFEM_LOGO_PNG_BASE64 } from '../lib/profemLogo';
import { proposalService } from '../services/proposalService';

// ── Fallbacks p/ propostas com escopo/comercial nulos vindos do banco ────────
const EMPTY_SCOPE: TechnicalScope = {
  generalConsiderations: '', references: [], norms: [], items: [],
  safetyNotes: '', exclusions: [], contractorObligations: [], contracteeObligations: [],
};
const EMPTY_COMMERCIAL: CommercialProposal = {
  totalValue: 0, paymentTerms: '', reajuste: '', guarantee: '', items: [],
};

interface Props {
  proposal: Proposal;
  /** Dispara o diálogo de impressão automaticamente ao montar (usado em /proposal/:id?print=1). */
  autoPrint?: boolean;
}

// ── Paleta (idêntica ao :root do template HTML) ──────────────────────────────
const C = {
  brand: '#E2611A',
  brandDeep: '#B8480E',
  brandTint: '#FBEDE2',
  ink: '#15171C',
  ink2: '#3A3F48',
  muted: '#7A8089',
  line: '#E4E6EA',
  paper: '#FFFFFF',
  paper2: '#F7F8FA',
  warn: '#9C6A06',
  warnBg: '#FAF1DC',
  warnBorder: '#F0D9A0',
  warnText: '#7A5004',
  totalLbl: '#CFD2D8',
};
const SANS = "'Archivo','Helvetica Neue',Arial,sans-serif";
const MONO = "'IBM Plex Mono','Courier New',monospace";
const LOGO_SRC = `data:image/png;base64,${PROFEM_LOGO_PNG_BASE64}`;

// ── Textos-padrão (espelham proposalDocx) ─────────────────────────────────────
const DEFAULT_OBJETO =
  'Fornecimento de material e mão de obra para a instalação do sistema de proteção e combate a ' +
  'incêndio, contemplando detecção, alarme e os subsistemas previstos em projeto, executados ' +
  'conforme a metodologia Simplific Fire da Profem — ciclo de Projeto, Instalação e Manutenção.';
const DEFAULT_NORMS: [string, string][] = [
  ['NBR 17240', 'Sistemas de detecção e alarme de incêndio'],
  ['NFPA 72', 'National Fire Alarm and Signaling Code'],
  ['NBR 13714', 'Sistemas de hidrantes e mangotinhos'],
  ['NBR 13786', 'Sprinklers — seleção, projeto e instalação'],
];
const DEFAULT_EXCLUSIONS = [
  'Fornecimento de plataformas elevatórias e andaimes para trabalhos em altura;',
  'Adequações civis, elétricas e hidráulicas necessárias à instalação;',
  'Elaboração de projetos executivos e memoriais de cálculo;',
  'Aprovação e obtenção de AVCB junto ao Corpo de Bombeiros;',
  'Manutenção preventiva e corretiva após emissão do Termo de Entrega.',
];
const DEFAULT_CONTRACTOR = [
  'Executar os serviços conforme normas técnicas vigentes;',
  'Fornecer ART/RRT de execução assinada pelo responsável técnico;',
  'Manter condições de segurança do trabalho durante toda a execução;',
  'Emitir Termo de Entrega e Aceite ao final dos serviços.',
];
const DEFAULT_CONTRACTEE = [
  'Liberar acesso às áreas de trabalho nos prazos acordados;',
  'Fornecer projetos, plantas e especificações técnicas;',
  'Disponibilizar energia elétrica e água para execução dos serviços;',
  'Fornecer plataformas elevatórias e andaimes quando necessário.',
];
const DEFAULT_ITEMS = [
  'Sistema de detecção e alarme de incêndio (material + instalação)',
  'Sistema de hidrantes e mangotinhos (material + instalação)',
  'Sistema de sprinklers (material + instalação)',
];

const MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const PAGE_STYLE = `
  @page { size: A4; margin: 0; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pfm-sheet { margin: 0 !important; box-shadow: none !important; page-break-after: always; }
    .pfm-sheet:last-child { page-break-after: auto; }
    .pfm-no-print { display: none !important; }
  }
`;

function splitNorm(n: string): [string, string] {
  const m = n.match(/^(.*?)\s*[—–:-]\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [n.trim(), ''];
}

// ── Sub-blocos ────────────────────────────────────────────────────────────────
function Masthead({ proposalNumber, refSub }: { proposalNumber: string; refSub: string }) {
  return (
    <>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, paddingBottom: 9 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={LOGO_SRC} alt="Profem" style={{ width: 28, height: 34, objectFit: 'contain' }} />
          <div style={{ lineHeight: 1 }}>
            <b style={{ display: 'block', fontWeight: 900, fontSize: '19pt', letterSpacing: '-.02em', color: C.ink }}>Profem</b>
            <span style={{ display: 'block', fontFamily: MONO, fontWeight: 500, fontSize: '6pt', letterSpacing: '.34em', color: C.muted, marginTop: 3, textTransform: 'uppercase' }}>
              Soluções Contra Incêndio
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: 1.45, paddingTop: 2 }}>
          <span style={{ display: 'inline-block', fontFamily: MONO, fontWeight: 600, fontSize: '6.6pt', letterSpacing: '.18em', textTransform: 'uppercase', color: C.brandDeep, background: C.brandTint, padding: '3px 8px', borderRadius: 2, marginBottom: 5 }}>
            Proposta Técnica
          </span>
          <span style={{ display: 'block', fontFamily: MONO, fontWeight: 600, fontSize: '9pt', color: C.ink }}>{proposalNumber}</span>
          <span style={{ display: 'block', fontFamily: MONO, fontSize: '7pt', color: C.muted, marginTop: 1 }}>{refSub}</span>
        </div>
      </header>
      <hr style={{ height: 0, border: 0, borderTop: `2px solid ${C.brand}`, margin: '0 0 1.5px' }} />
      <hr style={{ height: 0, border: 0, borderTop: `.6px solid ${C.line}`, margin: 0 }} />
    </>
  );
}

function Foot({ left, pageInfo }: { left: string[]; pageInfo: string }) {
  return (
    <footer style={{ marginTop: 'auto', paddingTop: 9, borderTop: `.6px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontFamily: MONO, fontSize: '6.2pt', color: C.muted, letterSpacing: '.02em' }}>
        <div>{left.map((l, i) => <span key={i} style={{ display: 'block' }}>{l}</span>)}</div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{pageInfo}</div>
    </footer>
  );
}

function HDoc({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontWeight: 800, fontSize: '15pt', letterSpacing: '-.01em', color: C.ink, margin: '16px 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 4, height: 22, background: C.brand, borderRadius: 1, flex: '0 0 auto' }} />
      {children}
    </h2>
  );
}

function HSec({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '17px 0 9px', fontWeight: 700, fontSize: '13pt', color: C.ink }}>
      <span style={{ width: 4, height: 16, background: C.brand, borderRadius: 1, flex: '0 0 auto' }} />
      <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: '8.5pt', color: C.brand, letterSpacing: '.02em' }}>{num}</span>
      {children}
      <span style={{ flex: 1, height: 0, borderTop: `.6px solid ${C.line}` }} />
    </div>
  );
}

function HSub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 700, fontSize: '12pt', color: C.ink2, margin: '13px 0 6px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 4, height: 11, background: C.brand, borderRadius: 1, flex: '0 0 auto' }} />
      {children}
    </div>
  );
}

const leadStyle: React.CSSProperties = { fontSize: '11pt', color: C.ink2, margin: '0 0 8px', lineHeight: 1.5, textAlign: 'justify' };
const ulStyle: React.CSSProperties = { fontSize: '11pt', color: C.ink2, paddingLeft: 18, margin: '4px 0 10px', lineHeight: 1.55 };

// ══════════════════════════════════════════════════════════════════════════════
export function ProposalPremiumView({ proposal, autoPrint = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: ref,
    documentTitle: `Proposta_${proposal.proposalNumber}_${proposal.clientName}`,
    pageStyle: PAGE_STYLE,
  });

  // Em modo impressão (Baixar PDF) abre o diálogo uma única vez, após o
  // layout/fontes assentarem — sem isso o react-to-print captura o DOM cru.
  const printedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => handlePrint(), 650);
    return () => clearTimeout(t);
  }, [autoPrint, handlePrint]);

  const sc = proposal.technicalScope ?? EMPTY_SCOPE;
  const com = proposal.commercialProposal ?? EMPTY_COMMERCIAL;
  const rev = String(proposal.revision ?? '00').padStart(2, '0');
  const d = new Date();
  const dateLong = `${String(d.getDate()).padStart(2, '0')} de ${MES[d.getMonth()]} de ${d.getFullYear()}`;
  const refSub = `Rev. ${rev} · ${String(d.getDate()).padStart(2, '0')} ${MES_ABBR[d.getMonth()]} ${d.getFullYear()}`;
  const scopeTitle = (proposal.scopeTitle || 'Sistema de Proteção e Combate a Incêndio').trim();
  const proposalNumber = proposal.proposalNumber || 'S/N';

  const norms: [string, string][] = sc.norms?.length ? sc.norms.map(splitNorm) : DEFAULT_NORMS;
  const exclusions = sc.exclusions?.length ? sc.exclusions : DEFAULT_EXCLUSIONS;
  const contractor = sc.contractorObligations?.length ? sc.contractorObligations : DEFAULT_CONTRACTOR;
  const contractee = sc.contracteeObligations?.length ? sc.contracteeObligations : DEFAULT_CONTRACTEE;
  const items = com.items || [];

  const sheet: React.CSSProperties = {
    width: '210mm', minHeight: '297mm', margin: '14px auto', padding: '17mm 16mm 14mm',
    background: C.paper, position: 'relative', display: 'flex', flexDirection: 'column',
    boxShadow: '0 4px 26px rgba(0,0,0,.18)', color: C.ink, fontFamily: SANS, fontSize: '9.6pt', lineHeight: 1.5,
    boxSizing: 'border-box',
  };

  const addr = ['Profem Soluções Contra Incêndio · Rua Esmeralda, 120 — Colina da Serra · Cabreúva/SP · 13318-000', 'comercial@profemsolucoes.com.br · +55 11 4529-3379'];

  const thStyle: React.CSSProperties = { background: C.brand, color: '#fff', textAlign: 'left', fontWeight: 600, fontSize: '9pt', letterSpacing: '.04em', textTransform: 'uppercase', padding: '6px 9px' };
  const tdStyle: React.CSSProperties = { padding: '5.5px 9px', borderBottom: `.6px solid ${C.line}`, color: C.ink2, verticalAlign: 'top', fontSize: '11pt' };

  return (
    <div>
      {/* Botão imprimir (oculto na impressão) */}
      <div className="pfm-no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={() => handlePrint()}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', background: C.ink, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: MONO, border: 0, cursor: 'pointer' }}
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`}</style>

      <div ref={ref}>
        {/* ═══════════ FOLHA 1 — CAPA ═══════════ */}
        <section className="pfm-sheet" style={sheet}>
          <Masthead proposalNumber={proposalNumber} refSub={refSub} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontFamily: MONO, fontSize: '7pt', letterSpacing: '.2em', color: C.muted, textTransform: 'uppercase', margin: '0 0 6px' }}>
              Cabreúva/SP · {dateLong}
            </p>
            <h1 style={{ fontWeight: 900, fontSize: '27pt', lineHeight: 1.06, letterSpacing: '-.02em', margin: '0 0 6px', color: C.ink }}>
              Proposta para<br />{scopeTitle}
            </h1>
            <p style={{ fontSize: '11pt', color: C.ink2, maxWidth: '74%', margin: 0 }}>
              Escopo base — instalação completa de sistema de detecção, alarme e combate, em conformidade com as normas técnicas vigentes.
            </p>
            <div style={{ width: 60, height: 3, background: C.brand, borderRadius: 2, margin: '24px 0' }} />

            <div style={{ border: `.6px solid ${C.line}`, borderLeft: `4px solid ${C.brand}`, borderRadius: 3, padding: '15px 18px', background: C.paper }}>
              <span style={{ fontFamily: MONO, fontSize: '6.6pt', letterSpacing: '.22em', color: C.muted, textTransform: 'uppercase' }}>Destinatário</span>
              <p style={{ fontWeight: 700, fontSize: '11pt', color: C.ink, margin: '5px 0 14px' }}>{(proposal.clientName || '[ Nome do cliente ]')}</p>
              <div style={{ display: 'flex', gap: 0, borderTop: `.6px solid ${C.line}`, paddingTop: 12 }}>
                {([
                  ['Proposta Nº', proposalNumber, true],
                  ['Revisão', `Rev. ${rev}`, true],
                  ['Validade', `${proposal.validityDays} dias`, false],
                  ['Local', 'Cabreúva/SP', false],
                ] as [string, string, boolean][]).map(([k, v, isMono], i) => (
                  <div key={i} style={{ flex: 1, paddingRight: 14 }}>
                    <span style={{ display: 'block', fontFamily: MONO, fontSize: '6.4pt', letterSpacing: '.18em', color: C.muted, textTransform: 'uppercase' }}>{k}</span>
                    <span style={{ display: 'block', fontWeight: isMono ? 600 : 700, fontFamily: isMono ? MONO : SANS, fontSize: '9.2pt', color: C.ink, marginTop: 3 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Foot left={['Marcus Paulo Gonçalves Lopes · Diretoria de Engenharia', 'comercial@profemsolucoes.com.br · +55 11 4529-3379']} pageInfo={`${proposalNumber} · Pág. 01/03`} />
        </section>

        {/* ═══════════ FOLHA 2 — TÉCNICA ═══════════ */}
        <section className="pfm-sheet" style={sheet}>
          <Masthead proposalNumber={proposalNumber} refSub={refSub} />
          <HDoc>Proposta Técnica</HDoc>

          <HSec num="01">Considerações Gerais</HSec>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11pt' }}>
            <tbody>
              {([
                ['Proponente', 'Profem Soluções Contra Incêndio'],
                ['Contratante', proposal.clientName || '[ Nome do cliente ]'],
                ['Local de trabalho', 'Cabreúva/SP'],
                ['Escopo', scopeTitle],
                ['Prazo estimado', proposal.deadline || 'A definir conforme levantamento técnico'],
                ['Vigência', String(d.getFullYear())],
              ] as [string, string][]).map(([k, v], i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 0', borderBottom: `.6px solid ${C.line}`, color: C.muted, width: '40%' }}>{k}</td>
                  <td style={{ padding: '4px 0', borderBottom: `.6px solid ${C.line}`, color: C.ink, fontWeight: 600 }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {sc.locations && sc.locations.length > 0 && (
            <>
              <HSub>Unidades / Locais de execução</HSub>
              <ul style={ulStyle}>{sc.locations.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </>
          )}

          <HSec num="02">Objeto e Escopo</HSec>
          <p style={leadStyle}>{sc.generalConsiderations?.trim() || DEFAULT_OBJETO}</p>
          {sc.items?.length > 0 && (
            <>
              <HSub>Escopo de fornecimento</HSub>
              <ul style={ulStyle}>
                {sc.items.map((it, i) => <li key={i}>{it.category ? `${it.category} — ${it.description}` : it.description}</li>)}
              </ul>
            </>
          )}
          <HSub>Normas técnicas de referência</HSub>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
            <thead>
              <tr><th style={{ ...thStyle, width: '32%' }}>Norma</th><th style={thStyle}>Aplicação</th></tr>
            </thead>
            <tbody>
              {norms.map(([code, app], i) => (
                <tr key={i} style={{ background: i % 2 ? C.paper2 : C.paper }}>
                  <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt' }}>{code}</td>
                  <td style={tdStyle}>{app}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '6.8pt', color: C.muted, margin: '3px 0 0', fontStyle: 'italic' }}>As normas aplicáveis são confirmadas conforme o escopo final contratado.</p>

          {sc.maintenancePlan && sc.maintenancePlan.length > 0 && (
            <>
              <HSub>Matriz de periodicidade</HSub>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Equipamento</th>
                    <th style={thStyle}>Tipo de inspeção</th>
                    <th style={{ ...thStyle, width: '22%' }}>Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  {sc.maintenancePlan.map((t, i) => (
                    <tr key={t.id} style={{ background: i % 2 ? C.paper2 : C.paper }}>
                      <td style={tdStyle}>{t.equipment}</td>
                      <td style={tdStyle}>{t.inspection}</td>
                      <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt' }}>{t.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <HSec num="03">Exclusões do Escopo</HSec>
          <p style={leadStyle}>Estão <strong style={{ color: C.ink }}>excluídos</strong> do presente escopo, salvo negociação expressa em contrário:</p>
          <ul style={ulStyle}>{exclusions.map((e, i) => <li key={i}>{e}</li>)}</ul>

          <HSec num="04">Obrigações das Partes</HSec>
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <HSub>Contratada — Profem</HSub>
              <ul style={{ ...ulStyle, fontSize: '11pt', paddingLeft: 16 }}>{contractor.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
            <div style={{ flex: 1 }}>
              <HSub>Contratante</HSub>
              <ul style={{ ...ulStyle, fontSize: '11pt', paddingLeft: 16 }}>{contractee.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          </div>
          <Foot left={addr} pageInfo={`${proposalNumber} · Pág. 02/03`} />
        </section>

        {/* ═══════════ FOLHA 3 — COMERCIAL ═══════════ */}
        <section className="pfm-sheet" style={sheet}>
          <Masthead proposalNumber={proposalNumber} refSub={refSub} />
          <HDoc>Proposta Comercial</HDoc>

          <HSec num="05">Valores — Material e Mão de Obra</HSec>
          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: '8%' }}>Item</th>
                <th style={thStyle}>Descrição do serviço</th>
                <th style={{ ...thStyle, width: '11%', textAlign: 'center' }}>Quant.</th>
                <th style={{ ...thStyle, width: '16%', textAlign: 'right' }}>Unit.</th>
                <th style={{ ...thStyle, width: '18%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(items.length > 0
                ? items.map((it, i) => [
                    String(i + 1).padStart(2, '0'),
                    it.billingType === 'monthly' ? `${it.description} — mensal × ${it.contractMonths || 12}` : it.description,
                    String(it.quantity),
                    it.billingType === 'monthly' ? `${formatCurrency(it.unitPrice)}/mês` : formatCurrency(it.unitPrice),
                    formatCurrency(itemContractValue(it)),
                  ])
                : DEFAULT_ITEMS.map((desc, i) => [String(i + 1).padStart(2, '0'), desc, '1', 'R$ —', 'R$ —'])
              ).map((row, i) => (
                <tr key={i} style={{ background: i % 2 ? C.paper2 : C.paper }}>
                  <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt' }}>{row[0]}</td>
                  <td style={tdStyle}>{row[1]}</td>
                  <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt', textAlign: 'center' }}>{row[2]}</td>
                  <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt', textAlign: 'right' }}>{row[3]}</td>
                  <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt', textAlign: 'right' }}>{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '6.8pt', color: C.muted, margin: '3px 0 0', fontStyle: 'italic' }}>Valores ilustrativos — preencher conforme levantamento técnico e orçamento final aprovado.</p>

          <div style={{ background: C.ink, color: '#fff', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', margin: '4px 0 6px' }}>
            <span style={{ fontFamily: MONO, fontSize: '7.4pt', letterSpacing: '.12em', textTransform: 'uppercase', color: C.totalLbl }}>Investimento total — material + mão de obra</span>
            <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: '15pt', color: C.brand }}>{formatCurrency(com.totalValue || 0)}</span>
          </div>

          <div style={{ borderRadius: 3, padding: '11px 14px', margin: '10px 0', fontSize: '11pt', border: `.6px solid ${C.warnBorder}`, background: C.warnBg, color: C.warnText }}>
            <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: '6.6pt', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: 3, color: C.warn }}>Itens não inclusos</span>
            Plataformas elevatórias e andaimes para trabalhos em altura deverão ser fornecidos pela Contratante e <strong style={{ color: C.warn }}>não estão inclusos</strong> no valor acima.
          </div>

          {com.onDemandServices && com.onDemandServices.length > 0 && (
            <>
              <HSub>Serviços sob demanda</HSub>
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '6px 0 4px' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Serviço</th>
                    <th style={{ ...thStyle, width: '24%' }}>Unidade</th>
                    <th style={{ ...thStyle, width: '20%', textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {com.onDemandServices.map((s, i) => (
                    <tr key={s.id} style={{ background: i % 2 ? C.paper2 : C.paper }}>
                      <td style={tdStyle}>{s.description}</td>
                      <td style={tdStyle}>{s.unit}</td>
                      <td style={{ ...tdStyle, fontFamily: MONO, fontSize: '11pt', textAlign: 'right' }}>{formatCurrency(s.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '6.8pt', color: C.muted, margin: '3px 0 0', fontStyle: 'italic' }}>Valores cobrados por evento/acionamento — não inclusos no investimento total.</p>
            </>
          )}

          <HSec num="06">Condições Comerciais</HSec>
          <div style={{ display: 'flex', gap: 0, border: `.6px solid ${C.line}`, borderRadius: 3, overflow: 'hidden', margin: '10px 0' }}>
            {([
              ['Pagamento', com.paymentTerms || 'Faturamento total para 07 DDL após a finalização dos trabalhos.'],
              ['Reajuste', com.reajuste || 'Não aplicável durante o prazo de validade da proposta.'],
              ['Garantia', com.guarantee || 'Conforme manual do fabricante.'],
              ['Validade', `${proposal.validityDays} dias a partir da data de emissão.`],
            ] as [string, string][]).map(([k, v], i, arr) => (
              <div key={i} style={{ flex: 1, padding: '11px 13px', borderRight: i < arr.length - 1 ? `.6px solid ${C.line}` : 0 }}>
                <span style={{ fontFamily: MONO, fontSize: '6.4pt', letterSpacing: '.1em', color: C.brandDeep, textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>{k}</span>
                <span style={{ fontSize: '11pt', color: C.ink2 }}>{v}</span>
              </div>
            ))}
          </div>

          <HSec num="07">Considerações Finais</HSec>
          <p style={leadStyle}>Para quaisquer esclarecimentos, entre em contato com a Diretoria de Engenharia ou o Departamento Comercial. Agradecemos pela oportunidade e aguardamos seu retorno. Atenciosamente,</p>

          <div style={{ display: 'flex', gap: 46, marginTop: 30 }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: `.8px solid ${C.ink}`, paddingTop: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '11pt', display: 'block' }}>Marcus Paulo G. Lopes</span>
                <span style={{ fontSize: '7.6pt', color: C.muted }}>Engº Civil · Profem Soluções Contra Incêndio</span><br />
                <span style={{ fontSize: '7.6pt', color: C.muted, fontFamily: MONO }}>Assinatura digital verificada</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: `.8px solid ${C.ink}`, paddingTop: 6 }}>
                <span style={{ fontWeight: 700, fontSize: '11pt', display: 'block' }}>Aceite do Cliente</span>
                <span style={{ fontSize: '7.6pt', color: C.muted }}>Responsável · [ Data ]</span>
              </div>
            </div>
          </div>
          <Foot left={addr} pageInfo={`${proposalNumber} · Pág. 03/03`} />
        </section>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Rota de impressão: /proposal/:id?print=1
// Carrega a proposta por id e renderiza a prévia premium em modo auto-print.
// ══════════════════════════════════════════════════════════════════════════════
export function ProposalPrintRoute({ id }: { id: string }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    proposalService
      .getProposal(id)
      .then((p) => {
        if (!active) return;
        if (p) setProposal(p);
        else setNotFound(true);
      })
      .catch(() => active && setNotFound(true));
    return () => {
      active = false;
    };
  }, [id]);

  if (notFound) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: SANS, color: C.ink2 }}>
        <AlertCircle size={44} color={C.brand} />
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Proposta não encontrada</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>O link pode ter expirado ou estar incorreto.</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, border: `3px solid ${C.line}`, borderTopColor: C.brand, borderRadius: '50%', animation: 'pfmspin 0.8s linear infinite' }} />
        <style>{`@keyframes pfmspin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <ProposalPremiumView proposal={proposal} autoPrint />;
}
