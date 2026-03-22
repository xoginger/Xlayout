/**
 * Creado y diseñado por XO
 * XLayout System
 */

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
    return this.prisma.client.project.create({
      data: {
        ...data,
        tenantId,
        creatorId: userId,
      },
    });
  }

  async getProjects(tenantId: string) {
    return this.prisma.client.project.findMany({
      where: { tenantId },
      include: {
        creator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { versions: true } }
      }
    });
  }

  async getProjectById(tenantId: string, projectId: string) {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, tenantId },
      include: { versions: true }
    });
    
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    return project;
  }

  async saveLayoutVersion(tenantId: string, projectId: string, sceneState: any) {
    // Verificación básica de que el proyecto pertenece al tenant
    await this.getProjectById(tenantId, projectId);

    const versionNum = await this.prisma.client.projectVersion.count({
      where: { projectId }
    }) + 1;

    const version = await this.prisma.client.projectVersion.create({
      data: {
        projectId,
        versionNum,
        sceneState
      }
    });

    // Generar automáticamente una cotización basada en los placements
    const placements = sceneState.placements || [];
    if (placements.length > 0) {
       const quoteData = await this.pricingEngine.calculateQuote(tenantId, placements);
       
       await this.prisma.client.quote.create({
         data: {
           tenantId,
           projectVersionId: version.id,
           totalAmount: quoteData.total,
           quoteData: quoteData.lines as any, // Instantánea del estado desnormalizado
           status: 'DRAFT'
         }
       });
    }

    return version;
  }

  async getQuotes(tenantId: string, projectId: string) {
    return this.prisma.client.quote.findMany({
      where: { 
        tenantId,
        projectVersion: { projectId }
      },
      include: { projectVersion: true }
    });
  }

  async updateProject(tenantId: string, id: string, data: { name?: string; description?: string }) {
    await this.getProjectById(tenantId, id);
    return this.prisma.client.project.update({
      where: { id },
      data
    });
  }

  async deleteProject(tenantId: string, id: string) {
    await this.getProjectById(tenantId, id);
    return this.prisma.client.project.delete({
      where: { id }
    });
  }

  async duplicateProject(tenantId: string, userId: string, id: string) {
    const original = await this.getProjectById(tenantId, id);
    
    // Crear nuevo proyecto
    const duplicated = await this.prisma.client.project.create({
      data: {
        name: `${original.name} (Copia)`,
        description: original.description,
        tenantId,
        creatorId: userId
      }
    });

    // Copiar la última versión si existe
    const latestVersion = await this.prisma.client.projectVersion.findFirst({
      where: { projectId: id },
      orderBy: { versionNum: 'desc' }
    });

    if (latestVersion) {
      await this.saveLayoutVersion(tenantId, duplicated.id, latestVersion.sceneState);
    }

    return duplicated;
  }
}
