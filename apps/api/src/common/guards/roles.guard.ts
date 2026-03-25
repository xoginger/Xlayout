/**
 * Creado y diseñado por XO
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard que valida el rol interno del usuario contra la lista definida
 * por el decorador @AllowedRoles().
 *
 * Para DISTRIBUTOR_USER → valida contra distributorRole
 * Para COMPANY_USER → valida contra companyRole
 * Para PLATFORM_USER → siempre permitido (superadmin)
 *
 * Si no se define el decorador, permite el acceso.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles permitidos del decorador (método tiene prioridad sobre clase)
    const allowedRoles = this.reflector.getAllAndOverride<string[]>(
      ALLOWED_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay decorador, permitir acceso
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Se requiere autenticación');
    }

    // PLATFORM_USER siempre tiene acceso total (superadmin)
    if (user.userType === 'PLATFORM_USER') {
      return true;
    }

    // Determinar el rol interno según el tipo de usuario
    let userRole: string | null = null;

    if (user.userType === 'DISTRIBUTOR_USER') {
      userRole = user.distributorRole;
    } else if (user.userType === 'COMPANY_USER') {
      userRole = user.companyRole;
    }

    if (!userRole) {
      throw new ForbiddenException('El usuario no tiene un rol interno asignado');
    }

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException(
        `Acceso denegado: el rol '${userRole}' no tiene permisos para esta operación`,
      );
    }

    return true;
  }
}
