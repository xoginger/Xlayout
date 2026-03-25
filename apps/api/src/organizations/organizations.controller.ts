/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Organizaciones/Tenants — solo PLATFORM_USER (superadmin)
@UseGuards(JwtAuthGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post('companies')
  async createCompany(@Body() body: { name: string; type?: string }) {
    return this.orgService.createCompany(body);
  }

  @Get('companies')
  async getAllCompanies() {
    return this.orgService.findAllCompanies();
  }

  @Get('companies/:id')
  async getCompany(@Param('id') id: string) {
    return this.orgService.findCompanyById(id);
  }
}
