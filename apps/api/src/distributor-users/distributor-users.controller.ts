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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DistributorUsersService } from './distributor-users.service';

// Controlador de usuarios internos de distribuidores (diseñadores, vendedores, administradores)
@Controller('distributor-users')
@UseGuards(JwtAuthGuard)
export class DistributorUsersController {
  constructor(private readonly distributorUsersService: DistributorUsersService) {}

  /** Crea un nuevo usuario dentro de una empresa distribuidora */
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

  /** Lista todos los usuarios de un distribuidor */
  @Get('by-distributor/:distributorId')
  async findByDistributor(@Param('distributorId') distributorId: string) {
    return this.distributorUsersService.findByDistributor(distributorId);
  }

  /** Obtiene el perfil propio del usuario distribuidor autenticado */
  @Get('me')
  async getMe(@Request() req: any) {
    const userId = req.user.sub;
    return this.distributorUsersService.findOne(userId);
  }

  /** Obtiene un usuario por ID */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.distributorUsersService.findOne(id);
  }

  /** Actualiza el rol o estado de un usuario del distribuidor */
  @Patch(':distributorId/:userId')
  async update(
    @Param('distributorId') distributorId: string,
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    return this.distributorUsersService.updateUser(distributorId, userId, body);
  }
}
