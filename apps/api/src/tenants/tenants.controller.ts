/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, Post, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER')
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  /** POST /tenants — El admin de la plataforma crea una nueva empresa/marca */
  @Post()
  create(@Body() body: {
    name: string;
    slug: string;
    contactEmail?: string;
    logoUrl?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminFirstName?: string;
    adminLastName?: string;
  }) {
    return this.service.create(body);
  }

  /** GET /tenants — Listar todos los tenants (solo admin de plataforma) */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /tenants/:id — Obtener detalles del tenant */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** PATCH /tenants/:id/status — Suspender / activar un tenant */
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: any }) {
    return this.service.updateStatus(id, body.status);
  }
}
