/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { EndUsersService } from './end-users.service';

@Controller('end-users')
export class EndUsersController {
  constructor(private readonly service: EndUsersService) {}

  /** POST /end-users/register — Auto-registro gratuito */
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

  /** GET /end-users/:id — Obtener perfil de usuario final */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** GET /end-users/:id/catalogs — Listar todos los catálogos accesibles */
  @Get(':id/catalogs')
  getCatalogs(@Param('id') id: string) {
    return this.service.getAccessibleCatalogs(id);
  }

  /** POST /end-users/:id/activate — Activar acceso con un código */
  @Post(':id/activate')
  activate(@Param('id') id: string, @Body() body: { code: string }) {
    return this.service.activateWithCode(id, body.code);
  }
}
