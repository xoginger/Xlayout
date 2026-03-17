import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CatalogAccessService } from './catalog-access.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('catalog-access')
@UseGuards(JwtAuthGuard)
export class CatalogAccessController {
  constructor(private readonly service: CatalogAccessService) {}

  /** POST /catalog-access — Grant access to an end user (company user action) */
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

  /** GET /catalog-access/tenant/:tenantId — List all accesses for a tenant */
  @Get('tenant/:tenantId')
  listByTenant(@Param('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  /** DELETE /catalog-access/tenant/:tenantId/user/:endUserId — Revoke access */
  @Delete('tenant/:tenantId/user/:endUserId')
  revoke(
    @Param('tenantId') tenantId: string,
    @Param('endUserId') endUserId: string,
  ) {
    return this.service.revokeAccess(tenantId, endUserId);
  }
}
