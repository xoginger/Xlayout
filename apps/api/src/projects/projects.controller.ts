import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async createProject(@Req() req: any, @Body() body: { name: string; description?: string }) {
    // sub comes from JWT payload
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
