/**
 * Creado y diseñado por XO
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DistributorOwnershipGuard } from '../common/guards/distributor-ownership.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';
import { AllowedRoles } from '../common/decorators/roles.decorator';
import { DistributorsService } from './distributors.service';
import { ManufacturerDistributorService } from './manufacturer-distributor.service';

// Controlador de distribuidores — accesible según tipo de usuario y ownership
@Controller('distributors')
export class DistributorsController {
  constructor(
    private readonly distributorsService: DistributorsService,
    private readonly mdService: ManufacturerDistributorService,
  ) {}

  // ── Registro público (sin auth requerida) ─────────────────────────────────

  /** Registro público de distribuidor — crea empresa con status PENDING */
  @Post('register')
  async register(@Body() body: {
    name: string;
    contactEmail: string;
    phone?: string;
    country?: string;
  }) {
    const distributor = await this.distributorsService.createDistributor({
      ...body,
      metadata: { registeredAt: new Date().toISOString(), source: 'public_form' },
    });
    return { 
      message: 'Solicitud de registro recibida. Un administrador revisará tu solicitud.',
      id: distributor.id,
    };
  }

  // ── Operaciones protegidas — solo PLATFORM_USER y COMPANY_USER ────────────

  /** Crea una nueva empresa distribuidora */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post()
  async create(@Body() body: {
    name: string;
    contactEmail?: string;
    phone?: string;
    country?: string;
    plan?: 'STANDARD' | 'PRO';
    metadata?: any;
  }) {
    return this.distributorsService.createDistributor(body);
  }

  /** Lista todos los distribuidores del sistema */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Get()
  async findAll() {
    return this.distributorsService.findAll();
  }

  /** Obtiene el detalle de un distribuidor — con validación de ownership para DISTRIBUTOR_USER */
  @UseGuards(JwtAuthGuard, UserTypeGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Get(':distributorId')
  async findOne(@Param('distributorId') distributorId: string) {
    return this.distributorsService.findOne(distributorId);
  }

  /** Actualiza datos de un distribuidor */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.distributorsService.updateDistributor(id, body);
  }

  // ── Autorización de acceso fabricante → distribuidor ─────────────────────

  /** 
   * El fabricante (tenantId del token) autoriza a un distribuidor.
   * Ahora soporta múltiples listas de precio.
   */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post(':distributorId/grant-access')
  async grantAccess(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
    @Body() body: {
      priceListTypes?: string[];
      priceListType?: string; // Compatibilidad con versión anterior
      defaultPriceList?: string;
      notes?: string;
      expiresAt?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return { error: 'Debe estar autenticado como usuario de un fabricante' };
    }

    // Compatibilidad: si solo viene priceListType (string), convertir a array
    const lists = body.priceListTypes || (body.priceListType ? [body.priceListType] : ['A']);
    const defaultList = body.defaultPriceList || lists[0] || 'A';

    return this.distributorsService.grantAccess(
      tenantId,
      distributorId,
      lists,
      defaultList,
      body.notes,
      body.expiresAt ? new Date(body.expiresAt) : undefined,
    );
  }

  /** Revoca el acceso de un distribuidor al catálogo del fabricante */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Delete(':distributorId/revoke-access')
  async revokeAccess(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.distributorsService.revokeAccess(tenantId, distributorId);
  }

  /** Lista los distribuidores autorizados para el fabricante actual */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Get('by-tenant/authorized')
  async findByTenant(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.distributorsService.findDistributorsByTenant(tenantId);
  }

  // ── Listas de Precio Permitidas ───────────────────────────────────────────

  /** Asigna listas de precio permitidas a un distribuidor */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post(':distributorId/allowed-price-lists')
  async assignAllowedPriceLists(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
    @Body() body: {
      priceLists: Array<{ priceListType: string; isDefault?: boolean }>;
    },
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.assignAllowedPriceLists(tenantId, distributorId, body.priceLists);
  }

  /** Revoca una lista de precio */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Delete(':distributorId/allowed-price-lists/:priceListType')
  async revokeAllowedPriceList(
    @Param('distributorId') distributorId: string,
    @Param('priceListType') priceListType: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.revokeAllowedPriceList(tenantId, distributorId, priceListType);
  }

  /** Obtiene listas permitidas de un distribuidor para el fabricante actual */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Get(':distributorId/allowed-price-lists')
  async getAllowedPriceLists(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.getAllowedPriceLists(tenantId, distributorId);
  }

  // ── Descuentos de Marca al Distribuidor ───────────────────────────────────

  /** Asigna un descuento al distribuidor */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post(':distributorId/discount')
  async assignDiscount(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
    @Body() body: {
      discountPercent: number;
      scope?: 'GLOBAL' | 'BY_LINE' | 'BY_PRODUCT';
      productLineId?: string;
      productId?: string;
    },
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.assignDiscount(tenantId, distributorId, body);
  }

  /** Actualiza un descuento existente */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch(':distributorId/discount/:discountId')
  async updateDiscount(
    @Param('distributorId') distributorId: string,
    @Param('discountId') discountId: string,
    @Request() req: any,
    @Body() body: { discountPercent?: number; active?: boolean },
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.updateDiscount(tenantId, discountId, body);
  }

  /** Obtiene descuentos del distribuidor para el fabricante actual */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Get(':distributorId/discounts')
  async getDiscounts(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.mdService.getDiscounts(tenantId, distributorId);
  }

  // ── Resumen de Relación Marca↔Distribuidor ────────────────────────────────

  /** Obtiene el resumen completo de la relación */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
  @Get(':distributorId/relationship/:tenantId')
  async getRelationshipSummary(
    @Param('distributorId') distributorId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return this.mdService.getRelationshipSummary(tenantId, distributorId);
  }

  /** Obtiene las marcas autorizadas para el distribuidor */
  @UseGuards(JwtAuthGuard, UserTypeGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @Get(':distributorId/authorized-brands')
  async getAuthorizedBrands(@Param('distributorId') distributorId: string) {
    return this.mdService.getAuthorizedBrands(distributorId);
  }

  // ── Reglas de Pricing PRO ─────────────────────────────────────────────────

  /** Crea una regla de pricing PRO — solo distribuidores PRO */
  @UseGuards(JwtAuthGuard, UserTypeGuard, RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Post(':distributorId/pro-pricing-rule')
  async setProPricingRule(
    @Param('distributorId') distributorId: string,
    @Body() body: {
      scope: 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT';
      markupPercent: number;
      tenantId?: string;
      productLineId?: string;
      productId?: string;
      priority?: number;
    },
  ) {
    return this.distributorsService.setProPricingRule(distributorId, body);
  }

  /** Desactiva una regla de pricing PRO */
  @UseGuards(JwtAuthGuard, UserTypeGuard, RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Delete(':distributorId/pro-pricing-rule/:ruleId')
  async deactivateProPricingRule(
    @Param('distributorId') distributorId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.distributorsService.deactivateProPricingRule(distributorId, ruleId);
  }

  // ── Branding PRO ──────────────────────────────────────────────────────────

  /** Actualiza la configuración de branding del distribuidor PRO */
  @UseGuards(JwtAuthGuard, UserTypeGuard, RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Post(':distributorId/branding')
  async upsertBranding(
    @Param('distributorId') distributorId: string,
    @Body() body: any,
  ) {
    return this.distributorsService.upsertBranding(distributorId, body);
  }

  // ── Legacy Markup (compatibilidad) ────────────────────────────────────────

  /** Crea una regla de incremento de precio (legacy) */
  @UseGuards(JwtAuthGuard, UserTypeGuard, RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Post(':distributorId/markup')
  async setMarkup(
    @Param('distributorId') distributorId: string,
    @Body() body: {
      scope: 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT';
      markupPercent: number;
      tenantId?: string;
      productLineId?: string;
      productId?: string;
      priority?: number;
    },
  ) {
    return this.distributorsService.setMarkup(distributorId, body);
  }

  /** Desactiva una regla de markup (legacy) */
  @UseGuards(JwtAuthGuard, UserTypeGuard, RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Delete(':distributorId/markup/:markupId')
  async deactivateMarkup(
    @Param('distributorId') distributorId: string,
    @Param('markupId') markupId: string,
  ) {
    return this.distributorsService.deactivateMarkup(distributorId, markupId);
  }
}
