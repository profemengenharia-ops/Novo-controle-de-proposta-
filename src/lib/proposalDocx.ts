/**
 * proposalDocx — Gerador de proposta em Word (.docx) da ProFem
 *
 * Reproduz fielmente o template HTML de referência "Profem · Proposta":
 *   • Masthead em todas as páginas (logo chama + wordmark + selo + referência)
 *   • Rodapé com endereço + numeração de página
 *   • Sistema de cor único (laranja #E2611A) e tipografia disciplinada
 *   • Capa → Proposta Técnica (01–04) → Proposta Comercial (05–07)
 *   • kv-table, tabela de valores, faixa de total, card de condições (4 col),
 *     callout de itens não inclusos e bloco de assinatura/aceite.
 *
 * Os dados reais da proposta são vinculados quando disponíveis; caso contrário,
 * usam-se os textos-padrão (idênticos ao template de referência).
 *
 * API pública:
 *   generateProposalDocx(proposal) → Promise<Blob>
 *   downloadProposalDocx(proposal) → dispara o download no navegador
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  TableLayoutType,
  VerticalAlign,
  HeightRule,
  Header,
  Footer,
  ImageRun,
  PageNumber,
} from 'docx';
import { Proposal } from '../types';
import { formatCurrency } from './utils';
import { PROFEM_LOGO_PNG_BASE64 } from './profemLogo';

// ── Sistema de cor (espelha :root do HTML) ───────────────────────────────────
const BRAND = 'E2611A';
const BRAND_DEEP = 'B8480E';
const BRAND_TINT = 'FBEDE2';
const INK = '15171C';
const INK2 = '3A3F48';
const MUTED = '7A8089';
const LINE = 'E4E6EA';
const PAPER2 = 'F7F8FA';
const WARN = '9C6A06';
const WARN_BG = 'FAF1DC';
const WARN_BORDER = 'F0D9A0';
const WARN_TEXT = '7A5004';
const TOTAL_LBL = 'CFD2D8';
const WHITE = 'FFFFFF';

const SANS = 'Arial';
const MONO = 'Courier New';

// ── Bordas reutilizáveis ─────────────────────────────────────────────────────
const line = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
const brandLeft = { style: BorderStyle.SINGLE, size: 28, color: BRAND };
const noTableBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };

const MES_ABBR = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// ── Textos-padrão (idênticos ao template de referência) ──────────────────────
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

const DEFAULT_ITEMS: [string][] = [
  ['Sistema de detecção e alarme de incêndio (material + instalação)'],
  ['Sistema de hidrantes e mangotinhos (material + instalação)'],
  ['Sistema de sprinklers (material + instalação)'],
];

// ── Helpers de codificação de imagem (browser + node) ────────────────────────
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ── Runs ──────────────────────────────────────────────────────────────────────
function mono(text: string, opts: { color?: string; size?: number; bold?: boolean; caps?: boolean } = {}) {
  return new TextRun({
    text,
    font: MONO,
    color: opts.color ?? MUTED,
    size: opts.size ?? 14,
    bold: opts.bold ?? false,
    allCaps: opts.caps ?? false,
    characterSpacing: 18,
  });
}

function sans(
  text: string,
  opts: { color?: string; size?: number; bold?: boolean; italics?: boolean } = {},
) {
  return new TextRun({
    text,
    font: SANS,
    color: opts.color ?? INK2,
    size: opts.size ?? 22,
    bold: opts.bold ?? false,
    italics: opts.italics ?? false,
  });
}

/** Pequeno bloco laranja (barra de acento) via sombreamento de run. */
function bar() {
  return new TextRun({ text: '  ', shading: { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' } });
}

// ── Parágrafos ────────────────────────────────────────────────────────────────
function lead(text: string, opts: { after?: number } = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: opts.after ?? 140, line: 264 },
    children: [sans(text, { size: 22 })],
  });
}

function hDoc(title: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [80, 9280],
    layout: TableLayoutType.FIXED,
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 80, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 160, right: 0 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [new TextRun({ text: title, font: SANS, bold: true, size: 30, color: INK })] })],
          }),
        ],
      }),
    ],
  });
}

function hSec(num: string, title: string) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 4 } },
    children: [
      bar(),
      new TextRun({ text: '  ' + num + '  ', font: MONO, color: BRAND, bold: true, size: 18, characterSpacing: 18 }),
      new TextRun({ text: title, font: SANS, bold: true, size: 26, color: INK }),
    ],
  });
}

function hSub(title: string) {
  return new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [bar(), new TextRun({ text: '  ' + title, font: SANS, bold: true, size: 24, color: INK2 })],
  });
}

function listItem(text: string) {
  return new Paragraph({
    spacing: { after: 50, line: 252 },
    indent: { left: 260, hanging: 160 },
    children: [new TextRun({ text: '•  ', color: BRAND, bold: true, size: 22 }), sans(text, { size: 22 })],
  });
}

// ── Tabela chave/valor ────────────────────────────────────────────────────────
function kvTable(rows: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3744, 5616],
    layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: line, left: none, right: none, insideHorizontal: line, insideVertical: none },
    rows: rows.map(
      ([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              margins: { top: 70, bottom: 70, left: 0, right: 120 },
              children: [new Paragraph({ children: [sans(k, { color: MUTED, size: 22 })] })],
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              margins: { top: 70, bottom: 70, left: 0, right: 0 },
              children: [new Paragraph({ children: [sans(v, { color: INK, bold: true, size: 22 })] })],
            }),
          ],
        }),
    ),
  });
}

// ── Tabela de normas (Norma | Aplicação) ──────────────────────────────────────
function normsTable(norms: [string, string][]) {
  const headerCell = (text: string) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' },
      margins: { top: 70, bottom: 70, left: 140, right: 140 },
      children: [new Paragraph({ children: [new TextRun({ text: text.toUpperCase(), font: SANS, bold: true, color: WHITE, size: 18, characterSpacing: 8 })] })],
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3000, 6360],
    layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: line, left: none, right: none, insideHorizontal: line, insideVertical: none },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [headerCell('Norma'), headerCell('Aplicação')],
      }),
      ...norms.map(
        ([code, app], i) =>
          new TableRow({
            children: [
              new TableCell({
                shading: i % 2 ? { type: ShadingType.CLEAR, fill: PAPER2, color: 'auto' } : undefined,
                margins: { top: 65, bottom: 65, left: 140, right: 140 },
                children: [new Paragraph({ children: [mono(code, { color: INK2, size: 22 })] })],
              }),
              new TableCell({
                shading: i % 2 ? { type: ShadingType.CLEAR, fill: PAPER2, color: 'auto' } : undefined,
                margins: { top: 65, bottom: 65, left: 140, right: 140 },
                children: [new Paragraph({ children: [sans(app, { color: INK2, size: 22 })] })],
              }),
            ],
          }),
      ),
    ],
  });
}

// ── Tabela de valores ──────────────────────────────────────────────────────────
type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

function valuesTable(proposal: Proposal) {
  const com = proposal.commercialProposal;
  const items = com.items || [];

  const th = (text: string, align: Align) =>
    new TableCell({
      shading: { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' },
      margins: { top: 65, bottom: 65, left: 140, right: 140 },
      children: [new Paragraph({ alignment: align, children: [new TextRun({ text: text.toUpperCase(), font: SANS, bold: true, color: WHITE, size: 18, characterSpacing: 8 })] })],
    });

  const td = (text: string, align: Align, opts: { mono?: boolean; bold?: boolean; zebra?: boolean } = {}) =>
    new TableCell({
      shading: opts.zebra ? { type: ShadingType.CLEAR, fill: PAPER2, color: 'auto' } : undefined,
      margins: { top: 60, bottom: 60, left: 140, right: 140 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment: align,
          children: [opts.mono ? mono(text, { color: INK2, size: 22, bold: opts.bold }) : sans(text, { color: INK2, size: 22, bold: opts.bold })],
        }),
      ],
    });

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        th('Item', AlignmentType.LEFT),
        th('Descrição do serviço', AlignmentType.LEFT),
        th('Quant.', AlignmentType.CENTER),
        th('Unit.', AlignmentType.RIGHT),
        th('Total', AlignmentType.RIGHT),
      ],
    }),
  ];

  if (items.length > 0) {
    items.forEach((it, i) => {
      const z = i % 2 === 1;
      rows.push(
        new TableRow({
          children: [
            td(String(i + 1).padStart(2, '0'), AlignmentType.LEFT, { mono: true, zebra: z }),
            td(it.description, AlignmentType.LEFT, { zebra: z }),
            td(String(it.quantity), AlignmentType.CENTER, { mono: true, zebra: z }),
            td(formatCurrency(it.unitPrice), AlignmentType.RIGHT, { mono: true, zebra: z }),
            td(formatCurrency(it.totalPrice), AlignmentType.RIGHT, { mono: true, bold: true, zebra: z }),
          ],
        }),
      );
    });
  } else {
    DEFAULT_ITEMS.forEach(([desc], i) => {
      const z = i % 2 === 1;
      rows.push(
        new TableRow({
          children: [
            td(String(i + 1).padStart(2, '0'), AlignmentType.LEFT, { mono: true, zebra: z }),
            td(desc, AlignmentType.LEFT, { zebra: z }),
            td('1', AlignmentType.CENTER, { mono: true, zebra: z }),
            td('R$ —', AlignmentType.RIGHT, { mono: true, zebra: z }),
            td('R$ —', AlignmentType.RIGHT, { mono: true, zebra: z }),
          ],
        }),
      );
    });
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [750, 5210, 1030, 1180, 1190],
    layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: line, left: none, right: none, insideHorizontal: line, insideVertical: none },
    rows,
  });
}

// ── Faixa de investimento total ────────────────────────────────────────────────
function totalBar(value: number) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [6000, 3360],
    layout: TableLayoutType.FIXED,
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: INK, color: 'auto' },
            margins: { top: 150, bottom: 150, left: 200, right: 140 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [mono('Investimento total — material + mão de obra', { color: TOTAL_LBL, size: 15, caps: true })] })],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: INK, color: 'auto' },
            margins: { top: 150, bottom: 150, left: 140, right: 200 },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [mono(formatCurrency(value || 0), { color: BRAND, bold: true, size: 30 })] })],
          }),
        ],
      }),
    ],
  });
}

// ── Card de condições comerciais (4 colunas) ────────────────────────────────────
function termsCard(cells: [string, string][]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2340, 2340, 2340, 2340],
    layout: TableLayoutType.FIXED,
    borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: none, insideVertical: line },
    rows: [
      new TableRow({
        children: cells.map(
          ([k, v]) =>
            new TableCell({
              margins: { top: 120, bottom: 120, left: 150, right: 150 },
              children: [
                new Paragraph({ spacing: { after: 60 }, children: [mono(k, { color: BRAND_DEEP, size: 13, caps: true })] }),
                new Paragraph({ children: [sans(v, { color: INK2, size: 22 })] }),
              ],
            }),
        ),
      }),
    ],
  });
}

// ── Callout de itens não inclusos ────────────────────────────────────────────────
function warnCallout() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [9360],
    layout: TableLayoutType.FIXED,
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: WARN_BORDER }, bottom: { style: BorderStyle.SINGLE, size: 4, color: WARN_BORDER }, left: { style: BorderStyle.SINGLE, size: 4, color: WARN_BORDER }, right: { style: BorderStyle.SINGLE, size: 4, color: WARN_BORDER }, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: WARN_BG, color: 'auto' },
            margins: { top: 130, bottom: 130, left: 170, right: 170 },
            children: [
              new Paragraph({ spacing: { after: 50 }, children: [mono('Itens não inclusos', { color: WARN, size: 13, bold: true, caps: true })] }),
              new Paragraph({
                children: [
                  sans('Plataformas elevatórias e andaimes para trabalhos em altura deverão ser fornecidos pela Contratante e ', { color: WARN_TEXT, size: 22 }),
                  sans('não estão inclusos', { color: WARN, size: 22, bold: true }),
                  sans(' no valor acima.', { color: WARN_TEXT, size: 22 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ── Bloco de assinaturas ─────────────────────────────────────────────────────────
function signBlock() {
  const cell = (lines: { text: string; bold?: boolean; mono?: boolean; color?: string; size?: number }[]) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 80, bottom: 40, left: 0, right: 300 },
      borders: { ...noTableBorders, top: { style: BorderStyle.SINGLE, size: 8, color: INK } },
      children: lines.map(
        (ln, i) =>
          new Paragraph({
            spacing: { before: i === 0 ? 70 : 0, after: 20 },
            children: [ln.mono ? mono(ln.text, { color: ln.color ?? MUTED, size: ln.size ?? 15 }) : sans(ln.text, { color: ln.color ?? INK, bold: ln.bold, size: ln.size ?? 15 })],
          }),
      ),
    });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4680, 4680],
    layout: TableLayoutType.FIXED,
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          cell([
            { text: 'Marcus Paulo G. Lopes', bold: true, color: INK, size: 22 },
            { text: 'Engº Civil · Profem Soluções Contra Incêndio', color: MUTED, size: 15 },
            { text: 'Assinatura digital verificada', mono: true, color: MUTED, size: 14 },
          ]),
          cell([
            { text: 'Aceite do Cliente', bold: true, color: INK, size: 22 },
            { text: 'Responsável · [ Data ]', color: MUTED, size: 15 },
          ]),
        ],
      }),
    ],
  });
}

// ── Masthead (cabeçalho) ─────────────────────────────────────────────────────────
function buildHeader(proposalNumber: string, refSub: string): Header {
  const logo = new Paragraph({
    children: [
      new ImageRun({ type: 'png', data: base64ToBytes(PROFEM_LOGO_PNG_BASE64), transformation: { width: 28, height: 34 } }),
    ],
  });

  const brandCell = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [520, 4000],
    layout: TableLayoutType.FIXED,
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({ margins: { top: 0, bottom: 0, left: 0, right: 100 }, verticalAlign: VerticalAlign.CENTER, children: [logo] }),
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({ spacing: { after: 10 }, children: [new TextRun({ text: 'Pro', font: SANS, bold: true, size: 34, color: INK }), new TextRun({ text: 'fem', font: SANS, bold: true, size: 34, color: INK })] }),
              new Paragraph({ children: [new TextRun({ text: 'SOLUÇÕES CONTRA INCÊNDIO', font: MONO, size: 11, color: MUTED, characterSpacing: 40 })] }),
            ],
          }),
        ],
      }),
    ],
  });

  const metaCell = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 30 },
      children: [new TextRun({ text: ' PROPOSTA TÉCNICA ', font: MONO, bold: true, size: 13, color: BRAND_DEEP, characterSpacing: 14, shading: { type: ShadingType.CLEAR, fill: BRAND_TINT, color: 'auto' } })],
    }),
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { after: 10 }, children: [mono(proposalNumber, { color: INK, bold: true, size: 18 })] }),
    new Paragraph({ alignment: AlignmentType.RIGHT, children: [mono(refSub, { color: MUTED, size: 14 })] }),
  ];

  const mast = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5400, 3960],
    layout: TableLayoutType.FIXED,
    borders: { top: none, bottom: { style: BorderStyle.SINGLE, size: 16, color: BRAND }, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({ margins: { top: 0, bottom: 80, left: 0, right: 0 }, verticalAlign: VerticalAlign.CENTER, children: [brandCell] }),
          new TableCell({ margins: { top: 0, bottom: 80, left: 0, right: 0 }, verticalAlign: VerticalAlign.CENTER, children: metaCell }),
        ],
      }),
    ],
  });

  return new Header({
    children: [mast, new Paragraph({ spacing: { before: 0, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 1 } }, children: [] })],
  });
}

// ── Rodapé ───────────────────────────────────────────────────────────────────────
function buildFooter(proposalNumber: string, addrLines: string[]): Footer {
  const left = addrLines.map(
    (l, i) => new Paragraph({ spacing: { after: i === addrLines.length - 1 ? 0 : 10 }, children: [mono(l, { color: MUTED, size: 12 })] }),
  );

  const right = new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({ text: `${proposalNumber} · Pág. `, font: MONO, color: MUTED, size: 12 }),
      new TextRun({ children: [PageNumber.CURRENT], font: MONO, color: MUTED, size: 12 }),
      new TextRun({ text: '/', font: MONO, color: MUTED, size: 12 }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: MONO, color: MUTED, size: 12 }),
    ],
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [6800, 2560],
    layout: TableLayoutType.FIXED,
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE }, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({ margins: { top: 90, bottom: 0, left: 0, right: 0 }, verticalAlign: VerticalAlign.BOTTOM, children: left }),
          new TableCell({ margins: { top: 90, bottom: 0, left: 0, right: 0 }, verticalAlign: VerticalAlign.BOTTOM, children: [right] }),
        ],
      }),
    ],
  });

  return new Footer({ children: [table] });
}

// ── Capa ────────────────────────────────────────────────────────────────────────
function coverContent(proposal: Proposal, revFormatted: string, dateLong: string, scopeTitle: string): (Paragraph | Table)[] {
  const divider = new Table({
    width: { size: 900, type: WidthType.DXA },
    columnWidths: [900],
    layout: TableLayoutType.FIXED,
    borders: noTableBorders,
    rows: [
      new TableRow({
        height: { value: 60, rule: HeightRule.EXACT },
        children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: BRAND, color: 'auto' }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [new Paragraph({ children: [] })] })],
      }),
    ],
  });

  const metaGrid = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2200, 2200, 2200, 2200],
    layout: TableLayoutType.FIXED,
    borders: { top: line, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          ['Proposta Nº', proposal.proposalNumber || 'S/N', true],
          ['Revisão', `Rev. ${revFormatted}`, true],
          ['Validade', `${proposal.validityDays} dias`, false],
          ['Local', 'Cabreúva/SP', false],
        ].map(
          ([k, v, isMono]) =>
            new TableCell({
              margins: { top: 110, bottom: 30, left: 0, right: 120 },
              children: [
                new Paragraph({ spacing: { after: 30 }, children: [mono(k as string, { color: MUTED, size: 13, caps: true })] }),
                new Paragraph({ children: [isMono ? mono(v as string, { color: INK, bold: true, size: 18 }) : sans(v as string, { color: INK, bold: true, size: 18 })] }),
              ],
            }),
        ),
      }),
    ],
  });

  const scopeCard = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [9360],
    layout: TableLayoutType.FIXED,
    borders: { top: line, bottom: line, right: line, left: brandLeft, insideHorizontal: none, insideVertical: none },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 200, bottom: 200, left: 220, right: 220 },
            children: [
              new Paragraph({ spacing: { after: 40 }, children: [mono('Destinatário', { color: MUTED, size: 13, caps: true })] }),
              new Paragraph({ spacing: { after: 160 }, children: [sans((proposal.clientName || '[ Nome do cliente ]').toUpperCase(), { color: INK, bold: true, size: 22 })] }),
              metaGrid,
            ],
          }),
        ],
      }),
    ],
  });

  return [
    new Paragraph({ spacing: { before: 160, after: 120 }, children: [mono(`Cabreúva/SP · ${dateLong}`, { color: MUTED, size: 14, caps: true })] }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Proposta para', font: SANS, bold: true, size: 54, color: INK }),
        new TextRun({ text: scopeTitle, font: SANS, bold: true, size: 54, color: INK, break: 1 }),
      ],
    }),
    new Paragraph({ spacing: { after: 140 }, alignment: AlignmentType.LEFT, children: [sans('Escopo base — instalação completa de sistema de detecção, alarme e combate, em conformidade com as normas técnicas vigentes.', { color: INK2, size: 22 })] }),
    divider,
    new Paragraph({ spacing: { after: 120 }, children: [] }),
    scopeCard,
  ];
}

// ── Util: divide string de norma em [código, aplicação] ──────────────────────────
function splitNorm(n: string): [string, string] {
  const m = n.match(/^(.*?)\s*[—–:-]\s*(.+)$/);
  if (m) return [m[1].trim(), m[2].trim()];
  return [n.trim(), ''];
}

// ══════════════════════════════════════════════════════════════════════════════
// GERADOR PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export async function generateProposalDocx(proposal: Proposal): Promise<Blob> {
  const sc = proposal.technicalScope;
  const com = proposal.commercialProposal;
  const revFormatted = String(proposal.revision ?? '00').padStart(2, '0');

  const d = new Date();
  const dateLong = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const refSub = `Rev. ${revFormatted} · ${String(d.getDate()).padStart(2, '0')} ${MES_ABBR[d.getMonth()]} ${d.getFullYear()}`;
  const scopeTitle = (proposal.scopeTitle || 'Sistema de Proteção e Combate a Incêndio').trim();

  const norms: [string, string][] = sc.norms?.length ? sc.norms.map(splitNorm) : DEFAULT_NORMS;
  const exclusions = sc.exclusions?.length ? sc.exclusions : DEFAULT_EXCLUSIONS;
  const contractor = sc.contractorObligations?.length ? sc.contractorObligations : DEFAULT_CONTRACTOR;
  const contractee = sc.contracteeObligations?.length ? sc.contracteeObligations : DEFAULT_CONTRACTEE;

  const children: (Paragraph | Table)[] = [];

  // ── CAPA ──────────────────────────────────────────────────────────────────────
  children.push(...coverContent(proposal, revFormatted, dateLong, scopeTitle));

  // ── PÁG 2 · PROPOSTA TÉCNICA ────────────────────────────────────────────────────
  children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 60 }, children: [] }));
  children.push(hDoc('Proposta Técnica'));

  // 01 Considerações Gerais
  children.push(hSec('01', 'Considerações Gerais'));
  children.push(
    kvTable([
      ['Proponente', 'Profem Soluções Contra Incêndio'],
      ['Contratante', proposal.clientName || '[ Nome do cliente ]'],
      ['Local de trabalho', 'Cabreúva/SP'],
      ['Escopo', scopeTitle],
      ['Prazo estimado', proposal.deadline || 'A definir conforme levantamento técnico'],
      ['Vigência', String(d.getFullYear())],
    ]),
  );

  // 02 Objeto e Escopo
  children.push(hSec('02', 'Objeto e Escopo'));
  children.push(lead(sc.generalConsiderations?.trim() || DEFAULT_OBJETO));
  if (sc.items?.length) {
    children.push(hSub('Escopo de fornecimento'));
    sc.items.forEach(it => children.push(listItem(it.category ? `${it.category} — ${it.description}` : it.description)));
  }
  children.push(hSub('Normas técnicas de referência'));
  children.push(normsTable(norms));
  children.push(new Paragraph({ spacing: { before: 30, after: 0 }, children: [sans('As normas aplicáveis são confirmadas conforme o escopo final contratado.', { color: MUTED, size: 14, italics: true })] }));

  // 03 Exclusões do Escopo
  children.push(hSec('03', 'Exclusões do Escopo'));
  children.push(lead('Estão excluídos do presente escopo, salvo negociação expressa em contrário:', { after: 80 }));
  exclusions.forEach(e => children.push(listItem(e)));

  // 04 Obrigações das Partes
  children.push(hSec('04', 'Obrigações das Partes'));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [4680, 4680],
      layout: TableLayoutType.FIXED,
      borders: noTableBorders,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              margins: { top: 0, bottom: 0, left: 0, right: 200 },
              children: [hSub('Contratada — Profem'), ...contractor.map(o => listItem(o))],
            }),
            new TableCell({
              margins: { top: 0, bottom: 0, left: 200, right: 0 },
              children: [hSub('Contratante'), ...contractee.map(o => listItem(o))],
            }),
          ],
        }),
      ],
    }),
  );

  // ── PÁG 3 · PROPOSTA COMERCIAL ──────────────────────────────────────────────────
  children.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 60 }, children: [] }));
  children.push(hDoc('Proposta Comercial'));

  // 05 Valores
  children.push(hSec('05', 'Valores — Material e Mão de Obra'));
  children.push(valuesTable(proposal));
  children.push(new Paragraph({ spacing: { before: 30, after: 80 }, children: [sans('Valores ilustrativos — preencher conforme levantamento técnico e orçamento final aprovado.', { color: MUTED, size: 14, italics: true })] }));
  children.push(totalBar(com.totalValue || 0));
  children.push(new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }));
  children.push(warnCallout());

  // 06 Condições Comerciais
  children.push(hSec('06', 'Condições Comerciais'));
  children.push(
    termsCard([
      ['Pagamento', com.paymentTerms || 'Faturamento total para 07 DDL após a finalização dos trabalhos.'],
      ['Reajuste', com.reajuste || 'Não aplicável durante o prazo de validade da proposta.'],
      ['Garantia', com.guarantee || 'Conforme manual do fabricante.'],
      ['Validade', `${proposal.validityDays} dias a partir da data de emissão.`],
    ]),
  );

  // 07 Considerações Finais
  children.push(hSec('07', 'Considerações Finais'));
  children.push(
    lead('Para quaisquer esclarecimentos, entre em contato com a Diretoria de Engenharia ou o Departamento Comercial. Agradecemos pela oportunidade e aguardamos seu retorno. Atenciosamente,'),
  );
  children.push(signBlock());

  // ── MONTAGEM DO DOCUMENTO ────────────────────────────────────────────────────────
  const header = buildHeader(proposal.proposalNumber || 'S/N', refSub);
  const footerDefault = buildFooter(proposal.proposalNumber || 'S/N', [
    'Profem Soluções Contra Incêndio · Rua Esmeralda, 120 — Colina da Serra · Cabreúva/SP · 13318-000',
    'comercial@profemsolucoes.com.br · +55 11 4529-3379',
  ]);
  const footerFirst = buildFooter(proposal.proposalNumber || 'S/N', [
    'Marcus Paulo Gonçalves Lopes · Diretoria de Engenharia',
    'comercial@profemsolucoes.com.br · +55 11 4529-3379',
  ]);

  const doc = new Document({
    creator: 'ProFem Soluções Contra Incêndio',
    title: `Proposta ${proposal.proposalNumber}`,
    styles: { default: { document: { run: { font: SANS, size: 22, color: INK2 } } } },
    sections: [
      {
        properties: {
          titlePage: true,
          page: { margin: { top: 1900, bottom: 1300, left: 1000, right: 1000, header: 560, footer: 470 } },
        },
        headers: { default: header, first: header },
        footers: { default: footerDefault, first: footerFirst },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

/** Dispara o download do .docx no navegador. */
export async function downloadProposalDocx(proposal: Proposal): Promise<void> {
  const blob = await generateProposalDocx(proposal);
  const safeClient = (proposal.clientName || 'Cliente').replace(/[^\w\-]+/g, '_').slice(0, 40);
  const filename = `Proposta_${proposal.proposalNumber || 'SN'}_${safeClient}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
