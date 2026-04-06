/**
 * Creado y diseñado por XO
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingEngineService, PricingResult } from '../pricing/pricing.service';
import { AuditService } from '../audit/audit.service';

/**
 * Servicio de cotizaciones.
 *
 * Implementa dos modos de cotización:
 * - PER_BRAND (STANDARD): una cotización separada por cada marca
 * - CONSOLIDATED (PRO): una sola cotización multi-marca unificada
 *
 * Cada línea de cotización conserva trazabilidad completa del cálculo de precio.
 */
@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private pricingEngine: PricingEngineService,
    private auditService: AuditService,
  ) {}

  // ─── Generación de Cotización ─────────────────────────────────────────────

  /**
   * Genera cotización(es) para un distribuidor a partir de items del proyecto.
   *
   * STANDARD → separa automáticamente por marca (una Quote por marca)
   * PRO → consolida todo en una sola Quote
   */
  async generateQuote(params: {
    userId: string;
    userType: string;
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
    const { userId, userType, projectVersionId, items } = params;
    const creatorId = userId; // Trazabilidad: quién generó la cotización

    // Determinar distribuidor y plan
    let distributorId: string | null = null;
    let plan = 'STANDARD';

    if (userType === 'DISTRIBUTOR_USER') {
      const distUser = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: { distributor: true },
      });
      if (distUser) {
        distributorId = distUser.distributorId;
        plan = distUser.distributor.plan || 'STANDARD';
      }
    }

    // Para usuarios COMPANY_USER, calcular como STANDARD sin distribuidor
    // (fabricante cotizando directamente → usa precio lista A sin descuento)

    // Validar acceso a todas las marcas
    const tenantIds = [...new Set(items.map(i => i.tenantId))];

    if (distributorId) {
      for (const tenantId of tenantIds) {
        const hasAccess = await this.pricingEngine.validateAccess(tenantId, distributorId);
        if (!hasAccess) {
          throw new ForbiddenException(
            `El distribuidor no tiene acceso activo a la marca ${tenantId}. No se puede cotizar.`
          );
        }
      }
    }

    // STANDARD: si mezcla marcas, separar obligatoriamente
    if (plan === 'STANDARD' && tenantIds.length > 1 && distributorId) {
      return this.generatePerBrandQuotes(projectVersionId, distributorId, items, tenantIds, creatorId);
    }

    // PRO o una sola marca → generar cotización
    if (plan === 'PRO' && distributorId) {
      return this.generateConsolidatedQuote(projectVersionId, distributorId, items, creatorId);
    }

    // Caso directo: fabricante o una sola marca STANDARD
    return this.generateSingleQuote(
      projectVersionId,
      distributorId,
      items,
      plan === 'PRO' ? 'CONSOLIDATED' : 'PER_BRAND',
      creatorId,
    );
  }

  /**
   * Genera una cotización por marca (STANDARD multi-marca).
   * Retorna un array de cotizaciones separadas.
   */
  private async generatePerBrandQuotes(
    projectVersionId: string,
    distributorId: string,
    items: any[],
    tenantIds: string[],
    creatorId: string,
  ) {
    const quotes = [];

    for (const tenantId of tenantIds) {
      const brandItems = items.filter(i => i.tenantId === tenantId);
      const quote = await this.generateSingleQuote(
        projectVersionId,
        distributorId,
        brandItems,
        'PER_BRAND',
        creatorId,
      );
      quotes.push(quote);
    }

    return {
      mode: 'PER_BRAND',
      message: `Se generaron ${quotes.length} cotizaciones separadas por marca`,
      quotes,
    };
  }

  /**
   * Genera una cotización consolidada multi-marca (PRO).
   */
  private async generateConsolidatedQuote(
    projectVersionId: string,
    distributorId: string,
    items: any[],
    creatorId: string,
  ) {
    const quote = await this.generateSingleQuote(
      projectVersionId,
      distributorId,
      items,
      'CONSOLIDATED',
      creatorId,
    );

    return {
      mode: 'CONSOLIDATED',
      message: 'Cotización consolidada multi-marca generada',
      quotes: [quote],
    };
  }

  /**
   * Genera una sola cotización con trazabilidad completa.
   */
  private async generateSingleQuote(
    projectVersionId: string,
    distributorId: string | null,
    items: any[],
    quoteMode: 'PER_BRAND' | 'CONSOLIDATED',
    creatorId: string,
  ) {
    const lines: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      let pricing: PricingResult;

      if (distributorId) {
        // Calcular precio con motor de precios completo
        pricing = await this.pricingEngine.calculatePrice({
          tenantId: item.tenantId,
          distributorId,
          productId: item.productId,
          variantId: item.variantId,
          productLineId: item.productLineId,
          priceListType: item.priceListType,
        });
      } else {
        // Sin distribuidor (fabricante directo) → precio base lista A
        const priceRecord = await this.prisma.client.productPrice.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            priceType: item.priceListType || 'A',
            active: true,
          },
        });
        const basePrice = priceRecord ? Number(priceRecord.basePrice) : 0;
        pricing = {
          baseListPrice: basePrice,
          priceListType: item.priceListType || 'A',
          discountPercent: 0,
          authorizedPrice: basePrice,
          proMarkup: 0,
          proposedPrice: basePrice,
          finalPrice: basePrice,
          distributorPlan: 'STANDARD',
          currency: priceRecord?.currency || 'MXN',
        };
      }

      // Obtener datos del producto para la línea
      const product = await this.prisma.client.product.findUnique({
        where: { id: item.productId },
        include: { tenant: { select: { name: true } } },
      });

      const lineTotal = pricing.finalPrice * (item.quantity || 1);
      subtotal += lineTotal;

      lines.push({
        productId: item.productId,
        variantId: item.variantId || null,
        tenantId: item.tenantId,
        tenantName: product?.tenant?.name || '',
        productName: product?.name || 'Producto',
        productSku: product?.sku || null,
        quantity: item.quantity || 1,
        priceListType: pricing.priceListType,
        baseListPrice: pricing.baseListPrice,
        discountPercent: pricing.discountPercent,
        authorizedPrice: pricing.authorizedPrice,
        proMarkup: pricing.proMarkup,
        finalPrice: pricing.finalPrice,
        lineTotal: Math.round(lineTotal * 100) / 100,
        currency: pricing.currency,
        metadata: {
          distributorPlan: pricing.distributorPlan,
          proposedPrice: pricing.proposedPrice,
        },
      });
    }

    // Calcular totales
    subtotal = Math.round(subtotal * 100) / 100;
    const ivaRate = 0.16;
    const ivaAmount = Math.round(subtotal * ivaRate * 100) / 100;
    const totalAmount = Math.round((subtotal + ivaAmount) * 100) / 100;
    const totalPieces = lines.reduce((sum: number, l: any) => sum + l.quantity, 0);

    // Obtener tenantId (para la quote — usar primera marca)
    const primaryTenantId = items[0]?.tenantId || '';

    // Crear la cotización en DB — transacción atómica (quote + lines)
    const quote = await this.prisma.client.$transaction(async (tx: any) => {
      const q = await tx.quote.create({
        data: {
          tenantId: primaryTenantId,
          projectVersionId,
          distributorId,
          creatorId, // Trazabilidad: quién generó la cotización (NC-TRAZ-01)
          quoteMode: quoteMode as any,
          totalAmount,
          subtotalAmount: subtotal,
          ivaAmount,
          totalPieces,
          priceType: lines[0]?.priceListType || 'A',
          status: 'DRAFT',
          quoteData: {
            mode: quoteMode,
            generatedAt: new Date().toISOString(),
            distributorId,
            tenantIds: [...new Set(items.map((i: any) => i.tenantId))],
          },
          lines: {
            create: lines,
          },
        },
        include: {
          lines: true,
        },
      });

      // Validar integridad: la cotización DEBE tener líneas
      if (q.lines.length === 0 && lines.length > 0) {
        throw new BadRequestException('Error de integridad: la cotización se creó sin líneas');
      }

      return q;
    });

    // Auditoría: registrar creación de cotización (fire-and-forget)
    this.auditService.log({
      actorType: 'COMPANY_USER' as any,
      actorId: creatorId,
      tenantId: primaryTenantId || undefined,
      action: 'CREATE_QUOTE',
      entityType: 'QUOTE',
      entityId: quote.id,
      payload: {
        quoteMode,
        totalAmount,
        totalPieces,
        linesCount: quote.lines.length,
      },
    }).catch((err) => console.error('[AuditService] Error registrando cotización:', err.message));

    return quote;
  }

  // ─── Consultas ────────────────────────────────────────────────────────────

  /** Obtener cotizaciones de un proyecto con sus líneas */
  async getQuotesByProject(projectVersionId: string) {
    return this.prisma.client.quote.findMany({
      where: { projectVersionId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Obtener detalle de una cotización con sus líneas */
  async getQuoteDetail(quoteId: string) {
    const quote = await this.prisma.client.quote.findUnique({
      where: { id: quoteId },
      include: { lines: true },
    });
    if (!quote) throw new NotFoundException('Cotización no encontrada');
    return quote;
  }

  // ─── Plantillas de Cotización ─────────────────────────────────────────────

  /** Obtener plantillas del tenant (fabricante) */
  async getTemplatesByTenant(tenantId: string) {
    return this.prisma.client.quoteTemplate.findMany({
      where: { tenantId, ownerType: 'tenant', active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Obtener plantillas del distribuidor */
  async getTemplatesByDistributor(distributorId: string) {
    return this.prisma.client.quoteTemplate.findMany({
      where: { distributorId, ownerType: 'distributor', active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Crear o actualizar plantilla para un tenant */
  async upsertTenantTemplate(tenantId: string, data: any) {
    const existing = await this.prisma.client.quoteTemplate.findFirst({
      where: { tenantId, ownerType: 'tenant', active: true },
    });

    if (existing) {
      return this.prisma.client.quoteTemplate.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          logoUrl: data.logoUrl ?? existing.logoUrl,
          companyName: data.companyName ?? existing.companyName,
          address: data.address ?? existing.address,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          rfc: data.rfc ?? existing.rfc,
          website: data.website ?? existing.website,
          primaryColor: data.primaryColor ?? existing.primaryColor,
          accentColor: data.accentColor ?? existing.accentColor,
          fontFamily: data.fontFamily ?? existing.fontFamily,
          headerText: data.headerText ?? existing.headerText,
          footerText: data.footerText ?? existing.footerText,
          validityDays: data.validityDays ?? existing.validityDays,
          showIva: data.showIva ?? existing.showIva,
          ivaRate: data.ivaRate ?? existing.ivaRate,
          currency: data.currency ?? existing.currency,
        },
      });
    }

    return this.prisma.client.quoteTemplate.create({
      data: {
        ownerType: 'tenant',
        tenantId,
        name: data.name || 'Cotización estándar',
        logoUrl: data.logoUrl || null,
        companyName: data.companyName || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        rfc: data.rfc || null,
        website: data.website || null,
        primaryColor: data.primaryColor || '#4F46E5',
        accentColor: data.accentColor || '#10B981',
        fontFamily: data.fontFamily || 'helvetica',
        headerText: data.headerText || null,
        footerText: data.footerText || null,
        validityDays: data.validityDays ?? 30,
        showIva: data.showIva ?? true,
        ivaRate: data.ivaRate ?? 0.16,
        currency: data.currency || 'MXN',
        isDefault: true,
      },
    });
  }

  /** Crear o actualizar plantilla para un distribuidor PRO */
  async upsertDistributorTemplate(distributorId: string, data: any) {
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: distributorId },
    });
    if (!distributor || distributor.plan !== 'PRO') {
      throw new ForbiddenException('Solo distribuidores PRO pueden crear plantillas de cotización propias');
    }

    const existing = await this.prisma.client.quoteTemplate.findFirst({
      where: { distributorId, ownerType: 'distributor', active: true },
    });

    if (existing) {
      return this.prisma.client.quoteTemplate.update({
        where: { id: existing.id },
        data: {
          name: data.name ?? existing.name,
          logoUrl: data.logoUrl ?? existing.logoUrl,
          companyName: data.companyName ?? existing.companyName,
          address: data.address ?? existing.address,
          phone: data.phone ?? existing.phone,
          email: data.email ?? existing.email,
          rfc: data.rfc ?? existing.rfc,
          website: data.website ?? existing.website,
          primaryColor: data.primaryColor ?? existing.primaryColor,
          accentColor: data.accentColor ?? existing.accentColor,
          headerText: data.headerText ?? existing.headerText,
          footerText: data.footerText ?? existing.footerText,
          validityDays: data.validityDays ?? existing.validityDays,
          showIva: data.showIva ?? existing.showIva,
          ivaRate: data.ivaRate ?? existing.ivaRate,
          currency: data.currency ?? existing.currency,
        },
      });
    }

    return this.prisma.client.quoteTemplate.create({
      data: {
        ownerType: 'distributor',
        distributorId,
        name: data.name || 'Cotización del distribuidor',
        logoUrl: data.logoUrl || null,
        companyName: data.companyName || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        rfc: data.rfc || null,
        website: data.website || null,
        primaryColor: data.primaryColor || '#4F46E5',
        accentColor: data.accentColor || '#10B981',
        headerText: data.headerText || null,
        footerText: data.footerText || null,
        validityDays: data.validityDays ?? 30,
        showIva: data.showIva ?? true,
        ivaRate: data.ivaRate ?? 0.16,
        currency: data.currency || 'MXN',
        isDefault: true,
      },
    });
  }

  /**
   * Resolver plantillas aplicables.
   * PRO → plantilla del distribuidor (cotización unificada)
   * STANDARD → plantilla de cada marca
   */
  async resolveTemplates(userId: string, userType: string, tenantIds: string[]) {
    if (userType === 'DISTRIBUTOR_USER') {
      const distUser = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: { distributor: true },
      });

      if (distUser && distUser.distributor.plan === 'PRO') {
        const distTemplate = await this.prisma.client.quoteTemplate.findFirst({
          where: { distributorId: distUser.distributorId, ownerType: 'distributor', active: true },
        });

        if (distTemplate) {
          return {
            mode: 'unified' as const,
            templates: [{ template: distTemplate, tenantIds }],
          };
        }
      }
    }

    // Modo por marca
    const templates = [];
    for (const tenantId of tenantIds) {
      const tenantTemplate = await this.prisma.client.quoteTemplate.findFirst({
        where: { tenantId, ownerType: 'tenant', active: true },
      });

      templates.push({
        template: tenantTemplate || this.getDefaultTemplate(tenantId),
        tenantIds: [tenantId],
      });
    }

    return {
      mode: 'per-brand' as const,
      templates,
    };
  }

  /** Plantilla por defecto del sistema */
  private getDefaultTemplate(tenantId: string) {
    return {
      id: 'system-default',
      ownerType: 'system',
      tenantId,
      name: 'Cotización XLayout',
      logoUrl: null,
      companyName: null,
      address: null,
      phone: null,
      email: null,
      rfc: null,
      website: null,
      primaryColor: '#4F46E5',
      accentColor: '#10B981',
      fontFamily: 'helvetica',
      headerText: null,
      footerText: 'Esta cotización tiene carácter informativo y no constituye un compromiso comercial vinculante.',
      validityDays: 30,
      showIva: true,
      ivaRate: 0.16,
      currency: 'MXN',
      isDefault: true,
    };
  }

  /** Eliminar plantilla (soft delete) */
  async deleteTemplate(id: string, ownerType: string, ownerId: string) {
    const template = await this.prisma.client.quoteTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('Plantilla no encontrada');

    if (ownerType === 'tenant' && template.tenantId !== ownerId) {
      throw new ForbiddenException('No puedes eliminar esta plantilla');
    }
    if (ownerType === 'distributor' && template.distributorId !== ownerId) {
      throw new ForbiddenException('No puedes eliminar esta plantilla');
    }

    return this.prisma.client.quoteTemplate.update({
      where: { id },
      data: { active: false },
    });
  }
}
