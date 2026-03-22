/**
 * Creado y diseñado por XO
 */

"use client";

import React, { ReactNode, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string | ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'bottom', className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      // Usamos posicionamiento fijo, por lo que no necesitamos desplazamientos de scroll
      // si el padre también es fijo, pero lo estándar es usar los valores de rect
      // que son relativos al viewport.
      if (position === 'right') {
        top = rect.top + rect.height / 2;
        left = rect.right + 8;
      } else if (position === 'bottom') {
        top = rect.bottom + 8;
        left = rect.left + rect.width / 2;
      } else if (position === 'top') {
        top = rect.top - 8;
        left = rect.left + rect.width / 2;
      } else if (position === 'left') {
        top = rect.top + rect.height / 2;
        left = rect.left - 8;
      }

      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => setIsVisible(false);

  // Traslación basada en la posición para centrar
  const getTranslate = () => {
    if (position === 'right' || position === 'left') return 'translateY(-50%)';
    return 'translateX(-50%)';
  };

  return (
    <div 
      ref={triggerRef} 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {mounted && isVisible && createPortal(
        <div 
          className="fixed z-[10000] pointer-events-none transition-all duration-200"
          style={{ 
            top: coords.top, 
            left: coords.left,
            transform: getTranslate(),
          }}
        >
          <div className="whitespace-nowrap bg-[#222222] text-white text-[10px] font-bold tracking-wider px-2.5 py-1.5 rounded shadow-2xl border border-white/10 opacity-100 flex items-center gap-2">
            {content}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
