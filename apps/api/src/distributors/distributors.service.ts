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
    plan?: 'STANDARD' | 'PRO';
    status?: 'ACTIVE' | 'INACTIVE' | 'PENDING';
    slug?: string;
    metadata?: any;
  }) {
    // Genera un slug único a partir del nombre o usa el provisto
    const slug = data.slug || data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    return this.prisma.client.distributorCompany.create({
      data: {
        name: data.name,
        contactEmail: data.contactEmail,
        phone: data.phone,
        country: data.country,
        plan: (data.plan as any) || 'STANDARD',
        status: (data.status as any) || 'ACTIVE',
        metadata: data.metadata,
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

  /** Obtiene un distribuidor por ID con toda su información comercial */
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
        allowedPriceLists: {
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
        discounts: {
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true } },
          },
        },
        proPricingRules: {
          where: { active: true },
          orderBy: { priority: 'desc' },
        },
        brandingConfig: true,
        // Legacy
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
      plan: 'STANDARD' | 'PRO';
      metadata: any;
    }>,
  ) {
    await this.findOne(id);
    return this.prisma.client.distributorCompany.update({
      where: { id },
      data: data as any,
    });
  }

  // ─── Control de Acceso Fabricante ↔ Distribuidor ──────────────────────────

  /**
   * El fabricante (tenantId) autoriza a un distribuidor para acceder a su catálogo.
   * Crea el acceso macro Y registra las listas permitidas.
   */
  async grantAccess(
    tenantId: string,
    distributorId: string,
    priceListTypes: string[] = ['A'],
    defaultPriceList: string = 'A',
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

    // Validar tipos de lista
    const validPriceTypes = ['A', 'B', 'C', 'D', 'E'];
    for (const pt of priceListTypes) {
      if (!validPriceTypes.includes(pt.toUpperCase())) {
        throw new BadRequestException(`Tipo de lista inválido: ${pt}. Use A, B, C, D o E.`);
      }
    }

    // Crear o actualizar el acceso macro (ManufacturerDistributorAccess)
    const existingAccess = await this.prisma.client.manufacturerDistributorAccess.findUnique({
      where: { tenantId_distributorId: { tenantId, distributorId } },
    });

    if (existingAccess) {
      await this.prisma.client.manufacturerDistributorAccess.update({
        where: { tenantId_distributorId: { tenantId, distributorId } },
        data: {
          active: true,
          defaultPriceList: defaultPriceList.toUpperCase(),
          notes,
          expiresAt,
        },
      });
    } else {
      await this.prisma.client.manufacturerDistributorAccess.create({
        data: {
          tenantId,
          distributorId,
          active: true,
          defaultPriceList: defaultPriceList.toUpperCase(),
          notes,
          expiresAt,
        },
      });
    }

    // Crear registros de listas permitidas
    for (const pt of priceListTypes) {
      const priceListType = pt.toUpperCase();
      const existing = await this.prisma.client.manufacturerDistributorAllowedPriceList.findUnique({
        where: {
          tenantId_distributorId_priceListType: {
            tenantId,
            distributorId,
            priceListType,
          },
        },
      });

      if (existing) {
        await this.prisma.client.manufacturerDistributorAllowedPriceList.update({
          where: { id: existing.id },
          data: {
            active: true,
            isDefault: priceListType === defaultPriceList.toUpperCase(),
          },
        });
      } else {
        await this.prisma.client.manufacturerDistributorAllowedPriceList.create({
          data: {
            tenantId,
            distributorId,
            priceListType,
            isDefault: priceListType === defaultPriceList.toUpperCase(),
            active: true,
          },
        });
      }
    }

    // Mantener compatibilidad con DistributorCatalogAccess (legacy)
    const existingCatalogAccess = await this.prisma.client.distributorCatalogAccess.findUnique({
      where: { distributorId_tenantId: { distributorId, tenantId } },
    });

    if (existingCatalogAccess) {
      await this.prisma.client.distributorCatalogAccess.update({
        where: { distributorId_tenantId: { distributorId, tenantId } },
        data: { active: true, priceListType: defaultPriceList.toUpperCase() },
      });
    } else {
      await this.prisma.client.distributorCatalogAccess.create({
        data: {
          distributorId,
          tenantId,
          priceListType: defaultPriceList.toUpperCase(),
          active: true,
        },
      });
    }

    return {
      message: 'Acceso otorgado correctamente',
      tenantId,
      distributorId,
      allowedPriceLists: priceListTypes.map(pt => pt.toUpperCase()),
      defaultPriceList: defaultPriceList.toUpperCase(),
    };
  }

  /** Revoca el acceso de un distribuidor al catálogo de un fabricante */
  async revokeAccess(tenantId: string, distributorId: string) {
    // Desactivar acceso macro
    await this.prisma.client.manufacturerDistributorAccess.update({
      where: { tenantId_distributorId: { tenantId, distributorId } },
      data: { active: false },
    }).catch(() => null);

    // Desactivar listas permitidas
    await this.prisma.client.manufacturerDistributorAllowedPriceList.updateMany({
      where: { tenantId, distributorId },
      data: { active: false },
    });

    // Desactivar descuentos
    await this.prisma.client.manufacturerDistributorDiscount.updateMany({
      where: { tenantId, distributorId },
      data: { active: false },
    });

    // Desactivar acceso de catálogo (legacy)
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
            allowedPriceLists: {
              where: { tenantId, active: true },
              select: { priceListType: true, isDefault: true },
            },
            discounts: {
              where: { tenantId, active: true },
              select: { scope: true, discountPercent: true, productLineId: true, productId: true },
            },
          },
        },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }

  // ─── Reglas de Pricing PRO ────────────────────────────────────────────────

  /**
   * Crea una regla de pricing PRO para un distribuidor.
   * Solo distribuidores con plan PRO pueden tener estas reglas.
   */
  async setProPricingRule(
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
    // Validar que el distribuidor es PRO
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distribuidor no encontrado');
    if (distributor.plan !== 'PRO') {
      throw new ForbiddenException('Solo distribuidores PRO pueden crear reglas de pricing propias');
    }

    // Validar que el markup no sea negativo (aunque el piso mínimo lo protege)
    if (data.markupPercent < 0) {
      throw new BadRequestException('El incremento de precio no puede ser negativo');
    }

    return this.prisma.client.distributorProPricingRule.create({
      data: {
        distributorId,
        scope: data.scope as any,
        markupPercent: data.markupPercent,
        tenantId: data.tenantId || null,
        productLineId: data.productLineId || null,
        productId: data.productId || null,
        priority: data.priority ?? 0,
        active: true,
      },
    });
  }

  /** Desactiva una regla de pricing PRO */
  async deactivateProPricingRule(distributorId: string, ruleId: string) {
    const rule = await this.prisma.client.distributorProPricingRule.findUnique({
      where: { id: ruleId },
    });
    if (!rule || rule.distributorId !== distributorId) {
      throw new ForbiddenException('No autorizado para modificar esta regla');
    }
    return this.prisma.client.distributorProPricingRule.update({
      where: { id: ruleId },
      data: { active: false },
    });
  }

  // ─── Branding PRO ─────────────────────────────────────────────────────────

  /** Obtiene o crea la configuración de branding de un distribuidor PRO */
  async upsertBranding(
    distributorId: string,
    data: Partial<{
      logoUrl: string;
      companyName: string;
      primaryColor: string;
      accentColor: string;
      address: string;
      phone: string;
      email: string;
      rfc: string;
      website: string;
    }>,
  ) {
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distribuidor no encontrado');
    if (distributor.plan !== 'PRO') {
      throw new ForbiddenException('Solo distribuidores PRO pueden configurar branding propio');
    }

    const existing = await this.prisma.client.distributorBrandingConfig.findUnique({
      where: { distributorId },
    });

    if (existing) {
      return this.prisma.client.distributorBrandingConfig.update({
        where: { distributorId },
        data,
      });
    }

    return this.prisma.client.distributorBrandingConfig.create({
      data: { distributorId, ...data },
    });
  }

  // ─── Mapa de catálogos accesibles ─────────────────────────────────────────

  /**
   * Obtiene los catálogos accesibles por un distribuidor, con las listas permitidas.
   * Devuelve un mapa: tenantId → { defaultPriceList, allowedLists, discountPercent }
   */
  async getDistributorCatalogMap(distributorId: string) {
    const accesses = await this.prisma.client.manufacturerDistributorAccess.findMany({
      where: { distributorId, active: true },
      include: {
        tenant: { select: { id: true, name: true } },
      },
    });

    const map = new Map<string, {
      defaultPriceList: string;
      allowedLists: string[];
      tenantName: string;
    }>();

    for (const access of accesses) {
      const allowedLists = await this.prisma.client.manufacturerDistributorAllowedPriceList.findMany({
        where: { tenantId: access.tenantId, distributorId, active: true },
      });

      map.set(access.tenantId, {
        defaultPriceList: access.defaultPriceList || 'A',
        allowedLists: allowedLists.length > 0
          ? allowedLists.map((l: any) => l.priceListType)
          : [access.defaultPriceList || 'A'],
        tenantName: access.tenant.name,
      });
    }

    return map;
  }

  // ─── Legacy — compatibilidad con DistributorPriceMarkup ────────────────

  /** Crea una regla de markup (legacy) para un distribuidor */
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
    if (data.markupPercent < 0) {
      throw new BadRequestException('El incremento de precio no puede ser negativo');
    }

    return this.prisma.client.distributorPriceMarkup.create({
      data: {
        distributorId,
        scope: data.scope as any,
        markupPercent: data.markupPercent,
        tenantId: data.tenantId || null,
        productLineId: data.productLineId || null,
        productId: data.productId || null,
        priority: data.priority ?? 0,
        active: true,
      },
    });
  }

  /** Desactiva una regla de markup (legacy) */
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
}
