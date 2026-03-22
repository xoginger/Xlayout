/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditActorType, Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    actorType: AuditActorType;
    actorId: string;
    tenantId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    payload?: Prisma.InputJsonValue;
  }) {
    return this.prisma.client.auditLog.create({ data });
  }

  async findByTenant(tenantId: string, limit = 50) {
    return this.prisma.client.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findGlobal(limit = 100) {
    return this.prisma.client.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
