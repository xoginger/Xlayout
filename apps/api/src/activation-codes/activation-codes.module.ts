// activation-codes.module.ts — XLayout Activation Codes Module
import { Module } from '@nestjs/common';
import { ActivationCodesService } from './activation-codes.service';
import { ActivationCodesController } from './activation-codes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ActivationCodesController],
  providers: [ActivationCodesService],
  exports: [ActivationCodesService],
})
export class ActivationCodesModule {}
