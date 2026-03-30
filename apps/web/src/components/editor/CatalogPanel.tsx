/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';
import { useVirtualizer } from '@tanstack/react-virtual';

/* ─── Ícono por SKU ─── */
const getIcon = (sku: string) => {
  if (sku.startsWith('DK')) return '🖥️';
  if (sku.startsWith('CH')) return '💺';
  if (sku.startsWith('CB')) return '🗄️';
  if (sku.startsWith('SF')) return '📚';
  return '📦';
};

/* ─── Tarjeta de Producto (dark, compacta) ─── */
const ProductCard: React.FC<{ product: any; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const projectState = useEditorStore((s) => s.project);
  
  const activePriceType = (projectState as any).priceType || 'A';
  const activePrice = product.pricesMap ? product.pricesMap[activePriceType] : null;

  /* Insertar y cerrar catálogo automáticamente */
  const handleInsert = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const finalProduct = { ...product, price: activePrice };
    insertProduct(finalProduct, tenantId);
    setActiveTool('select');
    setCatalogPanelState('hidden');
  }, [product, activePrice, tenantId, insertProduct, setActiveTool, setCatalogPanelState]);

  return (
    <div
      className="group relative flex flex-col p-2 rounded-[var(--xo-radius-md)] cursor-pointer overflow-hidden isolate h-full transition-all"
      style={{
        background: 'var(--xo-surface-hover)',
        border: '1px solid var(--xo-border)',
      }}
      onClick={handleInsert}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
        e.currentTarget.style.boxShadow = 'var(--xo-shadow-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--xo-border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Overlay de inserción */}
      <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center p-3">
        <button
          onClick={handleInsert}
          className="translate-y-2 group-hover:translate-y-0 transition-all duration-200 w-full rounded-[var(--xo-radius-sm)] py-1.5 pointer-events-auto"
          style={{
            background: 'var(--xo-primary)',
            color: 'var(--xo-text)',
            fontSize: 'var(--xo-text-xs)',
            fontWeight: 800,
            letterSpacing: 'var(--xo-tracking-wide)',
            textTransform: 'uppercase' as const,
            boxShadow: 'var(--xo-shadow-md)',
          }}
        >
          Insertar
        </button>
      </div>

      {/* Thumbnail */}
      <div
        className="aspect-square w-full rounded-[var(--xo-radius-sm)] mb-2 flex flex-col items-center justify-center overflow-hidden relative group-hover:scale-95 transition-transform duration-200"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--xo-border-subtle)' }}
      >
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-2" style={{ filter: 'brightness(0.95)' }} />
        ) : (
          <span className="text-2xl grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-200">
            {getIcon(product.sku)}
          </span>
        )}
        <div
          className="absolute bottom-1 right-1 px-1 py-0.5 rounded"
          style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'var(--xo-blur-light)',
            fontSize: '6px',
            fontFamily: 'var(--xo-font-mono)',
            fontWeight: 700,
            color: 'var(--xo-text-muted)',
          }}
        >
          {product.width}×{product.depth}m
        </div>
      </div>
      
      {/* Info */}
      <span
        className="truncate leading-tight relative z-0 uppercase"
        style={{ fontSize: 'var(--xo-text-xs)', fontWeight: 800, color: 'var(--xo-text-secondary)', letterSpacing: 'var(--xo-tracking-tight)' }}
      >
        {product.name}
      </span>
      <div className="flex justify-between items-center mt-0.5 relative z-0">
        <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
          {product.sku}
        </span>
        {product.hasPriceAccess && activePrice != null && (
          <span style={{ fontSize: 'var(--xo-text-2xs)', fontWeight: 800, color: 'var(--xo-success)' }}>
            ${activePrice.toLocaleString()} {product.currency}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── Panel de Catálogo (Overlay con navegación lateral) ─── */
export const CatalogPanel: React.FC = () => {
  const {
    tenants,
    selectedTenantId,
    selectedLineId,
    isLoading,
    searchQuery,
    loadCatalog,
    setSelectedTenant,
    setSelectedLine,
    setSearchQuery,
    getFilteredProducts,
  } = useCatalogStore();

  const catalogPanelState = useEditorStore((s) => s.catalogPanelState);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const pendingOpeningType = useEditorStore((s) => s.pendingOpeningType);
  const setPendingOpeningType = useEditorStore((s) => s.setPendingOpeningType);
  
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [activeTab, setActiveTab] = useState<'mobiliario' | 'estructura'>('mobiliario');
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  /* Auto-focus en búsqueda al abrir */
  useEffect(() => {
    if (catalogPanelState === 'open') {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [catalogPanelState]);

  /* Atajo de teclado: Tab para toggle */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setCatalogPanelState(catalogPanelState === 'open' ? 'hidden' : 'open');
      }
      /* Escape cierra */
      if (e.key === 'Escape' && catalogPanelState === 'open') {
        e.preventDefault();
        setCatalogPanelState('hidden');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [catalogPanelState, setCatalogPanelState]);

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [tenants, selectedTenantId, selectedLineId, searchQuery, getFilteredProducts]
  );
  
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredProducts.length / 3),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 5,
  });

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const currentLines = selectedTenant?.lines || [];

  /* Contadores por marca */
  const getTenantProductCount = useCallback((tenantId: string) => {
    const tenant = tenants.find(t => t.tenantId === tenantId);
    if (!tenant) return 0;
    return tenant.lines.reduce((sum, l) => sum + l.products.length, 0);
  }, [tenants]);

  if (catalogPanelState === 'hidden') return null;

  return (
    <>
      {/* Backdrop oscuro */}
      <div
        className="fixed inset-0 z-[998] transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)' }}
        onClick={() => setCatalogPanelState('hidden')}
      />

      {/* Overlay centrado del catálogo — Layout de 2 columnas */}
      <div
        className="fixed z-[999] flex overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(900px, 92vw)',
          height: 'min(680px, 82vh)',
          background: 'var(--xo-surface-elevated)',
          backdropFilter: 'var(--xo-blur)',
          WebkitBackdropFilter: 'var(--xo-blur)',
          borderRadius: 'var(--xo-radius-xl)',
          border: '1px solid var(--xo-border-hover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: 'catalogOverlayIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ════ COLUMNA IZQUIERDA: Navegación (Marcas + Líneas) ════ */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: '220px',
            borderRight: '1px solid var(--xo-border)',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          {/* Cabecera del sidebar */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--xo-border)' }}
          >
            <span
              className="uppercase flex items-center gap-2"
              style={{ fontSize: 'var(--xo-text-sm)', fontWeight: 800, letterSpacing: 'var(--xo-tracking-ultra)', color: 'var(--xo-text-secondary)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" style={{ color: 'var(--xo-primary)' }}>
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Catálogo
            </span>
          </div>

          {/* Tabs: Mobiliario | Estructura */}
          <div className="flex p-1 shrink-0" style={{ borderBottom: '1px solid var(--xo-border)', background: 'rgba(0,0,0,0.15)' }}>
            {(['mobiliario', 'estructura'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 px-2 uppercase whitespace-nowrap transition-all"
                style={{
                  fontSize: 'var(--xo-text-xs)',
                  fontWeight: 800,
                  letterSpacing: 'var(--xo-tracking-ultra)',
                  borderRadius: 'var(--xo-radius-sm)',
                  background: activeTab === tab ? 'var(--xo-surface-hover)' : 'transparent',
                  color: activeTab === tab ? 'var(--xo-text)' : 'var(--xo-text-dim)',
                  border: activeTab === tab ? '1px solid var(--xo-border-hover)' : '1px solid transparent',
                }}
              >
                {tab === 'mobiliario' ? '🪑 Mobiliario' : '🧱 Estructura'}
              </button>
            ))}
          </div>

          {/* Lista de Marcas y Líneas (scrollable) */}
          {activeTab === 'mobiliario' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
              {tenants.map(tenant => (
                <div key={tenant.tenantId} className="mb-1">
                  {/* Marca */}
                  <button
                    onClick={() => setSelectedTenant(tenant.tenantId)}
                    className="w-full flex items-center justify-between px-4 py-2 text-left transition-all"
                    style={{
                      background: selectedTenantId === tenant.tenantId ? 'var(--xo-primary-muted)' : 'transparent',
                      borderLeft: selectedTenantId === tenant.tenantId ? '3px solid var(--xo-primary)' : '3px solid transparent',
                    }}
                  >
                    <span
                      className="uppercase truncate"
                      style={{
                        fontSize: 'var(--xo-text-xs)',
                        fontWeight: 800,
                        letterSpacing: 'var(--xo-tracking-ultra)',
                        color: selectedTenantId === tenant.tenantId ? 'var(--xo-primary)' : 'var(--xo-text-muted)',
                      }}
                    >
                      {tenant.tenantName}
                    </span>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        fontSize: '8px',
                        fontWeight: 800,
                        fontFamily: 'var(--xo-font-mono)',
                        background: selectedTenantId === tenant.tenantId ? 'var(--xo-primary)' : 'var(--xo-surface-active)',
                        color: selectedTenantId === tenant.tenantId ? 'white' : 'var(--xo-text-ghost)',
                      }}
                    >
                      {getTenantProductCount(tenant.tenantId)}
                    </span>
                  </button>

                  {/* Líneas (solo expandido para marca activa) */}
                  {selectedTenantId === tenant.tenantId && tenant.lines.length > 0 && (
                    <div className="pl-4 py-1">
                      {tenant.lines.map(line => (
                        <button
                          key={line.lineId}
                          onClick={() => setSelectedLine(line.lineId)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[var(--xo-radius-sm)] text-left transition-all mb-0.5"
                          style={{
                            background: selectedLineId === line.lineId ? 'var(--xo-surface-hover)' : 'transparent',
                            borderLeft: selectedLineId === line.lineId ? '2px solid var(--xo-primary)' : '2px solid transparent',
                          }}
                        >
                          <span
                            className="truncate"
                            style={{
                              fontSize: '10px',
                              fontWeight: selectedLineId === line.lineId ? 800 : 600,
                              color: selectedLineId === line.lineId ? 'var(--xo-text)' : 'var(--xo-text-dim)',
                              letterSpacing: 'var(--xo-tracking-normal)',
                            }}
                          >
                            {line.lineName}
                          </span>
                          <span
                            style={{
                              fontSize: '8px',
                              fontFamily: 'var(--xo-font-mono)',
                              color: 'var(--xo-text-ghost)',
                            }}
                          >
                            {line.products.length}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {tenants.length === 0 && !isLoading && (
                <div className="px-4 py-8 text-center">
                  <span style={{ fontSize: 'var(--xo-text-xs)', color: 'var(--xo-text-ghost)', fontWeight: 600 }}>
                    Sin marcas disponibles
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estructura: lista de componentes */}
          {activeTab === 'estructura' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {([
                { type: 'door' as const, icon: '🚪', label: 'Puerta', desc: '0.90m' },
                { type: 'window' as const, icon: '🪟', label: 'Ventana', desc: '1.20m' },
                { type: 'opening' as const, icon: '🔲', label: 'Hueco', desc: 'Vano' },
              ]).map(asset => (
                <button
                  key={asset.type}
                  onClick={() => { setPendingOpeningType(asset.type); setCatalogPanelState('hidden'); }}
                  className="w-full flex items-center gap-3 p-3 transition-all active:scale-95 text-left"
                  style={{
                    borderRadius: 'var(--xo-radius-md)',
                    background: pendingOpeningType === asset.type ? 'var(--xo-primary)' : 'var(--xo-surface-hover)',
                    border: `1px solid ${pendingOpeningType === asset.type ? 'var(--xo-primary)' : 'var(--xo-border)'}`,
                    color: pendingOpeningType === asset.type ? 'var(--xo-text)' : 'var(--xo-text-secondary)',
                  }}
                >
                  <span className={`text-xl ${pendingOpeningType === asset.type ? '' : 'grayscale opacity-60'}`}>{asset.icon}</span>
                  <div className="flex flex-col">
                    <span style={{ fontSize: 'var(--xo-text-xs)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 'var(--xo-tracking-wide)' }}>{asset.label}</span>
                    <span style={{ fontSize: '8px', fontFamily: 'var(--xo-font-mono)', color: pendingOpeningType === asset.type ? 'rgba(255,255,255,0.6)' : 'var(--xo-text-ghost)', marginTop: '2px' }}>{asset.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ════ COLUMNA DERECHA: Contenido (búsqueda + grid de productos) ════ */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Barra superior: Búsqueda + Breadcrumb + Cerrar */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--xo-border)' }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 shrink-0">
              {selectedTenant && (
                <>
                  <span style={{ fontSize: 'var(--xo-text-2xs)', fontWeight: 800, color: 'var(--xo-primary)', textTransform: 'uppercase', letterSpacing: 'var(--xo-tracking-wide)' }}>
                    {selectedTenant.tenantName}
                  </span>
                  {selectedLineId && currentLines.find(l => l.lineId === selectedLineId) && (
                    <>
                      <span style={{ fontSize: '8px', color: 'var(--xo-text-ghost)' }}>›</span>
                      <span style={{ fontSize: 'var(--xo-text-2xs)', fontWeight: 700, color: 'var(--xo-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--xo-tracking-normal)' }}>
                        {currentLines.find(l => l.lineId === selectedLineId)?.lineName}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Búsqueda global */}
            <div className="flex-1 relative group">
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchQuery(e.target.value);
                }}
                placeholder="Buscar producto por nombre o SKU…"
                className="w-full py-1.5 px-3 pl-8 outline-none transition-all"
                style={{
                  background: 'var(--xo-surface-hover)',
                  border: '1px solid var(--xo-border)',
                  borderRadius: 'var(--xo-radius-md)',
                  fontSize: 'var(--xo-text-sm)',
                  fontWeight: 600,
                  color: 'var(--xo-text-secondary)',
                  fontFamily: 'var(--xo-font)',
                  letterSpacing: 'var(--xo-tracking-normal)',
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 transition-colors" style={{ color: 'var(--xo-text-ghost)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchInput && (
                <button
                  onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                  className="absolute right-2 top-1.5 w-5 h-5 flex items-center justify-center rounded-full transition-colors"
                  style={{ background: 'var(--xo-surface-active)', color: 'var(--xo-text-muted)', fontSize: '8px', fontWeight: 900 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Contador de resultados */}
            <span
              className="shrink-0"
              style={{
                fontSize: '9px',
                fontWeight: 800,
                fontFamily: 'var(--xo-font-mono)',
                color: 'var(--xo-text-ghost)',
                textTransform: 'uppercase',
              }}
            >
              {filteredProducts.length} productos
            </span>

            {/* Botón cerrar */}
            <button
              onClick={() => setCatalogPanelState('hidden')}
              className="w-7 h-7 flex items-center justify-center rounded-[var(--xo-radius-sm)] transition-colors shrink-0"
              style={{ color: 'var(--xo-text-dim)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--xo-surface-hover)'; e.currentTarget.style.color = 'var(--xo-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--xo-text-dim)'; }}
              title="Cerrar — Esc"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Grid de productos */}
          <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={scrollRef}>
            {/* Loader */}
            {isLoading && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center" style={{ background: 'rgba(14, 14, 16, 0.7)', backdropFilter: 'var(--xo-blur-light)' }}>
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--xo-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}

            {activeTab === 'mobiliario' && (
              <div className="p-4">
                {filteredProducts.length === 0 ? (
                  <div
                    className="h-40 flex flex-col items-center justify-center p-6 text-center"
                    style={{
                      border: '2px dashed var(--xo-border)',
                      borderRadius: 'var(--xo-radius-lg)',
                      background: 'rgba(0,0,0,0.1)',
                    }}
                  >
                    <span className="text-3xl mb-2 opacity-20">📁</span>
                    <p style={{ fontSize: 'var(--xo-text-xs)', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: 'var(--xo-tracking-ultra)' }}>
                      {searchInput ? 'Sin resultados' : 'Sin productos en esta línea'}
                    </p>
                    {searchInput && (
                      <p style={{ fontSize: '9px', color: 'var(--xo-text-ghost)', marginTop: '4px' }}>
                        Intenta con otro término o cambia de línea
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item1 = filteredProducts[virtualRow.index * 3];
                      const item2 = filteredProducts[virtualRow.index * 3 + 1];
                      const item3 = filteredProducts[virtualRow.index * 3 + 2];

                      return (
                        <div
                          key={virtualRow.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualRow.size}px`,
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className="grid grid-cols-3 gap-3 pb-3"
                        >
                          {item1 && <ProductCard product={item1} tenantId={(item1 as any)._tenant?.id || selectedTenantId || ''} />}
                          {item2 && <ProductCard product={item2} tenantId={(item2 as any)._tenant?.id || selectedTenantId || ''} />}
                          {item3 && <ProductCard product={item3} tenantId={(item3 as any)._tenant?.id || selectedTenantId || ''} />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'estructura' && (
              <div className="p-6 flex flex-col items-center justify-center h-full">
                <span className="text-4xl mb-3 opacity-20">🏗️</span>
                <p style={{ fontSize: 'var(--xo-text-sm)', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: 'var(--xo-tracking-ultra)' }}>
                  Selecciona un componente estructural del panel izquierdo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
