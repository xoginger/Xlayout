/**
 * Creado y diseñado por XO
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class DistributorUsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── CRUD de Usuarios del Distribuidor ────────────────────────────────────

  /** Crea un nuevo usuario dentro de una empresa distribuidora */
  async createUser(
    distributorId: string,
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role?: 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';
      preferences?: any;
    },
  ) {
    // Verificar que el distribuidor existe
    const distributor = await this.prisma.client.distributorCompany.findUnique({
      where: { id: distributorId },
    });
    if (!distributor) throw new NotFoundException('Distribuidor no encontrado');

    // Verificar email único global
    const existingUser = await this.prisma.client.distributorUser.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con este email en el sistema');
    }

    // Hashear contraseña
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.client.distributorUser.create({
      data: {
        distributorId,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'DESIGNER',
        preferences: data.preferences,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        distributor: { select: { id: true, name: true } },
      },
    });
  }

  /** Lista todos los usuarios de un distribuidor */
  async findByDistributor(distributorId: string) {
    return this.prisma.client.distributorUser.findMany({
      where: { distributorId, status: 'ACTIVE' },
      orderBy: { firstName: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /** Obtiene un usuario por ID */
  async findOne(id: string) {
    const user = await this.prisma.client.distributorUser.findUnique({
      where: { id },
      include: {
        distributor: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Actualiza el rol o estado de un usuario del distribuidor */
  async updateUser(
    distributorId: string,
    userId: string,
    data: Partial<{
      role: 'DISTRIBUTOR_ADMIN' | 'DESIGNER' | 'SALES';
      status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
      firstName: string;
      lastName: string;
      preferences: any;
    }>,
  ) {
    const user = await this.prisma.client.distributorUser.findUnique({ where: { id: userId } });
    if (!user || user.distributorId !== distributorId) {
      throw new ForbiddenException('No autorizado para modificar este usuario');
    }
    return this.prisma.client.distributorUser.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  }

  /** Valida credenciales de un usuario distribuidor — para uso en auth */
  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.client.distributorUser.findUnique({
      where: { email },
      include: { distributor: true },
    });
    if (!user || user.status !== 'ACTIVE') return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    const { passwordHash, ...result } = user;
    return { ...result, userType: 'DISTRIBUTOR_USER' };
  }
}
