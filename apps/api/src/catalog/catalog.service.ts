import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductStatus } from '@prisma/client';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async createBrand(tenantId: string, data: { name: string; description?: string; logoUrl?: string }) {
    return this.prisma.brand.create({
      data: { ...data, tenantId },
    });
  }

  async getBrands(tenantId: string) {
    // Only return brands owned by the tenant or brands they have access to
    return this.prisma.brand.findMany({
      where: {
        OR: [
          { tenantId },
          { accessRules: { some: { companyId: tenantId } } },
        ],
      },
    });
  }

  async createProductLine(brandId: string, name: string) {
    return this.prisma.productLine.create({
      data: { brandId, name },
    });
  }

  async createCategory(name: string, parentId?: string) {
    return this.prisma.productCategory.create({
      data: { name, parentId },
    });
  }

  async createProduct(tenantId: string, data: {
    sku: string;
    name: string;
    brandId: string;
    lineId: string;
    categoryId: string;
    width: number;
    depth: number;
    height: number;
    basePrice: number;
    metadata?: any;
  }) {
    // Verify brand ownership
    const brand = await this.prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand || brand.tenantId !== tenantId) {
      throw new ForbiddenException('You can only create products for your own brands');
    }

    return this.prisma.product.create({
      data: {
        ...data,
      },
    });
  }

  async getProducts(tenantId: string, filters?: any) {
    // Complex query: A user can see products if their company owns the brand OR has explicit access to it
    return this.prisma.product.findMany({
      where: {
        brand: {
          OR: [
            { tenantId },
            { accessRules: { some: { companyId: tenantId } } },
          ],
        },
        ...filters,
      },
      include: { brand: true, line: true, category: true },
    });
  }
}
