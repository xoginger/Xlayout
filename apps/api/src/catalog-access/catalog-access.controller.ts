/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { CatalogAccessService } from './catalog-access.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Solo PLATFORM_USER y COMPANY_USER pueden gestionar acceso a catálogos
@Controller('catalog-access')
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
export class CatalogAccessController {
  constructor(private readonly service: CatalogAccessService) {}

  /** POST /catalog-access — Otorgar acceso a un usuario final (acción de usuario de empresa) */
  @Post()
  grant(@Body() body: {
    tenantId: string;
    endUserId: string;
    catalogEnabled?: boolean;
    pricesEnabled?: boolean;
    conditionsEnabled?: boolean;
    activatedByUserId?: string;
    expiresAt?: string;
  }) {
    return this.service.grantAccess({
      ...body,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  /** POST /catalog-access/by-email — Otorgar acceso a un usuario final vía email */
  @Post('by-email')
  grantByEmail(@Req() req: any, @Body() body: any) {
    return this.service.grantAccessByEmail(req.tenantId, body.email, {
      catalogEnabled: body.catalogEnabled,
      pricesEnabled: body.pricesEnabled,
      conditionsEnabled: body.conditionsEnabled,
      activatedByUserId: req.user.sub,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  /** GET /catalog-access/tenant/:tenantId — Listar todos los accesos para un tenant */
  @Get('tenant/:tenantId')
  listByTenant(@Param('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  /** DELETE /catalog-access/tenant/:tenantId/user/:endUserId — Revocar acceso */
  @Delete('tenant/:tenantId/user/:endUserId')
  revoke(
    @Param('tenantId') tenantId: string,
    @Param('endUserId') endUserId: string,
  ) {
    return this.service.revokeAccess(tenantId, endUserId);
  }
}
