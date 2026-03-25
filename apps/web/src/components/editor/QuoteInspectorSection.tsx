/**
 * Creado y diseñado por XO
 */

import React, { useMemo } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { buildSceneQuote, formatCurrency } from '@/utils/quote-builder';

/**
 * Sección de cotización para el Inspector del Editor.
 * Muestra una lista viva de los productos colocados en la escena
 * con cantidades, precio unitario, subtotales y total general.
 */
export const QuoteInspectorSection: React.FC = () => {
  const items = useEditorStore(s => s.items);
  const project = useEditorStore(s => s.project);

  // Derivar cotización reactivamente cuando cambian los items en escena o la config del proyecto
  const quote = useMemo(() => buildSceneQuote(items), [items, project.priceType]);

  // ── Estado vacío ──────────────────────────────────────────────────────

  if (quote.items.length === 0) {
    return (
      <div className="p-12 h-full flex flex-col items-center justify-center opacity-40 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-4xl shadow-inner outline outline-1 outline-zinc-200/50">
          🧾
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[10px] text-zinc-900 font-black uppercase tracking-[0.2em]">
            Escena sin productos
          </p>
          <p className="text-[9px] text-zinc-500 max-w-[180px] leading-relaxed font-medium">
            Agregue elementos desde el catálogo para generar la cotización automática.
          </p>
        </div>
      </div>
    );
  }

  // ── Cotización con productos ──────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500">
      
      {/* Resumen Superior Estilo "Dashboard" */}
      <div className="p-4 bg-zinc-900 mx-4 mt-4 rounded-2xl shadow-2xl shadow-zinc-900/10 border border-zinc-800 shrink-0 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full -mr-4 -mt-4 blur-2xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
        
        <div className="relative z-10 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.25em] mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Total Estimado
            </span>
            <span className="text-2xl font-black text-white font-mono tracking-tighter">
              {formatCurrency(quote.total)}
            </span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[18px] font-black text-zinc-300 font-mono leading-none">
              {quote.totalItems}
            </span>
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">
              Piezas Totales
            </span>
          </div>
        </div>

        {/* Selector de Lista de Precios */}
        <div className="mt-4 pt-3 border-t border-zinc-800 relative z-10 flex items-center justify-between">
            <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-widest">Lista de Precios</span>
            <div className="flex gap-1">
                {['A', 'B', 'C', 'D', 'E'].map((type) => (
                    <button
                        key={type}
                        onClick={() => useEditorStore.getState().setPriceType(type)}
                        className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black transition-all ${
                            project.priceType === type
                                ? 'bg-blue-600 text-white'
                                : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                        }`}
                    >
                        {type}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* Título de Partidas */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
          Partidas ({quote.items.length})
        </h3>
        <div className="h-px w-full bg-zinc-100"></div>
      </div>

      {/* Lista de partidas con scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-2 space-y-2.5">
        {quote.items.map((lineItem) => (
          <div
            key={lineItem.productId}
            className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
          >
            <div className="p-3 flex items-start gap-3">
              {/* Miniatura o Icono */}
              <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                {lineItem.thumbnail ? (
                  <img src={lineItem.thumbnail} alt={lineItem.name} className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-lg grayscale opacity-40 group-hover:grayscale-0 transition-all">📦</span>
                )}
              </div>

              {/* Info del producto */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-zinc-900 uppercase tracking-tight truncate pr-2">
                    {lineItem.name}
                  </span>
                  <span className="bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded text-[9px] font-black font-mono">
                    x{lineItem.quantity}
                  </span>
                </div>
                {lineItem.sku && (
                  <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest">
                    {lineItem.sku}
                  </span>
                )}
              </div>
            </div>

            {/* Fila de precios y subtotales */}
            <div className="px-3 py-2.5 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between">
              {lineItem.hasPrice ? (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-zinc-400 uppercase tracking-tighter">Unitario</span>
                    <span className="text-[10px] font-mono font-bold text-zinc-600">
                      {formatCurrency(lineItem.unitPrice!)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">Subtotal</span>
                    <span className="text-[11px] font-mono font-black text-zinc-900 tracking-tight">
                      {formatCurrency(lineItem.subtotal!)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                    Precio no asignado
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer de la cotización */}
      <div className="p-4 bg-zinc-50 border-t border-zinc-100 shrink-0 space-y-3">
        {/* Advertencia si hay productos sin precio */}
        {quote.itemsWithoutPrice > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 animate-in zoom-in-95 duration-300">
            <span className="text-sm mt-0.5">⚠️</span>
            <p className="text-[9px] text-amber-800 font-bold leading-relaxed">
              Hay {quote.itemsWithoutPrice} partidas sin precio. El total general ignora estos elementos hasta que se les asigne un valor en el catálogo.
            </p>
          </div>
        )}

        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Total Final</span>
            <span className="text-[8px] font-bold text-zinc-400 uppercase">(IVA Incluido*)</span>
          </div>
          <span className="text-xl font-black font-mono text-zinc-900 tracking-tighter">
            {formatCurrency(quote.total)}
          </span>
        </div>
        
        <button className="w-full py-3 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 shadow-xl shadow-zinc-900/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2">
          Finalizar Propuesta
        </button>
      </div>
    </div>
  );
};
