/**
 * Creado y diseñado por XO
 * XLayout Catalog Mock Data
 * -------------------------
 * Represents 2 brands, several product lines, and realistic products.
 * In production, this would come from the API (paginated, filtered server-side).
 */

import type { Brand, ProductLine, ProductDefinition } from '@/types/catalog';

// ============================================================
// BRANDS
// ============================================================
export const MOCK_BRANDS: Brand[] = [
  {
    id: 'brand-pm-lapiedad',
    name: 'PM La Piedad',
    slug: 'pm-lapiedad',
    primaryColor: '#1e3a5f',
    description: 'Fabricante líder de mobiliario para oficina, almacén y espacios comerciales.',
    status: 'active',
  },
  {
    id: 'brand-demo',
    name: 'Demo Brand',
    slug: 'demo-brand',
    primaryColor: '#6d28d9',
    description: 'Marca de demostración para pruebas de la plataforma XLayout.',
    status: 'active',
  },
];

// ============================================================
// PRODUCT LINES
// ============================================================
export const MOCK_LINES: ProductLine[] = [
  // PM La Piedad
  { id: 'line-terra',       brandId: 'brand-pm-lapiedad', name: 'Terra',      slug: 'terra',      category: 'desk',    description: 'Línea de escritorios y mesas de trabajo ergonómicos.' },
  { id: 'line-lockers',     brandId: 'brand-pm-lapiedad', name: 'Lockers',    slug: 'lockers',    category: 'locker',  description: 'Casilleros y armarios de seguridad para oficina.' },
  { id: 'line-archiveros',  brandId: 'brand-pm-lapiedad', name: 'Archiveros', slug: 'archiveros', category: 'filing-cabinet', description: 'Archiveros metálicos de alta capacidad.' },
  { id: 'line-racks',       brandId: 'brand-pm-lapiedad', name: 'Racks',      slug: 'racks',      category: 'rack',   description: 'Sistemas de almacenamiento selectivo para bodega.' },
  // Demo Brand
  { id: 'line-office',      brandId: 'brand-demo',        name: 'Office',     slug: 'office',     category: 'desk',    description: 'Demo office furniture.' },
  { id: 'line-storage',     brandId: 'brand-demo',        name: 'Storage',    slug: 'storage',    category: 'storage', description: 'Demo storage solutions.' },
];

// ============================================================
// PRODUCT DEFINITIONS (Lightweight — no 3D assets)
// ============================================================
export const MOCK_PRODUCTS: ProductDefinition[] = [
  // ── PM La Piedad / Terra ────────────────────────────────
  {
    id: 'prod-terra-desk-160',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-terra',
    sku: 'TRR-DSK-160',
    name: 'Escritorio Terra 160',
    category: 'desk',
    width: 1.60, depth: 0.80, height: 0.75,
    priceBase: 4200,
    currency: 'MXN',
    tags: ['escritorio', 'oficina', 'terra'],
    description: 'Escritorio ejecutivo línea Terra, superficie de 160cm.',
    boundingBox: { width: 1.60, depth: 0.80, height: 0.75 },
  },
  {
    id: 'prod-terra-desk-120',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-terra',
    sku: 'TRR-DSK-120',
    name: 'Escritorio Terra 120',
    category: 'desk',
    width: 1.20, depth: 0.70, height: 0.75,
    priceBase: 3600,
    currency: 'MXN',
    tags: ['escritorio', 'compact', 'terra'],
    description: 'Escritorio estación de trabajo compacto.',
    boundingBox: { width: 1.20, depth: 0.70, height: 0.75 },
  },
  {
    id: 'prod-terra-meeting-180',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-terra',
    sku: 'TRR-MTG-180',
    name: 'Mesa Terra Reunión 6px',
    category: 'meeting-table',
    width: 1.80, depth: 1.00, height: 0.75,
    priceBase: 8500,
    currency: 'MXN',
    tags: ['mesa', 'reuniones', 'sala', 'terra'],
    description: 'Mesa de reunión para 6 personas, línea Terra.',
    boundingBox: { width: 1.80, depth: 1.00, height: 0.75 },
  },
  {
    id: 'prod-terra-meeting-240',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-terra',
    sku: 'TRR-MTG-240',
    name: 'Mesa Terra Reunión 10px',
    category: 'meeting-table',
    width: 2.40, depth: 1.20, height: 0.75,
    priceBase: 12000,
    currency: 'MXN',
    tags: ['mesa', 'reuniones', 'sala', 'terra', 'grande'],
    description: 'Mesa de reunión para 10 personas.',
    boundingBox: { width: 2.40, depth: 1.20, height: 0.75 },
  },

  // ── PM La Piedad / Lockers ──────────────────────────────
  {
    id: 'prod-locker-4p',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-lockers',
    sku: 'LCK-4P-STD',
    name: 'Locker 4 Puertas',
    category: 'locker',
    width: 0.90, depth: 0.50, height: 1.80,
    priceBase: 5800,
    currency: 'MXN',
    tags: ['locker', 'casillero', '4 puertas'],
    description: 'Locker de acero con 4 puertas independientes.',
    boundingBox: { width: 0.90, depth: 0.50, height: 1.80 },
  },
  {
    id: 'prod-locker-6p',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-lockers',
    sku: 'LCK-6P-STD',
    name: 'Locker 6 Puertas',
    category: 'locker',
    width: 0.90, depth: 0.50, height: 1.80,
    priceBase: 7200,
    currency: 'MXN',
    tags: ['locker', 'casillero', '6 puertas'],
    description: 'Locker de acero con 6 puertas.',
    boundingBox: { width: 0.90, depth: 0.50, height: 1.80 },
  },

  // ── PM La Piedad / Archiveros ───────────────────────────
  {
    id: 'prod-archivero-3g',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-archiveros',
    sku: 'ARV-3G-STD',
    name: 'Archivero 3 Gavetas',
    category: 'filing-cabinet',
    width: 0.47, depth: 0.60, height: 1.02,
    priceBase: 2800,
    currency: 'MXN',
    tags: ['archivero', '3 gavetas', 'horizontal'],
    description: 'Archivero metálico lateral de 3 gavetas.',
    boundingBox: { width: 0.47, depth: 0.60, height: 1.02 },
  },
  {
    id: 'prod-archivero-4g',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-archiveros',
    sku: 'ARV-4G-STD',
    name: 'Archivero 4 Gavetas',
    category: 'filing-cabinet',
    width: 0.47, depth: 0.60, height: 1.32,
    priceBase: 3400,
    currency: 'MXN',
    tags: ['archivero', '4 gavetas'],
    description: 'Archivero metálico lateral de 4 gavetas.',
    boundingBox: { width: 0.47, depth: 0.60, height: 1.32 },
  },

  // ── PM La Piedad / Racks ────────────────────────────────
  {
    id: 'prod-rack-selectivo',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-racks',
    sku: 'RCK-SEL-200',
    name: 'Rack Selectivo 2m',
    category: 'rack',
    width: 2.70, depth: 1.00, height: 3.20,
    priceBase: 9800,
    currency: 'MXN',
    tags: ['rack', 'selectivo', 'bodega', 'almacén'],
    description: 'Rack de almacenamiento selectivo para tarimas, 3 niveles.',
    boundingBox: { width: 2.70, depth: 1.00, height: 3.20 },
  },
  {
    id: 'prod-rack-modular',
    brandId: 'brand-pm-lapiedad',
    lineId: 'line-racks',
    sku: 'RCK-MOD-100',
    name: 'Rack Modular Ligero',
    category: 'rack',
    width: 1.00, depth: 0.50, height: 2.00,
    priceBase: 4200,
    currency: 'MXN',
    tags: ['rack', 'modular', 'ligero'],
    description: 'Anaquel modular de perfiles metálicos.',
    boundingBox: { width: 1.00, depth: 0.50, height: 2.00 },
  },

  // ── Demo Brand / Office ─────────────────────────────────
  {
    id: 'prod-demo-desk',
    brandId: 'brand-demo',
    lineId: 'line-office',
    sku: 'DEMO-DSK-001',
    name: 'Demo Desk Standard',
    category: 'desk',
    width: 1.40, depth: 0.70, height: 0.75,
    priceBase: 0,
    currency: 'MXN',
    tags: ['demo', 'desk'],
    description: 'Demo office desk for testing.',
    boundingBox: { width: 1.40, depth: 0.70, height: 0.75 },
  },
  {
    id: 'prod-demo-meeting',
    brandId: 'brand-demo',
    lineId: 'line-office',
    sku: 'DEMO-MTG-001',
    name: 'Demo Meeting Table',
    category: 'meeting-table',
    width: 2.00, depth: 1.00, height: 0.75,
    priceBase: 0,
    currency: 'MXN',
    tags: ['demo', 'meeting'],
    description: 'Demo meeting table for testing.',
    boundingBox: { width: 2.00, depth: 1.00, height: 0.75 },
  },

  // ── Demo Brand / Storage ────────────────────────────────
  {
    id: 'prod-demo-cabinet',
    brandId: 'brand-demo',
    lineId: 'line-storage',
    sku: 'DEMO-CAB-001',
    name: 'Demo Cabinet',
    category: 'cabinet',
    width: 0.80, depth: 0.50, height: 0.85,
    priceBase: 0,
    currency: 'MXN',
    tags: ['demo', 'cabinet', 'storage'],
    description: 'Demo storage cabinet.',
    boundingBox: { width: 0.80, depth: 0.50, height: 0.85 },
  },
  {
    id: 'prod-demo-locker',
    brandId: 'brand-demo',
    lineId: 'line-storage',
    sku: 'DEMO-LCK-001',
    name: 'Demo Locker',
    category: 'locker',
    width: 0.90, depth: 0.50, height: 1.80,
    priceBase: 0,
    currency: 'MXN',
    tags: ['demo', 'locker'],
    description: 'Demo locker for testing.',
    boundingBox: { width: 0.90, depth: 0.50, height: 1.80 },
  },
];
