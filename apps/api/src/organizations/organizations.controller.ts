import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CompanyType } from '@prisma/client';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post('companies')
  async createCompany(@Body() body: { name: string; type: CompanyType }) {
    return this.orgsService.createCompany(body);
  }

  @Get('companies')
  async getAllCompanies() {
    return this.orgsService.findAllCompanies();
  }

  @Get('companies/:id')
  async getCompany(@Param('id') id: string) {
    return this.orgsService.findCompanyById(id);
  }
}
