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
    
    await job.updateProgress(10);

    if (type === 'catalog') {
      try {
        let fileContent = '';
        if (fileUrl.startsWith('http')) {
          const res = await fetch(fileUrl);
          fileContent = await res.text();
        } else {
          const basePath = process.env.UPLOAD_DIR || '/app/storage';
          const relativePath = fileUrl.replace('/storage/', '');
          const absolutePath = path.join(basePath, relativePath);
          fileContent = fs.readFileSync(absolutePath, 'utf8');
        }

        await job.updateProgress(30);

        const records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        });

        let rowsInserted = 0;

        for (const row of records as any[]) {
          // Columns expected: sku, name, line_slug, width, depth, height, price_a, price_b, price_c, price_d, price_e
          if (!row.sku || !row.name || !row.line_slug) continue;

          let line = await this.prisma.client.productLine.findFirst({
            where: { tenantId, slug: row.line_slug }
          });
          if (!line) {
            line = await this.prisma.client.productLine.create({
              data: { tenantId, name: row.line_slug, slug: row.line_slug }
            });
          }

          const product = await this.prisma.client.product.upsert({
            where: { tenantId_sku: { tenantId, sku: row.sku } },
            create: {
              tenantId,
              lineId: line.id,
              sku: row.sku,
              name: row.name,
              width: parseFloat(row.width) || 1,
              depth: parseFloat(row.depth) || 1,
              height: parseFloat(row.height) || 1,
              status: 'PUBLISHED',
              active: true
            },
            update: {
              name: row.name,
              width: parseFloat(row.width) || 1,
              depth: parseFloat(row.depth) || 1,
              height: parseFloat(row.height) || 1,
            }
          });

          const priceTypes = ['a', 'b', 'c', 'd', 'e'];
          for (const pt of priceTypes) {
            const priceVal = parseFloat(row[`price_${pt}`]);
            if (!isNaN(priceVal) && priceVal > 0) {
              const uct = pt.toUpperCase();
              await this.prisma.client.productPrice.upsert({
                where: {
                  productId_priceType: {
                    productId: product.id,
                    priceType: uct
                  }
                },
                create: {
                  tenantId,
                  productId: product.id,
                  priceType: uct,
                  basePrice: priceVal,
                  currency: row.currency || 'MXN'
                },
                update: {
                  basePrice: priceVal,
                  currency: row.currency || 'MXN'
                }
              });
            }
          }

          rowsInserted++;
          if (rowsInserted % 50 === 0) {
            await job.updateProgress(30 + Math.floor((rowsInserted / records.length) * 60));
          }
        }

        await job.updateProgress(100);
        return { success: true, rowsInserted, type: 'catalog' };
      } catch (err: any) {
        throw new Error(`Import failed: ${err.message}`);
      }
    } 
    else if (type === 'prices') {
      await job.updateProgress(100);
      return { success: true, rulesUpdated: 0, type: 'prices' };
    }

    throw new Error('Unknown import type');
  }
}
