/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';

/* ─── Tarjeta compacta de producto (modo grid) ─── */
const ProductCardGrid: React.FC<{ product: any; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const projectState = useEditorStore((s) => s.project);

  const activePriceType = (projectState as any).priceType || 'A';
  const activePrice = product.pricesMap ? product.pricesMap[activePriceType] : null;

  const handleInsert = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    insertProduct({ ...product, price: activePrice }, tenantId);
    setActiveTool('select');
    setCatalogPanelState('hidden');
  }, [product, activePrice, tenantId, insertProduct, setActiveTool, setCatalogPanelState]);

  const dims = `${product.width}×${product.depth}×${product.height}m`;

  return (
    <div
      className="group relative flex flex-col rounded-lg cursor-pointer overflow-hidden isolate transition-all duration-150"
      style={{
        background: 'var(--xo-surface-hover)',
        border: '1px solid var(--xo-border)',
      }}
      onClick={handleInsert}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(99, 102, 241, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--xo-border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Thumbnail compacto */}
      <div
        className="w-full flex items-center justify-center overflow-hidden relative"
        style={{ height: '90px', background: 'rgba(255,255,255,0.03)' }}
      >
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-2" style={{ filter: 'brightness(0.95)' }} />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-30 group-hover:opacity-60 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
        )}

        {/* Badge de dimensiones */}
        <div
          className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded"
          style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            fontSize: '7px',
            fontFamily: 'var(--xo-font-mono)',
            fontWeight: 700,
            color: 'var(--xo-text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          {dims}
        </div>

        {/* Botón de insertar flotante */}
        <div className="absolute inset-0 bg-indigo-600/15 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center">
          <span
            className="px-3 py-1 rounded-md translate-y-1 group-hover:translate-y-0 transition-transform duration-150"
            style={{
              background: 'var(--xo-primary)',
              color: 'white',
              fontSize: '8px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
            }}
          >
            + Insertar
          </span>
        </div>
      </div>

      {/* Info del producto */}
      <div className="p-2 flex flex-col gap-0.5">
        <span
          className="truncate leading-tight uppercase"
          style={{ fontSize: '9px', fontWeight: 800, color: 'var(--xo-text-secondary)', letterSpacing: '0.02em' }}
          title={product.name}
        >
          {product.name}
        </span>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
              {product.sku}
            </span>
            {product.variants && product.variants.length > 0 && (
              <span
                className="shrink-0 px-1 py-0.5 rounded"
                style={{ fontSize: '6px', fontWeight: 800, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--xo-primary)', fontFamily: 'var(--xo-font-mono)' }}
              >
                {product.variants.length} var
              </span>
            )}
          </div>
          {product.hasPriceAccess && activePrice != null && (
            <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--xo-font-mono)' }}>
              ${activePrice.toLocaleString()}
            </span>
          )}
        </div>
        {/* Línea / marca (en búsqueda global) */}
        {product._line && (
          <span style={{ fontSize: '6.5px', color: 'var(--xo-text-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {product._line.name}
          </span>
        )}
      </div>
    </div>
  );
};


/* ─── Fila de producto con árbol de variantes (modo lista) ─── */
const ProductTreeRow: React.FC<{ product: any; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const projectState = useEditorStore((s) => s.project);
  const [expanded, setExpanded] = useState(false);

  const activePriceType = (projectState as any).priceType || 'A';
  const activePrice = product.pricesMap ? product.pricesMap[activePriceType] : null;
  const variants = product.variants || [];
  const hasVariants = variants.length > 0;

  const handleInsert = useCallback((e: React.MouseEvent, overrideProduct?: any) => {
    e.stopPropagation();
    const target = overrideProduct || product;
    const price = target.pricesMap ? target.pricesMap[activePriceType] : activePrice;
    insertProduct({ ...product, ...target, price }, tenantId);
    setActiveTool('select');
    setCatalogPanelState('hidden');
  }, [product, activePrice, activePriceType, tenantId, insertProduct, setActiveTool, setCatalogPanelState]);

  /** Traduce tipo de variante a etiqueta legible */
  const variantTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      color: '🎨 Color', texture: '🧵 Textura', material: '🪨 Material',
      finish: '✨ Acabado', size: '📐 Medida', config: '⚙️ Config',
    };
    return labels[type] || type;
  };

  return (
    <div>
      {/* ── Fila del producto base ── */}
      <div
        className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-all duration-100"
        style={{ background: 'transparent', borderBottom: '1px solid var(--xo-border)' }}
        onClick={(e) => hasVariants ? setExpanded(!expanded) : handleInsert(e)}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--xo-surface-hover)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Chevron para expandir variantes */}
        <div className="w-4 shrink-0 flex items-center justify-center">
          {hasVariants ? (
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              className="w-3 h-3 transition-transform duration-150"
              style={{
                color: expanded ? 'var(--xo-primary)' : 'var(--xo-text-ghost)',
                transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          ) : (
            <span className="w-1 h-1 rounded-full" style={{ background: 'var(--xo-text-ghost)' }}></span>
          )}
        </div>

        {/* Miniatura */}
        <div
          className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--xo-border-subtle)' }}
        >
          {product.thumbnail ? (
            <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-1" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 opacity-30">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
          )}
        </div>

        {/* Nombre, SKU y conteo de variantes */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate uppercase" style={{ fontSize: '9px', fontWeight: 800, color: 'var(--xo-text-secondary)', letterSpacing: '0.02em' }}>
              {product.name}
            </span>
            {hasVariants && (
              <span
                className="shrink-0 px-1.5 py-0.5 rounded-full"
                style={{ fontSize: '7px', fontWeight: 800, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--xo-primary)', fontFamily: 'var(--xo-font-mono)' }}
              >
                {variants.length} var
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
              {product.sku}
            </span>
            {product._line && (
              <span style={{ fontSize: '7px', color: 'var(--xo-text-ghost)', fontWeight: 600 }}>
                • {product._line.name}
              </span>
            )}
          </div>
        </div>

        {/* Dimensiones */}
        <span className="shrink-0" style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
          {product.width}×{product.depth}×{product.height}
        </span>

        {/* Precio */}
        {product.hasPriceAccess && activePrice != null ? (
          <span className="shrink-0 w-16 text-right" style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--xo-font-mono)' }}>
            ${activePrice.toLocaleString()}
          </span>
        ) : (
          <span className="shrink-0 w-16 text-right" style={{ fontSize: '8px', color: 'var(--xo-text-ghost)' }}>—</span>
        )}

        {/* Botón insertar base */}
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 px-2 py-1 rounded transition-all duration-100"
          style={{ background: 'var(--xo-primary)', color: 'white', fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onClick={(e) => handleInsert(e)}
        >
          +
        </button>
      </div>

      {/* ── Variantes expandidas ── */}
      {expanded && hasVariants && (
        <div style={{ background: 'rgba(99, 102, 241, 0.03)', borderBottom: '1px solid var(--xo-border)' }}>
          {variants.map((variant: any) => {
            const vPrice = variant.pricesMap ? variant.pricesMap[activePriceType] : null;
            return (
              <div
                key={variant.variantId}
                className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-100"
                style={{ paddingLeft: '44px' }}
                onClick={(e) => handleInsert(e, { ...variant, productId: variant.variantId || product.productId })}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Indicador de rama del árbol */}
                <div className="flex items-center shrink-0" style={{ width: '16px' }}>
                  <div style={{ width: '8px', height: '1px', background: 'var(--xo-border-hover)' }}></div>
                  <div className="w-1 h-1 rounded-full" style={{ background: 'var(--xo-primary)' }}></div>
                </div>

                {/* Tipo de variante badge */}
                <span
                  className="shrink-0 px-1.5 py-0.5 rounded"
                  style={{
                    fontSize: '7px', fontWeight: 700,
                    background: 'rgba(255,255,255,0.05)', color: 'var(--xo-text-muted)',
                    border: '1px solid var(--xo-border)',
                  }}
                >
                  {variantTypeLabel(variant.variantType)}
                </span>

                {/* Nombre de la variante */}
                <span className="flex-1 min-w-0 truncate" style={{ fontSize: '8px', fontWeight: 700, color: 'var(--xo-text-secondary)' }}>
                  {variant.name}
                </span>

                {/* SKU */}
                <span className="shrink-0" style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
                  {variant.sku}
                </span>

                {/* Dimensiones (si difieren del padre) */}
                {(variant.width !== product.width || variant.depth !== product.depth || variant.height !== product.height) && (
                  <span className="shrink-0" style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
                    {variant.width}×{variant.depth}×{variant.height}
                  </span>
                )}

                {/* Precio de la variante */}
                {variant.hasPriceAccess && vPrice != null ? (
                  <span className="shrink-0 w-16 text-right" style={{ fontSize: '8px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--xo-font-mono)' }}>
                    ${vPrice.toLocaleString()}
                  </span>
                ) : (
                  <span className="shrink-0 w-16 text-right" style={{ fontSize: '7px', color: 'var(--xo-text-ghost)' }}>—</span>
                )}

                {/* Insertar variante */}
                <button
                  className="shrink-0 opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded transition-all duration-100"
                  style={{ background: 'var(--xo-primary)', color: 'white', fontSize: '7px', fontWeight: 800 }}
                  onClick={(e) => handleInsert(e, { ...variant, productId: variant.variantId || product.productId })}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─── Panel de Catálogo Profesional ─── */
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<any>(null);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // Auto-focus en búsqueda al abrir
  useEffect(() => {
    if (catalogPanelState === 'open') {
      setTimeout(() => searchRef.current?.focus(), 100);
    }
  }, [catalogPanelState]);

  // Atajos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        e.preventDefault();
        setCatalogPanelState(catalogPanelState === 'open' ? 'hidden' : 'open');
      }
      if (e.key === 'Escape' && catalogPanelState === 'open') {
        e.preventDefault();
        setCatalogPanelState('hidden');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [catalogPanelState, setCatalogPanelState]);

  // Búsqueda con debounce de 150ms para fluidez
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 150);
  }, [setSearchQuery]);

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [tenants, selectedTenantId, selectedLineId, searchQuery, getFilteredProducts]
  );

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const currentLines = selectedTenant?.lines || [];

  // Contadores
  const getTenantProductCount = useCallback((tenantId: string) => {
    const tenant = tenants.find(t => t.tenantId === tenantId);
    if (!tenant) return 0;
    return tenant.lines.reduce((sum, l) => sum + l.products.length, 0);
  }, [tenants]);

  const isSearchActive = searchInput.trim().length > 0;

  if (catalogPanelState === 'hidden') return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] transition-opacity duration-200"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={() => setCatalogPanelState('hidden')}
      />

      {/* Panel principal */}
      <div
        className="fixed z-[999] flex overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(960px, 94vw)',
          height: 'min(700px, 85vh)',
          background: 'var(--xo-surface-elevated)',
          backdropFilter: 'var(--xo-blur)',
          WebkitBackdropFilter: 'var(--xo-blur)',
          borderRadius: '16px',
          border: '1px solid var(--xo-border-hover)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)',
          animation: 'catalogOverlayIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ════ SIDEBAR IZQUIERDO ════ */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: '210px',
            borderRight: '1px solid var(--xo-border)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {/* Cabecera */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--xo-border)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" style={{ color: 'var(--xo-primary)' }}>
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="uppercase" style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--xo-text-secondary)' }}>
              Catálogo
            </span>
          </div>

          {/* Tabs */}
          <div className="flex p-1 shrink-0" style={{ borderBottom: '1px solid var(--xo-border)', background: 'rgba(0,0,0,0.15)' }}>
            {(['mobiliario', 'estructura'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-1.5 px-2 uppercase whitespace-nowrap transition-all"
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  borderRadius: '6px',
                  background: activeTab === tab ? 'var(--xo-surface-hover)' : 'transparent',
                  color: activeTab === tab ? 'var(--xo-text)' : 'var(--xo-text-dim)',
                  border: activeTab === tab ? '1px solid var(--xo-border-hover)' : '1px solid transparent',
                }}
              >
                {tab === 'mobiliario' ? '🪑 Mobiliario' : '🧱 Estructura'}
              </button>
            ))}
          </div>

          {/* Lista de Marcas y Líneas */}
          {activeTab === 'mobiliario' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
              {/* Opción "Todos" — muestra todos los productos del tenant */}
              {selectedTenant && selectedTenant.lines.length > 1 && (
                <button
                  onClick={() => setSelectedLine(null as any)}
                  className="w-full flex items-center justify-between px-4 py-1.5 text-left transition-all"
                  style={{
                    background: !selectedLineId ? 'var(--xo-surface-hover)' : 'transparent',
                    borderLeft: !selectedLineId ? '2px solid var(--xo-primary)' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '9px', fontWeight: 700, color: !selectedLineId ? 'var(--xo-primary)' : 'var(--xo-text-dim)' }}>
                    📋 Todos
                  </span>
                  <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
                    {getTenantProductCount(selectedTenantId || '')}
                  </span>
                </button>
              )}

              {tenants.map(tenant => (
                <div key={tenant.tenantId} className="mb-0.5">
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
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        color: selectedTenantId === tenant.tenantId ? 'var(--xo-primary)' : 'var(--xo-text-muted)',
                      }}
                    >
                      {tenant.tenantName}
                    </span>
                    <span
                      className="shrink-0 px-1.5 py-0.5 rounded-full"
                      style={{
                        fontSize: '7px',
                        fontWeight: 800,
                        fontFamily: 'var(--xo-font-mono)',
                        background: selectedTenantId === tenant.tenantId ? 'var(--xo-primary)' : 'var(--xo-surface-active)',
                        color: selectedTenantId === tenant.tenantId ? 'white' : 'var(--xo-text-ghost)',
                      }}
                    >
                      {getTenantProductCount(tenant.tenantId)}
                    </span>
                  </button>

                  {/* Líneas expandidas */}
                  {selectedTenantId === tenant.tenantId && tenant.lines.length > 0 && (
                    <div className="pl-3 py-0.5">
                      {tenant.lines.map(line => (
                        <button
                          key={line.lineId}
                          onClick={() => setSelectedLine(line.lineId)}
                          className="w-full flex items-center justify-between px-3 py-1.5 rounded text-left transition-all mb-0.5"
                          style={{
                            background: selectedLineId === line.lineId ? 'var(--xo-surface-hover)' : 'transparent',
                            borderLeft: selectedLineId === line.lineId ? '2px solid var(--xo-primary)' : '2px solid transparent',
                          }}
                        >
                          <span
                            className="truncate"
                            style={{
                              fontSize: '9px',
                              fontWeight: selectedLineId === line.lineId ? 800 : 600,
                              color: selectedLineId === line.lineId ? 'var(--xo-text)' : 'var(--xo-text-dim)',
                            }}
                          >
                            {line.lineName}
                          </span>
                          <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-ghost)' }}>
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
                  <span style={{ fontSize: '9px', color: 'var(--xo-text-ghost)', fontWeight: 600 }}>
                    Sin marcas disponibles
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Estructura */}
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
                    borderRadius: '8px',
                    background: pendingOpeningType === asset.type ? 'var(--xo-primary)' : 'var(--xo-surface-hover)',
                    border: `1px solid ${pendingOpeningType === asset.type ? 'var(--xo-primary)' : 'var(--xo-border)'}`,
                    color: pendingOpeningType === asset.type ? 'var(--xo-text)' : 'var(--xo-text-secondary)',
                  }}
                >
                  <span className={`text-xl ${pendingOpeningType === asset.type ? '' : 'grayscale opacity-60'}`}>{asset.icon}</span>
                  <div className="flex flex-col">
                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{asset.label}</span>
                    <span style={{ fontSize: '7px', fontFamily: 'var(--xo-font-mono)', color: pendingOpeningType === asset.type ? 'rgba(255,255,255,0.6)' : 'var(--xo-text-ghost)', marginTop: '1px' }}>{asset.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ════ CONTENIDO PRINCIPAL ════ */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Barra superior: Búsqueda + Controles */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 shrink-0"
            style={{ borderBottom: '1px solid var(--xo-border)', background: 'rgba(0,0,0,0.1)' }}
          >
            {/* Búsqueda global — campo grande y prominente */}
            <div className="flex-1 relative">
              <input
                ref={searchRef}
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Buscar en todo el catálogo…  ej: mesa, escritorio, gondola"
                className="w-full py-2 px-4 pl-9 outline-none transition-all"
                style={{
                  background: isSearchActive ? 'rgba(99, 102, 241, 0.08)' : 'var(--xo-surface-hover)',
                  border: isSearchActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--xo-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--xo-text)',
                  fontFamily: 'var(--xo-font)',
                }}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors" style={{ color: isSearchActive ? 'var(--xo-primary)' : 'var(--xo-text-ghost)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchInput && (
                <button
                  onClick={() => { handleSearchChange(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
                  style={{ background: 'var(--xo-surface-active)', color: 'var(--xo-text-muted)', fontSize: '10px', fontWeight: 900 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Toggle vista: Grid / Lista */}
            <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--xo-border)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="px-2 py-1.5 transition-all"
                style={{
                  background: viewMode === 'grid' ? 'var(--xo-primary)' : 'transparent',
                  color: viewMode === 'grid' ? 'white' : 'var(--xo-text-ghost)',
                }}
                title="Vista cuadrícula"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="px-2 py-1.5 transition-all"
                style={{
                  background: viewMode === 'list' ? 'var(--xo-primary)' : 'transparent',
                  color: viewMode === 'list' ? 'white' : 'var(--xo-text-ghost)',
                }}
                title="Vista lista"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>

            {/* Contador + info de contexto */}
            <div className="flex flex-col items-end shrink-0">
              <span style={{ fontSize: '10px', fontWeight: 800, fontFamily: 'var(--xo-font-mono)', color: 'var(--xo-text-muted)' }}>
                {filteredProducts.length}
              </span>
              <span style={{ fontSize: '7px', color: 'var(--xo-text-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {isSearchActive ? 'resultados' : 'productos'}
              </span>
            </div>

            {/* Cerrar */}
            <button
              onClick={() => setCatalogPanelState('hidden')}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0"
              style={{ color: 'var(--xo-text-dim)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--xo-surface-hover)'; e.currentTarget.style.color = 'var(--xo-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--xo-text-dim)'; }}
              title="Cerrar — Esc"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Indicador de búsqueda activa */}
          {isSearchActive && (
            <div className="px-4 py-1.5 flex items-center gap-2 shrink-0" style={{ background: 'rgba(99, 102, 241, 0.06)', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3" style={{ color: 'var(--xo-primary)' }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--xo-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Búsqueda global — mostrando resultados de todas las marcas y líneas
              </span>
            </div>
          )}

          {/* Contenido de productos */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoading && (
              <div className="absolute inset-0 z-40 flex flex-col items-center justify-center" style={{ background: 'rgba(14, 14, 16, 0.7)' }}>
                <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--xo-primary)', borderTopColor: 'transparent' }} />
              </div>
            )}

            {activeTab === 'mobiliario' && (
              <div className="p-3">
                {filteredProducts.length === 0 ? (
                  <div
                    className="py-16 flex flex-col items-center justify-center text-center"
                    style={{ borderRadius: '12px' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mb-3 opacity-15">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                      {searchInput ? 'Sin resultados' : 'Sin productos en esta categoría'}
                    </p>
                    {searchInput && (
                      <p style={{ fontSize: '9px', color: 'var(--xo-text-ghost)', marginTop: '6px', maxWidth: '250px' }}>
                        Intenta con palabras parciales. Ej: «mesa», «escrit», «negro»
                      </p>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  /* Vista Grid — 4 columnas compactas */
                  <div className="grid grid-cols-4 gap-2.5">
                    {filteredProducts.map((product: any) => (
                      <ProductCardGrid
                        key={product.productId}
                        product={product}
                        tenantId={product._tenant?.id || selectedTenantId || ''}
                      />
                    ))}
                  </div>
                ) : (
                  /* Vista Lista — filas con árbol de variantes */
                  <div className="flex flex-col">
                    {/* Cabecera de tabla */}
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-1" style={{ borderBottom: '1px solid var(--xo-border)' }}>
                      <span className="w-4 shrink-0"></span>
                      <span className="w-9 shrink-0" style={{ fontSize: '7px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em' }}></span>
                      <span className="flex-1" style={{ fontSize: '7px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Producto</span>
                      <span className="shrink-0" style={{ fontSize: '7px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Medidas</span>
                      <span className="shrink-0 w-16 text-right" style={{ fontSize: '7px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Precio</span>
                      <span className="shrink-0 w-6"></span>
                    </div>
                    {filteredProducts.map((product: any) => (
                      <ProductTreeRow
                        key={product.productId}
                        product={product}
                        tenantId={product._tenant?.id || selectedTenantId || ''}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'estructura' && (
              <div className="p-6 flex flex-col items-center justify-center h-full">
                <span className="text-4xl mb-3 opacity-20">🏗️</span>
                <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--xo-text-ghost)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Selecciona un componente del panel izquierdo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
