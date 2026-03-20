import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class PrismaService implements OnModuleInit {
  private static _baseClient: PrismaClient;
  private static readonly als = new AsyncLocalStorage<{ tenantId: string }>();
  private readonly logger = new Logger(PrismaService.name);

  constructor() {}

  static setTenantId(tenantId: string, callback: () => any) {
    return this.als.run({ tenantId }, callback);
  }

  private static getBaseClient(): PrismaClient {
    if (!PrismaService._baseClient) {
      PrismaService._baseClient = new PrismaClient({
        log: ['error'],
      });
    }
    return PrismaService._baseClient;
  }

  async onModuleInit() {
    const maxRetries = 12;
    const baseDelayMs = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await PrismaService.getBaseClient().$connect();
        // Verify connection is truly usable with a real query
        await PrismaService.getBaseClient().$queryRaw`SELECT 1`;
        this.logger.log(`Database connected successfully on attempt ${attempt}`);
        return;
      } catch (err: any) {
        const delay = baseDelayMs * attempt;
        this.logger.warn(
          `DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delay}ms...`
        );
        if (attempt === maxRetries) {
          this.logger.error('Could not connect to database after maximum retries');
          throw err;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  public get client(): any {
    const context = PrismaService.als.getStore();
    const tenantId = context?.tenantId;

    if (!tenantId) {
      return PrismaService.getBaseClient();
    }
    
    const base = PrismaService.getBaseClient();

    return (base as any).$extends({
      query: {
         $allModels: {
            async $allOperations({ model, operation, args, query }: any) {
               const self = PrismaService.getBaseClient() as any;
               return self.$transaction(async (tx: any) => {
                  await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
                  const modelName = model.charAt(0).toLowerCase() + model.slice(1);
                  return tx[modelName][operation](args);
               });
            }
         }
      }
    });
  }

  // Fallback for direct access — bypasses tenant middleware
  get baseClient() {
    return PrismaService.getBaseClient();
  }
}
