/**
 * Creado y diseñado por XO
 * XLayout System
 */
import { Module } from '@nestjs/common';
import { EndUsersService } from './end-users.service';
import { EndUsersController } from './end-users.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EndUsersController],
  providers: [EndUsersService],
  exports: [EndUsersService],
})
export class EndUsersModule {}
