/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingEngineService } from '../pricing/pricing.service';

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  private validateTenantId(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException(
        'No se pudo resolver el contexto de tenant. ' +
        'Para PLATFORM_USER, envíe el header x-tenant-id. ' +
        'Para COMPANY_USER, verifique que el usuario tiene tenant asignado.'
      );
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

  async createProductLine(tenantId: string, data: { name: string; description?: string }) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productLine.create({
      data: { 
        tenantId, 
        name: data.name, 
        description: data.description,
        slug: data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
        active: true
      },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  async getProductLines(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productLine.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  async updateProductLine(tenantId: string, id: string, data: { active?: boolean; name?: string; description?: string }) {
    this.validateTenantId(tenantId);
    const line = await this.prisma.client.productLine.findUnique({ where: { id } });
    if (!line || line.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes permiso para editar esta línea');
    }
    
    const updateData: any = { ...data };
    if (data.name) {
      updateData.slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
    }

    return this.prisma.client.productLine.update({ 
      where: { id }, 
      data: updateData,
      include: {
        _count: {
          select: { products: true }
        }
      }
    });
  }

  async deleteProductLine(tenantId: string, id: string) {
    this.validateTenantId(tenantId);
    const line = await this.prisma.client.productLine.findUnique({ 
      where: { id },
      include: { _count: { select: { products: true } } }
    });
    
    if (!line || line.tenantId !== tenantId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta línea');
    }

    if (line._count.products > 0) {
      throw new BadRequestException('No se puede eliminar una línea que tiene productos asociados. Reasigna los productos primero.');
    }

    return this.prisma.client.productLine.delete({ where: { id } });
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

  async updateCategory(tenantId: string, id: string, data: { name?: string; parentId?: string; active?: boolean }) {
    this.validateTenantId(tenantId);
    const category = await this.prisma.client.productCategory.findUnique({ where: { id } });
    if (!category || category.tenantId !== tenantId) {
      throw new ForbiddenException('You can only update your own categories');
    }
    return this.prisma.client.productCategory.update({ 
      where: { id }, 
      data: {
        ...data,
        slug: data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : undefined
      } 
    });
  }

  async updateCategoryStatus(tenantId: string, id: string, data: { active?: boolean }) {
    return this.updateCategory(tenantId, id, data);
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
    
    // Procesar precios si se proporcionan
    let pricesUpdate = {};
    if (prices && Array.isArray(prices)) {
      pricesUpdate = {
        prices: {
          upsert: prices.map((p: any) => ({
            where: {
              productId_variantId_priceType: {
                productId: id,
                variantId: null as any,
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
    // Validación: precio no puede ser negativo (NC-DATA-02)
    if (data.basePrice !== undefined && data.basePrice < 0) {
      throw new BadRequestException('El precio base no puede ser negativo');
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

  /**
   * Llamado por el endpoint de subida — guarda metadatos del archivo subido.
   * Si es un modelo 3D, desvincula automáticamente cualquier modelo previo del mismo producto.
   */
  async createAssetFromUpload(tenantId: string, data: any) {
    this.validateTenantId(tenantId);
    
    // Verificar que el producto pertenece al tenant
    const product = await this.prisma.client.product.findUnique({ where: { id: data.productId } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('No puedes agregar assets a productos ajenos');
    }

    // Si es un modelo 3D, desvincular modelos previos del mismo producto
    if (data.assetType === 'model_3d') {
      await this.prisma.client.productAsset.updateMany({
        where: { 
          productId: data.productId, 
          assetType: 'model_3d' 
        },
        data: { productId: null }
      });
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

  // Permite al usuario/admin sobrescribir heurística de escala
  async forceAssetScale(tenantId: string, id: string, targetUnit: string, conversionService: any) {
    this.validateTenantId(tenantId);
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }
    if (!asset.originalFileUrl) {
      throw new BadRequestException('No existe el archivo original para re-procesar (pipeline v1 legacy). Por favor re-suba el modelo 3D.');
    }

    // Actualizar metadata con unidad forzada
    const existingMeta = (asset.metadata as Record<string, any>) || {};
    existingMeta.forcedUnit = targetUnit;

    await this.prisma.client.productAsset.update({
      where: { id },
      data: { 
        conversionStatus: 'processing', 
        conversionError: null,
        metadata: existingMeta
      },
    });

    // Reconstruir ruta absoluta
    const storageDir = process.env.UPLOAD_DIR || '/app/storage';
    const relativePath = asset.originalFileUrl.replace('/storage/', '');
    const absolutePath = `${storageDir}/${relativePath}`;

    await conversionService.retryConversion({
      assetId: id,
      originalFilePath: absolutePath,
      originalFormat: asset.originalFormat || 'glb',
      tenantId,
      forceUnit: targetUnit
    });

    return { message: `Escala forzada a ${targetUnit}. Re-procesando asset.`, assetId: id, currentMetadata: existingMeta };
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

  // ─── Métodos para vincular/desvincular assets ──────────────────────────────
  
  /**
   * Vincula un asset existente a un producto.
   * Si es un modelo 3D, desvincula automáticamente cualquier modelo previo del mismo producto.
   */
  async linkAssetToProduct(tenantId: string, productId: string, assetId: string) {
    this.validateTenantId(tenantId);
    
    // 1. Verificar existencia y pertenencia
    const product = await this.prisma.client.product.findUnique({ where: { id: productId }, include: { assets: true } });
    if (!product || product.tenantId !== tenantId) {
      throw new ForbiddenException('Producto no encontrado o acceso denegado');
    }

    const asset = await this.prisma.client.productAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.tenantId !== tenantId) {
      throw new ForbiddenException('Asset no encontrado o acceso denegado');
    }

    // 2. Si el asset a vincular es un modelo 3D, desvincular otros modelos 3D del mismo producto
    if (asset.assetType === 'model_3d') {
      await this.prisma.client.productAsset.updateMany({
        where: { 
          productId, 
          assetType: 'model_3d',
          id: { not: assetId } 
        },
        data: { productId: null }
      });
    }

    // 3. Vincular el nuevo asset
    return this.prisma.client.productAsset.update({
      where: { id: assetId },
      data: { productId },
      include: { product: true }
    });
  }

  /**
   * Desvincula un asset de un producto sin eliminar el asset.
   */
  async unlinkAssetFromProduct(tenantId: string, productId: string, assetId: string) {
    this.validateTenantId(tenantId);
    
    const asset = await this.prisma.client.productAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.tenantId !== tenantId || asset.productId !== productId) {
      throw new ForbiddenException('Relación no encontrada o acceso denegado');
    }

    return this.prisma.client.productAsset.update({
      where: { id: assetId },
      data: { productId: null },
      include: { product: true }
    });
  }

  /**
   * Obtiene assets que no están vinculados a ningún producto.
   */
  async getUnlinkedAssets(tenantId: string) {
    this.validateTenantId(tenantId);
    return this.prisma.client.productAsset.findMany({
      where: { 
        tenantId,
        productId: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ─── Catálogo del Editor — filtros por estado PUBLISHED ─────────────────────────
  async getAvailableCatalog(userId: string, userType: string) {
    // Mapa: tenantId → { pricesEnabled, priceListType, allowedLists }
    let tenantAccessMap = new Map<string, {
      pricesEnabled: boolean;
      priceListType: string;
      allowedLists: string[];
    }>();

    // Datos del distribuidor si aplica
    let distributorId: string | null = null;
    let distributorPlan: string = 'STANDARD';

    if (userType === 'PLATFORM_USER') {
      // La plataforma ve todos los tenants activos con acceso completo y precio A
      const activeTenants = await this.prisma.client.tenant.findMany({ where: { status: 'ACTIVE' } });
      activeTenants.forEach((t: any) => tenantAccessMap.set(t.id, {
        pricesEnabled: true,
        priceListType: 'A',
        allowedLists: ['A', 'B', 'C', 'D', 'E'],
      }));
    } else if (userType === 'COMPANY_USER') {
      // El usuario del fabricante ve su propio catálogo con acceso completo y precio A
      const user = await this.prisma.client.companyUser.findUnique({ where: { id: userId } });
      if (user) tenantAccessMap.set(user.tenantId, {
        pricesEnabled: true,
        priceListType: 'A',
        allowedLists: ['A', 'B', 'C', 'D', 'E'],
      });
    } else if (userType === 'DISTRIBUTOR_USER') {
      // El diseñador ve catálogos según acceso macro + listas permitidas
      const distUser = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: {
          distributor: {
            include: {
              manufacturerAccesses: { where: { active: true } },
              allowedPriceLists: { where: { active: true } },
            },
          },
        },
      });
      if (distUser) {
        distributorId = distUser.distributorId;
        distributorPlan = distUser.distributor.plan || 'STANDARD';

        // Construir mapa de acceso por marca con listas permitidas
        for (const access of (distUser as any).distributor.manufacturerAccesses) {
          const allowedForTenant = (distUser as any).distributor.allowedPriceLists
            .filter((pl: any) => pl.tenantId === access.tenantId)
            .map((pl: any) => pl.priceListType);
          const defaultList = access.defaultPriceList || 'A';

          tenantAccessMap.set(access.tenantId, {
            pricesEnabled: true,
            priceListType: defaultList,
            allowedLists: allowedForTenant.length > 0 ? allowedForTenant : [defaultList],
          });
        }
      }
    } else if (userType === 'END_USER') {
      // El usuario final solo ve catálogos a los que fue dado de alta
      const accesses = await this.prisma.client.catalogAccess.findMany({
        where: { endUserId: userId, active: true, catalogEnabled: true },
      });
      accesses.forEach((a: any) => tenantAccessMap.set(a.tenantId, {
        pricesEnabled: a.pricesEnabled,
        priceListType: 'A',
        allowedLists: ['A'],
      }));
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
              where: { status: 'PUBLISHED', active: true },
              orderBy: { name: 'asc' },
              include: {
                prices: { where: { active: true } },
                assets: true,
                variants: {
                  where: { active: true },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    prices: { where: { active: true } }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Obtener descuentos de marca para el distribuidor
    let distributorDiscounts: any[] = [];
    if (distributorId) {
      distributorDiscounts = await this.prisma.client.manufacturerDistributorDiscount.findMany({
        where: { distributorId, active: true },
      });
    }

    // Obtener reglas PRO del distribuidor
    let proRules: any[] = [];
    if (distributorId && distributorPlan === 'PRO') {
      proRules = await this.prisma.client.distributorProPricingRule.findMany({
        where: { distributorId, active: true },
        orderBy: { priority: 'desc' },
      });
    }

    /**
     * Obtiene el descuento aplicable de la marca para este distribuidor.
     * Prioridad: BY_PRODUCT > BY_LINE > GLOBAL
     */
    const getDiscount = (tenantId: string, lineId: string, productId: string): number => {
      if (!distributorDiscounts.length) return 0;

      const relevant = distributorDiscounts.filter(d => d.tenantId === tenantId);
      const byProduct = relevant.find(d => d.scope === 'BY_PRODUCT' && d.productId === productId);
      if (byProduct) return Number(byProduct.discountPercent);

      const byLine = relevant.find(d => d.scope === 'BY_LINE' && d.productLineId === lineId);
      if (byLine) return Number(byLine.discountPercent);

      const global = relevant.find(d => d.scope === 'GLOBAL');
      if (global) return Number(global.discountPercent);

      return 0;
    };

    /**
     * Obtiene el markup PRO aplicable.
     * Prioridad: BY_PRODUCT > BY_LINE > BY_TENANT > GLOBAL
     */
    const getProMarkup = (tenantId: string, lineId: string, productId: string): number => {
      if (!proRules.length) return 0;

      for (const rule of proRules) {
        if (rule.scope === 'BY_PRODUCT' && rule.productId === productId) return Number(rule.markupPercent);
        if (rule.scope === 'BY_LINE' && rule.productLineId === lineId) return Number(rule.markupPercent);
        if (rule.scope === 'BY_TENANT' && rule.tenantId === tenantId) return Number(rule.markupPercent);
        if (rule.scope === 'GLOBAL') return Number(rule.markupPercent);
      }
      return 0;
    };



/**
 * Calcula el precio final con el flujo completo usando la ÚNICA FUENTE DE VERDAD.
 */
const calculateFinalPrice = (
  basePrice: number,
  context: { tenantId: string; lineId: string; productId: string },
) => {
  const discountPercent = getDiscount(context.tenantId, context.lineId, context.productId);
  const proMarkup = getProMarkup(context.tenantId, context.lineId, context.productId);
  
  return PricingEngineService.calculatePriceFormula(
    basePrice,
    discountPercent,
    proMarkup,
    distributorPlan as 'STANDARD' | 'PRO'
  );
};

    // Construir respuesta del catálogo
    return tenantsData
      .map((tenant: any) => {
        const access = tenantAccessMap.get(tenant.id);
        const priceListType = access?.priceListType || 'A';

        const linesWithProducts = tenant.productLines
          .filter((line: any) => line.products.length > 0)
          .map((line: any) => ({
            lineId: line.id,
            lineName: line.name,
            products: line.products.map((product: any) => {
              // Construir diccionario completo de precios base
              const pricesMap: Record<string, number> = {};
              let currency = 'MXN';
              product.prices.forEach((p: any) => {
                pricesMap[p.priceType] = Number(p.basePrice);
                currency = p.currency;
              });

              const basePrice = pricesMap[priceListType] ?? pricesMap['A'] ?? 0;
              const priceCalc = calculateFinalPrice(basePrice, {
                tenantId: tenant.id,
                lineId: line.id,
                productId: product.id,
              });

              const model3dAsset = product.assets.find((a: any) => a.assetType === 'model_3d');

              // Mapear variantes del producto
              const variants = (product.variants || []).map((v: any) => {
                const vPricesMap: Record<string, number> = {};
                (v.prices || []).forEach((p: any) => {
                  vPricesMap[p.priceType] = Number(p.basePrice);
                });
                const vBasePrice = vPricesMap[priceListType] ?? vPricesMap['A'] ?? basePrice;
                const vCalc = calculateFinalPrice(vBasePrice, {
                  tenantId: tenant.id,
                  lineId: line.id,
                  productId: product.id,
                });

                return {
                  variantId: v.id,
                  name: v.name,
                  sku: v.sku || product.sku,
                  variantType: v.variantType,
                  width: v.width ?? product.width,
                  depth: v.depth ?? product.depth,
                  height: v.height ?? product.height,
                  price: access?.pricesEnabled ? vBasePrice : null,
                  authorizedPrice: access?.pricesEnabled ? Math.round(vCalc.authorizedPrice * 100) / 100 : null,
                  finalPrice: access?.pricesEnabled ? Math.round(vCalc.finalPrice * 100) / 100 : null,
                  discountPercent: vCalc.discountPercent,
                  proMarkup: vCalc.proMarkup,
                  pricesMap: access?.pricesEnabled ? (Object.keys(vPricesMap).length > 0 ? vPricesMap : pricesMap) : null,
                  hasPriceAccess: access?.pricesEnabled ?? false,
                  currency,
                };
              });

              return {
                productId: product.id,
                name: product.name,
                sku: product.sku,
                width: product.width,
                depth: product.depth,
                height: product.height,
                // Precio base de la lista asignada (sin descuento)
                price: access?.pricesEnabled ? basePrice : null,
                // Precio autorizado (con descuento de marca aplicado)
                authorizedPrice: access?.pricesEnabled ? Math.round(priceCalc.authorizedPrice * 100) / 100 : null,
                // Precio final (para PRO: con markup, respetando piso mínimo)
                finalPrice: access?.pricesEnabled ? Math.round(priceCalc.finalPrice * 100) / 100 : null,
                // Descuento de marca aplicado
                discountPercent: priceCalc.discountPercent,
                // Markup PRO aplicado (0 si STANDARD)
                proMarkup: priceCalc.proMarkup,
                // Lista de precios activa
                priceListType: priceListType,
                // Listas permitidas para este distribuidor-marca
                allowedPriceLists: access?.allowedLists || [priceListType],
                // Mapa completo de precios base
                pricesMap: access?.pricesEnabled ? pricesMap : null,
                currency: currency,
                hasPriceAccess: access?.pricesEnabled ?? false,
                thumbnail: product.assets.find((a: any) => a.assetType === 'thumbnail')?.fileUrl || null,
                metadata: {
                  ...(product.metadata as any || {}),
                  ...(model3dAsset?.metadata as any || {}),
                  model3dUrl: model3dAsset?.model3dUrl || null,
                  distributorPlan: distributorPlan,
                },
                variants,
              };
            })
          }));

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          distributorPlan,
          lines: linesWithProducts,
        };
      })
      .filter((t: any) => t.lines.length > 0);
  }
}
