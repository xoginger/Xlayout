import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class ImportsService {
  constructor(@InjectQueue('imports') private importsQueue: Queue) {}

  async triggerImport(tenantId: string, type: 'catalog' | 'prices', fileUrl: string) {
    const job = await this.importsQueue.add('process-import', {
      tenantId,
      type,
      fileUrl,
      timestamp: Date.now()
    });
    
    return {
      message: 'Import queued successfully',
      jobId: job.id
    };
  }

  async getImportStatus(jobId: string) {
    const job = await this.importsQueue.getJob(jobId);
    if (!job) {
      return { status: 'NOT_FOUND' };
    }
    
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason
    };
  }
}
