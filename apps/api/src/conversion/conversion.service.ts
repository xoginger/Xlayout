/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CONVERSION_QUEUE } from './conversion.constants';

export interface ConversionJobData {
  assetId: string;
  originalFilePath: string;
  originalFormat: string;
  tenantId: string;
}

@Injectable()
export class ConversionService {
  constructor(@InjectQueue(CONVERSION_QUEUE) private conversionQueue: Queue) {}

  async enqueueConversion(data: ConversionJobData): Promise<void> {
    await this.conversionQueue.add('convert-asset', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 50,
      removeOnFail: 100,
    });
  }

  async retryConversion(data: ConversionJobData): Promise<void> {
    await this.conversionQueue.add('convert-asset', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
