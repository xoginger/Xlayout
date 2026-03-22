/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
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
