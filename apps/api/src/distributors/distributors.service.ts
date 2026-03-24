/**
 * Creado y diseñado por XO
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DistributorsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD de Empresas Distribuidoras ──────────────────────────────────────

  /** Crea una nueva empresa distribuidora */
  async createDistributor(data: {
    name: string;
    contactEmail?: string;
    phone?: string;
    country?: string;
    metadata?: any;
  }) {
    // Genera un slug único a partir del nombre
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return this.prisma.client.distributorCompany.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  /** Lista todos los distribuidores activos */
  async findAll() {
    return this.prisma.client.distributorCompany.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { users: true, manufacturerAccesses: true },
        },
      },
    });
  }

  /** Obtiene un distribuidor por ID */
  async findOne(id: string) {
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            status: true,
          },
        },
        manufacturerAccesses: {
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true, slug: true } },
          },
        },
        catalogAccesses: {
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
        priceMarkups: {
          where: { active: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!distributor) throw new NotFoundException('Distribuidor no encontrado');
    return distributor;
  }

  /** Actualiza los datos de un distribuidor */
  async updateDistributor(
    id: string,
    data: Partial<{
      name: string;
      contactEmail: string;
      phone: string;
      country: string;
      metadata: any;
    }>,
  ) {
    await this.findOne(id);
    return this.prisma.client.distributorCompany.update({
      where: { id },
      data,
    });
  }

  // ─── Control de Acceso Fabricante ↔ Distribuidor ──────────────────────────

  /**
   * El fabricante (tenantId) autoriza a un distribuidor para acceder a su catálogo.
   * Además define qué lista de precios recibirá.
   */
  async grantAccess(
    tenantId: string,
    distributorId: string,
    priceListType: string = 'A',
    notes?: string,
    expiresAt?: Date,
  ) {
    // Verificar que el distribuidor existe
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distribuidor no encontrado');

    // Verificar que el fabricante existe
    const tenant = await this.prisma.client.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Fabricante no encontrado');

    // Validar tipo de lista de precio
    const validPriceTypes = ['A', 'B', 'C', 'D', 'E'];
    if (!validPriceTypes.includes(priceListType.toUpperCase())) {
      throw new BadRequestException(`Tipo de lista de precio inválido: ${priceListType}. Use A, B, C, D o E.`);
    }

    // Crear o actualizar el acceso macro (ManufacturerDistributorAccess)
    const existingAccess = await this.prisma.client.manufacturerDistributorAccess.findUnique({
      where: { tenantId_distributorId: { tenantId, distributorId } },
    });

    if (existingAccess) {
      // Reactivar si estaba inactivo
      await this.prisma.client.manufacturerDistributorAccess.update({
        where: { tenantId_distributorId: { tenantId, distributorId } },
        data: { active: true, notes, expiresAt },
      });
    } else {
      await this.prisma.client.manufacturerDistributorAccess.create({
        data: { tenantId, distributorId, active: true, notes, expiresAt },
      });
    }

    // Crear o actualizar el acceso de catálogo con lista de precio asignada
    const existingCatalogAccess = await this.prisma.client.distributorCatalogAccess.findUnique({
      where: { distributorId_tenantId: { distributorId, tenantId } },
    });

    if (existingCatalogAccess) {
      return this.prisma.client.distributorCatalogAccess.update({
        where: { distributorId_tenantId: { distributorId, tenantId } },
        data: { active: true, priceListType: priceListType.toUpperCase() },
        include: { tenant: true, distributor: true },
      });
    }

    return this.prisma.client.distributorCatalogAccess.create({
      data: {
        distributorId,
        tenantId,
        priceListType: priceListType.toUpperCase(),
        active: true,
      },
      include: { tenant: true, distributor: true },
    });
  }

  /** Revoca el acceso de un distribuidor al catálogo de un fabricante */
  async revokeAccess(tenantId: string, distributorId: string) {
    // Desactivar acceso macro
    await this.prisma.client.manufacturerDistributorAccess.update({
      where: { tenantId_distributorId: { tenantId, distributorId } },
      data: { active: false },
    }).catch(() => null); // No lanzar error si no existe

    // Desactivar acceso de catálogo
    await this.prisma.client.distributorCatalogAccess.update({
      where: { distributorId_tenantId: { distributorId, tenantId } },
      data: { active: false },
    }).catch(() => null);

    return { message: 'Acceso revocado correctamente' };
  }

  /** Lista los distribuidores autorizados para un fabricante */
  async findDistributorsByTenant(tenantId: string) {
    return this.prisma.client.manufacturerDistributorAccess.findMany({
      where: { tenantId, active: true },
      include: {
        distributor: {
          include: {
            _count: { select: { users: true } },
            catalogAccesses: {
              where: { tenantId, active: true },
              select: { priceListType: true },
            },
            priceMarkups: {
              where: { active: true, tenantId },
              select: { scope: true, markupPercent: true, priority: true },
            },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  // ─── Gestión de Markup de Precios ─────────────────────────────────────────

  /** Crea o actualiza una regla de markup para un distribuidor */
  async setMarkup(
    distributorId: string,
    data: {
      scope: 'GLOBAL' | 'BY_TENANT' | 'BY_LINE' | 'BY_PRODUCT';
      markupPercent: number;
      tenantId?: string;
      productLineId?: string;
      productId?: string;
      priority?: number;
    },
  ) {
    // Validar que el markup no sea negativo
    if (data.markupPercent < 0) {
      throw new BadRequestException('El incremento de precio no puede ser negativo');
    }

    return this.prisma.client.distributorPriceMarkup.create({
      data: {
        distributorId,
        scope: data.scope,
        markupPercent: data.markupPercent,
        tenantId: data.tenantId || null,
        productLineId: data.productLineId || null,
        productId: data.productId || null,
        priority: data.priority ?? 0,
        active: true,
      },
    });
  }

  /** Desactiva una regla de markup */
  async deactivateMarkup(distributorId: string, markupId: string) {
    const markup = await this.prisma.client.distributorPriceMarkup.findUnique({
      where: { id: markupId },
    });
    if (!markup || markup.distributorId !== distributorId) {
      throw new ForbiddenException('No autorizado para modificar este markup');
    }
    return this.prisma.client.distributorPriceMarkup.update({
      where: { id: markupId },
      data: { active: false },
    });
  }

  /** 
   * Calcula el precio final para un producto según las reglas de markup del distribuidor.
   * Prioridad: BY_PRODUCT > BY_LINE > BY_TENANT > GLOBAL
   */
  async calculateFinalPrice(
    distributorId: string,
    basePrice: number,
    context: { tenantId: string; productId: string; productLineId: string },
  ): Promise<number> {
    // Obtener todas las reglas activas del distribuidor
    const markups = await this.prisma.client.distributorPriceMarkup.findMany({
      where: { distributorId, active: true },
      orderBy: { priority: 'desc' },
    });

    // Encontrar la regla de mayor prioridad que aplique al contexto
    let applicableMarkup = null;

    for (const markup of markups) {
      if (markup.scope === 'BY_PRODUCT' && markup.productId === context.productId) {
        applicableMarkup = markup;
        break;
      }
      if (markup.scope === 'BY_LINE' && markup.productLineId === context.productLineId) {
        applicableMarkup = markup;
        break;
      }
      if (markup.scope === 'BY_TENANT' && markup.tenantId === context.tenantId) {
        applicableMarkup = markup;
        break;
      }
      if (markup.scope === 'GLOBAL' && !applicableMarkup) {
        applicableMarkup = markup;
        // No break — puede haber reglas de mayor prioridad
      }
    }

    if (!applicableMarkup) return basePrice;

    // Precio final = precioBase * (1 + markupPercent / 100)
    const percent = Number(applicableMarkup.markupPercent);
    return basePrice * (1 + percent / 100);
  }

  /**
   * Obtiene los catálogos accesibles por un distribuidor, con la lista de precios asignada.
   * Devuelve un mapa: tenantId → priceListType
   */
  async getDistributorCatalogMap(distributorId: string): Promise<Map<string, string>> {
    const accesses = await this.prisma.client.distributorCatalogAccess.findMany({
      where: { distributorId, active: true },
    });

    const map = new Map<string, string>();
    accesses.forEach((a: { tenantId: string; priceListType: string }) => map.set(a.tenantId, a.priceListType));
    return map;
  }
}
