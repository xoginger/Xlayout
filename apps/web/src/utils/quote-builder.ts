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
}

export interface SceneQuote {
  items: QuoteLineItem[];
  total: number;
  totalItems: number;
  itemsWithoutPrice: number;
}

// ─── Construir cotización a partir de los items de la escena ─────────────────

/**
 * Agrupa los SceneItem por productId, calcula cantidades,
 * y resuelve el precio unitario usando la jerarquía:
 *   finalPrice → price → metadata.basePrice → null
 */
export function buildSceneQuote(items: SceneItem[]): SceneQuote {
  // Solo procesar items de tipo 'catalog-item' (productos del catálogo)
  const catalogItems = items.filter(i => i.type === 'catalog-item');

  // Agrupar por productId
  const groupMap = new Map<string, {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number | null;
  }>();

  for (const item of catalogItems) {
    const existing = groupMap.get(item.productId);

    if (existing) {
      existing.quantity += 1;
    } else {
      // Resolver precio con jerarquía: finalPrice → price → basePrice → null
      const resolvedPrice = resolvePrice(item);

      groupMap.set(item.productId, {
        productId: item.productId,
        name: item.label || 'Producto sin nombre',
        sku: item.metadata?.sku || '',
        quantity: 1,
        unitPrice: resolvedPrice,
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
    }));

  // Calcular totales
  const total = lineItems.reduce((sum, li) => sum + (li.subtotal ?? 0), 0);
  const totalItems = catalogItems.length;
  const itemsWithoutPrice = lineItems.filter(li => !li.hasPrice).length;

  return { items: lineItems, total, totalItems, itemsWithoutPrice };
}

// ─── Resolver precio con jerarquía ──────────────────────────────────────────

function resolvePrice(item: SceneItem): number | null {
  // 1. finalPrice del metadata (precio con markup del distribuidor)
  const finalPrice = item.metadata?.finalPrice;
  if (typeof finalPrice === 'number' && finalPrice > 0) return finalPrice;

  // 2. price del SceneItem (precio base de la lista asignada)
  if (typeof item.price === 'number' && item.price > 0) return item.price;

  // 3. basePrice del metadata (precio base sin lista)
  const basePrice = item.metadata?.basePrice;
  if (typeof basePrice === 'number' && basePrice > 0) return basePrice;

  // 4. Sin precio disponible
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
