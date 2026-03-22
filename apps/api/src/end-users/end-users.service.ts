/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EndUsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Auto-registro por parte del usuario final (arquitecto, diseñador, distribuidor) */
  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    profession?: string;
    country?: string;
  }) {
    const existing = await this.prisma.client.endUser.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    // En producción, usar bcrypt aquí
    const passwordHash = Buffer.from(data.password).toString('base64');

    return this.prisma.client.endUser.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyName: data.companyName,
        profession: data.profession,
        country: data.country,
        status: 'ACTIVE',
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.client.endUser.findUnique({
      where: { id },
      include: {
        catalogAccesses: {
          where: { active: true },
          include: { tenant: { select: { id: true, name: true, slug: true, logoUrl: true } } },
        },
      },
    });
    if (!user) throw new NotFoundException(`EndUser '${id}' no encontrado`);
    return user;
  }

  /** Listar todos los catálogos de tenant a los que este usuario final tiene acceso */
  async getAccessibleCatalogs(endUserId: string) {
    return this.prisma.client.catalogAccess.findMany({
      where: { endUserId, active: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });
  }

  /** Activar acceso al catálogo mediante un código */
  async activateWithCode(endUserId: string, code: string) {
    const activationCode = await this.prisma.client.activationCode.findUnique({ where: { code } });
    if (!activationCode || !activationCode.active) {
      throw new BadRequestException('Código de activación inválido o expirado');
    }
    if (activationCode.expiresAt && activationCode.expiresAt < new Date()) {
      throw new BadRequestException('El código de activación ha expirado');
    }
    if (activationCode.maxUses && activationCode.usedCount >= activationCode.maxUses) {
      throw new BadRequestException('El código de activación ha alcanzado su máximo de usos');
    }

    // Verificar si el acceso ya existe
    const existing = await this.prisma.client.catalogAccess.findUnique({
      where: { tenantId_endUserId: { tenantId: activationCode.tenantId, endUserId } },
    });
    if (existing) {
      // Actualizar acceso existente si el código otorga más permisos
      return this.prisma.client.$transaction([
        this.prisma.client.catalogAccess.update({
          where: { tenantId_endUserId: { tenantId: activationCode.tenantId, endUserId } },
          data: {
            catalogEnabled: existing.catalogEnabled || activationCode.catalogEnabled,
            pricesEnabled: existing.pricesEnabled || activationCode.pricesEnabled,
            conditionsEnabled: existing.conditionsEnabled || activationCode.conditionsEnabled,
            activationCodeId: activationCode.id,
            active: true,
          },
        }),
        this.prisma.client.activationCode.update({
          where: { id: activationCode.id },
          data: { usedCount: { increment: 1 } },
        }),
      ]);
    }

    return this.prisma.client.$transaction([
      this.prisma.client.catalogAccess.create({
        data: {
          tenantId: activationCode.tenantId,
          endUserId,
          catalogEnabled: activationCode.catalogEnabled,
          pricesEnabled: activationCode.pricesEnabled,
          conditionsEnabled: activationCode.conditionsEnabled,
          activationCodeId: activationCode.id,
          active: true,
        },
      }),
      this.prisma.client.activationCode.update({
        where: { id: activationCode.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }
}
