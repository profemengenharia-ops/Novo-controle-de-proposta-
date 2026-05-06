import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'color';
  size?: number;
}

export function Logo({ className = '', variant = 'color', size = 40 }: LogoProps) {
  const isDark = variant === 'dark';
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Flame Icon */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 512 512" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path 
          d="M260.6 5.4c-9.1-4.7-18.7-6.2-26.6-4.1-13.8 3.7-23.4 15.6-26.3 32.8-5.7 34.1 11.2 78.4 46.1 121.3 32.8 40.3 64.9 74.4 75.3 113.8 6.5 24.6 1.8 50.9-13.3 74.2-14.8 22.8-37.4 39.8-63.5 48-26 8.1-53.8 8.1-78.2 0-24.4-8.1-45.5-23.7-59.5-44-13.8-20.1-20.5-43.5-19.1-65.7 1.3-22.2 7.7-43.1 18.2-61.9-5.1 13.9-8.4 28.5-9.8 43.6-.9 9.8-.7 19.8.5 29.8 2.2 18.8 8.4 36.8 18.2 52.8 9.8 15.9 23 29.5 38.6 39.8 15.7 10.3 33.6 17.2 52.3 20.3 18.8 3.1 38 2.4 56.6-2 18.6-4.5 35.8-12.8 50.3-24.5 14.5-11.7 25.8-26.5 33.1-43.3 7.2-16.7 10.5-35.1 9.3-53.6-1.1-18.6-6-36.5-14.4-52.8-16.8-32.8-44.5-63.9-74.8-101.4-27.9-34.6-53.3-73.6-60.5-120.3-.9-5.8-.3-11.4 1.7-16.1.5-1.2 1.1-2.4 1.7-3.5 1-1.8 2.3-3.5 3.9-5.1 1.6-1.6 3.4-3.1 5.4-4.4 2-1.3 4.2-2.3 6.6-3 2.4-.7 4.9-1.1 7.5-1.2 2.6-.1 5.3 0 8 .4 2.7.4 5.4 1 8.1 1.8z" 
          fill={isDark ? "#FFFFFF" : "#525252"} 
          fillOpacity={isDark ? "0.3" : "1"}
        />
        <path 
          d="M280.6 5.4c48 40 180 160 180 320 0 100-80 180-180 180s-180-80-180-180c0-60 20-110 50-150-10 40-10 80 0 120 10 40 40 70 80 80-40-10-70-40-80-80-5-20-5-40 0-60 40-80 160-200 210-230-10 10-50 70-80 100z" 
          fill="#F97316"
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
