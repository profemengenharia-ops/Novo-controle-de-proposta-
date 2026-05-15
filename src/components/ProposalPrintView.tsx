/**
 * ProposalPrintView — Gerador de PDF da ProFem
 *
 * Estrutura (7 páginas aprox.):
 *   Pág 1 — Carta de Apresentação (formato carta formal)
 *   Pág 2 — Índice (17 seções com referência de página)
 *   Pág 3 — Proposta Técnica · Seções 1–4 (Considerações, Referências, Normas, Escopo)
 *   Pág 4 — Proposta Técnica · Seções 5–11 (Segurança, Condições, Obrigações, Prazo)
 *   Pág 5 — Proposta Comercial · Seções 12–17 (Valores, Pagamento, Assinaturas)
 */

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Proposal } from '../types';
import { formatCurrency } from '../lib/utils';
import { Printer } from 'lucide-react';

interface PrintViewProps {
  proposal: Proposal;
}

// ── Paleta ─────────────────────────────────────────────────────────────────────
const C = {
  orange: '#f97316',
  dark:   '#111111',
  n50:    '#fafafa',
  n100:   '#f5f5f5',
  n200:   '#e5e5e5',
  n300:   '#d4d4d4',
  n400:   '#a3a3a3',
  n600:   '#525252',
  n700:   '#404040',
  n900:   '#171717',
  white:  '#ffffff',
};

const PAGE_STYLE = `
  @page { size: A4 portrait; margin: 2cm; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .pfm-page-break { break-before: page; }
    .pfm-no-break   { break-inside: avoid; }
  }
`;

const font: React.CSSProperties = {
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

// ── Textos padrão ProFem ───────────────────────────────────────────────────────
const DEFAULT_SCOPE_CONSIDERATIONS =
  'Caso sejam necessários materiais e mão de obra de equipamentos e serviços que não estão sendo ' +
  'considerados, como por exemplo, o fornecimento de materiais para substituição, eles serão ' +
  'apresentados em orçamento complementar.\n\n' +
  'A CONTRATANTE deverá disponibilizar em arquivo eletrônico DWG os projetos dos Sistemas de ' +
  'Prevenção e Combate a Incêndio existente.\n\n' +
  'A CONTRATANTE deverá liberar e desobstruir as áreas onde serão executados os serviços, ' +
  'conforme cronograma pré-definido;\n\n' +
  'Não estamos incluindo despesas com chamados emergenciais, peças de reposição, horas extras, ' +
  'trabalhos noturnos, estadia e jantar para os nossos colaboradores.';

const DEFAULT_WORKING_HOURS =
  'O horário normal de trabalho será de segunda-feira a sexta das 08h00min às 17h00min.';

// ── Logo SVG (chama ProFem) ────────────────────────────────────────────────────
function FlameIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 409 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <path
        d="M 196 0 L 28 180 L 3 242 L 0 315 L 23 391 L 73 453 L 151 493 L 232 495 L 165 477 L 115 445 L 77 399 L 55 335 L 59 278 L 83 219 L 200 64 L 208 23 Z"
        fill="#525252"
      />
      <path
        d="M 222 10 L 227 75 L 131 246 L 121 327 L 142 383 L 182 415 L 157 356 L 154 295 L 172 241 L 211 198 L 192 268 L 204 367 L 238 434 L 295 480 L 350 437 L 385 387 L 407 324 L 408 261 L 369 165 Z"
        fill="#f97316"
      />
    </svg>
  );
}

// Logo inline para págs 2+ (esquerda, pequeno)
function LogoSmall() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <FlameIcon size={26} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: C.dark, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.01em', ...font }}>
          PROFEM
        </span>
        <span style={{ fontSize: 6, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.22em', ...font }}>
          Soluções Contra Incêndio
        </span>
      </div>
    </div>
  );
}

// Logo para capa (centralizado, maior)
function LogoCover() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <FlameIcon size={68} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.dark, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-0.01em', ...font }}>
          PROFEM
        </div>
        <div style={{ fontSize: 7.5, fontWeight: 700, color: C.n400, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: 3, ...font }}>
          Soluções Contra Incêndio
        </div>
      </div>
    </div>
  );
}

// ── Cabeçalho de página (págs 2+) ─────────────────────────────────────────────
function PageHeader({ proposalNumber, revision }: { proposalNumber: string; revision: string }) {
  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return (
    <div style={{ marginBottom: 18, ...font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <LogoSmall />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7.5, color: C.n400 }}>Cabreúva, {today}</div>
          <div style={{ fontSize: 7, color: C.n400, marginTop: 2 }}>
            Ref: {proposalNumber} — Rev.{revision}
          </div>
        </div>
      </div>
      <div style={{ height: 0.5, background: C.n200, marginTop: 8 }} />
    </div>
  );
}

// ── Rodapé de página ──────────────────────────────────────────────────────────
function PageFooter() {
  return (
    <div style={{ paddingTop: 8, borderTop: `0.4px solid ${C.n200}`, marginTop: 24, ...font }}>
      <div style={{ fontSize: 6.5, color: C.n400, textAlign: 'right' }}>
        Rua Esmeralda, 120 - Colina da Serra&nbsp;&nbsp;|&nbsp;&nbsp;
        Cabreúva, SP 13318-000&nbsp;&nbsp;|&nbsp;&nbsp;
        comercial@profemsolucoes.com.br&nbsp;&nbsp;|&nbsp;&nbsp;
        Tel: 011-4529-3379
      </div>
    </div>
  );
}

// ── Bloco de seção ("PROPOSTA TÉCNICA." / "PROPOSTA COMERCIAL.") ───────────────
function BlockHeader({ title }: { title: string }) {
  return (
    <div style={{ marginBottom: 16, ...font }}>
      <p style={{
        fontSize: 11, fontWeight: 700, color: C.dark,
        margin: '0 0 4px', textTransform: 'uppercase',
      }}>
        {title}.
      </p>
      <div style={{ height: 0.6, background: C.n300 }} />
    </div>
  );
}

// ── Título de seção ("N.  TÍTULO:") ──────────────────────────────────────────
function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <div className="pfm-no-break" style={{ margin: '12px 0 5px', ...font }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.dark, margin: 0, textTransform: 'uppercase' }}>
        {number}.&nbsp;&nbsp;&nbsp;{title}:
      </p>
    </div>
  );
}

// ── Título de subseção ("N.N. TÍTULO:") ───────────────────────────────────────
function SubSectionTitle({ label }: { label: string }) {
  return (
    <div className="pfm-no-break" style={{ margin: '9px 0 3px 14px', ...font }}>
      <p style={{ fontSize: 9.5, fontWeight: 700, color: C.dark, margin: 0, textTransform: 'uppercase' }}>
        {label}:
      </p>
    </div>
  );
}

// ── Parágrafo ─────────────────────────────────────────────────────────────────
function Body({ children, justify = true }: { children: React.ReactNode; justify?: boolean }) {
  return (
    <p style={{
      fontSize: 9.5, color: C.n700, lineHeight: 1.65,
      margin: '0 0 4px',
      textAlign: justify ? 'justify' : 'left',
      ...font,
    }}>
      {children}
    </p>
  );
}

// ── Bullet ───────────────────────────────────────────────────────────────────
function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 2, marginLeft: 10 }}>
      <span style={{ color: C.n600, fontSize: 9.5, flexShrink: 0, marginTop: 1 }}>•</span>
      <p style={{ fontSize: 9.5, color: C.n700, lineHeight: 1.65, margin: 0, textAlign: 'justify', ...font }}>
        {children}
      </p>
    </div>
  );
}

// ── Item do Índice ────────────────────────────────────────────────────────────
function TocItem({ number, title, page }: { number: string; title: string; page: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 5, ...font }}>
      <span style={{ fontSize: 9.5, color: C.n700, minWidth: 28, flexShrink: 0 }}>{number}.</span>
      <span style={{ fontSize: 9.5, color: C.n700, textTransform: 'uppercase', flexShrink: 0 }}>{title}</span>
      <span style={{
        flex: 1,
        borderBottom: `0.5px dotted ${C.n300}`,
        marginBottom: 3,
        marginLeft: 4,
        marginRight: 4,
      }} />
      <span style={{ fontSize: 9.5, color: C.n700, flexShrink: 0 }}>{page}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function ProposalPrintView({ proposal }: PrintViewProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Proposta_${proposal.clientName}_${proposal.proposalNumber}`,
    pageStyle: PAGE_STYLE,
  });

  const sc  = proposal.technicalScope;
  const com = proposal.commercialProposal;

  const today = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  // Seção 6 — usa texto customizado ou padrão ProFem
  const scopeConsiderations = sc.scopeConsiderations || DEFAULT_SCOPE_CONSIDERATIONS;

  // Seção 10 — horário de trabalho
  const workingHours = sc.workingHours || DEFAULT_WORKING_HOURS;

  // Seção 11 — prazo de execução
  const mobilizationDays = sc.mobilizationDays ?? 5;
  const executionTime    = sc.executionTime    || '90 dias corridos';

  // Revisão formatada (ex: "00")
  const revFormatted = String(proposal.revision).padStart(2, '0');

  return (
    <div>
      {/* ── Botão imprimir (oculto no PDF) ── */}
      <div className="flex justify-end mb-4 print:hidden">
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
        >
          <Printer size={16} /> Imprimir / Salvar PDF
        </button>
      </div>

      {/* ── Documento imprimível ── */}
      <div ref={componentRef} style={{ background: C.white, color: C.dark, ...font }}>

        {/* ════════════════════════════════════════════════════════════════
            PÁG 1 — CARTA DE APRESENTAÇÃO
        ════════════════════════════════════════════════════════════════ */}
        <div style={{
          minHeight: 'calc(29.7cm - 4cm)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Logo centralizado */}
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <LogoCover />
          </div>

          {/* Corpo da carta */}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 9.5, color: C.n700, marginBottom: 22, ...font }}>
              Cabreúva, {today}.
            </p>

            <p style={{ fontSize: 9.5, color: C.n700, marginBottom: 10, ...font }}>À</p>

            <p style={{ fontSize: 9.5, fontWeight: 700, color: C.dark, marginBottom: 36, ...font }}>
              {proposal.clientName.toUpperCase()}&nbsp;
              Nº {proposal.proposalNumber} – Rev.{revFormatted}.
            </p>

            <p style={{ fontSize: 9.5, color: C.n700, marginBottom: 36, ...font }}>
              <strong>ESCOPO BASE:</strong>{' '}
              {(proposal.scopeTitle || 'INSTALAÇÃO DO SISTEMA DE PROTEÇÃO E COMBATE A INCÊNDIO.').toUpperCase()}
            </p>

            <p style={{
              fontSize: 9.5, color: C.n700,
              lineHeight: 1.65, textAlign: 'justify',
              marginBottom: 40, ...font,
            }}>
              Agradecemos o convite e nos colocamos à vossa disposição para quaisquer esclarecimentos.
            </p>

            <p style={{ fontSize: 9.5, color: C.n700, marginBottom: 48, ...font }}>
              Atenciosamente,
            </p>

            {/* Assinatura */}
            <div style={{ width: 220 }}>
              <div style={{ height: 0.6, background: C.n400, marginBottom: 7 }} />
              <p style={{ fontSize: 9, fontWeight: 700, color: C.dark, margin: '0 0 2px', ...font }}>
                Marcus Paulo Gonçalves Lopes
              </p>
              <p style={{ fontSize: 8, color: C.n400, margin: 0, ...font }}>Engenharia</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PÁG 2 — ÍNDICE
        ════════════════════════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader
            proposalNumber={proposal.proposalNumber}
            revision={revFormatted}
          />

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, color: C.dark,
              margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', ...font,
            }}>
              Índice
            </p>
          </div>

          <div style={{ maxWidth: '88%', margin: '0 auto' }}>
            <TocItem number="1"  title="Considerações Gerais"              page={3} />
            <TocItem number="2"  title="Referências"                        page={3} />
            <TocItem number="3"  title="Normas Técnicas Aplicáveis"         page={3} />
            <TocItem number="4"  title="Escopo de Fornecimento"             page={3} />
            <TocItem number="5"  title="Segurança do Trabalho"              page={4} />
            <TocItem number="6"  title="Considerações ao Escopo"            page={4} />
            <TocItem number="7"  title="Exclusões do Escopo"                page={4} />
            <TocItem number="8"  title="Obrigações da Contratada"           page={4} />
            <TocItem number="9"  title="Obrigações da Contratante"          page={4} />
            <TocItem number="10" title="Horário de Trabalho"                page={4} />
            <TocItem number="11" title="Prazo de Execução"                  page={4} />
            <TocItem number="12" title="Valores (Material e Mão de Obra)"   page={5} />
            <TocItem number="13" title="Forma de Pagamento"                 page={5} />
            <TocItem number="14" title="Reajuste"                           page={5} />
            <TocItem number="15" title="Garantia"                           page={5} />
            <TocItem number="16" title="Validade da Proposta"               page={5} />
            <TocItem number="17" title="Considerações Finais"               page={5} />
          </div>

          <PageFooter />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PÁG 3 — PROPOSTA TÉCNICA · Seções 1–4
        ════════════════════════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader
            proposalNumber={proposal.proposalNumber}
            revision={revFormatted}
          />
          <BlockHeader title="Proposta Técnica" />

          {/* 1. Considerações Gerais */}
          <SectionTitle number="1" title="Considerações Gerais" />
          {sc.generalConsiderations ? (
            <Body>{sc.generalConsiderations}</Body>
          ) : null}
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            fontSize: 9.5, marginTop: 6, marginBottom: 14,
          }}>
            <tbody>
              {([
                ['Proponente:',        'PROFEM SOLUÇÕES CONTRA INCÊNDIO.'],
                ['Contratante:',       proposal.clientName.toUpperCase()],
                ['Local de Trabalho:', 'CABREÚVA/SP.'],
                ['Escopo:',            (proposal.scopeTitle || 'INSTALAÇÃO DE SISTEMA DE INCÊNDIO').toUpperCase()],
                ['Vigência:',          new Date().getFullYear().toString()],
              ] as [string, string][]).map(([label, value], i) => (
                <tr key={i} style={{ borderBottom: `0.4px solid ${C.n200}` }}>
                  <td style={{
                    padding: '6px 10px', fontWeight: 700, color: C.dark,
                    width: '28%', background: C.n50, ...font,
                  }}>
                    {label}
                  </td>
                  <td style={{ padding: '6px 10px', color: C.n700, ...font }}>
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

          {/* 3. Normas Técnicas Aplicáveis */}
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
              {sc.items.map((item, idx) => (
                <div key={idx} className="pfm-no-break">
                  <SubSectionTitle label={`4.${idx + 1}. ${item.category}`} />
                  <Body>{item.description}</Body>
                </div>
              ))}
            </>
          )}

          <PageFooter />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PÁG 4 — PROPOSTA TÉCNICA · Seções 5–11
        ════════════════════════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader
            proposalNumber={proposal.proposalNumber}
            revision={revFormatted}
          />

          {/* 5. Segurança do Trabalho */}
          {sc.safetyNotes && (
            <>
              <SectionTitle number="5" title="Segurança do Trabalho" />
              <Body>{sc.safetyNotes}</Body>
            </>
          )}

          {/* 6. Considerações ao Escopo */}
          <SectionTitle number="6" title="Considerações ao Escopo" />
          {scopeConsiderations
            .split('\n\n')
            .filter(Boolean)
            .map((para, i) => <Body key={i}>{para.trim()}</Body>)
          }

          {/* 7. Exclusões do Escopo */}
          {sc.exclusions.length > 0 && (
            <>
              <SectionTitle number="7" title="Exclusões do Escopo" />
              {sc.exclusions.map((e, i) => <Bullet key={i}>{e}</Bullet>)}
            </>
          )}

          {/* 8. Obrigações da Contratada */}
          {sc.contractorObligations.length > 0 && (
            <>
              <SectionTitle number="8" title="Obrigações da Contratada" />
              {sc.contractorObligations.map((o, i) => <Bullet key={i}>{o}</Bullet>)}
            </>
          )}

          {/* 9. Obrigações da Contratante */}
          {sc.contracteeObligations.length > 0 && (
            <>
              <SectionTitle number="9" title="Obrigações da Contratante" />
              {sc.contracteeObligations.map((o, i) => <Bullet key={i}>{o}</Bullet>)}
            </>
          )}

          {/* 10. Horário de Trabalho */}
          <SectionTitle number="10" title="Horário de Trabalho" />
          <Body>{workingHours}</Body>

          {/* 11. Prazo de Execução */}
          <SectionTitle number="11" title="Prazo de Execução" />
          <Body>Mobilização: {mobilizationDays} dias após a confirmação.</Body>
          <Body>Serão executadas em aproximadamente {executionTime}.</Body>

          <PageFooter />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PÁG 5 — PROPOSTA COMERCIAL · Seções 12–17
        ════════════════════════════════════════════════════════════════ */}
        <div className="pfm-page-break" style={{ paddingTop: 4 }}>
          <PageHeader
            proposalNumber={proposal.proposalNumber}
            revision={revFormatted}
          />
          <BlockHeader title="Proposta Comercial" />

          {/* 12. Valores */}
          <SectionTitle number="12" title="Valores (Material e Mão de Obra)" />

          {/* Tabela detalhada (opcional — hideItemDetails oculta) */}
          {!com.hideItemDetails && (com.items || []).length > 0 && (
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 9, marginTop: 8, marginBottom: 4,
            }}>
              <thead>
                <tr style={{ background: C.n100 }}>
                  {(['ITEM', 'DESCRIÇÃO DO SERVIÇO', 'QUANT.', 'UNIT.', 'TOTAL'] as const).map((h, i) => (
                    <th key={i} style={{
                      padding: '7px 8px',
                      textAlign: i === 0 ? 'center' : i >= 3 ? 'right' : 'left',
                      fontSize: 7.5, fontWeight: 700, color: C.n400,
                      borderBottom: `0.4px solid ${C.n200}`,
                      width: i === 0 ? '5%' : i === 1 ? '52%' : '14%',
                      ...font,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(com.items || []).map((item, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.n50 }}>
                    <td style={{ padding: '7px 8px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'center', ...font }}>
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td style={{ padding: '7px 8px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, fontWeight: 500, ...font }}>
                      {item.description}
                    </td>
                    <td style={{ padding: '7px 8px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'center', ...font }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '7px 8px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'right', ...font }}>
                      {item.unit}
                    </td>
                    <td style={{ padding: '7px 8px', color: C.n700, borderBottom: `0.4px solid ${C.n200}`, textAlign: 'right', fontWeight: 600, ...font }}>
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Linha de total — layout simples (modelo real) */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '9px 0',
            borderTop: `0.6px solid ${C.n300}`,
            borderBottom: `0.6px solid ${C.n300}`,
            marginTop: com.hideItemDetails ? 8 : 0,
            marginBottom: 6,
          }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: C.dark, ...font }}>Total:</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.dark, ...font }}>
              {formatCurrency(com.totalValue || 0)}
            </span>
          </div>

          <p style={{ fontSize: 7.5, color: C.n400, margin: '0 0 14px', ...font }}>
            * Plataformas elevatórias e andaimes para trabalhos em altura deverão ser
            fornecidos pela Contratante.
          </p>

          {/* 13. Forma de Pagamento */}
          <SectionTitle number="13" title="Forma de Pagamento" />
          <Body>{com.paymentTerms || '—'}</Body>

          {/* 14. Reajuste */}
          <SectionTitle number="14" title="Reajuste" />
          <Body>
            {com.reajuste || 'Não aplicável durante o prazo de validade da proposta.'}
          </Body>

          {/* 15. Garantia */}
          <SectionTitle number="15" title="Garantia" />
          <Body>{com.guarantee || 'Não aplicável.'}</Body>

          {/* 16. Validade da Proposta */}
          <SectionTitle number="16" title="Validade da Proposta" />
          <Body>
            Esta proposta tem validade de {proposal.validityDays} dias a partir da data de emissão.
          </Body>

          {/* 17. Considerações Finais */}
          <SectionTitle number="17" title="Considerações Finais" />
          <Body>
            Para quaisquer esclarecimentos, entrar em contato com nossos departamentos.
          </Body>
          <Body justify={false}>
            <strong><em>Agradecendo desde já sua atenção, subscrevemo-nos.</em></strong>
          </Body>
          <Body justify={false}>Atenciosamente,</Body>

          {/* Assinaturas — 2 profissionais ProFem */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 40, marginTop: 52,
          }}>
            {/* Engenharia */}
            <div>
              <div style={{ height: 0.8, background: C.n300, marginBottom: 8 }} />
              <p style={{ fontSize: 9, fontWeight: 700, color: C.dark, margin: '0 0 2px', ...font }}>
                Marcus Paulo G. Lopes
              </p>
              <p style={{ fontSize: 8, color: C.n400, margin: '0 0 1px', ...font }}>Engº Civil</p>
              <p style={{ fontSize: 8, color: C.n400, margin: 0, ...font }}>
                marcus.lopes@profemsolucoes.com.br
              </p>
            </div>

            {/* Comercial */}
            <div>
              <div style={{ height: 0.8, background: C.n300, marginBottom: 8 }} />
              <p style={{ fontSize: 9, fontWeight: 700, color: C.dark, margin: '0 0 2px', ...font }}>
                Amanda Lins
              </p>
              <p style={{ fontSize: 8, color: C.n400, margin: '0 0 1px', ...font }}>
                Analista de Negócios
              </p>
              <p style={{ fontSize: 8, color: C.n400, margin: 0, ...font }}>
                amanda.lins@profemsolucoes.com.br
              </p>
            </div>
          </div>

          <PageFooter />
        </div>

      </div>
    </div>
  );
}
