/**
 * Creado y diseñado por XO
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editor-store';
import { buildSceneQuote, formatCurrency } from '@/utils/quote-builder';
import { generateQuotePDF, SYSTEM_DEFAULT_TEMPLATE } from '@/utils/pdf-quote-generator';
import type { QuoteTemplateData, QuoteLineItem as PDFLineItem } from '@/utils/pdf-quote-generator';
import { api } from '@/lib/api';

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
        <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-inner" style={{ background: 'rgba(255,255,255,0.04)', outline: '1px solid var(--xo-border)' }}>
          🧾
        </div>
        <div className="space-y-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--xo-text-secondary)' }}>
            Sin productos ni historial
          </p>
          <p className="text-[9px] max-w-[180px] leading-relaxed font-medium" style={{ color: 'var(--xo-text-ghost)' }}>
            Agregue elementos desde el catálogo para generar la cotización automática.
          </p>
        </div>
      </div>
    );
  }

  // ── Cotización con productos ──────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden" style={{ background: 'var(--xo-surface)' }}>
      
      {/* Scrollable Container for everything EXCEPT the main summary summary */}
      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-4">
        
        {/* Resumen Superior Estilo "Dashboard" */}
        <div className="p-4 mx-4 mt-4 rounded-2xl shadow-2xl shrink-0 overflow-hidden relative group" style={{ background: 'var(--xo-bg)', border: '1px solid var(--xo-border-hover)' }}>
          <div className="absolute top-0 right-0 p-8 bg-blue-500/10 rounded-full -mr-4 -mt-4 blur-2xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
          
          <div className="relative z-10 flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.25em] mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                Total con IVA
              </span>
              <span className="text-2xl font-black text-white font-mono tracking-tighter">
                {formatCurrency(currentQuote.total)}
              </span>
              <span className="text-[8px] font-mono mt-1" style={{ color: 'var(--xo-text-ghost)' }}>
                Subtotal {formatCurrency(currentQuote.subtotal)} + IVA {formatCurrency(currentQuote.ivaAmount)}
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
              <div className="h-px w-full" style={{ background: 'var(--xo-border)' }}></div>
            </div>

            <div className="px-4 py-2 space-y-2.5">
              {currentQuote.items.map((lineItem) => (
                <div
                  key={lineItem.productId}
                  className="group rounded-xl overflow-hidden transition-all duration-300"
                  style={{ background: 'var(--xo-surface-hover)', border: '1px solid var(--xo-border)' }}
                >
                  <div className="p-3 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--xo-border)' }}>
                      {lineItem.thumbnail ? (
                        <img src={lineItem.thumbnail} alt={lineItem.name} className="w-full h-full object-contain p-1" />
                      ) : (
                        <span className="text-lg grayscale opacity-40 group-hover:grayscale-0 transition-all">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black uppercase tracking-tight truncate pr-2" style={{ color: 'var(--xo-text-secondary)' }}>
                          {lineItem.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--xo-text-muted)' }}>
                          x{lineItem.quantity}
                        </span>
                      </div>
                      {lineItem.sku && (
                        <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: 'var(--xo-text-ghost)' }}>
                          {lineItem.sku}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-3 py-2.5 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--xo-border)' }}>
                    {lineItem.hasPrice ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[7px] font-black uppercase tracking-tighter" style={{ color: 'var(--xo-text-ghost)' }}>Unitario</span>
                          <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--xo-text-muted)' }}>
                            {formatCurrency(lineItem.unitPrice!)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[7px] font-black uppercase tracking-tighter" style={{ color: 'var(--xo-primary)' }}>Subtotal</span>
                          <span className="text-[11px] font-mono font-black tracking-tight" style={{ color: 'var(--xo-text)' }}>
                            {formatCurrency(lineItem.subtotal!)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 w-full py-0.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#fbbf24' }}>
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
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: 'var(--xo-text-dim)' }}>
                Historial Guardado ({quotes.length})
              </h3>
              <div className="h-px w-full" style={{ background: 'var(--xo-border)' }}></div>
            </div>

            <div className="px-4 space-y-2">
              {isLoadingQuotes ? (
                <div className="py-8 text-center animate-pulse">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-ghost)' }}>Cargando historial...</span>
                </div>
              ) : (
                quotes.map((q) => (
                  <div 
                    key={q.id}
                    className="p-3 rounded-xl transition-colors cursor-pointer group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--xo-border)' }}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-tight" style={{ color: 'var(--xo-text-secondary)' }}>
                          Cotización {q.projectVersion?.versionNum ? `v${q.projectVersion.versionNum}` : ''}
                        </span>
                        <span className="text-[8px] font-medium" style={{ color: 'var(--xo-text-ghost)' }}>
                          {new Date(q.createdAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <span className="text-[10px] font-black font-mono tracking-tighter" style={{ color: 'var(--xo-text)' }}>
                        {formatCurrency(Number(q.totalAmount))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[7px] font-bold uppercase tracking-widest" style={{ color: 'var(--xo-text-ghost)' }}>
                        {q.totalPieces} PIEZAS • LISTA {q.priceType}
                      </span>
                      {q.creator && (
                        <span className="text-[7px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--xo-primary)' }}>
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
      <div className="p-4 shrink-0 space-y-3" style={{ background: 'var(--xo-surface-elevated)', borderTop: '1px solid var(--xo-border)', boxShadow: '0 -8px 20px -10px rgba(0,0,0,0.3)' }}>
        {currentQuote.itemsWithoutPrice > 0 && currentQuote.items.length > 0 && (
          <div className="p-3 rounded-xl flex items-start gap-2.5 animate-in zoom-in-95 duration-300 mb-2" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-xs">⚠️</span>
            <p className="text-[8.5px] font-bold leading-tight" style={{ color: '#fbbf24' }}>
              {currentQuote.itemsWithoutPrice} partidas sin precio ignoradas en el total.
            </p>
          </div>
        )}

        {currentQuote.items.length > 0 && (
          <>
            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-dim)' }}>Subtotal</span>
              </div>
              <span className="text-[12px] font-bold font-mono tracking-tighter" style={{ color: 'var(--xo-text-muted)' }}>
                {formatCurrency(currentQuote.subtotal)}
              </span>
            </div>

            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text-dim)' }}>IVA (16%)</span>
              </div>
              <span className="text-[12px] font-bold font-mono tracking-tighter" style={{ color: 'var(--xo-text-muted)' }}>
                {formatCurrency(currentQuote.ivaAmount)}
              </span>
            </div>

            <div className="h-px w-full" style={{ background: 'var(--xo-border-hover)' }}></div>

            <div className="flex justify-between items-center px-1">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--xo-text)' }}>Total con IVA</span>
                <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--xo-text-ghost)' }}>(Proyecto {project.name})</span>
              </div>
              <span className="text-xl font-black font-mono tracking-tighter" style={{ color: 'var(--xo-text)' }}>
                {formatCurrency(currentQuote.total)}
              </span>
            </div>
            
            <button 
              onClick={handleSaveQuote}
              disabled={isSavingQuote || project.id === 'default'}
              className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2`}
              style={{
                background: project.id === 'default' ? 'var(--xo-surface-hover)' : 'var(--xo-primary)',
                color: project.id === 'default' ? 'var(--xo-text-ghost)' : 'white',
                cursor: project.id === 'default' ? 'not-allowed' : 'pointer',
              }}
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

            {/* Botón Generar PDF */}
            <GeneratePDFButton currentQuote={currentQuote} project={project} />

            {project.id === 'default' && (
              <p className="text-[7.5px] text-center font-bold uppercase tracking-widest" style={{ color: 'var(--xo-text-ghost)' }}>
                Guarda el proyecto primero para poder cotizar
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Botón de generación de PDF con plantilla ─── */
const GeneratePDFButton: React.FC<{ currentQuote: any; project: any }> = ({ currentQuote, project }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = useCallback(async () => {
    if (currentQuote.items.length === 0) return;
    setIsGenerating(true);
    console.log('[PDF] Iniciando generación de PDF...', { items: currentQuote.items.length });

    try {
      // 1. Intentar cargar plantilla personalizada del API, si no usar default
      let template: QuoteTemplateData = SYSTEM_DEFAULT_TEMPLATE;
      try {
        const templates: any = await api.get('/quotes/templates');
        const arr = Array.isArray(templates) ? templates : [];
        if (arr.length > 0) {
          const t = arr[0];
          template = {
            id: t.id || 'custom',
            ownerType: t.ownerType || 'tenant',
            name: t.name || 'Cotización',
            logoUrl: t.logoUrl || null,
            companyName: t.companyName || null,
            address: t.address || null,
            phone: t.phone || null,
            email: t.email || null,
            rfc: t.rfc || null,
            website: t.website || null,
            primaryColor: t.primaryColor || '#4F46E5',
            accentColor: t.accentColor || '#10B981',
            fontFamily: t.fontFamily || 'helvetica',
            headerText: t.headerText || null,
            footerText: t.footerText || SYSTEM_DEFAULT_TEMPLATE.footerText,
            validityDays: t.validityDays ?? 30,
            showIva: t.showIva ?? true,
            ivaRate: t.ivaRate ?? 0.16,
            currency: t.currency || 'MXN',
          };
          console.log('[PDF] Plantilla personalizada cargada:', template.companyName);
        }
      } catch (e) {
        console.log('[PDF] Sin plantilla personalizada, usando default');
      }

      // 2. Capturar snapshot del render 3D
      let sceneSnapshot: string | undefined;
      try {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          sceneSnapshot = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.85);
          console.log('[PDF] Snapshot 3D capturado');
        }
      } catch { /* Sin snapshot */ }

      // 3. Convertir items de la cotización a formato PDF
      const pdfItems: PDFLineItem[] = currentQuote.items.map((item: any) => ({
        name: item.name || 'Producto',
        sku: item.sku || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice ?? null,
        subtotal: item.subtotal ?? null,
        hasPrice: item.hasPrice ?? false,
      }));

      console.log('[PDF] Generando PDF con', pdfItems.length, 'partidas');

      // 4. Datos del proyecto
      const projectData = {
        projectName: project.name || 'Proyecto XLayout',
        projectCode: project.projectCode || '',
        clientName: project.clientName || '',
        clientCompany: project.clientCompany || '',
        contactEmail: project.contactEmail || '',
        contactPhone: project.contactPhone || '',
      };

      // 5. Generar y descargar PDF
      await generateQuotePDF({
        template,
        items: pdfItems,
        project: projectData,
        sceneSnapshot,
      });

      console.log('[PDF] ✅ PDF generado exitosamente');

    } catch (err) {
      console.error('[PDF] ❌ Error al generar PDF:', err);
      alert('Error al generar la cotización PDF. Revisa la consola para más detalles.');
    } finally {
      setIsGenerating(false);
    }
  }, [currentQuote, project]);

  return (
    <button
      onClick={handleGeneratePDF}
      disabled={isGenerating || currentQuote.items.length === 0}
      className="w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
      style={{
        background: 'linear-gradient(135deg, #059669, #10b981)',
        color: 'white',
        cursor: currentQuote.items.length === 0 ? 'not-allowed' : 'pointer',
        boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
      }}
    >
      {isGenerating ? (
        <>
          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          Generando PDF...
        </>
      ) : (
        <>
          <span className="text-xs">📄</span>
          Generar Cotización PDF
        </>
      )}
    </button>
  );
};
