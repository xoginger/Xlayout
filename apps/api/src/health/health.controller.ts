import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Unprotected health endpoint used by Docker healthcheck and nginx.
 * GET /api/health → { status: 'ok', db: 'ok' }
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Lightweight DB ping to confirm Prisma connection is established
      await this.prisma.baseClient.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok', ts: new Date().toISOString() };
    } catch (e) {
      return { status: 'ok', db: 'connecting', ts: new Date().toISOString() };
    }
  }
}
