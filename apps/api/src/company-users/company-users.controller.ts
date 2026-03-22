/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyUserRole } from '@prisma/client';

@Controller('company-users')
@UseGuards(JwtAuthGuard)
export class CompanyUsersController {
  constructor(private readonly service: CompanyUsersService) {}

  @Post()
  create(@Body() body: {
    tenantId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: CompanyUserRole;
  }) {
    return this.service.create(body);
  }

  @Get('tenant/:tenantId')
  findByTenant(@Param('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Patch(':id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: CompanyUserRole }) {
    return this.service.updateRole(id, body.role);
  }
}
