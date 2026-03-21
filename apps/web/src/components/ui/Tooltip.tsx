import React, { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'bottom', className = '' }) => {
  return (
    <div className={`relative group inline-block ${className}`}>
      {children}
      <div className={`absolute whitespace-nowrap z-[1000] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/20 ${
        position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2' :
        position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2' :
        position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2' :
        'left-full top-1/2 -translate-y-1/2 ml-2'
      }`}>
        {content}
        {/* Triángulo */}
        <div className={`absolute w-2 h-2 bg-zinc-900 rotate-45 ${
          position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' :
          position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' :
          position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' :
          '-left-1 top-1/2 -translate-y-1/2'
        }`} />
      </div>
    </div>
  );
};
