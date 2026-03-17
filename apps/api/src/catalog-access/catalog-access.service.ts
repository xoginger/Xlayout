import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Company user directly grants catalog access to an end user.
   * This is the "manual assignment" flow.
   */
  async grantAccess(data: {
    tenantId: string;
    endUserId: string;
    catalogEnabled?: boolean;
    pricesEnabled?: boolean;
    conditionsEnabled?: boolean;
    activatedByUserId?: string;
    expiresAt?: Date;
  }) {
    const existing = await this.prisma.client.catalogAccess.findUnique({
      where: { tenantId_endUserId: { tenantId: data.tenantId, endUserId: data.endUserId } },
    });
    if (existing) {
      // Update permissions
      return this.prisma.client.catalogAccess.update({
        where: { tenantId_endUserId: { tenantId: data.tenantId, endUserId: data.endUserId } },
        data: {
          catalogEnabled: data.catalogEnabled ?? existing.catalogEnabled,
          pricesEnabled: data.pricesEnabled ?? existing.pricesEnabled,
          conditionsEnabled: data.conditionsEnabled ?? existing.conditionsEnabled,
          expiresAt: data.expiresAt ?? existing.expiresAt,
          activatedByUserId: data.activatedByUserId,
          active: true,
        },
      });
    }

    return this.prisma.client.catalogAccess.create({ data: { ...data, active: true } });
  }

  /** Grant access looking up by email */
  async grantAccessByEmail(tenantId: string, email: string, data: any) {
    const endUser = await this.prisma.client.endUser.findUnique({ where: { email } });
    if (!endUser) {
      throw new NotFoundException('End user not found with this email. They must register first.');
    }
    return this.grantAccess({
      ...data,
      tenantId,
      endUserId: endUser.id,
    });
  }

  /** List all accesses for a tenant */
  async findByTenant(tenantId: string) {
    return this.prisma.client.catalogAccess.findMany({
      where: { tenantId, active: true },
      include: {
        endUser: { select: { id: true, email: true, firstName: true, lastName: true, profession: true } },
      },
      orderBy: { activatedAt: 'desc' },
    });
  }

  /** Revoke access */
  async revokeAccess(tenantId: string, endUserId: string) {
    return this.prisma.client.catalogAccess.update({
      where: { tenantId_endUserId: { tenantId, endUserId } },
      data: { active: false },
    });
  }
}
