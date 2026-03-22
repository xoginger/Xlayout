/**
 * Creado y diseñado por XO
 * XLayout Catalog Type System — Scalable 4-Layer Architecture
 * -----------------------------------------------------------
 * Layer 1: Brand (empresa / marca)
 * Layer 2: ProductLine (línea de producto)
 * Layer 3: ProductDefinition (definición ligera del producto)
 * Layer 4: ProductAssetSet (assets pesados, carga bajo demanda)
 *
 * SceneItem referencia solo el productId, no el objeto completo.
 * El editor trabaja con metadata ligera; los assets 3D se cargan lazily.
 */

// ============================================================
// Layer 1: Brand / Company Catalog
// ============================================================
export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  status?: 'active' | 'inactive';
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Layer 2: Product Line
// ============================================================
export interface ProductLine {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  category?: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Layer 3: Product Definition (lightweight — no 3D assets)
// ============================================================
export type ProductCategory =
  | 'desk'
  | 'meeting-table'
  | 'locker'
  | 'filing-cabinet'
  | 'rack'
  | 'shelf'
  | 'cabinet'
  | 'chair'
  | 'storage'
  | 'misc';

export interface ProductDefinition {
  id: string;
  brandId: string;
  lineId: string;
  sku: string;
  name: string;
  category: ProductCategory;
  subcategory?: string;
  /** Dimensions in meters */
  width: number;
  depth: number;
  height: number;
  priceBase?: number;
  currency?: string;
  tags?: string[];
  thumbnail?: string;
  /** Relative URL to a flat SVG footprint for 2D view */
  footprint2D?: string;
  /** Reference to the asset set (resolved lazily) */
  assetSetId?: string;
  /** Point of origin for insertion into scene */
  insertionPoint?: [number, number, number];
  /** Bounding box for placeholder rendering */
  boundingBox?: {
    width: number;
    depth: number;
    height: number;
  };
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Layer 4: Product Asset Set (heavy — loaded on demand)
// ============================================================
export interface ProductAssetSet {
  id: string;
  productId: string;
  /** Level-of-detail variants */
  lod0?: string; // highest quality
  lod1?: string; // mid quality
  lod2?: string; // lowest / thumbnail 3d
  /** GLB/GLTF model URL */
  glb?: string;
  /** Preview image for catalog */
  previewImage?: string;
  /** SVG footprint for 2D plan view */
  footprintSvg?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Scene Item — decoupled from ProductDefinition
// Only holds productId + placement data
// ============================================================
export interface CatalogSceneItem {
  id: string;
  /** productId references ProductDefinition without loading full object */
  productId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  /** Optional label override */
  label?: string;
  /** Optional quantity for future quoting */
  quantity?: number;
  /** Per-instance overrides (color, finish, etc.) */
  overrides?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ============================================================
// Catalog Filter State
// ============================================================
export interface CatalogFilters {
  brandId?: string;
  lineId?: string;
  category?: ProductCategory | '';
  searchQuery?: string;
  priceMin?: number;
  priceMax?: number;
  tags?: string[];
}

// ============================================================
// Placeholder category shape for 3D fallback rendering
// ============================================================
export const CATEGORY_DIMENSIONS: Record<ProductCategory, { defaultW: number; defaultD: number; defaultH: number; color: string }> = {
  desk:           { defaultW: 1.6, defaultD: 0.8, defaultH: 0.75, color: '#b45309' },
  'meeting-table':{ defaultW: 2.4, defaultD: 1.2, defaultH: 0.75, color: '#92400e' },
  locker:         { defaultW: 0.9, defaultD: 0.5, defaultH: 1.80, color: '#1e3a5f' },
  'filing-cabinet':{ defaultW: 0.5, defaultD: 0.6, defaultH: 1.30, color: '#374151' },
  rack:           { defaultW: 1.8, defaultD: 0.6, defaultH: 2.20, color: '#064e3b' },
  shelf:          { defaultW: 1.0, defaultD: 0.4, defaultH: 1.80, color: '#1e3a5f' },
  cabinet:        { defaultW: 0.8, defaultD: 0.5, defaultH: 0.85, color: '#4b5563' },
  chair:          { defaultW: 0.6, defaultD: 0.6, defaultH: 0.85, color: '#7c3aed' },
  storage:        { defaultW: 1.2, defaultD: 0.6, defaultH: 1.50, color: '#065f46' },
  misc:           { defaultW: 1.0, defaultD: 0.8, defaultH: 1.00, color: '#6b7280' },
};
