/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConversionService } from './conversion.service';
import { ConversionProcessor } from './conversion.processor';
import { CONVERSION_QUEUE } from './conversion.constants';

export { CONVERSION_QUEUE } from './conversion.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: CONVERSION_QUEUE }),
  ],
  providers: [ConversionService, ConversionProcessor],
  exports: [ConversionService],
})
export class ConversionModule {}
