/**
 * Creado y diseñado por XO
 * XLayout System — Procesador de Importaciones
 *
 * Worker BullMQ que procesa los archivos CSV subidos.
 * Soporta 3 tipos de importación:
 * - catalog: productos con líneas, dimensiones y precios
 * - prices: actualización masiva de listas de precios
 * - conditions: condiciones comerciales por producto o línea
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

@Processor('imports')
export class ImportsProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, type, fileUrl } = job.data;

    await job.updateProgress(5);

    // ─── Leer contenido del archivo ──────────────────────────────────────────
    let fileContent = '';
    try {
      if (fileUrl.startsWith('http')) {
        // Descarga desde URL remota
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fileContent = await res.text();
      } else {
        // Lectura desde disco local (archivo subido)
        const basePath = process.env.UPLOAD_DIR || '/app/storage';
        const relativePath = fileUrl.replace('/storage/', '');
        const absolutePath = path.join(basePath, relativePath);
        fileContent = fs.readFileSync(absolutePath, 'utf8');
      }
    } catch (err: any) {
      await this.updateJobStatus(job.id as string, 'FAILED', { error: `No se pudo leer el archivo: ${err.message}` });
      throw new Error(`No se pudo leer el archivo: ${err.message}`);
    }

    // Eliminar BOM si existe
    if (fileContent.charCodeAt(0) === 0xFEFF) {
      fileContent = fileContent.slice(1);
    }

    await job.updateProgress(10);

    // ─── Parsear CSV ─────────────────────────────────────────────────────────
    let records: any[];
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
    } catch (err: any) {
      await this.updateJobStatus(job.id as string, 'FAILED', { error: `Error al parsear CSV: ${err.message}` });
      throw new Error(`Error al parsear CSV: ${err.message}`);
    }

    if (records.length === 0) {
      await this.updateJobStatus(job.id as string, 'FAILED', { error: 'El archivo CSV no contiene filas de datos' });
      throw new Error('El archivo CSV no contiene filas de datos');
    }

    await job.updateProgress(15);

    // ─── Procesar según tipo ─────────────────────────────────────────────────
    let result: any;
    if (type === 'catalog') {
      result = await this.processCatalog(job, tenantId, records);
    } else if (type === 'prices') {
      result = await this.processPrices(job, tenantId, records);
    } else if (type === 'conditions') {
      result = await this.processConditions(job, tenantId, records);
    } else {
      throw new Error(`Tipo de importación desconocido: ${type}`);
    }

    // Actualizar estado final en DB
    await this.updateJobStatus(job.id as string, 'COMPLETED', result);
    await job.updateProgress(100);

    return result;
  }

  /** Helper para normalizar strings a slugs */
  private toSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-');
  }

  // ─── Importación de Productos y Categorías ─────────────────────────────────
  private async processCatalog(job: Job, tenantId: string, records: any[]) {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Columnas requeridas: sku, name, line
        if (!row.sku || !row.name || !row.line) {
          errors.push(`Fila ${i + 2}: faltan columnas obligatorias (sku, name, line)`);
          failed++;
          continue;
        }

        // 1. Buscar o crear línea (por nombre)
        const lineSlug = this.toSlug(row.line);
        let line = await this.prisma.client.productLine.findFirst({
          where: { tenantId, slug: lineSlug }
        });
        if (!line) {
          line = await this.prisma.client.productLine.create({
            data: { tenantId, name: row.line, slug: lineSlug }
          });
        }

        // 2. Buscar o crear categoría si se proporciona
        let categoryId: string | undefined;
        if (row.category) {
          const catSlug = this.toSlug(row.category);
          let category = await this.prisma.client.productCategory.findFirst({
            where: { tenantId, slug: catSlug }
          });
          if (!category) {
            category = await this.prisma.client.productCategory.create({
              data: { tenantId, name: row.category, slug: catSlug }
            });
          }
          categoryId = category.id;
        }

        // 3. Upsert del producto
        const product = await this.prisma.client.product.upsert({
          where: { tenantId_sku: { tenantId, sku: row.sku } },
          create: {
            tenantId,
            lineId: line.id,
            categoryId: categoryId || null,
            sku: row.sku,
            name: row.name,
            description: row.description || null,
            width: parseFloat(row.width) || 1,
            depth: parseFloat(row.depth) || 1,
            height: parseFloat(row.height) || 1,
            metadata: { unit: row.unit || 'pza' },
            status: 'PUBLISHED',
            active: true
          },
          update: {
            name: row.name,
            lineId: line.id,
            categoryId: categoryId || undefined,
            description: row.description || undefined,
            width: parseFloat(row.width) || undefined,
            depth: parseFloat(row.depth) || undefined,
            height: parseFloat(row.height) || undefined,
            metadata: { unit: row.unit || 'pza' }
          }
        });

        // 4. Precios por lista (A-E) - headers: price_a, price_b, etc.
        const priceTypes = ['a', 'b', 'c', 'd', 'e'];
        for (const pt of priceTypes) {
          const priceVal = parseFloat(row[`price_${pt}`]);
          if (!isNaN(priceVal) && priceVal > 0) {
            const uct = pt.toUpperCase();
            await this.prisma.client.productPrice.upsert({
              where: { productId_priceType: { productId: product.id, priceType: uct } },
              create: { tenantId, productId: product.id, priceType: uct, basePrice: priceVal, currency: row.currency || 'MXN' },
              update: { basePrice: priceVal, currency: row.currency || 'MXN' }
            });
          }
        }

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${i + 2} (${row.sku}): ${err.message}`);
        failed++;
      }

      // Actualizar progreso cada 25 filas
      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    return { success: true, type: 'catalog', succeeded, failed, total: records.length, errors: errors.slice(0, 50) };
  }

  // ─── Importación de Listas de Precios ──────────────────────────────────────
  private async processPrices(job: Job, tenantId: string, records: any[]) {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Columnas requeridas: sku, priceType, basePrice
        if (!row.sku || !row.priceType || !row.basePrice) {
          errors.push(`Fila ${i + 2}: faltan columnas obligatorias (sku, priceType, basePrice)`);
          failed++;
          continue;
        }

        // Buscar producto por SKU
        const product = await this.prisma.client.product.findFirst({
          where: { tenantId, sku: row.sku }
        });
        if (!product) {
          errors.push(`Fila ${i + 2}: producto SKU '${row.sku}' no encontrado`);
          failed++;
          continue;
        }

        const priceType = row.priceType.toUpperCase();
        const basePrice = parseFloat(row.basePrice);
        if (isNaN(basePrice) || basePrice < 0) {
          errors.push(`Fila ${i + 2}: precio inválido '${row.basePrice}'`);
          failed++;
          continue;
        }

        // Upsert del precio
        await this.prisma.client.productPrice.upsert({
          where: { productId_priceType: { productId: product.id, priceType } },
          create: {
            tenantId,
            productId: product.id,
            priceType,
            basePrice,
            currency: row.currency || 'MXN',
          },
          update: {
            basePrice,
            currency: row.currency || 'MXN',
          }
        });

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${i + 2} (${row.sku}): ${err.message}`);
        failed++;
      }

      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    return { success: true, type: 'prices', succeeded, failed, total: records.length, errors: errors.slice(0, 20) };
  }

  // ─── Importación de Condiciones Comerciales ────────────────────────────────
  private async processConditions(job: Job, tenantId: string, records: any[]) {
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Columnas requeridas: conditionType, description
        if (!row.conditionType || !row.description) {
          errors.push(`Fila ${i + 2}: faltan columnas obligatorias (conditionType, description)`);
          failed++;
          continue;
        }

        // Resolver productId si se proporcionó SKU
        let productId: string | undefined;
        if (row.sku) {
          const product = await this.prisma.client.product.findFirst({
            where: { tenantId, sku: row.sku }
          });
          if (product) productId = product.id;
        }

        // Resolver lineId si se proporcionó line (nombre o slug)
        let lineId: string | undefined;
        if (row.line) {
          const lineSlug = this.toSlug(row.line);
          const line = await this.prisma.client.productLine.findFirst({
            where: { tenantId, slug: lineSlug }
          });
          if (line) lineId = line.id;
        }

        // Crear condición
        await this.prisma.client.productCondition.create({
          data: {
            tenantId,
            productId: productId || null,
            lineId: lineId || null,
            conditionType: row.conditionType,
            description: row.description,
            active: row.active !== 'false',
          }
        });

        succeeded++;
      } catch (err: any) {
        errors.push(`Fila ${i + 2}: ${err.message}`);
        failed++;
      }

      if (i % 25 === 0) {
        await job.updateProgress(15 + Math.floor((i / records.length) * 80));
      }
    }

    return { success: true, type: 'conditions', succeeded, failed, total: records.length, errors: errors.slice(0, 20) };
  }

  // ─── Actualizar estado del job en la base de datos ─────────────────────────
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
}
