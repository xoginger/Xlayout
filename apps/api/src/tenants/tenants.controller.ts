import { Controller, Get, Post, Param, Body, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly service: TenantsService) {}

  /** POST /tenants — Platform admin creates a new company/brand */
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

  /** GET /tenants — List all tenants (platform admin only) */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** GET /tenants/:id — Get tenant details */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** PATCH /tenants/:id/status — Suspend / activate a tenant */
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: any }) {
    return this.service.updateStatus(id, body.status);
  }
}
