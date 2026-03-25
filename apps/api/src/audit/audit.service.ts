/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditActorType, Prisma } from '@prisma/client';

// Interfaz para los filtros del audit log global
interface AuditFilters {
  actorType?: string;
  entityType?: string;
  action?: string;
  tenantId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Registrar un evento de auditoría */
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

  /** Buscar logs por tenant */
  async findByTenant(tenantId: string, limit = 50) {
    return this.prisma.client.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Buscar logs globales con filtros opcionales */
  async findGlobal(filters?: AuditFilters) {
    const where: any = {};

    if (filters?.actorType) {
      where.actorType = filters.actorType;
    }
    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }
    if (filters?.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }
    if (filters?.tenantId) {
      where.tenantId = filters.tenantId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    return this.prisma.client.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }
}
