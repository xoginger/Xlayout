/**
 * Creado y diseñado por XO
 */

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Contexto de cálculo de precio — identifica variante, marca y distribuidor
 */
export interface PricingContext {
  tenantId: string;       // Fabricante (marca)
  distributorId: string;  // Distribuidor que solicita
  productId: string;
  variantId?: string;
  productLineId: string;
  priceListType?: string; // Lista específica solicitada (ej: 'A','B')
}

/**
 * Resultado del cálculo de precio con trazabilidad completa
 */
export interface PricingResult {
  baseListPrice: number;     // Precio base de la lista seleccionada
  priceListType: string;     // Lista usada
  discountPercent: number;   // Descuento de marca aplicado
  authorizedPrice: number;   // Precio autorizado = baseListPrice * (1 - discount/100)
  proMarkup: number;         // Markup PRO aplicado (0 si STANDARD)
  proposedPrice: number;     // Precio propuesto por fórmula PRO
  finalPrice: number;        // max(authorizedPrice, proposedPrice) — o authorizedPrice si STANDARD
  distributorPlan: string;   // 'STANDARD' | 'PRO'
  currency: string;
}

@Injectable()
export class PricingEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * Flujo completo de cálculo de precio para un producto/variante
   * dentro del contexto de un distribuidor.
   *
   * 1. Valida relación activa marca↔distribuidor
   * 2. Valida lista de precio permitida
   * 3. Obtiene baseListPrice
   * 4. Aplica descuento de marca → authorizedPrice
   * 5. Si PRO → aplica fórmula con piso mínimo
   */
  async calculatePrice(ctx: PricingContext): Promise<PricingResult> {
    // ─── 1. Validar relación activa marca↔distribuidor ─────────────────
    const access = await this.prisma.client.manufacturerDistributorAccess.findUnique({
      where: {
        tenantId_distributorId: {
          tenantId: ctx.tenantId,
          distributorId: ctx.distributorId,
        },
      },
    });

    if (!access || !access.active) {
      throw new ForbiddenException(
        `No existe relación activa entre la marca (${ctx.tenantId}) y el distribuidor (${ctx.distributorId})`
      );
    }

    // ─── 2. Determinar lista de precios ─────────────────────────────────
    let priceListType = ctx.priceListType || access.defaultPriceList || 'A';

    // Validar que la lista está permitida
    const allowedLists = await this.prisma.client.manufacturerDistributorAllowedPriceList.findMany({
      where: {
        tenantId: ctx.tenantId,
        distributorId: ctx.distributorId,
        active: true,
      },
    });

    // Si hay listas definidas, validar que la solicitada está permitida
    if (allowedLists.length > 0) {
      const allowed = allowedLists.find((l: any) => l.priceListType === priceListType);
      if (!allowed) {
        // Usar la lista por defecto si la solicitada no está permitida
        const defaultList = allowedLists.find((l: any) => l.isDefault) || allowedLists[0];
        priceListType = defaultList.priceListType;
      }
    }

    // ─── 3. Obtener precio base de la lista ─────────────────────────────
    const priceRecord = await this.prisma.client.productPrice.findFirst({
      where: {
        productId: ctx.productId,
        variantId: ctx.variantId || null,
        priceType: priceListType,
        active: true,
      },
    });

    // Si no hay precio en la lista solicitada, buscar en lista A
    let baseListPrice = 0;
    let currency = 'MXN';
    if (priceRecord) {
      baseListPrice = Number(priceRecord.basePrice);
      currency = priceRecord.currency;
    } else {
      // Fallback a lista A
      const fallback = await this.prisma.client.productPrice.findFirst({
        where: {
          productId: ctx.productId,
          variantId: ctx.variantId || null,
          priceType: 'A',
          active: true,
        },
      });
      if (fallback) {
        baseListPrice = Number(fallback.basePrice);
        currency = fallback.currency;
      }
    }

    // ─── 4. Aplicar descuento de marca → authorizedPrice ────────────────
    const discountPercent = await this.getApplicableDiscount(
      ctx.tenantId,
      ctx.distributorId,
      ctx.productLineId,
      ctx.productId,
    );
    const authorizedPrice = baseListPrice * (1 - discountPercent / 100);

    // ─── 4. Determinar plan del distribuidor ────────────────────────────
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: ctx.distributorId },
    });
    const plan = distributor?.plan || 'STANDARD';

    // ─── 5. Obtener regla de markup PRO si aplica ───────────────────────
    let proMarkup = 0;
    if (plan === 'PRO') {
      proMarkup = await this.getApplicableProMarkup(
        ctx.distributorId,
        ctx.tenantId,
        ctx.productLineId,
        ctx.productId,
      );
    }

    // ─── 5. Invocar fórmula de única fuente de verdad ──────────────────────
    const calcResult = PricingEngineService.calculatePriceFormula(
      baseListPrice,
      discountPercent,
      proMarkup,
      plan as 'STANDARD' | 'PRO'
    );

    return {
      baseListPrice: calcResult.baseListPrice,
      priceListType,
      discountPercent: calcResult.discountPercent,
      authorizedPrice: calcResult.authorizedPrice,
      proMarkup: calcResult.proMarkup,
      proposedPrice: calcResult.proposedPrice,
      finalPrice: calcResult.finalPrice,
      distributorPlan: plan,
      currency,
    };
  }

  /**
   * ÚNICA FUENTE DE VERDAD para la matemática de precios.
   * Calcula authorizedPrice y finalPrice (con piso mínimo PRO).
   */
  static calculatePriceFormula(
    basePrice: number,
    discountPercent: number,
    proMarkup: number,
    distributorPlan: 'STANDARD' | 'PRO'
  ): {
    baseListPrice: number;
    authorizedPrice: number;
    finalPrice: number;
    proposedPrice: number;
    discountPercent: number;
    proMarkup: number;
  } {
    const authorizedPrice = basePrice * (1 - discountPercent / 100);

    let proposedPrice = authorizedPrice;
    let finalPrice = authorizedPrice;
    let appliedMarkup = 0;

    if (distributorPlan === 'PRO') {
      proposedPrice = authorizedPrice * (1 + proMarkup / 100);
      // REGLA CRÍTICA: el precio final NUNCA puede ser menor al autorizado
      finalPrice = Math.max(authorizedPrice, proposedPrice);
      appliedMarkup = proMarkup;
    }

    return {
      baseListPrice: Math.round(basePrice * 100) / 100,
      authorizedPrice: Math.round(authorizedPrice * 100) / 100,
      proposedPrice: Math.round(proposedPrice * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discountPercent,
      proMarkup: appliedMarkup,
    };
  }

  /**
   * Calcula precios para múltiples items de una vez.
   * Usado para generar cotizaciones completas.
   */
  async calculateBulkPrices(
    distributorId: string,
    items: Array<{
      productId: string;
      variantId?: string;
      tenantId: string;
      productLineId: string;
      priceListType?: string;
      quantity?: number;
    }>,
  ): Promise<Array<PricingResult & { productId: string; variantId?: string; quantity: number }>> {
    const results = [];

    for (const item of items) {
      try {
        const result = await this.calculatePrice({
          tenantId: item.tenantId,
          distributorId,
          productId: item.productId,
          variantId: item.variantId,
          productLineId: item.productLineId,
          priceListType: item.priceListType,
        });
        results.push({
          ...result,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity || 1,
        });
      } catch (err: any) {
        // Si falla un item, incluir con precio 0 y error
        results.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity || 1,
          baseListPrice: 0,
          priceListType: item.priceListType || 'A',
          discountPercent: 0,
          authorizedPrice: 0,
          proMarkup: 0,
          proposedPrice: 0,
          finalPrice: 0,
          distributorPlan: 'STANDARD',
          currency: 'MXN',
          error: err.message,
        } as any);
      }
    }

    return results;
  }

  /**
   * Obtiene el descuento más específico aplicable al contexto.
   * Prioridad: BY_PRODUCT > BY_LINE > GLOBAL
   */
  private async getApplicableDiscount(
    tenantId: string,
    distributorId: string,
    productLineId: string,
    productId: string,
  ): Promise<number> {
    const discounts = await this.prisma.client.manufacturerDistributorDiscount.findMany({
      where: {
        tenantId,
        distributorId,
        active: true,
      },
    });

    if (discounts.length === 0) return 0;

    // Buscar por prioridad: BY_PRODUCT > BY_LINE > GLOBAL
    const byProduct = discounts.find(
      (d: any) => d.scope === 'BY_PRODUCT' && d.productId === productId,
    );
    if (byProduct) return Number(byProduct.discountPercent);

    const byLine = discounts.find(
      (d: any) => d.scope === 'BY_LINE' && d.productLineId === productLineId,
    );
    if (byLine) return Number(byLine.discountPercent);

    const global = discounts.find((d: any) => d.scope === 'GLOBAL');
    if (global) return Number(global.discountPercent);

    return 0;
  }

  /**
   * Obtiene el markup PRO más específico aplicable al contexto.
   * Prioridad: BY_PRODUCT > BY_LINE > BY_TENANT > GLOBAL
   */
  private async getApplicableProMarkup(
    distributorId: string,
    tenantId: string,
    productLineId: string,
    productId: string,
  ): Promise<number> {
    const rules = await this.prisma.client.distributorProPricingRule.findMany({
      where: { distributorId, active: true },
      orderBy: { priority: 'desc' },
    });

    if (rules.length === 0) return 0;

    for (const rule of rules) {
      if (rule.scope === 'BY_PRODUCT' && rule.productId === productId) {
        return Number(rule.markupPercent);
      }
      if (rule.scope === 'BY_LINE' && rule.productLineId === productLineId) {
        return Number(rule.markupPercent);
      }
      if (rule.scope === 'BY_TENANT' && rule.tenantId === tenantId) {
        return Number(rule.markupPercent);
      }
      if (rule.scope === 'GLOBAL') {
        return Number(rule.markupPercent);
      }
    }

    return 0;
  }

  /**
   * Valida que un distribuidor puede cotizar productos de una marca específica.
   */
  async validateAccess(tenantId: string, distributorId: string): Promise<boolean> {
    const access = await this.prisma.client.manufacturerDistributorAccess.findUnique({
      where: {
        tenantId_distributorId: { tenantId, distributorId },
      },
    });
    return !!(access && access.active);
  }

  /**
   * Obtiene las listas de precio permitidas para un distribuidor con una marca.
   */
  async getAllowedPriceLists(tenantId: string, distributorId: string): Promise<string[]> {
    const lists = await this.prisma.client.manufacturerDistributorAllowedPriceList.findMany({
      where: { tenantId, distributorId, active: true },
    });
    return lists.map((l: any) => l.priceListType);
  }
}
