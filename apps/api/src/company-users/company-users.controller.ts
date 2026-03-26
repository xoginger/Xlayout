/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Post, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { CompanyUsersService } from './company-users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';
import { CompanyUserRole } from '@prisma/client';

// Solo PLATFORM_USER y COMPANY_USER pueden gestionar usuarios de empresa
@Controller('company-users')
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
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

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateStatus(id, body.status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { firstName?: string; lastName?: string; email?: string; role?: CompanyUserRole }) {
    return this.service.update(id, body);
  }
}
