import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('imports')
export class ImportsProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { tenantId, type, fileUrl } = job.data;
    
    // Fake parsing delay
    await job.updateProgress(10);
    this.sleep(1000);
    await job.updateProgress(40);

    if (type === 'catalog') {
      // Stub: Fetch TSV/CSV from fileUrl, parse columns: Brand, Line, Category, Sku, Name, Price...
      await job.updateProgress(60);
      
      // Stub: insert rows to prisma...
      // await this.prisma.product.createMany({...})
      
      await job.updateProgress(100);
      return { success: true, rowsInserted: 1500, type: 'catalog' };
    } 
    else if (type === 'prices') {
      await job.updateProgress(100);
      return { success: true, rulesUpdated: 400, type: 'prices' };
    }

    throw new Error('Unknown import type');
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
