/**
 * Creado y diseñado por XO
 * XLayout System
 *
 * Guard de aislamiento multi-tenant.
 * Resuelve y asigna `req.tenantId` según el tipo de usuario autenticado.
 *
 * Flujo de resolución:
 *   COMPANY_USER   → tenantId del JWT/DB (obligatorio)
 *   PLATFORM_USER  → header x-tenant-id (opcional, algunas rutas lo necesitan)
 *   DISTRIBUTOR_USER → sin tenantId propio, usa distributorId
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

    // PLATFORM_USER ve todo — tenantId viene del header x-tenant-id o query param
    if (user.userType === 'PLATFORM_USER') {
      request.tenantId = request.headers['x-tenant-id'] || request.query.tenantId || null;
      return true;
    }

    // DISTRIBUTOR_USER no tiene tenantId propio — acceso se filtra por distributorId
    if (user.userType === 'DISTRIBUTOR_USER') {
      request.tenantId = request.headers['x-tenant-id'] || null;
      request.distributorId = user.distributorId;
      return true;
    }

    // COMPANY_USER y END_USER — tenantId del JWT es obligatorio
    // Si el JWT tiene tenantId, se usa; el header x-tenant-id se ignora (seguridad)
    if (!user.tenantId) {
      throw new ForbiddenException(
        `Acceso denegado: usuario ${user.userType} sin tenant asociado. Contacte al administrador.`
      );
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
