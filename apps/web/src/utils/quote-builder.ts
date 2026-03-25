/**
 * Creado y diseñado por XO
 */

import type { SceneItem } from '@/store/editor-store';

// ─── Tipos para la cotización ───────────────────────────────────────────────

export interface QuoteLineItem {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
  hasPrice: boolean;
  thumbnail?: string | null;
}

export interface SceneQuote {
  items: QuoteLineItem[];
  total: number;
  totalItems: number; // total de piezas físicas
  itemsWithoutPrice: number; // número de partidas (productos distintos) sin precio
}

// ─── Construir cotización a partir de los items de la escena ─────────────────

/**
 * Agrupa los SceneItem por productId, calcula cantidades,
 * y resuelve el precio unitario usando la jerarquía:
 *   finalPrice (con markup) → price (lista asignada) → basePrice (fallback)
 */
export function buildSceneQuote(items: any[]): SceneQuote {
  // Solo procesar items de tipo 'catalog-item'
  const catalogItems = items.filter(i => i.type === 'catalog-item');

  // Agrupar por productId
  const groupMap = new Map<string, {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number | null;
    thumbnail?: string | null;
  }>();

  for (const item of catalogItems) {
    const existing = groupMap.get(item.productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      const resolvedPrice = resolvePrice(item);

      groupMap.set(item.productId, {
        productId: item.productId,
        name: item.label || 'Producto sin nombre',
        sku: item.metadata?.sku || '',
        quantity: 1,
        unitPrice: resolvedPrice,
        thumbnail: item.metadata?.thumbnail,
      });
    }
  }

  // Convertir a array ordenado por nombre
  const lineItems: QuoteLineItem[] = Array.from(groupMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(g => ({
      productId: g.productId,
      name: g.name,
      sku: g.sku,
      quantity: g.quantity,
      unitPrice: g.unitPrice,
      subtotal: g.unitPrice !== null ? g.unitPrice * g.quantity : null,
      hasPrice: g.unitPrice !== null,
      thumbnail: g.thumbnail,
    }));

  // Calcular totales
  const total = lineItems.reduce((sum, li) => sum + (li.subtotal ?? 0), 0);
  const totalItems = catalogItems.length;
  const itemsWithoutPrice = lineItems.filter(li => !li.hasPrice).length;

  return { items: lineItems, total, totalItems, itemsWithoutPrice };
}

// ─── Resolver precio con jerarquía ──────────────────────────────────────────

function resolvePrice(item: any): number | null {
  // 1. finalPrice del metadata (precio con markup del distribuidor aplicado)
  const finalPrice = item.metadata?.finalPrice;
  if (typeof finalPrice === 'number' && finalPrice > 0) return finalPrice;

  // 2. price del SceneItem (precio base de la lista asignada p.ej 'A')
  if (typeof item.price === 'number' && item.price > 0) return item.price;

  // 3. basePrice del metadata (precio de referencia si no hay lista)
  const basePrice = item.metadata?.basePrice;
  if (typeof basePrice === 'number' && basePrice > 0) return basePrice;

  return null;
}

// ─── Formateo de moneda ─────────────────────────────────────────────────────

/**
 * Formatea un número como moneda MXN.
 * Usa Intl.NumberFormat para separadores y símbolo correctos.
 */
export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
