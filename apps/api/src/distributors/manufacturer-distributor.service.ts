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

/**
 * Servicio dedicado para la relación marca↔distribuidor.
 * Gestiona:
 * - Listas de precio permitidas
 * - Descuentos por distribuidor
 * - Validación de acceso
 * - Consulta de precios autorizados
 */
@Injectable()
export class ManufacturerDistributorService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Listas de Precio Permitidas ──────────────────────────────────────────

  /**
   * Asigna una o más listas de precio a un distribuidor para una marca.
   * Si ya existe, reactiva la lista.
   */
  async assignAllowedPriceLists(
    tenantId: string,
    distributorId: string,
    priceLists: Array<{ priceListType: string; isDefault?: boolean }>,
  ) {
    // Validar que existe la relación macro
    await this.validateRelationship(tenantId, distributorId);

    // Validar tipos de lista válidos
    const validTypes = ['A', 'B', 'C', 'D', 'E'];
    for (const pl of priceLists) {
      if (!validTypes.includes(pl.priceListType.toUpperCase())) {
        throw new BadRequestException(`Tipo de lista inválido: ${pl.priceListType}. Use A, B, C, D o E.`);
      }
    }

    // Si alguna se marca como default, desmarcar las anteriores
    const hasNewDefault = priceLists.some(pl => pl.isDefault);
    if (hasNewDefault) {
      await this.prisma.client.manufacturerDistributorAllowedPriceList.updateMany({
        where: { tenantId, distributorId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const results = [];
    for (const pl of priceLists) {
      const priceListType = pl.priceListType.toUpperCase();

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
        // Reactivar si estaba inactiva
        const updated = await this.prisma.client.manufacturerDistributorAllowedPriceList.update({
          where: { id: existing.id },
          data: {
            active: true,
            isDefault: pl.isDefault ?? existing.isDefault,
          },
        });
        results.push(updated);
      } else {
        const created = await this.prisma.client.manufacturerDistributorAllowedPriceList.create({
          data: {
            tenantId,
            distributorId,
            priceListType,
            isDefault: pl.isDefault ?? false,
            active: true,
          },
        });
        results.push(created);
      }
    }

    // Actualizar lista por defecto en el acceso macro
    const defaultList = priceLists.find(pl => pl.isDefault);
    if (defaultList) {
      await this.prisma.client.manufacturerDistributorAccess.update({
        where: { tenantId_distributorId: { tenantId, distributorId } },
        data: { defaultPriceList: defaultList.priceListType.toUpperCase() },
      });
    }

    return results;
  }

  /**
   * Revoca una lista de precio específica para un distribuidor.
   */
  async revokeAllowedPriceList(tenantId: string, distributorId: string, priceListType: string) {
    const existing = await this.prisma.client.manufacturerDistributorAllowedPriceList.findUnique({
      where: {
        tenantId_distributorId_priceListType: {
          tenantId,
          distributorId,
          priceListType: priceListType.toUpperCase(),
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Lista de precio no encontrada para este par marca-distribuidor');
    }

    return this.prisma.client.manufacturerDistributorAllowedPriceList.update({
      where: { id: existing.id },
      data: { active: false },
    });
  }

  /**
   * Obtiene las listas de precio permitidas para un distribuidor con una marca.
   */
  async getAllowedPriceLists(tenantId: string, distributorId: string) {
    return this.prisma.client.manufacturerDistributorAllowedPriceList.findMany({
      where: { tenantId, distributorId, active: true },
      orderBy: { priceListType: 'asc' },
    });
  }

  // ─── Descuentos de Marca ──────────────────────────────────────────────────

  /**
   * Asigna un descuento de la marca al distribuidor.
   */
  async assignDiscount(
    tenantId: string,
    distributorId: string,
    data: {
      discountPercent: number;
      scope?: 'GLOBAL' | 'BY_LINE' | 'BY_PRODUCT';
      productLineId?: string;
      productId?: string;
    },
  ) {
    // Validar relación activa
    await this.validateRelationship(tenantId, distributorId);

    // Validar porcentaje
    if (data.discountPercent < 0 || data.discountPercent > 100) {
      throw new BadRequestException('El descuento debe estar entre 0% y 100%');
    }

    const scope = data.scope || 'GLOBAL';

    return this.prisma.client.manufacturerDistributorDiscount.create({
      data: {
        tenantId,
        distributorId,
        discountPercent: data.discountPercent,
        scope: scope as any,
        productLineId: scope === 'BY_LINE' ? data.productLineId : null,
        productId: scope === 'BY_PRODUCT' ? data.productId : null,
        active: true,
      },
    });
  }

  /**
   * Actualiza un descuento existente.
   */
  async updateDiscount(
    tenantId: string,
    discountId: string,
    data: { discountPercent?: number; active?: boolean },
  ) {
    const discount = await this.prisma.client.manufacturerDistributorDiscount.findUnique({
      where: { id: discountId },
    });

    if (!discount || discount.tenantId !== tenantId) {
      throw new ForbiddenException('No autorizado para modificar este descuento');
    }

    if (data.discountPercent !== undefined && (data.discountPercent < 0 || data.discountPercent > 100)) {
      throw new BadRequestException('El descuento debe estar entre 0% y 100%');
    }

    return this.prisma.client.manufacturerDistributorDiscount.update({
      where: { id: discountId },
      data,
    });
  }

  /**
   * Obtiene todos los descuentos asignados a un distribuidor por una marca.
   */
  async getDiscounts(tenantId: string, distributorId: string) {
    return this.prisma.client.manufacturerDistributorDiscount.findMany({
      where: { tenantId, distributorId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Validación de Relación ──────────────────────────────────────────────

  /**
   * Valida que existe una relación activa entre marca y distribuidor.
   * Lanza error si no existe o está inactiva.
   */
  async validateRelationship(tenantId: string, distributorId: string) {
    const access = await this.prisma.client.manufacturerDistributorAccess.findUnique({
      where: {
        tenantId_distributorId: { tenantId, distributorId },
      },
    });

    if (!access) {
      throw new NotFoundException(
        'No existe relación entre esta marca y distribuidor. Otorgue acceso primero.'
      );
    }

    if (!access.active) {
      throw new ForbiddenException(
        'La relación marca↔distribuidor está inactiva.'
      );
    }

    return access;
  }

  // ─── Resumen Completo de Relación ─────────────────────────────────────────

  /**
   * Obtiene el resumen completo de la relación marca↔distribuidor.
   * Incluye: acceso macro, listas permitidas, descuentos, plan del distribuidor.
   */
  async getRelationshipSummary(tenantId: string, distributorId: string) {
    const [access, allowedLists, discounts, distributor] = await Promise.all([
      this.prisma.client.manufacturerDistributorAccess.findUnique({
        where: { tenantId_distributorId: { tenantId, distributorId } },
        include: { tenant: { select: { id: true, name: true, slug: true } } },
      }),
      this.getAllowedPriceLists(tenantId, distributorId),
      this.getDiscounts(tenantId, distributorId),
      this.prisma.client.distributorCompany.findUnique({
        where: { id: distributorId },
        select: { id: true, name: true, slug: true, plan: true, status: true },
      }),
    ]);

    return {
      access,
      distributor,
      allowedPriceLists: allowedLists,
      discounts,
      isActive: access?.active ?? false,
      defaultPriceList: access?.defaultPriceList || 'A',
    };
  }

  /**
   * Obtiene todas las marcas autorizadas para un distribuidor.
   */
  async getAuthorizedBrands(distributorId: string) {
    const accesses = await this.prisma.client.manufacturerDistributorAccess.findMany({
      where: { distributorId, active: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });

    // Enriquecer con listas y descuentos
    const results = [];
    for (const access of accesses) {
      const [allowedLists, discounts] = await Promise.all([
        this.getAllowedPriceLists(access.tenantId, distributorId),
        this.getDiscounts(access.tenantId, distributorId),
      ]);

      results.push({
        ...access,
        allowedPriceLists: allowedLists,
        discounts,
      });
    }

    return results;
  }
}
