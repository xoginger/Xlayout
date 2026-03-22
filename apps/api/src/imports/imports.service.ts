/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ImportsService {
  constructor(
    @InjectQueue('imports') private importsQueue: Queue,
    private readonly prisma: PrismaService
  ) {}

  async triggerImport(tenantId: string, type: 'catalog' | 'prices', fileUrl: string) {
    const job = await this.importsQueue.add('process-import', {
      tenantId,
      type,
      fileUrl,
      timestamp: Date.now()
    });
    
    // Crear un registro en la base de datos para el seguimiento histórico
    await this.prisma.client.importJob.create({
      data: {
        id: job.id,
        tenantId,
        type: type.toUpperCase(),
        filename: fileUrl.split('/').pop() || 'upload.csv',
        status: 'PENDING',
        createdById: 'system', // o el ID de usuario real si se pasa
      }
    });

    return {
      message: 'Importación encolada exitosamente',
      jobId: job.id
    };
  }

  async getImportStatus(jobId: string) {
    const job = await this.importsQueue.getJob(jobId);
    if (!job) {
      // Verificar la base de datos como respaldo
      const dbJob = await this.prisma.client.importJob.findUnique({ where: { id: jobId } });
      if (dbJob) return dbJob;
      return { status: 'NOT_FOUND' };
    }
    
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason
    };
  }

  async getImportsByTenant(tenantId: string) {
    return this.prisma.client.importJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}
