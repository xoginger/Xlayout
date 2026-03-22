import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async createBrand(tenantId: string, data: { name: string; description?: string; logoUrl?: string }) {
    return this.prisma.client.brand.create({
      data: { ...data, tenantId: tenantId || undefined },
    });
  }

  async getBrands(tenantId: string) {
    return this.prisma.client.brand.findMany({
      where: {
        OR: [
          { tenantId: tenantId || undefined },
          { accessRules: { some: { companyId: tenantId || undefined } } },
        ],
      },
    });
  }

  async createProductLine(tenantId: string, name: string) {
    return this.prisma.client.productLine.create({
      data: { tenantId: tenantId || undefined, name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    });
  }

  async getProductLines(tenantId: string) {
    return this.prisma.client.productLine.findMany({
      where: { tenantId: tenantId || undefined },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProductLine(tenantId: string, id: string, data: { active?: boolean; name?: string; description?: string }) {
    const line = await this.prisma.client.productLine.findUnique({ where: { id } });
    if (!line || line.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own product lines');
    }
    return this.prisma.client.productLine.update({ where: { id }, data });
  }

  async createCategory(tenantId: string, name: string, parentId?: string) {
    return this.prisma.client.productCategory.create({
      data: { tenantId: tenantId || undefined, name, slug: name.toLowerCase().replace(/\s+/g, '-'), parentId: parentId || undefined },
    });
  }

  async getCategories(tenantId: string) {
    return this.prisma.client.productCategory.findMany({
      where: { tenantId: tenantId || undefined },
      orderBy: { createdAt: 'desc' },
      include: { parent: true }
    });
  }

  async updateCategoryStatus(tenantId: string, id: string, data: { active?: boolean }) {
    const category = await this.prisma.client.productCategory.findUnique({ where: { id } });
    if (!category || category.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own categories');
    }
    return this.prisma.client.productCategory.update({ where: { id }, data });
  }

  async createProduct(tenantId: string, data: any) {
    const { prices, ...createData } = data;
    const line = await this.prisma.client.productLine.findUnique({ where: { id: createData.lineId } });
    if (!line || line.tenantId !== tenantId) {
      throw new ForbiddenException('You can only create products for your own lines');
    }

    let pricesCreate = {};
    if (prices && Array.isArray(prices)) {
      pricesCreate = {
        prices: {
          create: prices.map((p: any) => ({
            tenantId: tenantId || undefined,
            priceType: p.priceType,
            basePrice: p.basePrice || 0,
            currency: p.currency || 'MXN'
          }))
        }
      };
    }

    return this.prisma.client.product.create({
      data: { ...createData, tenantId: tenantId || undefined, ...pricesCreate },
      include: { prices: true }
    });
  }

  async updateProduct(tenantId: string, id: string, data: any) {
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own products');
    }
    // Strip relation fields that shouldn't be passed directly
    const { tenantId: _t, assets, line, category, conditions, prices, ...updateData } = data as any;
    
    // Process prices if provided
    let pricesUpdate = {};
    if (prices && Array.isArray(prices)) {
      pricesUpdate = {
        prices: {
          upsert: prices.map((p: any) => ({
            where: {
              productId_priceType: {
                productId: id,
                priceType: p.priceType
              }
            },
            create: {
              tenantId: tenantId || undefined,
              priceType: p.priceType,
              basePrice: p.basePrice || 0,
              currency: p.currency || 'MXN'
            },
            update: {
              basePrice: p.basePrice || 0,
              currency: p.currency || 'MXN'
            }
          }))
        }
      };
    }

    return this.prisma.client.product.update({
      where: { id },
      data: {
        ...updateData,
        ...pricesUpdate
      },
      include: { line: true, category: true, prices: { where: { active: true } }, assets: true },
    });
  }

  async publishProduct(tenantId: string, id: string) {
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only publish your own products');
    }
    return this.prisma.client.product.update({
      where: { id },
      data: { status: 'PUBLISHED', active: true },
    });
  }

  async unpublishProduct(tenantId: string, id: string) {
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own products');
    }
    return this.prisma.client.product.update({
      where: { id },
      data: { status: 'DRAFT', active: false },
    });
  }

  async createProductPrice(tenantId: string, productId: string, data: any) {
    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only create prices for your own products');
    }
    return this.prisma.client.productPrice.create({
      data: { ...data, tenantId: tenantId || undefined, productId },
    });
  }

  async getProducts(tenantId: string, filters?: any) {
    return this.prisma.client.product.findMany({
      where: { tenantId: tenantId || undefined, ...filters },
      orderBy: { sku: 'asc' },
      include: {
        line: true,
        category: true,
        prices: { where: { active: true } }, // Traemos todos los precios, no solo el último
        assets: { where: { assetType: 'model_3d' } }
      },
    });
  }

  async updateProductStatus(tenantId: string, id: string, data: { active?: boolean }) {
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own products');
    }
    return this.prisma.client.product.update({ where: { id }, data });
  }

  async getAssets(tenantId: string) {
    return this.prisma.client.productAsset.findMany({
      where: { tenantId: tenantId || undefined },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
  }

  async createAsset(tenantId: string, data: any) {
    const product = await this.prisma.client.product.findUnique({ where: { id: data.productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only add assets to your own products');
    }
    return this.prisma.client.productAsset.create({
      data: { ...data, tenantId: tenantId || undefined },
    });
  }

  async deleteAsset(tenantId: string, id: string) {
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('You can only delete your own assets');
    }
    return this.prisma.client.productAsset.delete({ where: { id } });
  }

  // Called by upload endpoint — stores uploaded file metadata, no URL yet
  async createAssetFromUpload(tenantId: string, data: any) {
    const product = await this.prisma.client.product.findUnique({ where: { id: data.productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only add assets to your own products');
    }
    return this.prisma.client.productAsset.create({
      data: { ...data, tenantId: tenantId || undefined },
      include: { product: true },
    });
  }

  // Reset status and re-enqueue conversion job for a failed asset
  async retryAssetConversion(tenantId: string, id: string, conversionService: any) {
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    if (!asset.originalFileUrl) {
      throw new ForbiddenException('No original file to convert. Re-upload the asset.');
    }

    await this.prisma.client.productAsset.update({
      where: { id },
      data: { conversionStatus: 'uploaded', conversionError: null },
    });

    // Reconstruct absolute path from relative public URL
    const storageDir = process.env.UPLOAD_DIR || '/app/storage';
    const relativePath = asset.originalFileUrl.replace('/storage/', '');
    const absolutePath = `${storageDir}/${relativePath}`;

    await conversionService.retryConversion({
      assetId: id,
      originalFilePath: absolutePath,
      originalFormat: asset.originalFormat || 'glb',
      tenantId,
    });

    return { message: 'Conversion job re-queued', assetId: id };
  }


  async getConditions(tenantId: string) {
    return this.prisma.client.productCondition.findMany({
      where: { tenantId: tenantId || undefined },
      orderBy: { createdAt: 'desc' },
      include: { product: true, line: true }
    });
  }

  async createCondition(tenantId: string, data: { productId?: string; lineId?: string; conditionType: string; description: string }) {
    return this.prisma.client.productCondition.create({
      data: { ...data, tenantId: tenantId || undefined },
    });
  }

  async updateConditionStatus(tenantId: string, id: string, data: { active?: boolean }) {
    const condition = await this.prisma.client.productCondition.findUnique({ where: { id } });
    if (!condition || condition.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own conditions');
    }
    return this.prisma.client.productCondition.update({ where: { id }, data });
  }

  async getPrices(tenantId: string) {
    return this.prisma.client.productPrice.findMany({
      where: { tenantId: tenantId || undefined },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
  }

  async updatePriceStatus(tenantId: string, id: string, data: { active?: boolean }) {
    const price = await this.prisma.client.productPrice.findUnique({ where: { id } });
    if (!price || price.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own prices');
    }
    return this.prisma.client.productPrice.update({ where: { id }, data });
  }

  // ─── Editor Catalog — filters by PUBLISHED status ─────────────────────────
  async getAvailableCatalog(userId: string, userType: string) {
    let tenantAccessMap = new Map<string, { pricesEnabled: boolean }>();

    if (userType === 'PLATFORM_USER') {
      const activeTenants = await this.prisma.client.tenant.findMany({ where: { status: 'ACTIVE' } });
      activeTenants.forEach((t: any) => tenantAccessMap.set(t.id, { pricesEnabled: true }));
    } else if (userType === 'COMPANY_USER') {
      const user = await this.prisma.client.companyUser.findUnique({ where: { id: userId } });
      if (user) tenantAccessMap.set(user.tenantId, { pricesEnabled: true });
    } else if (userType === 'END_USER') {
      const accesses = await this.prisma.client.catalogAccess.findMany({
        where: { endUserId: userId, active: true, catalogEnabled: true },
      });
      accesses.forEach((a: any) => tenantAccessMap.set(a.tenantId, { pricesEnabled: a.pricesEnabled }));
    }

    const tenantIds = Array.from(tenantAccessMap.keys());
    if (tenantIds.length === 0) return [];

    const tenantsData = await this.prisma.client.tenant.findMany({
      where: { id: { in: tenantIds } },
      include: {
        productLines: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: {
            products: {
              // KEY FIX: only show PUBLISHED products in the editor catalog
              where: { status: 'PUBLISHED', active: true },
              orderBy: { name: 'asc' },
              include: {
                prices: { where: { active: true } }, // Extraemos toooodos los precios para el Editor
                assets: true
              }
            }
          }
        }
      }
    });

    // Filter out lines with no published products
    return tenantsData
      .map((tenant: any) => {
        const access = tenantAccessMap.get(tenant.id);
        const linesWithProducts = tenant.productLines
          .filter((line: any) => line.products.length > 0)
          .map((line: any) => ({
            lineId: line.id,
            lineName: line.name,
            products: line.products.map((product: any) => {
              // Convertir arreglo de precios de Prisma a diccionario útil: { A: 100, B: 200 }
              const pricesMap: Record<string, number> = {};
              let currency = 'MXN';
              product.prices.forEach((p: any) => {
                pricesMap[p.priceType] = Number(p.basePrice);
                currency = p.currency;
              });

              const model3dAsset = product.assets.find((a: any) => a.assetType === 'model_3d');
              return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                width: product.width,
                depth: product.depth,
                height: product.height,
                pricesMap: access?.pricesEnabled ? pricesMap : null, // Entregar todos los precios si hay acceso
                currency: currency,
                hasPriceAccess: access?.pricesEnabled ?? false,
                thumbnail: product.assets.find((a: any) => a.assetType === 'thumbnail')?.fileUrl || null,
                metadata: {
                  ...(product.metadata as any || {}),
                  ...(model3dAsset?.metadata as any || {}),
                  model3dUrl: model3dAsset?.model3dUrl || null,
                }
              };
            })
          }));

        return { tenantId: tenant.id, tenantName: tenant.name, lines: linesWithProducts };
      })
      .filter((t: any) => t.lines.length > 0);
  }
}
