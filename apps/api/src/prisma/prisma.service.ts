import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class PrismaService implements OnModuleInit {
  private static _baseClient: PrismaClient;
  private static readonly als = new AsyncLocalStorage<{ tenantId: string }>();

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
    await PrismaService.getBaseClient().$connect();
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

  // Fallback for direct access if needed (caution: bypasses RLS if used improperly)
  get baseClient() {
    return PrismaService.getBaseClient();
  }
}
