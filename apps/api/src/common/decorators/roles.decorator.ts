/**
 * Creado y diseñado por XO
 */

import { SetMetadata } from '@nestjs/common';

// Clave de metadata para roles internos permitidos
export const ALLOWED_ROLES_KEY = 'allowedRoles';

/**
 * Decorador que define qué roles internos pueden acceder a un endpoint.
 * Funciona con sub-roles de distribuidor (DISTRIBUTOR_ADMIN, DESIGNER, SALES)
 * y de company (TENANT_ADMIN, BUSINESS_OWNER, CATALOG_MANAGER, SALES_USER).
 * Uso: @AllowedRoles('DISTRIBUTOR_ADMIN')
 */
export const AllowedRoles = (...roles: string[]) =>
  SetMetadata(ALLOWED_ROLES_KEY, roles);
