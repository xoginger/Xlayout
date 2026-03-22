/**
 * Creado y diseñado por XO
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/store/editor-store';

export const CalibrationHUD: React.FC = () => {
  const { calibrationState, setCalibrationState, blueprint, updateBlueprint, setActiveTool } = useEditorStore();
  const [inputValue, setInputValue] = useState(calibrationState.measuredDistance?.toFixed(3) || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (calibrationState.step === 'awaiting-real-distance' && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setInputValue(calibrationState.measuredDistance?.toFixed(3) || '');
    }
  }, [calibrationState.step, calibrationState.measuredDistance]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo escuchar globales si no estamos dentro del input
      if (document.activeElement === inputRef.current) return;
      
      if (calibrationState.step === 'awaiting-real-distance') {
        if (e.key === 'Enter') handleApply();
        if (e.key === 'Escape') handleCancel();
      } else if (calibrationState.step !== 'idle') {
        if (e.key === 'Escape') handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [calibrationState, inputValue]);

  if (calibrationState.step === 'idle') return null;

  const handleCancel = () => {
    setCalibrationState({ step: 'idle', pointA: undefined, pointB: undefined, measuredDistance: undefined });
    setActiveTool('select');
  };

  const handleApply = () => {
    const realDist = parseFloat(inputValue.replace(',', '.'));
    const measuredDist = calibrationState.measuredDistance;
    if (!isNaN(realDist) && realDist > 0 && measuredDist && measuredDist > 0) {
      const factor = realDist / measuredDist;
      updateBlueprint({
        scale: blueprint.scale * factor,
        calibrated: true,
        calibrationPointA: calibrationState.pointA,
        calibrationPointB: calibrationState.pointB,
        calibrationMeasuredDist: measuredDist,
        calibrationRealDist: realDist
      });
      handleCancel();
    } else {
      // Small feedback without browser alerts (assuming red border on input normally, using simplistic reset here)
      setInputValue('0.00');
    }
  };

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-zinc-700 p-4 flex flex-col gap-3 min-w-[280px] text-white animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex justify-between items-center border-b pb-2 border-zinc-700/50">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-300 flex items-center gap-2">
          <span className="text-blue-500">📐</span> Calibración de Plano
        </h3>
        <button onClick={handleCancel} className="text-zinc-500 hover:text-red-400 transition-colors bg-zinc-800 hover:bg-zinc-700 p-1 rounded-md" title="Cancelar (ESC)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {calibrationState.step === 'awaiting-first-point' && (
        <div className="text-xs text-center py-2 text-blue-400 font-medium bg-blue-500/10 rounded-lg animate-pulse">
          Click sobre el primer punto de medición...
        </div>
      )}

      {calibrationState.step === 'awaiting-second-point' && (
        <div className="text-xs text-center py-2 text-amber-400 font-medium bg-amber-500/10 rounded-lg animate-pulse">
          Mueve el cursor y clickea el segundo punto...
        </div>
      )}

      {calibrationState.step === 'awaiting-real-distance' && (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-wider bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
            <span className="text-zinc-500">Dist. Virtual Registrada:</span>
            <span className="text-blue-400 text-xs font-mono">{calibrationState.measuredDistance?.toFixed(3)}m</span>
          </div>
          
          <div className="space-y-1.5 px-1 mt-1">
            <label className="text-[9px] uppercase tracking-wider font-bold text-zinc-400">Cuantos metros reales son? (Equivalencia)</label>
            <div className="relative">
               <input 
                 ref={inputRef}
                 type="text" 
                 inputMode="decimal"
                 value={inputValue} 
                 onChange={(e) => setInputValue(e.target.value)}
                 className="w-full bg-zinc-950 border-2 border-zinc-700 rounded-xl px-4 py-3 text-lg font-black font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white pr-10 shadow-inner"
                 placeholder="Ej. 3.50"
                 onKeyDown={(e) => { 
                   e.stopPropagation(); 
                   if (e.key === 'Enter') handleApply();
                   if (e.key === 'Escape') handleCancel();
                 }} // Permite usar Enter directo desde el teclado
               />
               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-black">m</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2 mt-1 border-t border-zinc-800">
             <button onClick={handleApply} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.15em] py-3 rounded-xl transition-all shadow-lg shadow-blue-900/50 active:scale-95">
               Aplicar Escala (ENTER)
             </button>
          </div>
        </div>
      )}
    </div>
  );
};
