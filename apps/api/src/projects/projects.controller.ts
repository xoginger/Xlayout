/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Proyectos — accesible para PLATFORM, COMPANY y DISTRIBUTOR (no END_USER)
@UseGuards(JwtAuthGuard, TenantGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER', 'DISTRIBUTOR_USER')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async createProject(@Req() req: any, @Body() body: { name: string; description?: string }) {
    // sub proviene del payload JWT
    return this.projectsService.createProject(req.tenantId, req.user.sub, body);
  }

  @Get()
  async getProjects(@Req() req: any) {
    return this.projectsService.getProjects(req.tenantId);
  }

  @Get(':id')
  async getProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getProjectById(req.tenantId, id);
  }

  @Post(':id/versions')
  async saveVersion(@Req() req: any, @Param('id') projectId: string, @Body() body: { sceneState: any }) {
    return this.projectsService.saveLayoutVersion(req.tenantId, projectId, body.sceneState);
  }

  @Get(':id/quotes')
  async getProjectQuotes(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.getQuotes(req.tenantId, id);
  }

  @Post(':id/quotes')
  async createQuote(@Req() req: any, @Param('id') projectId: string, @Body() body: any) {
    return this.projectsService.createQuote(req.tenantId, req.user.sub, projectId, body);
  }

  @Patch(':id')
  async updateProject(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.projectsService.updateProject(req.tenantId, id, body);
  }

  @Delete(':id')
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.deleteProject(req.tenantId, id);
  }

  @Post(':id/duplicate')
  async duplicateProject(@Req() req: any, @Param('id') id: string) {
    return this.projectsService.duplicateProject(req.tenantId, req.user.sub, id);
  }
}
