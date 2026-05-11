import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'color';
  size?: number;
}

export function Logo({ className = '', variant = 'color', size = 40 }: LogoProps) {
  const isDark = variant === 'dark';
  
  // Cores baseadas na imagem fornecida
  const grayColor = isDark ? "#FFFFFF" : "#525252";
  const orangeColor = "#F97316";
  const grayOpacity = isDark ? "0.3" : "1";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Flame Icon Refatorado conforme imagem */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 409 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Parte Cinza (Esquerda ) */}
        <path 
          d="M 196 0 L 28 180 L 3 242 L 0 315 L 23 391 L 73 453 L 151 493 L 232 495 L 165 477 L 115 445 L 77 399 L 55 335 L 59 278 L 83 219 L 200 64 L 208 23 Z" 
          fill={grayColor} 
          fillOpacity={grayOpacity}
        />
        {/* Parte Laranja (Direita) */}
        <path 
          d="M 222 10 L 227 75 L 131 246 L 121 327 L 142 383 L 182 415 L 157 356 L 154 295 L 172 241 L 211 198 L 192 268 L 204 367 L 238 434 L 295 480 L 350 437 L 385 387 L 407 324 L 408 261 L 369 165 Z" 
          fill={orangeColor} 
        />
      </svg>
      
      <div className="flex flex-col leading-none">
        <span className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-neutral-900 uppercase italic'}`}>
          PROFEM
        </span>
        <span className={`text-[8px] font-bold uppercase tracking-[0.3em] ${isDark ? 'text-white/40' : 'text-neutral-400'}`}>
          Soluções Contra Incêndio
        </span>
      </div>
    </div>
  );
}