/**
 * Creado y diseñado por XO
 */

import { Module } from '@nestjs/common';
import { DistributorsController } from './distributors.controller';
import { DistributorsService } from './distributors.service';
import { ManufacturerDistributorService } from './manufacturer-distributor.service';
import { PrismaModule } from '../prisma/prisma.module';

// Módulo de gestión de empresas distribuidoras, relación marca↔distribuidor y pricing PRO
@Module({
  imports: [PrismaModule],
  controllers: [DistributorsController],
  providers: [DistributorsService, ManufacturerDistributorService],
  exports: [DistributorsService, ManufacturerDistributorService],
})
export class DistributorsModule {}
