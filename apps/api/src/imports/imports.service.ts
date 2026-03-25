/**
 * Creado y diseñado por XO
 * XLayout System — Servicio de Importaciones
 *
 * Encola trabajos de importación CSV en BullMQ y registra en la base de datos.
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

  /**
   * Encolar trabajo de importación y registrarlo en la base de datos.
   * @param tenantId - ID del tenant autenticado
   * @param type - Tipo: catalog, prices, conditions
   * @param fileUrl - Ruta del archivo subido o URL remota
   * @param originalName - Nombre original del archivo
   * @param userId - ID del usuario que inició la importación
   */
  async triggerImport(
    tenantId: string,
    type: 'catalog' | 'prices' | 'conditions',
    fileUrl: string,
    originalName: string,
    userId: string,
  ) {
    // Encolar en BullMQ
    const job = await this.importsQueue.add('process-import', {
      tenantId,
      type,
      fileUrl,
      originalName,
      timestamp: Date.now()
    });

    // Registrar en base de datos para historial
    await this.prisma.client.importJob.create({
      data: {
        id: job.id,
        tenantId,
        type: type.toUpperCase(),
        filename: originalName,
        status: 'PENDING',
        createdById: userId,
      }
    });

    return {
      message: 'Importación encolada exitosamente',
      jobId: job.id,
      type,
      filename: originalName,
    };
  }

  /** Consultar estado de un job desde la cola o la base de datos */
  async getImportStatus(jobId: string) {
    const job = await this.importsQueue.getJob(jobId);
    if (!job) {
      // Verificar en base de datos como respaldo
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

  /** Listar las últimas 50 importaciones de un tenant */
  async getImportsByTenant(tenantId: string) {
    return this.prisma.client.importJob.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}
