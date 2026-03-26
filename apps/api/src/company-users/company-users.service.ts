/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyUserRole } from '@prisma/client';

@Injectable()
export class CompanyUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    tenantId: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: CompanyUserRole;
  }) {
    const existing = await this.prisma.client.companyUser.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('El correo ya está registrado');

    const passwordHash = Buffer.from(data.password).toString('base64');
    return this.prisma.client.companyUser.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role ?? CompanyUserRole.CATALOG_MANAGER,
        status: 'ACTIVE',
      },
    });
  }

  async findByTenant(tenantId: string) {
    return this.prisma.client.companyUser.findMany({
      where: { tenantId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true },
    });
  }

  async updateRole(id: string, role: CompanyUserRole) {
    const user = await this.prisma.client.companyUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`CompanyUser '${id}' no encontrado`);
    return this.prisma.client.companyUser.update({ where: { id }, data: { role } });
  }

  async updateStatus(id: string, status: string) {
    const user = await this.prisma.client.companyUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`CompanyUser '${id}' no encontrado`);
    return this.prisma.client.companyUser.update({ where: { id }, data: { status: status as any } });
  }

  async update(id: string, data: { firstName?: string; lastName?: string; email?: string; role?: CompanyUserRole }) {
    const user = await this.prisma.client.companyUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`CompanyUser '${id}' no encontrado`);
    
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.client.companyUser.findUnique({ where: { email: data.email } });
      if (existing) throw new ConflictException('El correo ya está en uso por otro usuario');
    }

    return this.prisma.client.companyUser.update({
      where: { id },
      data
    });
  }
}
