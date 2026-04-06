/**
 * Creado y diseñado por XO
 */

import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { PricingEngineService } from './pricing.service';
import type { PricingContext } from './pricing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Motor de precios — controla cálculos de precio autorizado y final
@UseGuards(JwtAuthGuard, TenantGuard, UserTypeGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingEngine: PricingEngineService) {}

  /**
   * Calcula el precio de un producto/variante para un distribuidor.
   * Devuelve la cadena completa de trazabilidad.
   */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Post('calculate')
  async calculatePrice(@Body() body: PricingContext) {
    return this.pricingEngine.calculatePrice(body);
  }

  /**
   * Calcula precios para múltiples items.
   * Usado para generar cotizaciones completas.
   */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Post('calculate-bulk')
  async calculateBulk(@Body() body: {
    distributorId: string;
    items: Array<{
      productId: string;
      variantId?: string;
      tenantId: string;
      productLineId: string;
      priceListType?: string;
      quantity?: number;
    }>;
  }) {
    return this.pricingEngine.calculateBulkPrices(body.distributorId, body.items);
  }

  /**
   * Valida si un distribuidor tiene acceso activo a una marca.
   */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Get('validate-access')
  async validateAccess(
    @Query('tenantId') tenantId: string,
    @Query('distributorId') distributorId: string,
  ) {
    const hasAccess = await this.pricingEngine.validateAccess(tenantId, distributorId);
    return { hasAccess };
  }

  /**
   * Obtiene las listas de precio permitidas para un distribuidor con una marca.
   */
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Get('allowed-price-lists')
  async getAllowedPriceLists(
    @Query('tenantId') tenantId: string,
    @Query('distributorId') distributorId: string,
  ) {
    const lists = await this.pricingEngine.getAllowedPriceLists(tenantId, distributorId);
    return { allowedLists: lists };
  }
}
