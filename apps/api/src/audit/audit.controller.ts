/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * GET /audit/platform
   * Log de auditoría global con filtros opcionales.
   * Solo accesible por PLATFORM_USER (validación de rol en servicio si es necesario).
   */
  @Get('platform')
  getGlobalActivity(
    @Query('actorType') actorType?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('tenantId') tenantId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.findGlobal({
      actorType,
      entityType,
      action,
      tenantId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: parseInt(limit || '100'),
    });
  }

  @Get('company')
  getCompanyActivity(@Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return [];
    }
    return this.auditService.findByTenant(tenantId);
  }
}
