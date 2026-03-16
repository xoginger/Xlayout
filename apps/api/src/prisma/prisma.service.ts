import { Injectable, OnModuleInit, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

// Make PrismaService request-scoped so we can retrieve the tenantId injected by TenantGuard
@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(@Inject(REQUEST) private readonly request: any) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Extension for Tenant Row-Level Security
  // We use Prisma Client Extensions to wrap all queries dynamically
  public get client(): any {
    const tenantId = this.request.tenantId;

    if (!tenantId) {
      // If no tenantId, return normal client (e.g. for Auth/Login routes or Admin functions)
      return this;
    }

    // Return an extended client that injects PostgreSQL SET LOCAL directives
    return this.$extends({
      query: {
         $allModels: {
            async $allOperations({ model, operation, args, query }) {
               const self = this as any;
               
               // We run the queries in an interactive transaction to guarantee RLS session scoping
               // Note: We cast to any to access the model dynamically on the transaction object
               return (self as PrismaClient).$transaction(async (tx: any) => {
                  // 1. Inject the Postgres local variable for this transaction
                  await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
                  
                  // 2. Execute original query
                  // Prisma model names in $allOperations are PascalCase (e.g., 'User')
                  // but property keys on 'tx' are camelCase (e.g., 'user').
                  const modelName = model.charAt(0).toLowerCase() + model.slice(1);
                  return tx[modelName][operation](args);
               });
            }
         }
      }
    });
  }
}
