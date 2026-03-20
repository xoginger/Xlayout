import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
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
// ── Master SaaS Backend Modules (master-backend-v1) ────────
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

@Module({
  imports: [
    PrismaModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    // ── Legacy / existing modules ───────
    AuthModule,
    OrganizationsModule,
    CatalogModule,
    PricingModule,
    ProjectsModule,
    ImportsModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
