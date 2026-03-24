/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Se requiere autenticación');
    }

    // PLATFORM_USER ve todo — no tiene tenantId fijo, se le permite siempre
    if (user.userType === 'PLATFORM_USER') {
      request.tenantId = request.headers['x-tenant-id'] || null;
      return true;
    }

    // DISTRIBUTOR_USER no tiene tenantId propio — su acceso se filtra por distributorId
    if (user.userType === 'DISTRIBUTOR_USER') {
      request.tenantId = null;
      request.distributorId = user.distributorId;
      return true;
    }

    // COMPANY_USER y END_USER requieren tenantId válido
    if (!user.tenantId) {
      throw new ForbiddenException('Se requiere acceso de Tenant');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
