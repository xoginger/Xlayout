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

// Controlador de distribuidores — accesible según tipo de usuario y ownership
@Controller('distributors')
export class DistributorsController {
  constructor(private readonly distributorsService: DistributorsService) {}

  // ── Registro público (sin auth requerida) ─────────────────────────────────

  /** Registro público de distribuidor — crea empresa con status PENDING */
  @Post('register')
  async register(@Body() body: {
    name: string;
    contactEmail: string;
    phone?: string;
    country?: string;
  }) {
    // Crear distribuidor con estado pendiente de aprobación
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
   * Devuelve el DistributorCatalogAccess creado o actualizado.
   */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post(':distributorId/grant-access')
  async grantAccess(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
    @Body() body: {
      priceListType?: string;
      notes?: string;
      expiresAt?: string;
    },
  ) {
    // El tenantId viene del token JWT del CompanyUser/PlatformUser
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return { error: 'Debe estar autenticado como usuario de un fabricante' };
    }

    return this.distributorsService.grantAccess(
      tenantId,
      distributorId,
      body.priceListType || 'A',
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

  // ── Markup — solo DISTRIBUTOR_ADMIN de su propio distribuidor ─────────────

  /** Crea una regla de incremento de precio — validación de ownership */
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

  /** Desactiva una regla de markup — validación de ownership */
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
