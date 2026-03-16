import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || (!user.tenantId && user.roles?.indexOf('ADMIN') === -1)) {
      throw new ForbiddenException('Tenant access required');
    }

    // Example feature: We could inject the tenantId in body or header to make sure they match
    request.tenantId = user.tenantId;

    return true;
  }
}
