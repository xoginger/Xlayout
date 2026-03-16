import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Product } from '@prisma/client';

export interface PricingStrategy {
  calculatePrice(product: Product, rules: any[]): number;
}

export class BasePriceStrategy implements PricingStrategy {
  calculatePrice(product: Product): number {
    return Number(product.basePrice);
  }
}

export class BrandDiscountStrategy implements PricingStrategy {
  calculatePrice(product: Product, rules: any[]): number {
    let finalPrice = Number(product.basePrice);
    
    // Find applicable rule for this brand
    const brandRule = rules.find(
      r => r.strategyType === 'BrandDiscountStrategy' && r.configPayload?.brandId === product.brandId
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
    // 1. Fetch active discount rules for the tenant
    const rules = await this.prisma.discountRule.findMany({
      where: { tenantId, active: true },
      orderBy: { priority: 'desc' }
    });

    const strategies = [new BasePriceStrategy(), new BrandDiscountStrategy()];

    let total = 0;
    const lines = [];

    // 2. Fetch products details and apply rules
    for (const item of placements) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (!product) continue;

      let itemPrice = Number(product.basePrice);

      // Apply strategies consecutively (basic pipeline example)
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
    return this.prisma.priceList.findMany({
      where: { companies: { some: { companyId: tenantId } } }
    });
  }
}
