/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { PricingEngineService } from './pricing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Motor de precios — accesible para todos los usuarios autenticados con tenant
@UseGuards(JwtAuthGuard, TenantGuard, UserTypeGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingEngine: PricingEngineService) {}

  /** Calcular cotización — todos los usuarios con tenant pueden cotizar */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Post('quote')
  async quote(@Req() req: any, @Body() body: { placements: any[] }) {
    return this.pricingEngine.calculateQuote(req.tenantId, body.placements);
  }

  /** Listas de precios — solo fabricantes y plataforma */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Get('lists')
  async getPriceLists(@Req() req: any) {
    return this.pricingEngine.getPriceLists(req.tenantId);
  }
}
