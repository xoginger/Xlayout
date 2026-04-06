/**
 * Creado y diseñado por XO
 * XLayout System — Procesador de Importaciones v2
 *
 * Worker BullMQ que procesa archivos CSV/XLSX subidos.
 * Soporta 3 tipos de importación:
 * - catalog: productos base + variantes con líneas, dimensiones y precios
 * - prices: actualización masiva de listas de precios
 * - conditions: condiciones comerciales por producto o línea
 *
 * Características principales:
 * - Parseo unificado CSV/XLSX
 * - Validación exhaustiva por fila
 * - Agrupación inteligente base/variante
 * - Idempotencia por SKU (upsert)
 * - Modo dry-run (preview sin escritura)
 * - Reporte estructurado detallado
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parseImportFile, parseCSVContent } from './imports.parser';
import { validateCatalogRecords, validatePriceRecords, validateCommercialRelations, ValidationError } from './imports.validator';
import { DistributorsService } from '../distributors/distributors.service';
import { ManufacturerDistributorService } from '../distributors/manufacturer-distributor.service';
import { AuditService } from '../audit/audit.service';

// Tipo de dato del job
interface ImportJobData {
  tenantId: string;
  type: 'catalog' | 'prices' | 'conditions' | 'commercial-relations';
  fileUrl: string;
  originalName?: string;
  dryRun?: boolean;
  timestamp: number;
}

// Resumen detallado de importación
interface ImportSummary {
  success: boolean;
  type: string;
  dryRun: boolean;
  total: number;
  succeeded: number;
  failed: number;
  created: number;
  updated: number;
  variantsCreated: number;
  linesCreated: string[];
  categoriesCreated: string[];
  errors: string[];
  warnings: string[];
}

@Processor('imports')
export class ImportsProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private distributorsService: DistributorsService,
    private manufacturerDistributorService: ManufacturerDistributorService,
    private auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<ImportJobData, any, string>): Promise<any> {
    const { tenantId, type, fileUrl, dryRun = false } = job.data;

    await job.updateProgress(5);

    // ─── Resolver ruta del archivo ────────────────────────────────────────
    let filePath = '';
    let fileContent = '';
    let useFilePath = false;

    try {
      if (fileUrl.startsWith('http')) {
        // Descarga desde URL remota
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fileContent = await res.text();
      } else {
        // Archivo local en disco
        const basePath = process.env.UPLOAD_DIR || '/app/storage';
        const relativePath = fileUrl.replace('/storage/', '');
        filePath = path.join(basePath, relativePath);

        if (!fs.existsSync(filePath)) {
          throw new Error(`Archivo no encontrado en: ${filePath}`);
        }

        useFilePath = true;
      }
    } catch (err: any) {
      await this.updateJobStatus(job.id as string, 'FAILED', {
        success: false, type, dryRun, total: 0, succeeded: 0, failed: 0,
        created: 0, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        error: `No se pudo leer el archivo: ${err.message}`,
        errors: [`No se pudo leer el archivo: ${err.message}`], warnings: [],
      });
      throw new Error(`No se pudo leer el archivo: ${err.message}`);
    }

    await job.updateProgress(10);

    // ─── Parsear archivo ──────────────────────────────────────────────────
    let records: Record<string, string>[];
    try {
      if (useFilePath) {
        const parseResult = parseImportFile(filePath);
        records = parseResult.records;
      } else {
        const parseResult = parseCSVContent(fileContent);
        records = parseResult.records;
      }
    } catch (err: any) {
      await this.updateJobStatus(job.id as string, 'FAILED', {
        success: false, type, dryRun, total: 0, succeeded: 0, failed: 0,
        created: 0, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        error: `Error al parsear archivo: ${err.message}`,
        errors: [`Error al parsear archivo: ${err.message}`], warnings: [],
      });
      throw new Error(`Error al parsear archivo: ${err.message}`);
    }

    if (records.length === 0) {
      await this.updateJobStatus(job.id as string, 'FAILED', {
        success: false, type, dryRun, total: 0, succeeded: 0, failed: 0,
        created: 0, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        error: 'El archivo no contiene filas de datos',
        errors: ['El archivo no contiene filas de datos'], warnings: [],
      });
      throw new Error('El archivo no contiene filas de datos');
    }

    await job.updateProgress(15);

    // ─── Procesar según tipo ──────────────────────────────────────────────
    let result: any;
    if (type === 'catalog') {
      result = await this.processCatalog(job, tenantId, records, dryRun);
    } else if (type === 'prices') {
      result = await this.processPrices(job, tenantId, records, dryRun);
    } else if (type === 'conditions') {
      result = await this.processConditions(job, tenantId, records, dryRun);
    } else if (type === 'commercial-relations') {
      result = await this.processCommercialRelations(job, tenantId, records, dryRun);
    } else {
      throw new Error(`Tipo de importación desconocido: ${type}`);
    }

    // Actualizar estado final en DB
    const finalStatus = result.errors.length > 0 && result.succeeded === 0 ? 'FAILED' : 'COMPLETED';
    await this.updateJobStatus(job.id as string, finalStatus, result);
    await job.updateProgress(100);

    // Audit: registrar resultado de importación (NC-TRAZ-02)
    this.auditService.log({
      actorType: 'SYSTEM' as any,
      actorId: 'import-worker',
      tenantId,
      action: finalStatus === 'COMPLETED' ? 'IMPORT_SUCCESS' : 'IMPORT_FAILED',
      entityType: 'IMPORT_JOB',
      entityId: job.id as string,
      payload: {
        type,
        total: result.total,
        succeeded: result.succeeded,
        failed: result.failed,
        dryRun,
      },
    }).catch(() => {});

    return result;
  }

  /** Convierte texto a slug limpio */
  private toSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTACIÓN DE CATÁLOGO (Productos Base + Variantes)
  // ═══════════════════════════════════════════════════════════════════════════
  private async processCatalog(
    job: Job,
    tenantId: string,
    records: Record<string, string>[],
    dryRun: boolean,
  ): Promise<ImportSummary> {
    // ─── Fase 1: Validación ───────────────────────────────────────────────
    const validation = validateCatalogRecords(records);
    await job.updateProgress(25);

    // Si hay errores críticos y es dry-run, retornar inmediatamente
    if (dryRun) {
      return {
        success: validation.isValid,
        type: 'catalog',
        dryRun: true,
        total: records.length,
        succeeded: 0,
        failed: validation.errors.length,
        created: validation.stats.baseProducts,
        updated: 0,
        variantsCreated: validation.stats.variants,
        linesCreated: validation.stats.uniqueLines,
        categoriesCreated: validation.stats.uniqueCategories,
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message),
      };
    }

    // En modo real, continuar solo si hay registros procesables
    // (las filas con errores se omiten individualmente)

    let succeeded = 0;
    let failed = validation.errors.length;
    let created = 0;
    let updated = 0;
    let variantsCreated = 0;
    const allErrors = validation.errors.map(e => e.message);
    const allWarnings = validation.warnings.map(w => w.message);

    // Filas con errores conocidos — usar número de fila para saltar
    const errorRows = new Set(validation.errors.map(e => e.row));

    // ─── Fase 2: Resolver líneas y categorías ─────────────────────────────
    const lineCache = new Map<string, string>(); // nombre → id
    const categoryCache = new Map<string, string>(); // nombre → id
    const linesCreated: string[] = [];
    const categoriesCreated: string[] = [];

    // Pre-cargar líneas existentes
    const existingLines = await this.prisma.client.productLine.findMany({
      where: { tenantId },
    });
    for (const line of existingLines) {
      lineCache.set(line.name.toLowerCase(), line.id);
      lineCache.set(line.slug, line.id);
    }

    // Pre-cargar categorías existentes
    const existingCategories = await this.prisma.client.productCategory.findMany({
      where: { tenantId },
    });
    for (const cat of existingCategories) {
      categoryCache.set(cat.name.toLowerCase(), cat.id);
      categoryCache.set(cat.slug, cat.id);
    }

    await job.updateProgress(30);

    // ─── Fase 3: Separar base y variantes ─────────────────────────────────
    const baseRows: { index: number; row: Record<string, string> }[] = [];
    const variantRows: { index: number; row: Record<string, string> }[] = [];

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (errorRows.has(rowNum)) continue;

      const row = records[i];
      const baseSku = row.base_sku?.trim() || '';

      if (baseSku) {
        variantRows.push({ index: i, row });
      } else {
        baseRows.push({ index: i, row });
      }
    }

    // ─── Fase 4: Procesar productos base ──────────────────────────────────
    // Mapa de sku → productId para vincular variantes
    const productMap = new Map<string, string>();

    // Pre-cargar productos existentes del tenant para upsert
    const existingProducts = await this.prisma.client.product.findMany({
      where: { tenantId },
      select: { id: true, sku: true },
    });
    for (const p of existingProducts) {
      productMap.set(p.sku, p.id);
    }

    for (let idx = 0; idx < baseRows.length; idx++) {
      const { index: i, row } = baseRows[idx];
      const rowNum = i + 2;

      try {
        const sku = row.sku.trim();
        const name = row.name?.trim() || sku;
        const lineName = row.line?.trim() || '';

        // Resolver línea
        let lineId = lineCache.get(lineName.toLowerCase());
        if (!lineId && lineName) {
          const lineSlug = this.toSlug(lineName);
          // Intentar buscar por slug
          lineId = lineCache.get(lineSlug);
          if (!lineId) {
            const newLine = await this.prisma.client.productLine.create({
              data: { tenantId, name: lineName, slug: lineSlug, active: true },
            });
            lineId = newLine.id;
            lineCache.set(lineName.toLowerCase(), lineId!);
            lineCache.set(lineSlug, lineId!);
            linesCreated.push(lineName);
          }
        }

        if (!lineId) {
          allErrors.push(`Fila ${rowNum}: no se pudo resolver la línea '${lineName}'`);
          failed++;
          continue;
        }

        // Resolver categoría
        let categoryId: string | null = null;
        const catName = row.category?.trim();
        if (catName) {
          categoryId = categoryCache.get(catName.toLowerCase()) || null;
          if (!categoryId) {
            const catSlug = this.toSlug(catName);
            categoryId = categoryCache.get(catSlug) || null;
            if (!categoryId) {
              const newCat = await this.prisma.client.productCategory.create({
                data: { tenantId, name: catName, slug: catSlug, active: true },
              });
              categoryId = newCat.id;
              categoryCache.set(catName.toLowerCase(), categoryId!);
              categoryCache.set(catSlug, categoryId!);
              categoriesCreated.push(catName);
            }
          }
        }

        // Parsear dimensiones
        const width = parseFloat(row.width) || 1;
        const depth = parseFloat(row.depth) || 1;
        const height = parseFloat(row.height) || 1;

        // Parsear status
        const status = (row.status?.trim().toUpperCase() === 'DRAFT') ? 'DRAFT' : 'PUBLISHED';

        // Construir metadata
        const metadata: Record<string, any> = {};
        if (row.unit?.trim()) metadata.unit = row.unit.trim();
        else metadata.unit = 'pza';
        if (row.brand?.trim()) metadata.brand = row.brand.trim();

        // Upsert del producto base
        const isExisting = productMap.has(sku);
        const product = await this.prisma.client.product.upsert({
          where: { tenantId_sku: { tenantId, sku } },
          create: {
            tenantId,
            lineId,
            categoryId,
            sku,
            name,
            description: row.description?.trim() || null,
            width, depth, height,
            metadata,
            status: status as any,
            active: true,
          },
          update: {
            name,
            lineId,
            categoryId: categoryId || undefined,
            description: row.description?.trim() || undefined,
            width, depth, height,
            metadata,
            status: status as any,
          },
        });

        productMap.set(sku, product.id);

        // Crear/actualizar precios del producto base
        await this.upsertPrices(tenantId, product.id, null, row);
        
        // Crear/actualizar assets 3D/2D del producto base
        await this.upsertAssets(tenantId, product.id, row);

        if (isExisting) {
          updated++;
        } else {
          created++;
        }
        succeeded++;
      } catch (err: any) {
        allErrors.push(`Fila ${rowNum} (${row.sku}): ${err.message}`);
        failed++;
      }

      // Actualizar progreso
      if (idx % 20 === 0) {
        const progress = 30 + Math.floor((idx / baseRows.length) * 40);
        await job.updateProgress(Math.min(progress, 70));
      }
    }

    await job.updateProgress(70);

    // ─── Fase 5: Procesar variantes ───────────────────────────────────────
    for (let idx = 0; idx < variantRows.length; idx++) {
      const { index: i, row } = variantRows[idx];
      const rowNum = i + 2;

      try {
        const sku = row.sku.trim();
        const baseSku = row.base_sku.trim();
        const name = row.name?.trim() || row.variant_name?.trim() || sku;
        const variantType = row.variant_type?.trim().toLowerCase() || 'config';

        // Buscar producto base
        let baseProductId = productMap.get(baseSku);

        // Si no está en el mapa (importado previamente, no en este lote), buscar en DB
        if (!baseProductId) {
          const baseProduct = await this.prisma.client.product.findFirst({
            where: { tenantId, sku: baseSku },
          });
          if (baseProduct) {
            baseProductId = baseProduct.id;
            productMap.set(baseSku, baseProductId!);
          }
        }

        if (!baseProductId) {
          allErrors.push(`Fila ${rowNum}: producto base con SKU '${baseSku}' no encontrado`);
          failed++;
          continue;
        }

        // Dimensiones de la variante (opcionales)
        const width = row.width?.trim() ? parseFloat(row.width) : null;
        const depth = row.depth?.trim() ? parseFloat(row.depth) : null;
        const height = row.height?.trim() ? parseFloat(row.height) : null;

        // Metadata de la variante
        const metadata: Record<string, any> = {};
        if (row.unit?.trim()) metadata.unit = row.unit.trim();
        if (row.brand?.trim()) metadata.brand = row.brand.trim();

        // Upsert de la variante (por tenantId + sku)
        let variant: any;
        if (sku) {
          const existingVariant = await this.prisma.client.productVariant.findFirst({
            where: { tenantId, sku },
          });

          if (existingVariant) {
            variant = await this.prisma.client.productVariant.update({
              where: { id: existingVariant.id },
              data: {
                name,
                variantType,
                width: width !== null ? width : undefined,
                depth: depth !== null ? depth : undefined,
                height: height !== null ? height : undefined,
                metadata,
                active: true,
              },
            });
          } else {
            variant = await this.prisma.client.productVariant.create({
              data: {
                tenantId,
                productId: baseProductId,
                name,
                variantType,
                sku,
                width, depth, height,
                metadata,
                active: true,
                sortOrder: idx,
              },
            });
          }
        } else {
          // Sin SKU propio — buscar por nombre + tipo
          const existingVariant = await this.prisma.client.productVariant.findFirst({
            where: { tenantId, productId: baseProductId, name, variantType },
          });

          if (existingVariant) {
            variant = existingVariant;
          } else {
            variant = await this.prisma.client.productVariant.create({
              data: {
                tenantId,
                productId: baseProductId,
                name,
                variantType,
                width, depth, height,
                metadata,
                active: true,
                sortOrder: idx,
              },
            });
          }
        }

        // Crear/actualizar precios de la variante
        await this.upsertPrices(tenantId, baseProductId, variant.id, row);

        variantsCreated++;
        succeeded++;
      } catch (err: any) {
        allErrors.push(`Fila ${rowNum} (variante ${row.sku}): ${err.message}`);
        failed++;
      }

      // Actualizar progreso
      if (idx % 20 === 0) {
        const progress = 70 + Math.floor((idx / Math.max(variantRows.length, 1)) * 25);
        await job.updateProgress(Math.min(progress, 95));
      }
    }

    return {
      success: true,
      type: 'catalog',
      dryRun: false,
      total: records.length,
      succeeded,
      failed,
      created,
      updated,
      variantsCreated,
      linesCreated,
      categoriesCreated,
      errors: allErrors.slice(0, 100),
      warnings: allWarnings.slice(0, 50),
    };
  }

  // ─── Componente Auxiliar: Procesamiento de Assets ──────────────────────
  private async upsertAssets(
    tenantId: string,
    productId: string,
    row: Record<string, string>,
  ) {
    const model3dUrl = row.model_3d_url?.trim() || null;
    const asset2dUrl = row.asset_2d_url?.trim() || null;
    const thumbnailUrl = row.thumbnail_url?.trim() || null;

    if (!model3dUrl && !asset2dUrl && !thumbnailUrl) return;

    // Buscar si ya existe un asset para este producto (asumimos tipo model_3d para agrupación unificada)
    const existingAsset = await this.prisma.client.productAsset.findFirst({
      where: { tenantId, productId, assetType: 'model_3d' },
    });

    if (existingAsset) {
      await this.prisma.client.productAsset.update({
        where: { id: existingAsset.id },
        data: {
          model3dUrl: model3dUrl || existingAsset.model3dUrl,
          footprint2dUrl: asset2dUrl || existingAsset.footprint2dUrl,
          thumbnailUrl: thumbnailUrl || existingAsset.thumbnailUrl,
          conversionStatus: model3dUrl ? 'url_only' : existingAsset.conversionStatus,
        },
      });
    } else {
      await this.prisma.client.productAsset.create({
        data: {
          tenantId,
          productId,
          assetType: 'model_3d',
          fileUrl: model3dUrl || undefined,
          model3dUrl,
          footprint2dUrl: asset2dUrl,
          thumbnailUrl,
          conversionStatus: 'url_only',
          metadata: { source: 'bulk_import' },
        },
      });
    }
  }

  /**
   * Crea o actualiza precios para un producto/variante desde las columnas price_a..price_e.
   */
  private async upsertPrices(
    tenantId: string,
    productId: string,
    variantId: string | null,
    row: Record<string, string>,
  ) {
    const currency = row.currency?.trim().toUpperCase() || 'MXN';
    const priceTypes = ['a', 'b', 'c', 'd', 'e'];

    for (const pt of priceTypes) {
      const val = row[`price_${pt}`]?.trim();
      if (!val || val === '') continue;

      const priceVal = parseFloat(val);
      if (isNaN(priceVal) || priceVal < 0) continue;

      const priceType = pt.toUpperCase();

      // Buscar precio existente para este producto+variante+tipo
      const existing = await this.prisma.client.productPrice.findFirst({
        where: { productId, variantId, priceType },
      });

      if (existing) {
        await this.prisma.client.productPrice.update({
          where: { id: existing.id },
          data: { basePrice: priceVal, currency },
        });
      } else {
        await this.prisma.client.productPrice.create({
          data: {
            tenantId,
            productId,
            variantId,
            priceType,
            basePrice: priceVal,
            currency,
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTACIÓN DE LISTAS DE PRECIOS
  // ═══════════════════════════════════════════════════════════════════════════
  private async processPrices(
    job: Job,
    tenantId: string,
    records: Record<string, string>[],
    dryRun: boolean,
  ): Promise<ImportSummary> {
    const validation = validatePriceRecords(records);

    if (dryRun) {
      return {
        success: validation.isValid,
        type: 'prices',
        dryRun: true,
        total: records.length,
        succeeded: 0,
        failed: validation.errors.length,
        created: 0, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message),
      };
    }

    let succeeded = 0;
    let failed = 0;
    let updated = 0;
    let created = 0;
    const errors: string[] = [];
    const errorRows = new Set(validation.errors.map(e => e.row));

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (errorRows.has(rowNum)) {
        failed++;
        continue;
      }

      const row = records[i];
      try {
        const sku = row.sku.trim();
        // Soportar ambas convenciones de nombre de columna
        const priceType = (row.price_type || row.pricetype || '').trim().toUpperCase();
        const basePriceStr = row.base_price || row.baseprice || '';
        const basePrice = parseFloat(basePriceStr.trim());
        const currency = row.currency?.trim().toUpperCase() || 'MXN';

        // Buscar producto
        const product = await this.prisma.client.product.findFirst({
          where: { tenantId, sku },
        });
        if (!product) {
          errors.push(`Fila ${rowNum}: producto SKU '${sku}' no encontrado`);
          failed++;
          continue;
        }

        // Buscar precio existente
        const existing = await this.prisma.client.productPrice.findFirst({
          where: { productId: product.id, variantId: null, priceType },
        });

        if (existing) {
          await this.prisma.client.productPrice.update({
            where: { id: existing.id },
            data: { basePrice, currency },
          });
          updated++;
        } else {
          await this.prisma.client.productPrice.create({
            data: {
              tenantId,
              productId: product.id,
              priceType,
              basePrice,
              currency,
            },
          });
          created++;
        }

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${rowNum} (${row.sku}): ${err.message}`);
        failed++;
      }

      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    // Agregar errores de validación al inicio
    const allErrors = [...validation.errors.map(e => e.message), ...errors];

    return {
      success: true, type: 'prices', dryRun: false,
      total: records.length, succeeded, failed: failed + validation.errors.length,
      created, updated, variantsCreated: 0,
      linesCreated: [], categoriesCreated: [],
      errors: allErrors.slice(0, 100),
      warnings: validation.warnings.map(w => w.message),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTACIÓN DE CONDICIONES COMERCIALES
  // ═══════════════════════════════════════════════════════════════════════════
  private async processConditions(
    job: Job,
    tenantId: string,
    records: Record<string, string>[],
    dryRun: boolean,
  ): Promise<ImportSummary> {
    if (dryRun) {
      return {
        success: true, type: 'conditions', dryRun: true,
        total: records.length, succeeded: 0, failed: 0,
        created: records.length, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        errors: [], warnings: [],
      };
    }

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2;
      try {
        const condType = row.condition_type?.trim() || row.conditiontype?.trim() || '';
        const description = row.description?.trim() || '';

        if (!condType || !description) {
          errors.push(`Fila ${rowNum}: conditionType y description son obligatorios`);
          failed++;
          continue;
        }

        // Resolver productId si se proporcionó SKU
        let productId: string | null = null;
        if (row.sku?.trim()) {
          const product = await this.prisma.client.product.findFirst({
            where: { tenantId, sku: row.sku.trim() },
          });
          if (product) productId = product.id;
        }

        // Resolver lineId si se proporcionó nombre de línea
        let lineId: string | null = null;
        if (row.line?.trim()) {
          const lineSlug = this.toSlug(row.line.trim());
          const line = await this.prisma.client.productLine.findFirst({
            where: { tenantId, slug: lineSlug },
          });
          if (line) lineId = line.id;
        }

        await this.prisma.client.productCondition.create({
          data: {
            tenantId,
            productId,
            lineId,
            conditionType: condType,
            description,
            active: row.active?.trim().toLowerCase() !== 'false',
          },
        });

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${rowNum}: ${err.message}`);
        failed++;
      }

      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    return {
      success: true, type: 'conditions', dryRun: false,
      total: records.length, succeeded, failed,
      created: succeeded, updated: 0, variantsCreated: 0,
      linesCreated: [], categoriesCreated: [],
      errors: errors.slice(0, 100), warnings: [],
    };
  }

  // ─── Actualizar estado del job en la base de datos ─────────────────────
  private async updateJobStatus(jobId: string, status: string, summary: any) {
    try {
      await this.prisma.client.importJob.update({
        where: { id: jobId },
        data: { status, summary },
      });
    } catch {
      // Si el job no existe en DB, ignorar silenciosamente
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPORTACIÓN DE RELACIONES COMERCIALES
  // ═══════════════════════════════════════════════════════════════════════════
  private async processCommercialRelations(
    job: Job,
    tenantId: string,
    records: Record<string, string>[],
    dryRun: boolean,
  ): Promise<ImportSummary> {
    const validation = validateCommercialRelations(records);

    if (dryRun) {
      return {
        success: validation.isValid,
        type: 'commercial-relations',
        dryRun: true,
        total: records.length,
        succeeded: 0,
        failed: validation.errors.length,
        created: 0, updated: 0, variantsCreated: 0,
        linesCreated: [], categoriesCreated: [],
        errors: validation.errors.map(e => e.message),
        warnings: validation.warnings.map(w => w.message),
      };
    }

    let succeeded = 0;
    let failed = 0;
    let created = 0;
    const errors: string[] = [];
    const warnings = validation.warnings.map(w => w.message);
    const errorRows = new Set(validation.errors.map(e => e.row));

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 2;
      if (errorRows.has(rowNum)) {
        failed++;
        continue;
      }

      const row = records[i];
      try {
        const email = row.distributor_email?.trim();
        const slug = row.distributor_slug?.trim() || (email ? this.toSlug(email.split('@')[0]) : '');
        const rawLists = row.allowed_lists?.trim() || 'A';
        const discountStr = row.global_discount_percent?.trim() || '0';

        // 1. Buscar Distribuidor o crear perfil Inactivo (Pivote por correo y luego slug)
        let distributor = await this.prisma.client.distributorCompany.findFirst({
          where: { OR: [ { contactEmail: email || undefined }, { slug } ] }
        });

        if (!distributor) {
          // Auto-aprovisionar distribuidor inactivo
          const compName = row.distributor_name?.trim() || (email ? email.split('@')[0] : slug);
          distributor = await this.distributorsService.createDistributor({
            name: compName,
            slug: this.toSlug(compName) + '-' + crypto.randomUUID().split('-')[0], // evitar choques temporales
            contactEmail: email || undefined,
            phone: row.distributor_phone?.trim() || undefined,
            country: row.distributor_country?.trim() || undefined,
            status: 'INACTIVE',
            plan: 'STANDARD'
          });
          created++;
          warnings.push(`Fila ${rowNum}: Se creó el distribuidor '${compName}' como INACTIVE porque no existía.`);
        }

        // 2. Parsear listas y Default
        let lists = rawLists.replace(/ /g, '').split(',').filter(l => l.length === 1);
        if (lists.length === 0) lists = ['A'];
        // Garantizar al menos 'A' como fallback si falló parseo
        
        let defaultList = lists.includes('A') ? 'A' : lists[0];
        
        // 3. Otorgar Acceso
        await this.distributorsService.grantAccess(tenantId, distributor.id, lists, defaultList);

        // 4. Asignar Descuento
        const discountVal = parseFloat(discountStr);
        if (!isNaN(discountVal) && discountVal >= 0) {
           await this.manufacturerDistributorService.assignDiscount(tenantId, distributor.id, {
               scope: 'GLOBAL',
               discountPercent: discountVal
           });
        }

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${rowNum}: Falló asignación - ${err.message}`);
        failed++;
      }

      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    const allErrors = [...validation.errors.map(e => e.message), ...errors];

    return {
      success: true, type: 'commercial-relations', dryRun: false,
      total: records.length, succeeded, failed: failed + validation.errors.length,
      created, updated: succeeded - created, variantsCreated: 0,
      linesCreated: [], categoriesCreated: [],
      errors: allErrors.slice(0, 100),
      warnings: warnings.slice(0, 100),
    };
  }
}
