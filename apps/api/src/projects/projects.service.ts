import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingEngineService } from '../pricing/pricing.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private pricingEngine: PricingEngineService
  ) {}

  async createProject(tenantId: string, userId: string, data: { name: string; description?: string }) {
    return this.prisma.project.create({
      data: {
        ...data,
        tenantId,
        creatorId: userId,
      },
    });
  }

  async getProjects(tenantId: string) {
    return this.prisma.project.findMany({
      where: { tenantId },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { versions: true } }
      }
    });
  }

  async getProjectById(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: { versions: true }
    });
    
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async saveLayoutVersion(tenantId: string, projectId: string, sceneState: any) {
    // Basic verification that project belongs to tenant
    await this.getProjectById(tenantId, projectId);

    const versionNum = await this.prisma.projectVersion.count({
      where: { projectId }
    }) + 1;

    const version = await this.prisma.projectVersion.create({
      data: {
        projectId,
        versionNum,
        sceneState
      }
    });

    // Automatically generate a quote based on placements
    const placements = sceneState.placements || [];
    if (placements.length > 0) {
       const quoteData = await this.pricingEngine.calculateQuote(tenantId, placements);
       
       await this.prisma.quote.create({
         data: {
           tenantId,
           projectVersionId: version.id,
           totalAmount: quoteData.total,
           quoteData: quoteData.lines as any, // Denormalized state snapshot
           status: 'DRAFT'
         }
       });
    }

    return version;
  }

  async getQuotes(tenantId: string, projectId: string) {
    return this.prisma.quote.findMany({
      where: { 
        tenantId,
        projectVersion: { projectId }
      },
      include: { projectVersion: true }
    });
  }
}
