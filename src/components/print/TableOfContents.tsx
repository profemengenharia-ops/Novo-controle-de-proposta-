import React from 'react';

interface TOCItem {
  id: string;
  title: string;
  pageNumber?: number;
}

export function TableOfContents() {
  const items = [
    { id: '01', title: 'Apresentação da Empresa', pageNumber: '03' },
    { id: '02', title: 'Equipe Técnica e Experiência', pageNumber: '04' },
    { id: '03', title: 'Escopo Técnico de Fornecimento', pageNumber: '05' },
    { id: '04', title: 'Normativas e Certificações', pageNumber: '08' },
    { id: '01', title: 'Metodologia de Execução', isSub: true },
    { id: '02', title: 'Cronograma Estimado', isSub: true },
    { id: '05', title: 'Proposta Comercial (Investimento)', pageNumber: '10' },
    { id: '06', title: 'Condições Contratuais e Pagamento', pageNumber: '11' },
    { id: '07', title: 'Termos de Garantia e Suporte', pageNumber: '12' },
    { id: '08', title: 'Aceite e Assinaturas', pageNumber: '13' },
  ];

  return (
    <div className="h-[28.5cm] p-20 bg-white page-break-after flex flex-col">
      <div className="mt-20 mb-24">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-1 bg-orange-500 rounded-full" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500">Documentação Técnica</span>
        </div>
        <h2 className="text-5xl font-black tracking-tight text-neutral-900">
          Sumário Executivo
        </h2>
      </div>

      <div className="space-y-6 max-w-2xl">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-baseline gap-4 group">
            <span className={`text-xs font-black tabular-nums min-w-[2rem] ${item.isSub ? 'text-neutral-300 ml-8' : 'text-orange-500'}`}>
              {item.isSub ? `•` : item.id}
            </span>
            <span className={`flex-1 border-b border-dotted border-neutral-100 pb-1 text-sm tracking-wide ${item.isSub ? 'text-neutral-400 font-medium' : 'text-neutral-800 font-bold uppercase'}`}>
              {item.title}
            </span>
            {item.pageNumber && (
              <span className="text-xs font-black text-neutral-400 tabular-nums">
                {item.pageNumber}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-auto pt-10 border-t border-neutral-50 flex justify-between items-center">
        <p className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest leading-relaxed max-w-[40ch]">
          Este documento contém informações confidenciais e proprietárias da ProFem Engenharia de Incêndio.
        </p>
        <div className="flex gap-1">
          {[1, 2, 3].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 1 ? 'bg-orange-500' : 'bg-neutral-100'}`} />)}
        </div>
      </div>
    </div>
  );
}
