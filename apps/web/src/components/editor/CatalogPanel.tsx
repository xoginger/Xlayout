"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useCatalogStore, Product } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';

const getIcon = (sku: string) => {
  if (sku.startsWith('DK')) return '🖥️';
  if (sku.startsWith('CH')) return '💺';
  if (sku.startsWith('CB')) return '🗄️';
  if (sku.startsWith('SF')) return '📚';
  return '📦';
};

const TenantPill: React.FC<{ tenant: { tenantId: string; tenantName: string }; active: boolean; onClick: () => void }> = ({ tenant, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
        : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 hover:text-blue-600'
    }`}
  >
    <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-blue-400'}`} />
    {tenant.tenantName}
  </button>
);

const LineTab: React.FC<{ label: string; active: boolean; count: number; onClick: () => void }> = ({ label, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1.5 rounded text-[8.5px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
      active
        ? 'bg-zinc-900 text-white shadow-sm'
        : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
    }`}
  >
    {label}
    <span className={`text-[7px] px-1 py-0.5 rounded-full font-mono ${active ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
      {count}
    </span>
  </button>
);

const ProductCard: React.FC<{ product: Product; tenantId: string }> = ({ product, tenantId }) => {
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const handleInsert = () => {
    insertProduct(product, tenantId);
    setActiveTool('select');
  };

  return (
    <div
      className="group flex flex-col p-2 bg-white rounded-xl border border-zinc-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer active:scale-95"
      onClick={handleInsert}
    >
      <div className="aspect-square w-full rounded-lg mb-1.5 flex flex-col items-center justify-center gap-0.5 group-hover:scale-105 transition-transform bg-zinc-50 border border-zinc-100/50 overflow-hidden relative">
        {product.thumbnail ? (
           <img src={product.thumbnail} alt={product.name} className="w-full h-full object-contain p-2" />
        ) : (
           <span className="text-xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">{getIcon(product.sku)}</span>
        )}
        <div className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm px-1 rounded border border-zinc-100 text-[6px] font-mono font-bold text-zinc-500 shadow-sm">
          {product.width}×{product.depth}m
        </div>
      </div>
      <span className="text-[8px] font-black text-zinc-800 group-hover:text-blue-600 uppercase tracking-tighter truncate leading-tight transition-colors">
        {product.name}
      </span>
      <div className="flex justify-between items-center mt-0.5">
        <span className="text-[7px] font-mono text-zinc-400">{product.sku}</span>
        {product.hasPriceAccess && product.price != null && (
          <span className="text-[7px] font-black text-emerald-600">
            ${product.price.toLocaleString()}
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

  return (
    <aside className="w-64 flex flex-col border-r border-zinc-200 bg-white shrink-0 z-30 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="p-3 bg-white border-b border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Pro Assets 2026</span>
            <h2 className="text-[12px] font-black text-zinc-900 uppercase tracking-tighter leading-none">BIBLIOTECA TÉCNICA</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCatalogPanelState('collapsed')}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition-all text-lg font-bold"
            >
              ‹
            </button>
            <button
              onClick={() => setCatalogPanelState('hidden')}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-all text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ── Estructura / Arquitectura ── */}
      <div className="p-3 bg-zinc-50/50 border-b border-zinc-200">
        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-1">ESTRUCTURA Y VANOS</p>
        <div className="grid grid-cols-3 gap-2">
          {([
            { type: 'door' as const,    icon: '🚪', label: 'Puerta',  desc: '0.90m' },
            { type: 'window' as const,  icon: '🪟', label: 'Ventana', desc: '1.20m' },
            { type: 'opening' as const, icon: '🔲', label: 'Hueco',   desc: 'Vano' },
          ]).map(asset => (
            <button
              key={asset.type}
              onClick={() => setPendingOpeningType(asset.type)}
              className={`flex flex-col items-center p-2 rounded-xl border transition-all active:scale-95 ${
                pendingOpeningType === asset.type
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white border-zinc-200 hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              <span className={`text-xl mb-0.5 ${pendingOpeningType === asset.type ? '' : 'grayscale opacity-70 transition-all group-hover:grayscale-0'}`}>{asset.icon}</span>
              <span className={`text-[7px] font-black uppercase tracking-tight ${pendingOpeningType === asset.type ? 'text-white' : 'text-zinc-700'}`}>{asset.label}</span>
              <span className={`text-[6px] font-mono ${pendingOpeningType === asset.type ? 'text-blue-100' : 'text-zinc-400'}`}>{asset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Marcas Disponibles ── */}
      <div className="p-3 border-b border-zinc-100">
        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mb-2 px-1">COLECCIONES</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
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

      {/* ── Buscador ── */}
      <div className="px-3 py-2">
        <div className="relative group">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setSearchQuery(e.target.value);
            }}
            placeholder="Buscar por SKU o nombre..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2 px-3 pl-8 text-[9px] font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-zinc-400 tracking-wider transition-all"
          />
          <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* ── Líneas de Producto ── */}
      {currentLines.length > 0 && (
        <div className="border-b border-zinc-100 mx-3 mb-2">
          <div className="flex overflow-x-auto pb-2 gap-1.5 scrollbar-hide no-scrollbar">
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

      {/* ── Listado de Productos ── */}
      <div className="flex-1 overflow-y-auto p-3 pt-1 relative scrollbar-hide no-scrollbar">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-40 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Cargando catálogo...</span>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 opacity-40">
            <span className="text-3xl mb-2">🔍</span>
            <p className="text-[9px] font-black text-zinc-500 uppercase text-center tracking-widest">Sin resultados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {filteredProducts.map((p) => (
              <ProductCard key={p.productId} product={p} tenantId={selectedTenantId!} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-[7px] text-zinc-500 font-mono uppercase tracking-widest font-black">SYSTEM_v3.4.0</span>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-[7px] text-emerald-500 font-black uppercase tracking-tighter">ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
