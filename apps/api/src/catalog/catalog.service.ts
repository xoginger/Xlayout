/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  private validateTenantId(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
  }

  async createBrand(tenantId: string, data: { name: string; description?: string; logoUrl?: string }) {
    this.validateTenantId(tenantId);
    return this.prisma.client.brand.create({
      data: { ...data, tenantId },
    });
  }

  async getBrands(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.brand.findMany({
      where: {
        OR: [
          { tenantId },
          { accessRules: { some: { companyId: tenantId } } },
        ],
      },
    });
  }

  async createProductLine(tenantId: string, name: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productLine.create({
      data: { tenantId, name, slug: name.toLowerCase().replace(/\s+/g, '-') },
    });
  }

  async getProductLines(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productLine.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateProductLine(tenantId: string, id: string, data: { active?: boolean; name?: string; description?: string }) {
    this.validateTenantId(tenantId);
    const line = await this.prisma.client.productLine.findUnique({ where: { id } });
    if (!line || line.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own product lines');
    }
    return this.prisma.client.productLine.update({ where: { id }, data });
  }

  async createCategory(tenantId: string, name: string, parentId?: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productCategory.create({
      data: { tenantId, name, slug: name.toLowerCase().replace(/\s+/g, '-'), parentId: parentId || undefined },
    });
  }

  async getCategories(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productCategory.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: { parent: true }
    });
  }

  async updateCategoryStatus(tenantId: string, id: string, data: { active?: boolean }) {
    this.validateTenantId(tenantId);
    const category = await this.prisma.client.productCategory.findUnique({ where: { id } });
    if (!category || category.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own categories');
    }
    return this.prisma.client.productCategory.update({ where: { id }, data });
  }

  async createProduct(tenantId: string, data: any) {
    this.validateTenantId(tenantId);
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
            tenantId,
            priceType: p.priceType,
            basePrice: p.basePrice || 0,
            currency: p.currency || 'MXN'
          }))
        }
      };
    }

    return this.prisma.client.product.create({
      data: { ...createData, tenantId, ...pricesCreate },
      include: { prices: true }
    });
  }

  async updateProduct(tenantId: string, id: string, data: any) {
    this.validateTenantId(tenantId);
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
              tenantId,
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
    this.validateTenantId(tenantId);
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
    this.validateTenantId(tenantId);
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
    this.validateTenantId(tenantId);
    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only create prices for your own products');
    }
    return this.prisma.client.productPrice.create({
      data: { ...data, tenantId, productId },
    });
  }

  async getProducts(tenantId: string, filters?: any) {
    this.validateTenantId(tenantId);
    return this.prisma.client.product.findMany({
      where: { tenantId, ...filters },
      orderBy: { sku: 'asc' },
      include: {
        line: true,
        category: true,
        prices: { where: { active: true } }, // Obtenemos todos los precios, no solo el último
        assets: { where: { assetType: 'model_3d' } }
      },
    });
  }

  async updateProductStatus(tenantId: string, id: string, data: { active?: boolean }) {
    this.validateTenantId(tenantId);
    const product = await this.prisma.client.product.findUnique({ where: { id } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own products');
    }
    return this.prisma.client.product.update({ where: { id }, data });
  }

  async getAssets(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productAsset.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
  }

  async createAsset(tenantId: string, data: any) {
    this.validateTenantId(tenantId);
    const product = await this.prisma.client.product.findUnique({ where: { id: data.productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only add assets to your own products');
    }
    return this.prisma.client.productAsset.create({
      data: { ...data, tenantId },
    });
  }

  async deleteAsset(tenantId: string, id: string) {
    this.validateTenantId(tenantId);
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('You can only delete your own assets');
    }
    return this.prisma.client.productAsset.delete({ where: { id } });
  }

  // Llamado por el endpoint de subida — guarda metadatos del archivo subido, aún sin URL
  async createAssetFromUpload(tenantId: string, data: any) {
    this.validateTenantId(tenantId);
    const product = await this.prisma.client.product.findUnique({ where: { id: data.productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('You can only add assets to your own products');
    }
    return this.prisma.client.productAsset.create({
      data: { ...data, tenantId },
      include: { product: true },
    });
  }

  // Reiniciar estado y re-encolar trabajo de conversión para un asset fallido
  async retryAssetConversion(tenantId: string, id: string, conversionService: any) {
    this.validateTenantId(tenantId);
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    if (!asset.originalFileUrl) {
      throw new ForbiddenException('No hay archivo original para convertir. Re-suba el asset.');
    }

    await this.prisma.client.productAsset.update({
      where: { id },
      data: { conversionStatus: 'uploaded', conversionError: null },
    });

    // Reconstruir ruta absoluta desde la URL pública relativa
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
    this.validateTenantId(tenantId);
    return this.prisma.client.productCondition.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { product: true, line: true }
    });
  }

  async createCondition(tenantId: string, data: { productId?: string; lineId?: string; conditionType: string; description: string }) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productCondition.create({
      data: { ...data, tenantId },
    });
  }

  async updateConditionStatus(tenantId: string, id: string, data: { active?: boolean }) {
    this.validateTenantId(tenantId);
    const condition = await this.prisma.client.productCondition.findUnique({ where: { id } });
    if (!condition || condition.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own conditions');
    }
    return this.prisma.client.productCondition.update({ where: { id }, data });
  }

  async getPrices(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productPrice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { product: true }
    });
  }

  async updatePriceStatus(tenantId: string, id: string, data: { active?: boolean }) {
    this.validateTenantId(tenantId);
    const price = await this.prisma.client.productPrice.findUnique({ where: { id } });
    if (!price || price.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own prices');
    }
    return this.prisma.client.productPrice.update({ where: { id }, data });
  }

  // ─── Variantes de Producto ─────────────────────────────────────────────────

  /** Lista variantes activas de un producto */
  async getProductVariants(tenantId: string, productId: string) {
    return this.prisma.client.productVariant.findMany({
      where: { tenantId, productId, active: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Crea una nueva variante para un producto */
  async createProductVariant(tenantId: string, productId: string, data: any) {
    // Verificar que el producto pertenece al tenant
    const product = await this.prisma.client.product.findUnique({ where: { id: productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('Producto no pertenece a este fabricante');
    }

    return this.prisma.client.productVariant.create({
      data: {
        tenantId,
        productId,
        name: data.name,
        variantType: data.variantType || 'color',
        metadata: data.metadata || {},
        sortOrder: data.sortOrder ?? 0,
        active: true,
      },
    });
  }

  /** Actualiza datos de una variante */
  async updateProductVariant(tenantId: string, variantId: string, data: any) {
    const variant = await this.prisma.client.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.tenantId !== tenantId) {
      throw new ForbiddenException('Variante no pertenece a este fabricante');
    }
    return this.prisma.client.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  /** Elimina una variante (soft delete — marca como inactiva) */
  async deleteProductVariant(tenantId: string, variantId: string) {
    const variant = await this.prisma.client.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.tenantId !== tenantId) {
      throw new ForbiddenException('Variante no pertenece a este fabricante');
    }
    return this.prisma.client.productVariant.update({
      where: { id: variantId },
      data: { active: false },
    });
  }

  // ─── Catálogo del Editor — filtros por estado PUBLISHED ─────────────────────────
  async getAvailableCatalog(userId: string, userType: string) {
    // Mapa: tenantId → { pricesEnabled: boolean, priceListType: string }
    let tenantAccessMap = new Map<string, { pricesEnabled: boolean; priceListType: string }>();

    // ID del distribuidor si aplica (para calcular markup)
    let distributorId: string | null = null;

    if (userType === 'PLATFORM_USER') {
      // La plataforma ve todos los tenants activos con acceso completo y precio A
      const activeTenants = await this.prisma.client.tenant.findMany({ where: { status: 'ACTIVE' } });
      activeTenants.forEach((t: any) => tenantAccessMap.set(t.id, { pricesEnabled: true, priceListType: 'A' }));
    } else if (userType === 'COMPANY_USER') {
      // El usuario del fabricante ve su propio catálogo con acceso completo y precio A
      const user = await this.prisma.client.companyUser.findUnique({ where: { id: userId } });
      if (user) tenantAccessMap.set(user.tenantId, { pricesEnabled: true, priceListType: 'A' });
    } else if (userType === 'DISTRIBUTOR_USER') {
      // El diseñador ve catálogos autorizados a su distribuidor con la lista de precios asignada
      const distUser = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: {
          distributor: {
            include: {
              // Catálogos de fabricantes autorizados con su lista de precio asignada
              catalogAccesses: { where: { active: true } },
            },
          },
        },
      });
      if (distUser) {
        distributorId = distUser.distributorId;
        (distUser as any).distributor.catalogAccesses.forEach((ca: any) => {
          tenantAccessMap.set(ca.tenantId, {
            pricesEnabled: true,
            priceListType: ca.priceListType || 'A',
          });
        });
      }
    } else if (userType === 'END_USER') {
      // El usuario final solo ve catálogos a los que fue dado de alta
      const accesses = await this.prisma.client.catalogAccess.findMany({
        where: { endUserId: userId, active: true, catalogEnabled: true },
      });
      accesses.forEach((a: any) => tenantAccessMap.set(a.tenantId, { pricesEnabled: a.pricesEnabled, priceListType: 'A' }));
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
              // CORRECCIÓN CLAVE: solo mostrar productos PUBLISHED en el catálogo del editor
              where: { status: 'PUBLISHED', active: true },
              orderBy: { name: 'asc' },
              include: {
                prices: { where: { active: true } }, // Extraemos todos los precios para el Editor
                assets: true
              }
            }
          }
        }
      }
    });

    // Obtener reglas de markup del distribuidor si aplica
    let distributorMarkups: any[] = [];
    if (distributorId) {
      distributorMarkups = await this.prisma.client.distributorPriceMarkup.findMany({
        where: { distributorId, active: true },
        orderBy: { priority: 'desc' },
      });
    }

    /**
     * Calcula el precio de venta final aplicando el markupPercent del distribuidor.
     * Prioridad: BY_PRODUCT > BY_LINE > BY_TENANT > GLOBAL
     */
    const applyMarkup = (basePrice: number, context: { tenantId: string; lineId: string; productId: string }): number => {
      if (!distributorMarkups.length) return basePrice;

      let applicable: any = null;
      for (const markup of distributorMarkups) {
        if (markup.scope === 'BY_PRODUCT' && markup.productId === context.productId) { applicable = markup; break; }
        if (markup.scope === 'BY_LINE' && markup.productLineId === context.lineId) { applicable = markup; break; }
        if (markup.scope === 'BY_TENANT' && markup.tenantId === context.tenantId) { applicable = markup; break; }
        if (markup.scope === 'GLOBAL' && !applicable) { applicable = markup; }
      }

      if (!applicable) return basePrice;
      return basePrice * (1 + Number(applicable.markupPercent) / 100);
    };

    // Filtrar líneas sin productos publicados
    return tenantsData
      .map((tenant: any) => {
        const access = tenantAccessMap.get(tenant.id);
        // Lista de precios asignada al distribuidor para este fabricante ('A','B','C','D','E')
        const priceListType = access?.priceListType || 'A';

        const linesWithProducts = tenant.productLines
          .filter((line: any) => line.products.length > 0)
          .map((line: any) => ({
            lineId: line.id,
            lineName: line.name,
            products: line.products.map((product: any) => {
              // Construir diccionario completo de precios base: { A: 100, B: 200 }
              const pricesMap: Record<string, number> = {};
              let currency = 'MXN';
              product.prices.forEach((p: any) => {
                pricesMap[p.priceType] = Number(p.basePrice);
                currency = p.currency;
              });

              // Precio base según la lista de precios asignada al usuario/distribuidor
              const basePrice = pricesMap[priceListType] ?? pricesMap['A'] ?? 0;

              // Precio final con markup del distribuidor aplicado
              const finalPrice = applyMarkup(basePrice, {
                tenantId: tenant.id,
                lineId: line.id,
                productId: product.id,
              });

              const model3dAsset = product.assets.find((a: any) => a.assetType === 'model_3d');
              return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                width: product.width,
                depth: product.depth,
                height: product.height,
                // Precio base con la lista asignada (sin markup)
                price: access?.pricesEnabled ? basePrice : null,
                // Precio de venta final (con markup del distribuidor si aplica)
                finalPrice: access?.pricesEnabled ? Math.round(finalPrice * 100) / 100 : null,
                // Tipo de lista de precios activa para el usuario
                priceListType: priceListType,
                // Mapa completo de precios base (solo si tiene acceso — para admin del fabricante)
                pricesMap: access?.pricesEnabled ? pricesMap : null,
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

