/**
 * Creado y diseñado por XO
 * XLayout System — Validador de Importaciones
 *
 * Validaciones exhaustivas fila por fila para importación masiva de catálogo.
 * Detecta errores específicos con número de fila y motivo claro.
 */

// Monedas ISO válidas aceptadas
const VALID_CURRENCIES = new Set(['MXN', 'USD', 'EUR', 'COP', 'CLP', 'ARS', 'BRL', 'PEN', 'GTQ']);

// Tipos de variante aceptados
const VALID_VARIANT_TYPES = new Set(['color', 'texture', 'material', 'finish', 'size', 'config']);

// Estados válidos de producto
const VALID_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

// Columnas de precio
const PRICE_COLUMNS = ['price_a', 'price_b', 'price_c', 'price_d', 'price_e'];

// Columnas de dimensión
const DIMENSION_COLUMNS = ['width', 'depth', 'height'];

// Error individual de validación
export interface ValidationError {
  row: number;       // Número de fila (base 1, incluye header)
  column?: string;   // Columna afectada
  message: string;   // Mensaje descriptivo
  severity: 'error' | 'warning';
}

// Resultado de validación completa
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalRows: number;
    baseProducts: number;
    variants: number;
    uniqueLines: string[];
    uniqueCategories: string[];
    skuDuplicatesInFile: string[];
  };
}

/**
 * Valida un set completo de registros importados para tipo 'catalog'.
 * Retorna errores detallados por fila y estadísticas de pre-importación.
 */
export function validateCatalogRecords(records: Record<string, string>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Mapa de SKUs vistos en el archivo → número de fila (para detectar duplicados)
  const skuMap = new Map<string, number>();
  const skuDuplicates: string[] = [];

  // Contadores
  let baseProducts = 0;
  let variants = 0;
  const uniqueLines = new Set<string>();
  const uniqueCategories = new Set<string>();

  // Mapa de base_sku → existe en el archivo (para validar variantes)
  const allSkus = new Set<string>();
  records.forEach(row => {
    if (row.sku?.trim()) allSkus.add(row.sku.trim());
  });

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2; // +1 por índice 0, +1 por header

    const sku = row.sku?.trim() || '';
    const name = row.name?.trim() || '';
    const line = row.line?.trim() || '';
    const baseSku = row.base_sku?.trim() || '';
    const isVariant = baseSku.length > 0;

    // ─── Validación 1: SKU obligatorio ────────────────────────────────────
    if (!sku) {
      errors.push({ row: rowNum, column: 'sku', message: `Fila ${rowNum}: el SKU es obligatorio`, severity: 'error' });
      continue; // Sin SKU no podemos continuar
    }

    // ─── Validación 2: SKU duplicado en el archivo ────────────────────────
    if (skuMap.has(sku)) {
      const prevRow = skuMap.get(sku)!;
      errors.push({
        row: rowNum, column: 'sku',
        message: `Fila ${rowNum}: SKU '${sku}' duplicado (ya aparece en fila ${prevRow})`,
        severity: 'error'
      });
      skuDuplicates.push(sku);
      continue;
    }
    skuMap.set(sku, rowNum);

    // ─── Validación 3: Nombre obligatorio ─────────────────────────────────
    if (!name) {
      errors.push({ row: rowNum, column: 'name', message: `Fila ${rowNum}: el nombre del producto es obligatorio`, severity: 'error' });
    }

    // ─── Validación 4: Línea obligatoria (solo para productos base) ──────
    if (!isVariant && !line) {
      errors.push({ row: rowNum, column: 'line', message: `Fila ${rowNum}: la línea es obligatoria para productos base`, severity: 'error' });
    }

    // ─── Validación 5: base_sku debe existir en el archivo ───────────────
    if (isVariant) {
      if (!allSkus.has(baseSku)) {
        errors.push({
          row: rowNum, column: 'base_sku',
          message: `Fila ${rowNum}: base_sku '${baseSku}' no existe como producto en este archivo. Debe existir una fila con sku='${baseSku}'.`,
          severity: 'error'
        });
      }

      // Validar variant_type obligatorio para variantes
      const variantType = row.variant_type?.trim().toLowerCase() || '';
      if (!variantType) {
        errors.push({
          row: rowNum, column: 'variant_type',
          message: `Fila ${rowNum}: variant_type es obligatorio para variantes (valores: ${Array.from(VALID_VARIANT_TYPES).join(', ')})`,
          severity: 'error'
        });
      } else if (!VALID_VARIANT_TYPES.has(variantType)) {
        warnings.push({
          row: rowNum, column: 'variant_type',
          message: `Fila ${rowNum}: variant_type '${variantType}' no es estándar (valores recomendados: ${Array.from(VALID_VARIANT_TYPES).join(', ')})`,
          severity: 'warning'
        });
      }

      variants++;
    } else {
      baseProducts++;
    }

    // ─── Validación 5.5: Advertencia de Assets en Variantes ──────────────
    const assetUrls = [
      { col: 'model_3d_url', val: row.model_3d_url?.trim() },
      { col: 'asset_2d_url', val: row.asset_2d_url?.trim() },
      { col: 'thumbnail_url', val: row.thumbnail_url?.trim() }
    ];

    for (const asset of assetUrls) {
      if (asset.val) {
        if (!asset.val.startsWith('http')) {
          warnings.push({
            row: rowNum, column: asset.col,
            message: `Fila ${rowNum}: ${asset.col} debería ser una URL pública (comenzar con http:// o https://)`,
            severity: 'warning'
          });
        }
        
        if (isVariant) {
          warnings.push({
            row: rowNum, column: asset.col,
            message: `Fila ${rowNum}: XLayout asocia los assets (${asset.col}) al Producto Base. El enlace proporcionado en esta variante será ignorado.`,
            severity: 'warning'
          });
        }
      }
    }

    // ─── Validación 6: Dimensiones numéricas ─────────────────────────────
    for (const dim of DIMENSION_COLUMNS) {
      const val = row[dim]?.trim();
      if (val && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          errors.push({
            row: rowNum, column: dim,
            message: `Fila ${rowNum}: ${dim} debe ser un número válido, se recibió '${val}'`,
            severity: 'error'
          });
        } else if (num < 0) {
          errors.push({
            row: rowNum, column: dim,
            message: `Fila ${rowNum}: ${dim} no puede ser negativo (${val})`,
            severity: 'error'
          });
        } else if (num > 100) {
          warnings.push({
            row: rowNum, column: dim,
            message: `Fila ${rowNum}: ${dim} = ${val}m parece muy grande. ¿Verifique unidades?`,
            severity: 'warning'
          });
        }
      }
    }

    // ─── Validación 7: Precios válidos ───────────────────────────────────
    for (const priceCol of PRICE_COLUMNS) {
      const val = row[priceCol]?.trim();
      if (val && val !== '') {
        const num = parseFloat(val);
        if (isNaN(num)) {
          errors.push({
            row: rowNum, column: priceCol,
            message: `Fila ${rowNum}: ${priceCol} debe ser un número válido, se recibió '${val}'`,
            severity: 'error'
          });
        } else if (num < 0) {
          errors.push({
            row: rowNum, column: priceCol,
            message: `Fila ${rowNum}: ${priceCol} no puede ser negativo (${val})`,
            severity: 'error'
          });
        }
      }
    }

    // ─── Validación 8: Moneda válida ─────────────────────────────────────
    const currency = row.currency?.trim().toUpperCase();
    if (currency && !VALID_CURRENCIES.has(currency)) {
      warnings.push({
        row: rowNum, column: 'currency',
        message: `Fila ${rowNum}: moneda '${currency}' no reconocida (aceptadas: ${Array.from(VALID_CURRENCIES).join(', ')})`,
        severity: 'warning'
      });
    }

    // ─── Validación 9: Status válido ─────────────────────────────────────
    const status = row.status?.trim().toUpperCase();
    if (status && !VALID_STATUSES.has(status)) {
      warnings.push({
        row: rowNum, column: 'status',
        message: `Fila ${rowNum}: status '${status}' no válido (aceptados: DRAFT, PUBLISHED, ARCHIVED)`,
        severity: 'warning'
      });
    }

    // ─── Recopilar líneas y categorías únicas ────────────────────────────
    if (line) uniqueLines.add(line);
    const category = row.category?.trim();
    if (category) uniqueCategories.add(category);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: records.length,
      baseProducts,
      variants,
      uniqueLines: Array.from(uniqueLines),
      uniqueCategories: Array.from(uniqueCategories),
      skuDuplicatesInFile: skuDuplicates,
    },
  };
}

/**
 * Valida registros para importación de precios.
 */
export function validatePriceRecords(records: Record<string, string>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    if (!row.sku?.trim()) {
      errors.push({ row: rowNum, column: 'sku', message: `Fila ${rowNum}: SKU es obligatorio`, severity: 'error' });
      continue;
    }
    if (!row.price_type?.trim() && !row.pricetype?.trim()) {
      errors.push({ row: rowNum, column: 'priceType', message: `Fila ${rowNum}: priceType es obligatorio`, severity: 'error' });
    }
    const price = row.base_price?.trim() || row.baseprice?.trim() || '';
    if (!price) {
      errors.push({ row: rowNum, column: 'basePrice', message: `Fila ${rowNum}: basePrice es obligatorio`, severity: 'error' });
    } else {
      const num = parseFloat(price);
      if (isNaN(num) || num < 0) {
        errors.push({ row: rowNum, column: 'basePrice', message: `Fila ${rowNum}: basePrice '${price}' no es un número válido`, severity: 'error' });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: { totalRows: records.length, baseProducts: 0, variants: 0, uniqueLines: [], uniqueCategories: [], skuDuplicatesInFile: [] },
  };
}

/**
 * Valida registros para importación de relaciones comerciales.
 */
export function validateCommercialRelations(records: Record<string, string>[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    const rowNum = i + 2;

    const email = row.distributor_email?.trim();
    const slug = row.distributor_slug?.trim();

    if (!email && !slug) {
      errors.push({ row: rowNum, column: 'distributor_email', message: `Fila ${rowNum}: distributor_email o distributor_slug es obligatorio`, severity: 'error' });
      continue;
    }

    const discountStr = row.global_discount_percent?.trim();
    if (discountStr) {
      const num = parseFloat(discountStr);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.push({ row: rowNum, column: 'global_discount_percent', message: `Fila ${rowNum}: el descuento debe ser un número entre 0 y 100`, severity: 'error' });
      }
    }

    const listsStr = row.allowed_lists?.trim();
    if (listsStr) {
      const validChars = /^[A-Ea-e, ]+$/;
      if (!validChars.test(listsStr)) {
        errors.push({ row: rowNum, column: 'allowed_lists', message: `Fila ${rowNum}: allowed_lists solo puede contener letras A-E y comas`, severity: 'error' });
      }
    } else {
      warnings.push({ row: rowNum, column: 'allowed_lists', message: `Fila ${rowNum}: no se especificaron listas, se asignará 'A' por defecto`, severity: 'warning' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: { totalRows: records.length, baseProducts: 0, variants: 0, uniqueLines: [], uniqueCategories: [], skuDuplicatesInFile: [] },
  };
}
