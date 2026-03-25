/**
 * Creado y diseñado por XO
 */

import React, { useMemo, useEffect } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { buildSceneQuote, formatCurrency } from '@/utils/quote-builder';

/**
 * Sección de cotización para el Inspector del Editor.
 * Muestra una lista viva de los productos colocados en la escena
 * con cantidades, precio unitario, subtotales y total general.
 * Ahora incluye persistencia real e historial.
 */
export const QuoteInspectorSection: React.FC = () => {
  const items = useEditorStore(s => s.items);
  const project = useEditorStore(s => s.project);
  const quotes = useEditorStore(s => s.quotes);
  const isLoadingQuotes = useEditorStore(s => s.isLoadingQuotes);
  const isSavingQuote = useEditorStore(s => s.isSavingQuote);
  const fetchQuotes = useEditorStore(s => s.fetchQuotes);
  const saveQuoteAction = useEditorStore(s => s.saveQuote);

  // Derivar cotización reactivamente cuando cambian los items en escena o la config del proyecto
  const currentQuote = useMemo(() => buildSceneQuote(items), [items, project.priceType]);

  // Cargar historial al montar si el proyecto tiene ID real
  useEffect(() => {
    if (project.id && project.id !== 'default') {
      fetchQuotes();
    }
  }, [project.id]);

  const handleSaveQuote = async () => {
    try {
      await saveQuoteAction(currentQuote);
      // Opcional: Notificación de éxito
    } catch (error: any) {
      alert(error.message || 'Error al guardar la cotización');
    }
  };

  // ── Estado vacío ──────────────────────────────────────────────────────

  if (currentQuote.items.length === 0 && quotes.length === 0) {
    return (
      <div className="p-12 h-full flex flex-col items-center justify-center opacity-40 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center text-4xl shadow-inner outline outline-1 outline-zinc-200/50">
          🧾
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[10px] text-zinc-900 font-black uppercase tracking-[0.2em]">
            Sin productos ni historial
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
    <div className="flex flex-col h-full bg-white animate-in fade-in duration-500 overflow-hidden">
      
      {/* Scrollable Container for everything EXCEPT the main summary summary */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-4">
        
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
                {formatCurrency(currentQuote.total)}
              </span>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[18px] font-black text-zinc-300 font-mono leading-none">
                {currentQuote.totalItems}
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
        {currentQuote.items.length > 0 && (
          <>
            <div className="px-5 pt-6 pb-2 flex items-center gap-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                Partidas en Escena ({currentQuote.items.length})
              </h3>
              <div className="h-px w-full bg-zinc-100"></div>
            </div>

            <div className="px-4 py-2 space-y-2.5">
              {currentQuote.items.map((lineItem) => (
                <div
                  key={lineItem.productId}
                  className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
                >
                  <div className="p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                      {lineItem.thumbnail ? (
                        <img src={lineItem.thumbnail} alt={lineItem.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg grayscale opacity-40 group-hover:grayscale-0 transition-all">📦</span>
                      )}
                    </div>
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
          </>
        )}

        {/* ── Historial de Cotizaciones ────────────────────────────────────── */}
        {quotes.length > 0 && (
          <div className="mt-8">
            <div className="px-5 pb-3 flex items-center gap-3">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                Historial Guardado ({quotes.length})
              </h3>
              <div className="h-px w-full bg-zinc-100"></div>
            </div>

            <div className="px-4 space-y-2">
              {isLoadingQuotes ? (
                <div className="py-8 text-center animate-pulse">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Cargando historial...</span>
                </div>
              ) : (
                quotes.map((q) => (
                  <div 
                    key={q.id}
                    className="p-3 border border-zinc-100 bg-zinc-50/30 rounded-xl hover:bg-zinc-50 hover:border-zinc-200 transition-colors cursor-pointer group"
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black text-zinc-800 uppercase tracking-tight">
                          Cotización {q.projectVersion?.versionNum ? `v${q.projectVersion.versionNum}` : ''}
                        </span>
                        <span className="text-[8px] text-zinc-400 font-medium">
                          {new Date(q.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-zinc-900 font-mono tracking-tighter">
                        {formatCurrency(Number(q.totalAmount))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[7px] font-bold text-zinc-400 uppercase tracking-widest">
                        {q.totalPieces} PIEZAS • LISTA {q.priceType}
                      </span>
                      {q.creator && (
                        <span className="text-[7px] font-bold text-blue-500 uppercase tracking-widest truncate">
                          BY {q.creator.firstName}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Fijo */}
      <div className="p-4 bg-white border-t border-zinc-100 shrink-0 space-y-3 shadow-[0_-8px_20px_-10px_rgba(0,0,0,0.05)]">
        {currentQuote.itemsWithoutPrice > 0 && currentQuote.items.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2.5 animate-in zoom-in-95 duration-300 mb-2">
            <span className="text-xs">⚠️</span>
            <p className="text-[8.5px] text-amber-800 font-bold leading-tight">
              {currentQuote.itemsWithoutPrice} partidas sin precio ignoradas en el total.
            </p>
          </div>
        )}

        {currentQuote.items.length > 0 && (
          <>
            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Total Actual</span>
                <span className="text-[8px] font-bold text-zinc-400 uppercase">(Proyecto {project.name})</span>
              </div>
              <span className="text-xl font-black font-mono text-zinc-900 tracking-tighter">
                {formatCurrency(currentQuote.total)}
              </span>
            </div>
            
            <button 
              onClick={handleSaveQuote}
              disabled={isSavingQuote || project.id === 'default'}
              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-zinc-200/50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2 ${
                project.id === 'default' 
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-blue-600'
              }`}
            >
              {isSavingQuote ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <span className="text-xs">💾</span> 
                  Guardar Cotización Formal
                </>
              )}
            </button>
            {project.id === 'default' && (
              <p className="text-[7.5px] text-center text-zinc-400 font-bold uppercase tracking-widest">
                Guarda el proyecto primero para poder cotizar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
