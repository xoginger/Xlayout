/**
 * Creado y diseñado por XO
 * XLayout System — Health Controller mejorado (NC-OPS-02, NC-OPS-03)
 *
 * Endpoints:
 *   GET /api/health        → Estado general (DB + Redis)
 *   GET /api/health/worker → Estado del worker BullMQ
 */

import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(private readonly prisma: PrismaService) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 3000,
    });
    this.redis.connect().catch(() => {});
  }

  /**
   * Health check principal — verifica DB + Redis
   * Usado por Docker healthcheck y Nginx
   */
  @Get()
  async check() {
    const result: any = {
      status: 'ok',
      ts: new Date().toISOString(),
      db: 'error',
      redis: 'error',
    };

    // Check DB
    try {
      await this.prisma.baseClient.$queryRaw`SELECT 1`;
      result.db = 'ok';
    } catch {
      result.db = 'error';
      result.status = 'degraded';
    }

    // Check Redis
    try {
      const pong = await this.redis.ping();
      result.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      result.redis = 'error';
      result.status = 'degraded';
    }

    return result;
  }

  /**
   * Worker health check — verifica Redis y estado de la cola BullMQ
   * Usado por Docker healthcheck del contenedor worker
   */
  @Get('worker')
  async workerCheck() {
    const result: any = {
      status: 'ok',
      ts: new Date().toISOString(),
      redis: 'error',
      queues: {} as Record<string, any>,
    };

    // Verificar conexión Redis
    try {
      const pong = await this.redis.ping();
      result.redis = pong === 'PONG' ? 'ok' : 'error';
    } catch {
      result.redis = 'error';
      result.status = 'error';
      return result;
    }

    // Verificar colas BullMQ
    const queueNames = ['imports', 'conversion'];
    for (const queueName of queueNames) {
      try {
        // BullMQ almacena metadata de cola en keys Redis
        const waitingKey = `bull:${queueName}:wait`;
        const activeKey = `bull:${queueName}:active`;
        const failedKey = `bull:${queueName}:failed`;

        const [waiting, active, failed] = await Promise.all([
          this.redis.llen(waitingKey),
          this.redis.llen(activeKey),
          this.redis.zcard(failedKey),
        ]);

        result.queues[queueName] = {
          status: 'ok',
          waiting,
          active,
          failed,
        };
      } catch {
        result.queues[queueName] = { status: 'error' };
      }
    }

    return result;
  }
}
