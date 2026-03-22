"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';

const getIcon = (sku: string) => {
  if (sku.startsWith('DK')) return '🖥️';
  if (sku.startsWith('CH')) return '💺';
  if (sku.startsWith('CB')) return '🗄️';
  if (sku.startsWith('SF')) return '📚';
  return '📦';
};

// ─── Custom Dropdown for Brands (Tenants) ───
const BrandDropdown: React.FC<{
  tenants: any[];
  selectedTenantId: string | null;
  onSelect: (id: string) => void;
}> = ({ tenants, selectedTenantId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const filteredTenants = tenants.filter(t => t.tenantName.toLowerCase().includes(filter.toLowerCase()));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white border border-zinc-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-zinc-800 hover:border-blue-400 focus:outline-none transition-all"
      >
        <span className="truncate">{selectedTenant ? selectedTenant.tenantName : 'Seleccionar Marca...'}</span>
        <svg className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-64">
          <div className="p-2 border-b border-zinc-100 bg-zinc-50/50">
            <input
              type="text"
              placeholder="Buscar marca..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-2 py-1.5 bg-white border border-zinc-200 rounded text-[9px] font-bold text-zinc-800 uppercase tracking-widest focus:outline-none focus:border-blue-500 placeholder:text-zinc-400"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1 scrollbar-thin">
            {filteredTenants.length === 0 ? (
              <div className="px-3 py-4 text-center text-[9px] font-black text-zinc-400 uppercase">Sin resultados</div>
            ) : (
              filteredTenants.map((t) => (
                <button
                  key={t.tenantId}
                  onClick={() => { onSelect(t.tenantId); setIsOpen(false); setFilter(''); }}
                  className={`w-full text-left px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded transition-colors ${
                    selectedTenantId === t.tenantId ? 'bg-blue-50 text-blue-700' : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {t.tenantName}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Lines Selector (Tabs / List) ───
const LineSelector: React.FC<{
  lines: any[];
  selectedLineId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ lines, selectedLineId, onSelect }) => {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border ${
          !selectedLineId ? 'bg-zinc-800 text-white border-zinc-800 shadow-sm' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
        }`}
      >
        Todas
      </button>
      {lines.map((l) => (
        <button
          key={l.lineId}
          onClick={() => onSelect(l.lineId)}
          className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-wider transition-all border truncate max-w-[100px] ${
            selectedLineId === l.lineId ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20' : 'bg-white text-zinc-500 border-zinc-200 hover:border-blue-400 hover:text-blue-600'
          }`}
          title={l.lineName}
        >
          {l.lineName}
        </button>
      ))}
    </div>
  );
};

// ─── Product Card ───
const ProductCard: React.FC<{ product: any; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const projectState = useEditorStore((s) => s.project);
  
  // Extract correct price based on project priceType (default 'A')
  const activePriceType = (projectState as any).priceType || 'A';
  const activePrice = product.pricesMap ? product.pricesMap[activePriceType] : null;

  const handleInsert = (e: React.MouseEvent) => {
    e.stopPropagation();
    const finalProduct = { ...product, price: activePrice };
    insertProduct(finalProduct, tenantId);
    setActiveTool('select');
  };

  return (
    <div className="group relative flex flex-col p-2 bg-white rounded-xl border border-zinc-200 hover:border-blue-500 transition-all cursor-pointer overflow-hidden isolate" onClick={handleInsert}>
      {/* Visual Overlay on Hover (Adding to Plan logic) */}
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
        
        {/* Dimension Badge */}
        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded border border-zinc-200 text-[6px] font-mono font-bold text-zinc-600 shadow-sm z-0">
          {product.width}×{product.depth}m
        </div>
      </div>
      
      {/* Contextual Badges (especially useful for global search where brands/lines mix) */}
      <div className="flex gap-1 mb-1 relative z-0">
        {product._tenant?.name && (
          <span className="truncate max-w-[60px] text-[6px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded">
            {product._tenant.name}
          </span>
        )}
        {product._line?.name && (
          <span className="truncate max-w-[60px] text-[6px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 px-1 py-0.5 rounded">
            {product._line.name}
          </span>
        )}
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

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [tenants, selectedTenantId, selectedLineId, searchQuery, getFilteredProducts]
  );

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const currentLines = selectedTenant?.lines || [];
  const selectedLine = currentLines.find(l => l.lineId === selectedLineId);

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

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-4 space-y-6 relative">
            
            {/* Loader Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Búsqueda Global */}
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                BÚSQUEDA <div className="h-px flex-1 bg-zinc-200"></div>
              </h3>
              <div className="relative group">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Buscar producto, modelo..."
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-2.5 px-3 pl-9 text-[10px] font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-zinc-400 tracking-wider transition-all"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchInput && (
                  <button onClick={() => { setSearchInput(''); setSearchQuery(''); }} className="absolute right-3 top-2.5 w-4 h-4 text-zinc-400 hover:text-zinc-700 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-200">
                    <span className="text-[8px] font-black">✕</span>
                  </button>
                )}
              </div>
            </section>

            {searchQuery ? (
              <section className="space-y-4">
                <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                  RESULTADOS ({filteredProducts.length}) <div className="h-px flex-1 bg-zinc-200"></div>
                </h3>
                {filteredProducts.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl opacity-40 bg-zinc-50/50 p-4 text-center">
                    <span className="text-2xl mb-2">🔍</span>
                    <p className="text-[9px] font-black uppercase tracking-widest">Sin coincidencias</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pb-4">
                    {filteredProducts.map((p) => (
                      <ProductCard key={p.productId} product={p} tenantId={(p as any)._tenant?.id || selectedTenantId || ''} />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {activeTab === 'mobiliario' && (
                  <>
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                        FABRICANTE <div className="h-px flex-1 bg-zinc-200"></div>
                      </h3>
                      <BrandDropdown tenants={tenants} selectedTenantId={selectedTenantId} onSelect={setSelectedTenant} />
                    </section>

                    {selectedTenantId && currentLines.length > 0 && (
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                          COLECCIÓN / LÍNEA <div className="h-px flex-1 bg-zinc-200"></div>
                        </h3>
                        {selectedLine && (
                          <div className="flex items-center text-[8px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded w-max">
                            <span className="text-zinc-400 mr-1">/</span> {selectedLine.lineName}
                          </div>
                        )}
                        <LineSelector lines={currentLines} selectedLineId={selectedLineId} onSelect={setSelectedLine} />
                      </section>
                    )}

                    <section className="space-y-4">
                      <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest flex items-center gap-3">
                        PRODUCTOS (MODELOS 3D) <div className="h-px flex-1 bg-zinc-200"></div>
                      </h3>
                      {filteredProducts.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center border-2 border-dashed border-zinc-100 rounded-2xl opacity-40 bg-zinc-50/50 p-4 text-center">
                          <span className="text-2xl mb-2">📁</span>
                          <p className="text-[9px] font-black uppercase tracking-widest">Carpeta Vacía</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pb-6">
                          {filteredProducts.map((p) => (
                            <ProductCard key={p.productId} product={p} tenantId={selectedTenantId!} />
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                )}

                {activeTab === 'estructura' && (
                  <section className="space-y-4">
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
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
};
