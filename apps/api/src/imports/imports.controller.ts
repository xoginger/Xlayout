/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post()
  async triggerImport(@Req() req: any, @Body() body: { type: 'catalog' | 'prices'; fileUrl: string }) {
    return this.importsService.triggerImport(req.tenantId, body.type, body.fileUrl);
  }

  @Get()
  async getImports(@Req() req: any) {
    return this.importsService.getImportsByTenant(req.tenantId);
  }

  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.importsService.getImportStatus(id);
  }
}
