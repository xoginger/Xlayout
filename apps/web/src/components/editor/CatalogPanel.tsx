"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useCatalogStore } from '@/store/catalog-store';
import { useEditorStore } from '@/store/editor-store';
import type { ProductDefinition } from '@/types/catalog';
import { CATEGORY_DIMENSIONS } from '@/types/catalog';

// ============================================================
// Category icons
// ============================================================
const CATEGORY_ICONS: Record<string, string> = {
  desk: '🖥️',
  'meeting-table': '🪑',
  locker: '🔒',
  'filing-cabinet': '🗂️',
  rack: '🪜',
  shelf: '📚',
  cabinet: '🗄️',
  chair: '💺',
  storage: '📦',
  misc: '⬜',
};

// ============================================================
// Brand Pill
// ============================================================
const BrandPill: React.FC<{ brand: { id: string; name: string; primaryColor?: string }; active: boolean; onClick: () => void }> = ({ brand, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${
      active
        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
        : 'bg-white text-zinc-600 border-zinc-200 hover:border-blue-400 hover:text-blue-600'
    }`}
  >
    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: active ? 'white' : (brand.primaryColor ?? '#6b7280') }} />
    {brand.name}
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
const ProductCard: React.FC<{ product: ProductDefinition }> = ({ product }) => {
  const icon = CATEGORY_ICONS[product.category] ?? '⬜';
  const catDim = CATEGORY_DIMENSIONS[product.category];
  const insertProduct = useEditorStore((s) => s.insertSceneItem);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  const handleInsert = () => {
    insertProduct(product.id, product);
    setActiveTool('select');
  };

  return (
    <div
      className="group flex flex-col p-2 bg-white rounded-xl border border-zinc-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer active:scale-95"
      onClick={handleInsert}
      title={`Insert ${product.name} — ${product.width}m × ${product.depth}m × ${product.height}m`}
    >
      {/* Thumbnail / placeholder */}
      <div
        className="aspect-square w-full rounded-lg mb-1.5 flex flex-col items-center justify-center gap-0.5 group-hover:scale-105 transition-transform"
        style={{ backgroundColor: `${catDim?.color ?? '#64748b'}18` }}
      >
        <span className="text-xl">{icon}</span>
        <span className="text-[6px] font-mono text-zinc-400">
          {product.width.toFixed(1)}×{product.depth.toFixed(1)}m
        </span>
      </div>
      {/* Label */}
      <span className="text-[8px] font-black text-zinc-700 group-hover:text-blue-700 uppercase tracking-tighter truncate leading-tight">
        {product.name}
      </span>
      <span className="text-[7px] font-mono text-zinc-400">{product.sku}</span>
      {product.priceBase != null && product.priceBase > 0 && (
        <span className="text-[7px] font-bold text-indigo-600 mt-0.5">
          ${product.priceBase.toLocaleString()} {product.currency}
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
    brands,
    lines,
    selectedBrandId,
    selectedLineId,
    filters,
    loadCatalogMockData,
    setSelectedBrand,
    setSelectedLine,
    setSearchQuery,
    getLinesByBrand,
    getFilteredProducts,
  } = useCatalogStore();

  const setCatalogPanelState = useEditorStore((s) => s.setCatalogPanelState);
  const [searchInput, setSearchInput] = useState('');

  // Load mock data on mount
  useEffect(() => {
    loadCatalogMockData();
  }, [loadCatalogMockData]);

  const brandLines = useMemo(
    () => (selectedBrandId ? getLinesByBrand(selectedBrandId) : []),
    [selectedBrandId, getLinesByBrand, lines]
  );

  const filteredProducts = useMemo(
    () => getFilteredProducts(),
    [selectedBrandId, selectedLineId, filters]
  );

  const lineProductCount = (lineId: string) =>
    useCatalogStore.getState().products.filter(
      (p) => p.lineId === lineId && p.brandId === selectedBrandId
    ).length;

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
            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Catálogo</span>
            <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-tighter leading-none">Empresa</h2>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-zinc-400 bg-zinc-100 px-1 py-0.5 rounded hidden sm:block">v1</span>
            {/* Collapse */}
            <button
              onClick={() => setCatalogPanelState('collapsed')}
              title="Collapse panel"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-colors text-sm font-bold"
            >
              ‹
            </button>
            {/* Hide */}
            <button
              onClick={() => setCatalogPanelState('hidden')}
              title="Hide panel"
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ── Brand selector ── */}
      <div className="p-2 border-b border-zinc-100 bg-zinc-50">
        <p className="text-[7.5px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 px-1">Marca / Empresa</p>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {brands.map((b) => (
            <BrandPill
              key={b.id}
              brand={b}
              active={selectedBrandId === b.id}
              onClick={() => setSelectedBrand(b.id)}
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
          placeholder="BUSCAR PRODUCTOS..."
          className="w-full bg-zinc-50 border border-zinc-200 rounded-lg py-1.5 px-2.5 text-[8.5px] font-bold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-zinc-400 tracking-wider transition-all"
        />
      </div>

      {/* ── Product Lines tabs ── */}
      {brandLines.length > 0 && (
        <div className="border-b border-zinc-100">
          <div className="flex overflow-x-auto px-2 pt-1.5 pb-0 gap-0.5 scrollbar-hide">
            <LineTab
              label="Todos"
              active={!selectedLineId}
              count={selectedBrandId ? useCatalogStore.getState().getProductsByBrand(selectedBrandId).length : 0}
              onClick={() => setSelectedLine(null)}
            />
            {brandLines.map((line) => (
              <LineTab
                key={line.id}
                label={line.name}
                active={selectedLineId === line.id}
                count={lineProductCount(line.id)}
                onClick={() => setSelectedLine(line.id)}
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
            <p className="text-[9px] font-bold text-zinc-500 uppercase text-center">Sin productos</p>
          </div>
        ) : (
          <>
            <p className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest px-1">
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} — clic para insertar
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="p-3 bg-zinc-50 border-t border-zinc-200">
        <div className="text-[7px] text-zinc-400 font-mono text-center">
          Module: Catalog Architecture | catalog-arch-v1
        </div>
      </div>
    </aside>
  );
};
