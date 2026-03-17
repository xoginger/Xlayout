import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    slug: string;
    contactEmail?: string;
    logoUrl?: string;
    createdById?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminFirstName?: string;
    adminLastName?: string;
  }) {
    const existing = await this.prisma.client.tenant.findUnique({ where: { slug: data.slug } });
    if (existing) throw new ConflictException(`Tenant with slug '${data.slug}' already exists`);

    return this.prisma.client.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          contactEmail: data.contactEmail,
          logoUrl: data.logoUrl,
          createdById: data.createdById,
          status: 'ACTIVE',
        },
      });

      if (data.adminEmail && data.adminPassword) {
        await tx.companyUser.create({
          data: {
            tenantId: tenant.id,
            email: data.adminEmail,
            firstName: data.adminFirstName || 'Admin',
            lastName: data.adminLastName || '',
            passwordHash: Buffer.from(data.adminPassword).toString('base64'),
            role: 'TENANT_ADMIN',
            status: 'ACTIVE',
          }
        });
      }

      return tenant;
    });
  }

  async findAll() {
    return this.prisma.client.tenant.findMany({
      include: { _count: { select: { companyUsers: true, products: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { id },
      include: {
        companyUsers: { select: { id: true, email: true, role: true, status: true } },
        productLines: { select: { id: true, name: true, slug: true, active: true } },
        _count: { select: { products: true, activationCodes: true } },
      },
    });
    if (!tenant) throw new NotFoundException(`Tenant '${id}' not found`);
    return tenant;
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING') {
    await this.findById(id);
    return this.prisma.client.tenant.update({ where: { id }, data: { status } });
  }
}
