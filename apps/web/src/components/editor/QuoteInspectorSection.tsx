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

  // Derivar cotización reactivamente cuando cambian los items
  const quote = useMemo(() => buildSceneQuote(items), [items]);

  // ── Estado vacío ──────────────────────────────────────────────────────

  if (quote.items.length === 0) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center opacity-40 space-y-4 animate-in fade-in slide-in-from-right-3 duration-500">
        <div className="text-4xl">🧾</div>
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.15em] text-center max-w-[180px] leading-relaxed">
          Aún no hay productos colocados en la escena
        </p>
        <p className="text-[8px] text-zinc-400 text-center max-w-[160px] leading-relaxed">
          Arrastra productos desde el catálogo para generar una cotización automática
        </p>
      </div>
    );
  }

  // ── Cotización con productos ──────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-3 duration-500">
      {/* Encabezado con total */}
      <div className="bg-zinc-900 p-4 mx-4 mt-4 rounded-xl shadow-inner border border-zinc-800 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">
              Total Cotización
            </span>
            <span className="text-xl font-black text-white font-mono leading-none">
              {formatCurrency(quote.total)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block">
              Partidas
            </span>
            <span className="text-lg font-black text-zinc-300 font-mono leading-none">
              {quote.items.length}
            </span>
            <span className="text-[8px] text-zinc-500 block font-mono">
              ({quote.totalItems} pzas)
            </span>
          </div>
        </div>
      </div>

      {/* Lista de partidas con scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-2">
        {quote.items.map((lineItem) => (
          <div
            key={lineItem.productId}
            className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all group"
          >
            <div className="p-3 flex items-start justify-between gap-2">
              {/* Info del producto */}
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-tight truncate">
                  {lineItem.name}
                </span>
                {lineItem.sku && (
                  <span className="text-[8px] font-mono text-zinc-400 uppercase">
                    SKU: {lineItem.sku}
                  </span>
                )}
              </div>

              {/* Cantidad */}
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] font-black font-mono shrink-0">
                x{lineItem.quantity}
              </span>
            </div>

            {/* Fila de precios */}
            <div className="px-3 pb-3 flex items-center justify-between border-t border-zinc-200/50 pt-2">
              {lineItem.hasPrice ? (
                <>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-bold text-zinc-400 uppercase">
                      P. Unitario
                    </span>
                    <span className="text-[10px] font-mono font-bold text-zinc-600">
                      {formatCurrency(lineItem.unitPrice!)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-[7px] font-bold text-zinc-400 uppercase">
                      Subtotal
                    </span>
                    <span className="text-[11px] font-mono font-black text-zinc-900">
                      {formatCurrency(lineItem.subtotal!)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1.5 w-full">
                  <span className="text-amber-500 text-[10px]">⚠️</span>
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                    Sin precio asignado
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Advertencia de productos sin precio */}
      {quote.itemsWithoutPrice > 0 && (
        <div className="mx-4 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl shrink-0">
          <p className="text-[9px] text-amber-700 font-bold leading-relaxed">
            ⚠️ Hay {quote.itemsWithoutPrice} producto{quote.itemsWithoutPrice > 1 ? 's' : ''} sin precio asignado.
            El total no incluye estos productos.
          </p>
        </div>
      )}

      {/* Barra de total fija al fondo */}
      <div className="mx-4 mb-4 p-3 bg-zinc-100 border border-zinc-200 rounded-xl shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">
            Total
          </span>
          <span className="text-sm font-black font-mono text-zinc-900">
            {formatCurrency(quote.total)}
          </span>
        </div>
      </div>
    </div>
  );
};
