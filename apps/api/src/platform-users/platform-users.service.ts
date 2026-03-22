/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: 'PLATFORM_ADMIN' | 'PLATFORM_OWNER';
  }) {
    const existing = await this.prisma.client.platformUser.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('El correo ya existe');
    const passwordHash = Buffer.from(data.password).toString('base64');
    return this.prisma.client.platformUser.create({
      data: { ...data, passwordHash, role: data.role ?? 'PLATFORM_ADMIN' },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });
  }

  async findAll() {
    return this.prisma.client.platformUser.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    return this.prisma.client.platformUser.update({
      where: { id },
      data: { status },
      select: { id: true, status: true }
    });
  }
}
