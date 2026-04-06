/**
 * Creado y diseñado por XO
 * XLayout System — Servicio de Importaciones v2
 *
 * Encola trabajos de importación CSV/XLSX en BullMQ y registra en la base de datos.
 * Soporta modo dry-run (preview) para análisis previo sin escritura.
 */

import { Injectable, Logger } from '@nestjs/common';
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
   * @param dryRun - Si es true, solo analiza sin escribir en DB
   */
  async triggerImport(
    tenantId: string,
    type: 'catalog' | 'prices' | 'conditions' | 'commercial-relations',
    fileUrl: string,
    originalName: string,
    userId: string,
    dryRun: boolean = false,
  ) {
    // Generar ID único para el job de importación
    const jobId = crypto.randomUUID();

    // Encolar en BullMQ
    const job = await this.importsQueue.add('process-import', {
      tenantId,
      type,
      fileUrl,
      originalName,
      dryRun,
      jobId,
      timestamp: Date.now()
    });

    // Registrar en base de datos para historial
    // Solo registrar si no es dry-run (preview no se guarda en historial)
    if (!dryRun) {
      try {
        await this.prisma.client.importJob.create({
          data: {
            id: jobId,
            tenantId,
            type: type.toUpperCase(),
            filename: originalName,
            status: 'PENDING',
            createdById: userId,
          }
        });
      } catch (err: any) {
        // Si falla el registro en BD, loguear pero no bloquear la importación
        Logger.error(`Error registrando ImportJob en BD: ${err.message}`, 'ImportsService');
      }
    }

    return {
      message: dryRun
        ? 'Análisis previo encolado. Se procesará en breve.'
        : 'Importación encolada exitosamente',
      jobId,
      type,
      filename: originalName,
      dryRun,
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
