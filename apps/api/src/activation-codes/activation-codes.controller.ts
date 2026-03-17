import { Controller, Post, Get, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ActivationCodesService } from './activation-codes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activation-codes')
@UseGuards(JwtAuthGuard)
export class ActivationCodesController {
  constructor(private readonly service: ActivationCodesService) {}

  /** POST /activation-codes — Create a new activation code */
  @Post()
  create(@Req() req: any, @Body() body: {
    catalogEnabled?: boolean;
    pricesEnabled?: boolean;
    conditionsEnabled?: boolean;
    maxUses?: number;
    expiresAt?: string;
  }) {
    return this.service.create({
      ...body,
      tenantId: req.tenantId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  /** GET /activation-codes/tenant/:tenantId — List all codes for a tenant */
  @Get('tenant/:tenantId')
  listByTenant(@Param('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  /** GET /activation-codes/validate/:code — Validate without redeeming */
  @Get('validate/:code')
  validate(@Param('code') code: string) {
    return this.service.validate(code);
  }

  /** DELETE /activation-codes/:id — Deactivate a code */
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
