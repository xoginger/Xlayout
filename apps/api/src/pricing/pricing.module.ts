import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PricingEngineService } from './pricing.service';
import { PricingController } from './pricing.controller';

@Module({
  imports: [PrismaModule],
  providers: [PricingEngineService],
  controllers: [PricingController],
  exports: [PricingEngineService]
})
export class PricingModule {}
