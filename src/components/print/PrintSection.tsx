import React from 'react';

interface PrintSectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  isSubSection?: boolean;
}

export function PrintSection({ number, title, children, className = "", isSubSection = false }: PrintSectionProps) {
  return (
    <div className={`space-y-8 ${className} ${!isSubSection ? 'page-break-before py-8' : 'mt-8'}`}>
      <div className="flex items-center gap-4">
        {!isSubSection && (
          <div className="w-1.5 h-10 bg-orange-500 shrink-0" />
        )}
        <div className="flex items-baseline gap-2">
          <span className={`${isSubSection ? 'text-[10px] text-neutral-400' : 'text-3xl text-neutral-900'} font-black tracking-tight uppercase`}>
            {!isSubSection && `${number}. `}
            {title}
          </span>
        </div>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}
