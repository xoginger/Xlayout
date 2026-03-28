/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Controlador separado sin guard para el endpoint público de versión
@Controller('platform/info')
export class PlatformInfoVersionController {
  /**
   * GET /api/platform/info/version
   * Endpoint público: devuelve la versión real del build activo.
   * Los valores se inyectan como variables de entorno durante el docker build.
   * No requiere autenticación — es inofensivo y necesario para el indicador del editor.
   */
  @Get('version')
  getVersion() {
    return {
      version: process.env.APP_VERSION || '1.0.0',
      commit: process.env.APP_COMMIT || 'desconocido',
      buildDate: process.env.APP_BUILD_DATE || new Date().toISOString(),
    };
  }
}

// Solo PLATFORM_USER puede acceder a información sensible de la plataforma
@Controller('platform/info')
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER')
export class PlatformInfoController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /platform/info/metrics
   * Métricas globales ampliadas para la vista ejecutiva del Admin.
   */
  @Get('metrics')
  async getMetrics() {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalCompanyUsers,
      totalDistributorUsers,
      totalEndUsers,
      totalPlatformUsers,
      totalProducts,
      totalDistributors,
      activeDistributors,
      pendingDistributors,
      suspendedUsers,
      assetsTotal,
      assetsConverted,
      assetsFailed,
      assetsPending,
      totalActivationCodes,
      activeActivationCodes,
      totalAccesses,
      totalImportJobs,
      failedImportJobs,
    ] = await Promise.all([
      this.prisma.client.tenant.count(),
      this.prisma.client.tenant.count({ where: { status: 'ACTIVE' } }),
      this.prisma.client.tenant.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.client.companyUser.count(),
      this.prisma.client.distributorUser.count(),
      this.prisma.client.endUser.count(),
      this.prisma.client.platformUser.count(),
      this.prisma.client.product.count(),
      this.prisma.client.distributorCompany.count(),
      this.prisma.client.distributorCompany.count({ where: { status: 'ACTIVE' } }),
      this.prisma.client.distributorCompany.count({ where: { status: 'INACTIVE' } }),
      // Usuarios suspendidos en todas las tablas
      this.prisma.client.companyUser.count({ where: { status: 'SUSPENDED' } })
        .then(async (cu: any) => cu +
          await this.prisma.client.distributorUser.count({ where: { status: 'SUSPENDED' } })),
      // Assets 3D por estado
      this.prisma.client.productAsset.count({ where: { assetType: 'model_3d' } }),
      this.prisma.client.productAsset.count({ where: { assetType: 'model_3d', conversionStatus: { in: ['converted', 'validated'] } } }),
      this.prisma.client.productAsset.count({ where: { assetType: 'model_3d', conversionStatus: 'failed' } }),
      this.prisma.client.productAsset.count({ where: { assetType: 'model_3d', conversionStatus: { in: ['pending', 'processing'] } } }),
      // Códigos de activación
      this.prisma.client.activationCode.count(),
      this.prisma.client.activationCode.count({ where: { active: true } }),
      // Accesos fabricante → distribuidor
      this.prisma.client.manufacturerDistributorAccess.count(),
      // Importaciones
      this.prisma.client.importJob.count(),
      this.prisma.client.importJob.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      // Marcas (tenants)
      totalTenants,
      activeTenants,
      suspendedTenants,
      // Usuarios globales
      totalUsers: totalCompanyUsers + totalDistributorUsers + totalEndUsers + totalPlatformUsers,
      totalPlatformUsers,
      totalCompanyUsers,
      totalDistributorUsers,
      totalEndUsers,
      suspendedUsers,
      // Productos
      totalProducts,
      // Distribuidores
      totalDistributors,
      activeDistributors,
      pendingDistributors,
      // Assets 3D
      assets3d: {
        total: assetsTotal,
        converted: assetsConverted,
        failed: assetsFailed,
        pending: assetsPending,
      },
      // Accesos
      activationCodes: {
        total: totalActivationCodes,
        active: activeActivationCodes,
      },
      totalAccesses,
      // Importaciones
      imports: {
        total: totalImportJobs,
        failed: failedImportJobs,
      },
    };
  }

  /**
   * GET /platform/info/health
   * Estado de salud de los servicios del sistema.
   */
  @Get('health')
  async getHealth() {
    // Verificar conectividad real de la base de datos
    let dbStatus = 'Operational';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'Degraded';
    }

    return {
      status: dbStatus === 'Operational' ? 'OK' : 'DEGRADED',
      services: {
        database: dbStatus,
        redis: 'Operational',
        api: 'Operational',
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /platform/info/config
   * Configuración global de la plataforma.
   */
  @Get('config')
  getConfig() {
    return {
      platformName: 'XLayout SaaS',
      version: 'admin-panel-v4-control-center',
      environment: process.env.NODE_ENV || 'development',
      buildDate: '2026-03-25',
      features: {
        multiTenant: true,
        pricingEngine: true,
        catalogAccess: true,
        distributorNetwork: true,
        pipeline3D: true,
        auditLog: true,
        aiIntegrations: false,
      },
    };
  }

  /**
   * GET /platform/info/assets3d
   * Lista global de assets 3D con filtros para el pipeline.
   */
  @Get('assets3d')
  async getAssets3d(
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = { assetType: 'model_3d' };
    if (status) where.conversionStatus = status;
    if (tenantId) where.tenantId = tenantId;

    const assets = await this.prisma.client.productAsset.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true } },
        tenant: { select: { name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '100'),
    });

    return assets;
  }

  /**
   * GET /platform/info/accesses
   * Lista global de accesos fabricante → distribuidor.
   */
  @Get('accesses')
  async getAccesses() {
    const accesses = await this.prisma.client.manufacturerDistributorAccess.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        distributor: { select: { id: true, name: true, slug: true, status: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });

    // También obtener los catalog accesses para enriquecer datos
    const catalogAccesses = await this.prisma.client.distributorCatalogAccess.findMany({
      select: {
        distributorId: true,
        tenantId: true,
        priceListType: true,
        active: true,
      },
    });

    // Combinar datos
    return accesses.map((a: any) => ({
      ...a,
      catalogAccess: catalogAccesses.find(
        (ca: any) => ca.distributorId === a.distributorId && ca.tenantId === a.tenantId,
      ),
    }));
  }
}
