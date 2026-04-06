/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { CatalogModule } from './catalog/catalog.module';
import { PricingModule } from './pricing/pricing.module';
import { ProjectsModule } from './projects/projects.module';
import { ImportsModule } from './imports/imports.module';
import { BlueprintsModule } from './blueprints/blueprints.module';
// ── Módulos Master SaaS Backend (master-backend-v1) ────────
import { PlatformUsersModule } from './platform-users/platform-users.module';
import { TenantsModule } from './tenants/tenants.module';
import { CompanyUsersModule } from './company-users/company-users.module';
import { EndUsersModule } from './end-users/end-users.module';
import { CatalogAccessModule } from './catalog-access/catalog-access.module';
import { ActivationCodesModule } from './activation-codes/activation-codes.module';
import { AuditModule } from './audit/audit.module';
import { PlatformInfoModule } from './platform-info/platform-info.module';
import { CompanyInfoModule } from './company-info/company-info.module';
import { TenantMiddleware } from './prisma/tenant.middleware';
import { HealthModule } from './health/health.module';
// Módulos del modelo comercial multi-tenant de distribuidores
import { DistributorsModule } from './distributors/distributors.module';
import { DistributorUsersModule } from './distributor-users/distributor-users.module';
import { QuotesModule } from './quotes/quotes.module';
// Módulo de seguridad — limitación de tasa de requests
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    // ─── SEGURIDAD: Rate limiting global (300 req/min por IP) ──────────
    ThrottlerModule.forRoot([{
      ttl: 60000,  // Ventana de 60 segundos
      limit: 300,  // Máximo 300 requests por ventana (adaptado a WebApp rica / Editor 3D)
    }]),
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    // ── Módulos legados o existentes ───────
    AuthModule,
    OrganizationsModule,
    CatalogModule,
    PricingModule,
    ProjectsModule,
    ImportsModule,
    BlueprintsModule,
    // ── Master SaaS Backend v1 ──────────
    PlatformUsersModule,
    TenantsModule,
    CompanyUsersModule,
    EndUsersModule,
    CatalogAccessModule,
    ActivationCodesModule,
    AuditModule,
    PlatformInfoModule,
    CompanyInfoModule,
    HealthModule,
    // Módulos del modelo comercial de distribuidores
    DistributorsModule,
    DistributorUsersModule,
    // Módulo de cotizaciones y plantillas PDF
    QuotesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica rate limiting globalmente a todos los endpoints
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
