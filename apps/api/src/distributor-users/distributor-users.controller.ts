/**
 * Creado y diseñado por XO
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DistributorOwnershipGuard } from '../common/guards/distributor-ownership.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';
import { AllowedRoles } from '../common/decorators/roles.decorator';
import { DistributorUsersService } from './distributor-users.service';

/**
 * Controlador de usuarios internos de distribuidores.
 * Todos los endpoints requieren autenticación y validación de tipo de usuario.
 * Los endpoints de administración requieren DISTRIBUTOR_ADMIN + ownership.
 */
@Controller('distributor-users')
@UseGuards(JwtAuthGuard, UserTypeGuard)
export class DistributorUsersController {
  constructor(private readonly distributorUsersService: DistributorUsersService) {}

  /**
   * Crea un nuevo usuario dentro del distribuidor.
   * Solo DISTRIBUTOR_ADMIN de su propio distribuidor o PLATFORM_USER.
   * El ownership se valida contra body.distributorId.
   */
  @UseGuards(RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Post()
  async create(
    @Body() body: {
      distributorId: string;
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';
    },
  ) {
    return this.distributorUsersService.createUser(body.distributorId, body);
  }

  /**
   * Lista usuarios del distribuidor.
   * DISTRIBUTOR_ADMIN solo ve los de su propio distribuidor.
   */
  @UseGuards(RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Get('by-distributor/:distributorId')
  async findByDistributor(@Param('distributorId') distributorId: string) {
    return this.distributorUsersService.findByDistributor(distributorId);
  }

  /**
   * Obtiene el perfil propio del usuario distribuidor autenticado.
   * Cualquier DISTRIBUTOR_USER puede ver su propio perfil.
   */
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @Get('me')
  async getMe(@Request() req: any) {
    const userId = req.user.sub;
    return this.distributorUsersService.findOne(userId);
  }

  /**
   * Obtiene un usuario por ID.
   * DISTRIBUTOR_ADMIN solo puede ver usuarios de su distribuidor.
   * La validación de ownership se refuerza a nivel de servicio.
   */
  @UseGuards(RolesGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const result = await this.distributorUsersService.findOne(id);
    // Validar ownership a nivel de controlador para DISTRIBUTOR_USER
    if (
      req.user.userType === 'DISTRIBUTOR_USER' &&
      result.distributorId !== req.user.distributorId
    ) {
      throw new ForbiddenException('No puede acceder a usuarios de otro distribuidor');
    }
    return result;
  }

  /**
   * Actualiza rol o estado de un usuario del distribuidor.
   * Ownership validado por guard (distributorId en param) y servicio.
   */
  @UseGuards(RolesGuard, DistributorOwnershipGuard)
  @AllowedUserTypes('PLATFORM_USER', 'DISTRIBUTOR_USER')
  @AllowedRoles('DISTRIBUTOR_ADMIN')
  @Patch(':distributorId/:userId')
  async update(
    @Param('distributorId') distributorId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.distributorUsersService.updateUser(distributorId, userId, body);
  }
}
