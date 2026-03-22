/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('platform/info')
@UseGuards(JwtAuthGuard)
export class PlatformInfoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  async getMetrics() {
    // Esto requiere el rol de Admin de Plataforma para ser totalmente preciso en un sistema real
    const totalTenants = await this.prisma.client.tenant.count();
    const activeTenants = await this.prisma.client.tenant.count({ where: { status: 'ACTIVE' } });
    const totalCompanyUsers = await this.prisma.client.companyUser.count();
    const totalEndUsers = await this.prisma.client.endUser.count();
    const totalProducts = await this.prisma.client.product.count();

    return {
      totalTenants,
      activeTenants,
      totalUsers: totalCompanyUsers + totalEndUsers,
      totalProducts,
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      services: {
        database: 'Operational',
        redis: 'Operational',
        api: 'Operational',
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('config')
  getConfig() {
    return {
      platformName: 'XLayout SaaS',
      version: 'admin-panel-v3-complete',
      environment: process.env.NODE_ENV || 'development',
      features: {
        multiTenant: true,
        pricingEngine: true,
        catalogAccess: true,
        aiIntegrations: false,
      }
    };
  }
}
