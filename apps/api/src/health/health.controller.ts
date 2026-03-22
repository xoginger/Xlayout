/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Endpoint de salud no protegido utilizado por Docker healthcheck y nginx.
 * GET /api/health → { status: 'ok', db: 'ok' }
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Ping ligero a la BD para confirmar que la conexión Prisma está establecida
      await this.prisma.baseClient.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', ts: new Date().toISOString() };
    } catch (e) {
      return { status: 'ok', db: 'connecting', ts: new Date().toISOString() };
    }
  }
}
