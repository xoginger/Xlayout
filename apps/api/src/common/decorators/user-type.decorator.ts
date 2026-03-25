/**
 * Creado y diseñado por XO
 */

import { SetMetadata } from '@nestjs/common';

// Clave de metadata para tipos de usuario permitidos
export const ALLOWED_USER_TYPES_KEY = 'allowedUserTypes';

/**
 * Decorador que define qué tipos de usuario pueden acceder a un endpoint.
 * Uso: @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
 */
export const AllowedUserTypes = (...types: string[]) =>
  SetMetadata(ALLOWED_USER_TYPES_KEY, types);
