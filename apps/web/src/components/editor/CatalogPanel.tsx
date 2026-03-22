/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';
import { useVirtualizer } from '@tanstack/react-virtual';

const getIcon = (sku: string) => {
  if (sku.startsWith('DK')) return '🖥️';
  if (sku.startsWith('CH')) return '💺';
  if (sku.startsWith('CB')) return '🗄️';
  if (sku.startsWith('SF')) return '📚';
  return '📦';
};

// ─── Tarjeta de Producto (ProductCard) ───
const ProductCard: React.FC<{ product: any; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const projectState = useEditorStore((s) => s.project);
  
  const activePriceType = (projectState as any).priceType || 'A';
  const activePrice = product.pricesMap ? product.pricesMap[activePriceType] : null;

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    const finalProduct = { ...product, price: activePrice };
    insertProduct(finalProduct, tenantId);
    setActiveTool('select');
  };

  return (
    <div className="group relative flex flex-col p-2 bg-white rounded-xl border border-zinc-200 hover:border-blue-500 transition-all cursor-pointer overflow-hidden isolate h-full" onClick={handleInsert}>
      <div className="absolute inset-0 bg-blue-900/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center p-4">
         <button onClick={handleInsert} className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 w-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 rounded py-2 text-[9px] font-black uppercase tracking-wider hover:bg-blue-500 active:scale-95 pointer-events-auto">
           Agregar al Plano
         </button>
      </div>

      <div className="aspect-square w-full rounded-lg mb-2 flex flex-col items-center justify-center bg-zinc-50 border border-zinc-100/50 overflow-hidden relative group-hover:scale-95 transition-transform duration-300">
        {product.thumbnail ? (
           <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-2 mix-blend-multiply" />
        ) : (
           <span className="text-2xl grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">{getIcon(product.sku)}</span>
        )}
        
        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded border border-zinc-200 text-[6px] font-mono font-bold text-zinc-600 shadow-sm z-0">
          {product.width}×{product.depth}m
        </div>
      </div>
      
      <span className="text-[9px] font-black text-zinc-800 uppercase tracking-tighter truncate leading-tight relative z-0">
        {product.name}
      </span>
      <div className="flex justify-between items-center mt-1 relative z-0">
        <span className="text-[7.5px] font-mono text-zinc-400">{product.sku}</span>
        {product.hasPriceAccess && activePrice != null && (
          <span className="text-[8px] font-black text-emerald-600">
            ${activePrice.toLocaleString()} {product.currency}
          </span>
        )}
      </div>
    </div>
  );
};

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

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [tenants, selectedTenantId, selectedLineId, searchQuery, getFilteredProducts]
  );
  
  // React Virtual Setup
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(filteredProducts.length / 2),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180, // Approximate height of a row of cards
    overscan: 5,
  });

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const currentLines = selectedTenant?.lines || [];

  if (catalogPanelState === 'hidden') return null;
  const isCollapsed = catalogPanelState === 'collapsed';

  return (
    <aside 
      className={`absolute top-4 left-[72px] z-40 flex flex-col bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl ring-1 ring-zinc-900/5 transition-all duration-300 ease-in-out overflow-hidden
        ${isCollapsed ? 'w-12 h-12 justify-center items-center cursor-pointer hover:bg-zinc-50' : 'w-72 bottom-4'}`}
    >
      {isCollapsed ? (
        <div onClick={() => setCatalogPanelState('open')} className="w-full h-full flex items-center justify-center text-zinc-600 hover:text-blue-600" title="Expandir Catálogo">
          <span className="text-xl">📦</span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200/50 bg-white/50 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-800">Catálogo</span>
            <button onClick={() => setCatalogPanelState('collapsed')} className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-800 transition-colors" title="Contraer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex border-b border-zinc-200/50 bg-zinc-50/50 p-1 shrink-0 overflow-x-auto custom-scrollbar">
            <button onClick={() => setActiveTab('mobiliario')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'mobiliario' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Mobiliario</button>
            <button onClick={() => setActiveTab('estructura')} className={`flex-1 py-1.5 px-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-md whitespace-nowrap ${activeTab === 'estructura' ? 'text-zinc-900 bg-white border border-zinc-200 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}>Estructuras</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white flex flex-col relative" ref={scrollRef}>
            
            {/* Loader Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {activeTab === 'mobiliario' && (
              <>
                {/* STICKY HEADER ZONE: Contextual Navigation */}
                <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-zinc-200/60 shadow-sm">
                  
                  {/* NIVEL 1: Selector Horizontal de Marcas (Chips) */}
                  <div className="flex overflow-x-auto no-scrollbar gap-2 px-4 py-3 bg-zinc-50/50">
                    {tenants.map(t => (
                      <button 
                        key={t.tenantId}
                        onClick={() => setSelectedTenant(t.tenantId)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 transition-all ${
                          selectedTenantId === t.tenantId 
                            ? 'bg-zinc-900 text-white shadow-md' 
                            : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-400'
                        }`}
                      >
                        {t.tenantName}
                      </button>
                    ))}
                  </div>

                  {/* NIVEL 2: Colecciones de la Marca Activa (Tabs fluidos) */}
                  {selectedTenantId && currentLines.length > 0 && (
                    <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 pt-3 pb-0 bg-white">
                      {currentLines.map(l => (
                        <button
                          key={l.lineId}
                          onClick={() => setSelectedLine(l.lineId)}
                          className={`pb-2 text-[9px] font-black uppercase tracking-widest shrink-0 border-b-2 transition-all ${
                            selectedLineId === l.lineId
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-200'
                          }`}
                        >
                          {l.lineName}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Búsqueda Integrada al Contexto */}
                  <div className="px-4 py-3 bg-white">
                    <div className="relative group">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          setSearchQuery(e.target.value);
                        }}
                        placeholder="Buscar en esta colección..."
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2 px-3 pl-8 text-[10px] font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-zinc-400 tracking-wider transition-all"
                      />
                      <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {searchInput && (
                        <button onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-2.5 top-2 w-3.5 h-3.5 text-zinc-400 hover:text-zinc-700 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200">
                          <span className="text-[7px] font-black">✕</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* NIVEL 3: CUADRÍCULA DE PRODUCTOS (VIRTUALIZADA) */}
                <div className="flex-1 p-4 pb-12">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3 mb-4">
                    PRODUCTOS <div className="h-px flex-1 bg-zinc-200"></div>
                  </h3>
                  
                  {filteredProducts.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl opacity-40 bg-zinc-50/50 p-4 text-center">
                      <span className="text-2xl mb-2">📁</span>
                      <p className="text-[9px] font-black uppercase tracking-widest">Sin productos</p>
                    </div>
                  ) : (
                    <div 
                      style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item1 = filteredProducts[virtualRow.index * 2];
                        const item2 = filteredProducts[virtualRow.index * 2 + 1];

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
                            className="grid grid-cols-2 gap-2 pb-2"
                          >
                            {item1 && <ProductCard product={item1} tenantId={(item1 as any)._tenant?.id || selectedTenantId || ''} />}
                            {item2 && <ProductCard product={item2} tenantId={(item2 as any)._tenant?.id || selectedTenantId || ''} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'estructura' && (
              <section className="space-y-4 p-4">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                  COMPONENTES ARQUITECTÓNICOS <div className="h-px flex-1 bg-zinc-200"></div>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { type: 'door' as const,    icon: '🚪', label: 'Puerta',  desc: '0.90m' },
                    { type: 'window' as const,  icon: '🪟', label: 'Ventana', desc: '1.20m' },
                    { type: 'opening' as const, icon: '🔲', label: 'Hueco',   desc: 'Vano Abierto' },
                  ]).map(asset => (
                    <button
                      key={asset.type}
                      onClick={() => setPendingOpeningType(asset.type)}
                      className={`flex flex-col items-center p-4 rounded-xl border transition-all active:scale-95 ${
                        pendingOpeningType === asset.type
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20'
                          : 'bg-zinc-50 border-zinc-200 hover:border-blue-400 hover:shadow-lg hover:bg-white'
                      }`}
                    >
                      <span className={`text-3xl mb-1.5 ${pendingOpeningType === asset.type ? '' : 'grayscale opacity-80'}`}>{asset.icon}</span>
                      <span className={`text-[9px] font-black uppercase tracking-wide ${pendingOpeningType === asset.type ? 'text-white' : 'text-zinc-800'}`}>{asset.label}</span>
                      <span className={`text-[7px] font-mono mt-1 ${pendingOpeningType === asset.type ? 'text-blue-200' : 'text-zinc-400'}`}>{asset.desc}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            
          </div>
        </>
      )}
    </aside>
  );
};
