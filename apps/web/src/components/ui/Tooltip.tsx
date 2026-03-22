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
      <div className={`absolute whitespace-pre-wrap z-[1000] invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-[#222222] text-white text-[11px] font-medium tracking-wide px-3 py-2 rounded-md shadow-2xl border border-white/10 ${
        position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 mt-2.5' :
        position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 mb-2.5' :
        position === 'left' ? 'right-full top-1/2 -translate-y-1/2 mr-2.5' :
        'left-full top-1/2 -translate-y-1/2 ml-2.5'
      }`}>
        {content}
        {/* Triángulo Opcional - en Figma típicamente no lo llevan pero si lo dejamos lo hacemos sutil */}
        <div className={`absolute w-2 h-2 bg-[#222222] border-white/10 rotate-45 ${
          position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2 border-t border-l' :
          position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2 border-b border-r' :
          position === 'left' ? '-right-1 top-1/2 -translate-y-1/2 border-t border-r' :
          '-left-1 top-1/2 -translate-y-1/2 border-b border-l'
        }`} />
      </div>
    </div>
  );
};
