/**
 * Creado y diseñado por XO
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard que valida que un DISTRIBUTOR_USER solo opere sobre recursos
 * de su propio distributorId.
 *
 * Busca el distributorId en:
 *   1. req.params.distributorId (ruta tipo /distributors/:distributorId/...)
 *   2. req.body.distributorId (body del POST)
 *
 * PLATFORM_USER siempre bypasea esta verificación (superadmin).
 * COMPANY_USER bypasea esta verificación (fabricante administra distribuidores ajenos).
 */
@Injectable()
export class DistributorOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Se requiere autenticación');
    }

    // PLATFORM_USER y COMPANY_USER no están limitados por distributorId propio
    if (user.userType === 'PLATFORM_USER' || user.userType === 'COMPANY_USER') {
      return true;
    }

    // Solo aplica a DISTRIBUTOR_USER
    if (user.userType !== 'DISTRIBUTOR_USER') {
      throw new ForbiddenException('Tipo de usuario no válido para esta operación');
    }

    // Obtener el distributorId del token JWT
    const userDistributorId = user.distributorId;
    if (!userDistributorId) {
      throw new ForbiddenException('El usuario no tiene un distributorId asociado');
    }

    // Obtener el distributorId solicitado del request (params o body)
    const requestedDistributorId =
      request.params?.distributorId || request.body?.distributorId;

    // Si no hay distributorId en la petición, no hay nada que validar
    if (!requestedDistributorId) {
      return true;
    }

    // Validar que coincidan
    if (requestedDistributorId !== userDistributorId) {
      throw new ForbiddenException(
        'Acceso denegado: no puede operar recursos de otro distribuidor',
      );
    }

    return true;
  }
}
