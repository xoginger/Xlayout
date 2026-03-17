// catalog-access.module.ts — XLayout Catalog Access Module
import { Module } from '@nestjs/common';
import { CatalogAccessService } from './catalog-access.service';
import { CatalogAccessController } from './catalog-access.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CatalogAccessController],
  providers: [CatalogAccessService],
  exports: [CatalogAccessService],
})
export class CatalogAccessModule {}
