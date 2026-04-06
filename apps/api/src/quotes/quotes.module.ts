/**
 * Creado y diseñado por XO
 */

import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { PricingModule } from '../pricing/pricing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

// Módulo de cotizaciones — incluye generación, plantillas y persistencia
@Module({
  imports: [PrismaModule, PricingModule, AuditModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
