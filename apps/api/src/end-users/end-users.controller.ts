/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Get, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { EndUsersService } from './end-users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

@Controller('end-users')
export class EndUsersController {
  constructor(private readonly service: EndUsersService) {}

  /** POST /end-users/register — Auto-registro gratuito (ruta pública) */
  @Post('register')
  register(
    @Body() body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone?: string;
      companyName?: string;
      profession?: string;
      country?: string;
    },
  ) {
    return this.service.register(body);
  }

  /** GET /end-users/:id — Obtener perfil (solo el propio usuario o admin) */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'END_USER')
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    // END_USER solo puede ver su propio perfil
    if (req.user.userType === 'END_USER' && req.user.sub !== id) {
      throw new ForbiddenException('Solo puede acceder a su propio perfil');
    }
    return this.service.findById(id);
  }

  /** GET /end-users/:id/catalogs — Listar catálogos accesibles */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'END_USER')
  @Get(':id/catalogs')
  async getCatalogs(@Request() req: any, @Param('id') id: string) {
    // END_USER solo puede ver sus propios catálogos
    if (req.user.userType === 'END_USER' && req.user.sub !== id) {
      throw new ForbiddenException('Solo puede acceder a sus propios catálogos');
    }
    return this.service.getAccessibleCatalogs(id);
  }

  /** POST /end-users/:id/activate — Activar acceso con código (solo el propio usuario) */
  @UseGuards(JwtAuthGuard, UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'END_USER')
  @Post(':id/activate')
  async activate(@Request() req: any, @Param('id') id: string, @Body() body: { code: string }) {
    // END_USER solo puede activar su propia cuenta
    if (req.user.userType === 'END_USER' && req.user.sub !== id) {
      throw new ForbiddenException('Solo puede activar su propia cuenta');
    }
    return this.service.activateWithCode(id, body.code);
  }
}
