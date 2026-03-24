/**
 * Creado y diseñado por XO
 */

import { Module } from '@nestjs/common';
import { DistributorUsersController } from './distributor-users.controller';
import { DistributorUsersService } from './distributor-users.service';
import { PrismaModule } from '../prisma/prisma.module';

// Módulo de gestión de usuarios internos de una empresa distribuidora (diseñadores, vendedores)
@Module({
  imports: [PrismaModule],
  controllers: [DistributorUsersController],
  providers: [DistributorUsersService],
  exports: [DistributorUsersService],
})
export class DistributorUsersModule {}
