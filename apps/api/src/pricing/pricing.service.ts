/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingStrategy {
  calculatePrice(product: any, rules: any[]): number;
}

export class BasePriceStrategy implements PricingStrategy {
  calculatePrice(product: any): number {
    const defaultPrice = product.prices?.[0]?.basePrice;
    return defaultPrice ? Number(defaultPrice) : 0;
  }
}

export class BrandDiscountStrategy implements PricingStrategy {
  calculatePrice(product: any, rules: any[]): number {
    const defaultPrice = product.prices?.[0]?.basePrice;
    let finalPrice = defaultPrice ? Number(defaultPrice) : 0;
    
    // Buscar regla aplicable para esta línea (reemplazando marca)
    const brandRule = rules.find(
      r => r.strategyType === 'BrandDiscountStrategy' && r.configPayload?.lineId === product.lineId
    );

    if (brandRule) {
      const discountPercent = brandRule.configPayload.discountPercent || 0;
      finalPrice = finalPrice * (1 - discountPercent / 100);
    }
    
    return finalPrice;
  }
}

@Injectable()
export class PricingEngineService {
  constructor(private prisma: PrismaService) {}

  async calculateQuote(tenantId: string, placements: any[]) {
    // 1. Obtener reglas de descuento activas para el tenant
    const rules = await this.prisma.client.discountRule.findMany({
      where: { tenantId, active: true },
      orderBy: { priority: 'desc' }
    });

    const strategies = [new BasePriceStrategy(), new BrandDiscountStrategy()];

    let total = 0;
    const lines = [];

    // 2. Obtener detalles de productos y aplicar reglas
    for (const item of placements) {
      const product = await this.prisma.client.product.findUnique({
        where: { id: item.productId },
        include: { prices: { where: { active: true } } }
      });

      if (!product) continue;

      const defaultPrice = product.prices?.[0]?.basePrice;
      let itemPrice = defaultPrice ? Number(defaultPrice) : 0;

      // Aplicar estrategias consecutivamente (ejemplo básico de pipeline)
      strategies.forEach(strategy => {
         itemPrice = strategy.calculatePrice(product, rules); 
      });

      const lineTotal = itemPrice * (item.quantity || 1);
      total += lineTotal;

      lines.push({
        product: product.name,
        qty: item.quantity,
        unitPrice: itemPrice,
        lineTotal
      });
    }

    return { total, lines };
  }

  async getPriceLists(tenantId: string) {
    return this.prisma.client.priceList.findMany({
      where: { companies: { some: { companyId: tenantId } } }
    });
  }
}
