/**
 * Creado y diseñado por XO
 */

import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  /**
   * Genera cotización(es) a partir de items del proyecto.
   * STANDARD → separada por marca
   * PRO → consolidada multi-marca
   */
  @Post('generate')
  async generateQuote(@Req() req: any, @Body() body: {
    projectVersionId: string;
    items: Array<{
      productId: string;
      variantId?: string;
      tenantId: string;
      productLineId: string;
      quantity: number;
      priceListType?: string;
    }>;
  }) {
    const { userId, userType } = this.extractContext(req);
    return this.quotesService.generateQuote({
      userId,
      userType,
      projectVersionId: body.projectVersionId,
      items: body.items,
    });
  }

  /** Obtener cotizaciones de una versión de proyecto */
  @Get('by-project/:projectVersionId')
  async getByProject(@Param('projectVersionId') projectVersionId: string) {
    return this.quotesService.getQuotesByProject(projectVersionId);
  }

  /** Obtener detalle de una cotización con líneas */
  @Get(':id')
  async getDetail(@Param('id') id: string) {
    return this.quotesService.getQuoteDetail(id);
  }

  /** Obtener líneas de una cotización con trazabilidad */
  @Get(':id/lines')
  async getLines(@Param('id') id: string) {
    const quote = await this.quotesService.getQuoteDetail(id);
    return quote.lines;
  }

  // ─── Plantillas ───────────────────────────────────────────────────────────

  /** Obtener plantillas del usuario actual (según tipo) */
  @Get('templates/list')
  async getTemplates(@Req() req: any) {
    const { userType, tenantId, distributorId } = this.extractContext(req);

    if (userType === 'DISTRIBUTOR_USER' && distributorId) {
      return this.quotesService.getTemplatesByDistributor(distributorId);
    }
    if (tenantId) {
      return this.quotesService.getTemplatesByTenant(tenantId);
    }
    return [];
  }

  /** Crear/actualizar plantilla de cotización */
  @Post('templates')
  async upsertTemplate(@Req() req: any, @Body() body: any) {
    const { userType, tenantId, distributorId } = this.extractContext(req);

    if (userType === 'DISTRIBUTOR_USER' && distributorId) {
      return this.quotesService.upsertDistributorTemplate(distributorId, body);
    }
    if (tenantId) {
      return this.quotesService.upsertTenantTemplate(tenantId, body);
    }
    throw new Error('No se pudo determinar el contexto del usuario');
  }

  /** Resolver plantillas aplicables para generar PDF */
  @Get('templates/resolve')
  async resolveTemplates(@Req() req: any, @Query('tenantIds') tenantIdsStr: string) {
    const { userId, userType } = this.extractContext(req);
    const tenantIds = tenantIdsStr ? tenantIdsStr.split(',').filter(Boolean) : [];
    return this.quotesService.resolveTemplates(userId, userType, tenantIds);
  }

  /** Eliminar plantilla */
  @Delete('templates/:id')
  async deleteTemplate(@Req() req: any, @Param('id') id: string) {
    const { userType, tenantId, distributorId } = this.extractContext(req);
    const ownerType = userType === 'DISTRIBUTOR_USER' ? 'distributor' : 'tenant';
    const ownerId = ownerType === 'distributor' ? distributorId : tenantId;
    return this.quotesService.deleteTemplate(id, ownerType, ownerId);
  }

  /** Subir logo para la plantilla */
  @Post('templates/:id/logo')
  async uploadLogo(@Req() req: any, @Param('id') id: string, @Body() body: { logoUrl: string }) {
    const { userType, tenantId, distributorId } = this.extractContext(req);
    if (userType === 'DISTRIBUTOR_USER' && distributorId) {
      return this.quotesService.upsertDistributorTemplate(distributorId, { logoUrl: body.logoUrl });
    }
    if (tenantId) {
      return this.quotesService.upsertTenantTemplate(tenantId, { logoUrl: body.logoUrl });
    }
    throw new Error('No se pudo determinar el contexto');
  }

  /**
   * Extrae el contexto del usuario autenticado del request.
   */
  private extractContext(req: any) {
    const user = req.user;
    return {
      userId: user.sub || user.userId || user.id,
      userType: user.userType || user.type || 'COMPANY_USER',
      tenantId: user.tenantId || req.headers['x-tenant-id'] || null,
      distributorId: user.distributorId || null,
    };
  }
}
