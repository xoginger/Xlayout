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
import { DistributorsService } from './distributors.service';

// Controlador de distribuidores — accesible para fabricantes (COMPANY_USER) y plataforma (PLATFORM_USER)
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
    // TODO: Enviar notificación por email al(los) fabricante(s) registrados
    return { 
      message: 'Solicitud de registro recibida. Un administrador revisará tu solicitud.',
      id: distributor.id,
    };
  }

  // ── Operaciones protegidas ────────────────────────────────────────────────

  /** Crea una nueva empresa distribuidora */
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    return this.distributorsService.findAll();
  }

  /** Obtiene el detalle completo de un distribuidor */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.distributorsService.findOne(id);
  }

  /** Actualiza datos de un distribuidor */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.distributorsService.updateDistributor(id, body);
  }

  // ── Autorización de acceso fabricante → distribuidor ─────────────────────

  /** 
   * El fabricante (tenantId del token) autoriza a un distribuidor.
   * Devuelve el DistributorCatalogAccess creado o actualizado.
   */
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Delete(':distributorId/revoke-access')
  async revokeAccess(
    @Param('distributorId') distributorId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.distributorsService.revokeAccess(tenantId, distributorId);
  }

  /** Lista los distribuidores autorizados para el fabricante actual */
  @UseGuards(JwtAuthGuard)
  @Get('by-tenant/authorized')
  async findByTenant(@Request() req: any) {
    const tenantId = req.user.tenantId;
    return this.distributorsService.findDistributorsByTenant(tenantId);
  }

  // ── Markup de precios ────────────────────────────────────────────────────

  /** Crea una regla de incremento de precio para un distribuidor */
  @UseGuards(JwtAuthGuard)
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

  /** Desactiva una regla de markup */
  @UseGuards(JwtAuthGuard)
  @Delete(':distributorId/markup/:markupId')
  async deactivateMarkup(
    @Param('distributorId') distributorId: string,
    @Param('markupId') markupId: string,
  ) {
    return this.distributorsService.deactivateMarkup(distributorId, markupId);
  }
}
