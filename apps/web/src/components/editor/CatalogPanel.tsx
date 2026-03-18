"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';

// ============================================================
// Category icons (Mapping to SKU prefixes for now)
// ============================================================
const getIcon = (sku: string) => {
  if (sku.startsWith('DK')) return '🖥️';
  if (sku.startsWith('CH')) return '💺';
  if (sku.startsWith('CB')) return '🗄️';
  if (sku.startsWith('SF')) return '📚';
  return '📦';
};

// ============================================================
// Brand Pill (Now Tenant Pill)
// ============================================================
const TenantPill: React.FC<{ tenant: { tenantId: string; tenantName: string }; active: boolean; onClick: () => void }> = ({ tenant, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
        : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 hover:text-blue-600'
    }`}
  >
    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
    {tenant.tenantName}
  </button>
);

// ============================================================
// Product Line Tab
// ============================================================
const LineTab: React.FC<{ label: string; active: boolean; count: number; onClick: () => void }> = ({ label, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
      active
        ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
    }`}
  >
    {label}
    <span className={`text-[7px] px-1 py-0.5 rounded-full font-mono ${active ? 'bg-indigo-100 text-indigo-600' : 'bg-zinc-100 text-zinc-400'}`}>
      {count}
    </span>
  </button>
);

// ============================================================
// Product Card
// ============================================================
const ProductCard: React.FC<{ product: Product; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const handleInsert = () => {
    insertProduct(product, tenantId);
    setActiveTool('select');
  };

  return (
    <div
      className="group flex flex-col p-2 bg-white rounded-xl border border-zinc-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer active:scale-95"
      onClick={handleInsert}
      title={`Insert ${product.name} — ${product.width}m × ${product.depth}m × ${product.height}m`}
    >
      <div
        className="aspect-square w-full rounded-lg mb-1.5 flex flex-col items-center justify-center gap-0.5 group-hover:scale-105 transition-transform bg-zinc-50"
      >
        {product.thumbnail ? (
           <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-1" />
        ) : (
           <span className="text-xl">{getIcon(product.sku)}</span>
        )}
        <span className="text-[6px] font-mono text-zinc-400">
          {product.width.toFixed(1)}×{product.depth.toFixed(1)}m
        </span>
      </div>
      <span className="text-[8px] font-black text-zinc-700 group-hover:text-blue-700 uppercase tracking-tighter truncate leading-tight">
        {product.name}
      </span>
      <span className="text-[7px] font-mono text-zinc-400">{product.sku}</span>
      {product.hasPriceAccess && product.price != null && (
        <span className="text-[7px] font-bold text-indigo-600 mt-0.5">
          ${product.price.toLocaleString()}
        </span>
      )}
    </div>
  );
};

// ============================================================
// CatalogPanel — Main Export
// ============================================================
export const CatalogPanel: React.FC = () => {
  const {
    tenants,
    selectedTenantId,
    selectedLineId,
    isLoading,
    loadCatalog,
    setSelectedTenant,
    setSelectedLine,
    setSearchQuery,
    getFilteredProducts,
  } = useCatalogStore();

  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const pendingOpeningType = useEditorStore((s) => s.pendingOpeningType);
  const setPendingOpeningType = useEditorStore((s) => s.setPendingOpeningType);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [tenants, selectedTenantId, selectedLineId, getFilteredProducts]
  );

  const selectedTenant = tenants.find(t => t.tenantId === selectedTenantId);
  const currentLines = selectedTenant?.lines || [];

  const handleSearch = (q: string) => {
    setSearchInput(q);
    setSearchQuery(q);
  };

  return (
    <aside className="w-60 flex flex-col border-r border-zinc-200 bg-white shrink-0 z-30 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Catálogo Live</span>
            <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-tighter leading-none">SaaS Inventory</h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded hidden sm:block">v2</span>
            <button
              onClick={() => setCatalogPanelState('collapsed')}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors text-sm font-bold"
            >
              ‹
            </button>
            <button
              onClick={() => setCatalogPanelState('hidden')}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ── Architecture Assets ── */}
      <div className="p-2 border-b border-zinc-200 bg-amber-50/40">
        <p className="text-[7.5px] font-black uppercase tracking-widest text-amber-700 mb-1.5 px-1">🏗️ Arquitectura</p>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { type: 'door' as const,    icon: '🚪', label: 'Puerta',  desc: '0.9×2.1m' },
            { type: 'window' as const,  icon: '🪟', label: 'Ventana', desc: '1.2×1.0m' },
            { type: 'opening' as const, icon: '🔲', label: 'Hueco',   desc: '1.0×2.1m' },
          ]).map(asset => (
            <button
              key={asset.type}
              onClick={() => setPendingOpeningType(asset.type)}
              className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer active:scale-95 ${
                pendingOpeningType === asset.type
                  ? 'bg-amber-100 border-amber-400 shadow-md ring-1 ring-amber-300'
                  : 'bg-white border-zinc-200 hover:border-amber-300 hover:shadow-sm'
              }`}
              title={`Insertar ${asset.label} — click sobre un muro`}
            >
              <span className="text-lg mb-0.5">{asset.icon}</span>
              <span className="text-[7px] font-black text-zinc-700 uppercase tracking-tight">{asset.label}</span>
              <span className="text-[6px] font-mono text-zinc-400">{asset.desc}</span>
            </button>
          ))}
        </div>
        {pendingOpeningType && (
          <div className="mt-1.5 text-[7px] font-bold text-amber-600 text-center animate-pulse uppercase tracking-wider">
            Click sobre un muro para colocar
          </div>
        )}
      </div>

      {/* ── Loading state ── */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center bg-white/50 backdrop-blur-sm z-40">
          <div className="flex flex-col items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Cargando...</span>
          </div>
        </div>
      )}

      {/* ── Tenant selector ── */}
      <div className="p-2 border-b border-zinc-100 bg-zinc-50">
        <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 px-1">Empresas Habilitadas</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {tenants.map((t) => (
            <TenantPill
              key={t.tenantId}
              tenant={t}
              active={selectedTenantId === t.tenantId}
              onClick={() => setSelectedTenant(t.tenantId)}
            />
          ))}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-3 py-2 border-b border-zinc-100">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="BUSCAR EN EL CATÁLOGO..."
          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 px-2.5 text-[8.5px] font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-zinc-400 tracking-wider transition-all"
        />
      </div>

      {/* ── Product Lines tabs ── */}
      {currentLines.length > 0 && (
        <div className="border-b border-zinc-100">
          <div className="flex overflow-x-auto px-2 pt-1.5 pb-0 gap-0.5 scrollbar-hide">
            <LineTab
              label="Todos"
              active={!selectedLineId}
              count={currentLines.reduce((acc, l) => acc + l.products.length, 0)}
              onClick={() => setSelectedLine(null)}
            />
            {currentLines.map((line) => (
              <LineTab
                key={line.lineId}
                label={line.lineName}
                active={selectedLineId === line.lineId}
                count={line.products.length}
                onClick={() => setSelectedLine(line.lineId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Product grid ── */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
            <span className="text-2xl">📭</span>
            <p className="text-[9px] font-bold text-zinc-500 uppercase text-center">Sin productos disponibles</p>
          </div>
        ) : (
          <>
            <p className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest px-1">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} — clic para insertar
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredProducts.map((p) => (
                <ProductCard key={p.productId} product={p} tenantId={selectedTenantId!} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200">
        <div className="text-[7px] text-zinc-400 font-mono text-center uppercase tracking-widest font-black">
          Module: Catalog Integration | catalog-live-v1
        </div>
      </div>
    </aside>
  );
};
