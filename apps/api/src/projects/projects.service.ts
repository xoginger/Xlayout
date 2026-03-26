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

    // 1. Crear la versión base con el JSON
    const version = await this.prisma.client.projectVersion.create({
      data: {
        projectId,
        versionNum,
        sceneState
      }
    });

    // 2. Persistencia Relacional (Muros, Huecos, Placements)
    const walls = sceneState.walls || [];
    const openings = sceneState.openings || [];
    const items = sceneState.items || [];

    // Mapeo selectivo para evitar errores de esquema si vienen campos extra
    if (walls.length > 0) {
      await this.prisma.client.wall.createMany({
        data: walls.map((w: any) => ({
          id: w.id, // Mantener IDs del frontend para consistencia de referencias
          projectVersionId: version.id,
          startX: w.start[0],
          startY: w.start[2], // En 3D usualmente Z es profundidad, mapeamos a Y 2D
          endX: w.end[0],
          endY: w.end[2],
          thickness: w.thickness,
          height: w.height
        }))
      });
    }

    if (openings.length > 0) {
      await this.prisma.client.opening.createMany({
        data: openings.map((o: any) => ({
          id: o.id,
          projectVersionId: version.id,
          wallId: o.wallId,
          type: o.type,
          positionX: o.offset,
          width: o.width,
          height: o.height
        }))
      });
    }

    if (items.length > 0) {
      await this.prisma.client.placement.createMany({
        data: items.map((it: any) => ({
          id: it.id,
          projectVersionId: version.id,
          productId: it.productId,
          posX: it.position[0],
          posY: it.position[1],
          posZ: it.position[2],
          rotX: it.rotation[0],
          rotY: it.rotation[1],
          rotZ: it.rotation[2]
        }))
      });
    }

    // 3. Generar automáticamente una cotización basada en los placements
    if (items.length > 0) {
       const quoteData = await this.pricingEngine.calculateQuote(tenantId, items);
       
       await this.prisma.client.quote.create({
         data: {
           tenantId,
           projectVersionId: version.id,
           totalAmount: quoteData.total,
           quoteData: quoteData.lines as any,
           status: 'DRAFT',
           totalPieces: items.length,
           priceType: sceneState.project?.priceType || 'A'
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
      include: { 
        projectVersion: { select: { versionNum: true, createdAt: true } },
        creator: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createQuote(tenantId: string, userId: string, projectId: string, data: any) {
    // 1. Validar que el proyecto pertenece al tenant
    const project = await this.prisma.client.project.findFirst({
        where: { id: projectId, tenantId },
        select: { id: true }
    });

    if (!project) throw new NotFoundException('Proyecto no encontrado');

    // 2. Obtener la última versión disponible para el proyecto si no se especifica una
    const version = await this.prisma.client.projectVersion.findFirst({
        where: { projectId },
        orderBy: { versionNum: 'desc' }
    });

    if (!version) throw new NotFoundException('El proyecto no tiene versiones de layout guardadas');

    // 3. Persistir la cotización con su snapshot completo
    return this.prisma.client.quote.create({
        data: {
            tenantId,
            projectVersionId: version.id,
            totalAmount: data.totalAmount,
            totalPieces: data.totalItems || data.totalPieces || 0,
            priceType: data.priceType || 'A',
            status: 'DRAFT',
            quoteData: data.quoteData || data, // Guardar el snapshot JSON entero
            creatorId: userId
        }
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
