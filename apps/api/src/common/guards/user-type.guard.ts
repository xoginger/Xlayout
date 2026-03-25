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
import { ALLOWED_USER_TYPES_KEY } from '../decorators/user-type.decorator';

/**
 * Guard que valida el userType del usuario autenticado contra la lista definida
 * por el decorador @AllowedUserTypes(). Si no se define el decorador en un endpoint,
 * el guard permite el acceso (fallback permisivo para no romper endpoints existentes
 * que aún no están decorados).
 */
@Injectable()
export class UserTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener tipos permitidos del decorador (método tiene prioridad sobre clase)
    const allowedTypes = this.reflector.getAllAndOverride<string[]>(
      ALLOWED_USER_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay decorador, permitir acceso (compatibilidad con endpoints sin decorar)
    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userType) {
      throw new ForbiddenException('Se requiere autenticación con tipo de usuario válido');
    }

    if (!allowedTypes.includes(user.userType)) {
      throw new ForbiddenException(
        `Acceso denegado: el tipo de usuario '${user.userType}' no tiene permisos para este recurso`,
      );
    }

    return true;
  }
}
