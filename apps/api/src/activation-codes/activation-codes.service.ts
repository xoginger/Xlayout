import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ActivationCodesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a unique activation code for a tenant */
  async create(data: {
    tenantId: string;
    catalogEnabled?: boolean;
    pricesEnabled?: boolean;
    conditionsEnabled?: boolean;
    maxUses?: number;
    expiresAt?: Date;
  }) {
    const code = randomBytes(6).toString('hex').toUpperCase();
    return this.prisma.client.activationCode.create({
      data: {
        tenantId: data.tenantId,
        code,
        catalogEnabled: data.catalogEnabled ?? true,
        pricesEnabled: data.pricesEnabled ?? false,
        conditionsEnabled: data.conditionsEnabled ?? false,
        maxUses: data.maxUses ?? null,
        expiresAt: data.expiresAt ?? null,
        active: true,
      },
    });
  }

  /** List all codes for a tenant */
  async findByTenant(tenantId: string) {
    return this.prisma.client.activationCode.findMany({
      where: { tenantId },
      include: { _count: { select: { catalogAccesses: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Deactivate a code */
  async deactivate(id: string) {
    return this.prisma.client.activationCode.update({ where: { id }, data: { active: false } });
  }

  /** Validate a code without redeeming it (for UI preview) */
  async validate(code: string) {
    const record = await this.prisma.client.activationCode.findUnique({ where: { code } });
    if (!record || !record.active) return { valid: false, reason: 'Invalid or inactive code' };
    if (record.expiresAt && record.expiresAt < new Date()) return { valid: false, reason: 'Code expired' };
    if (record.maxUses && record.usedCount >= record.maxUses) return { valid: false, reason: 'Max uses reached' };
    return {
      valid: true,
      tenantId: record.tenantId,
      grants: {
        catalog: record.catalogEnabled,
        prices: record.pricesEnabled,
        conditions: record.conditionsEnabled,
      },
    };
  }
}
