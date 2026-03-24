/**
 * Creado y diseñado por XO
 */

import { Module } from '@nestjs/common';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { PrismaModule } from '../prisma/prisma.module';

// Módulo de gestión de empresas distribuidoras y autorización de catálogos
@Module({
  imports: [PrismaModule],
  controllers: [DistributorsController],
  providers: [DistributorsService],
  exports: [DistributorsService],
})
export class DistributorsModule {}
