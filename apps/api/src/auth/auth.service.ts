/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    // Verificar PlatformUser
    const platformUser = await this.prisma.client.platformUser.findUnique({ where: { email } });
    if (platformUser && await bcrypt.compare(pass, platformUser.passwordHash)) {
      const { passwordHash, ...result } = platformUser;
      return { ...result, userType: 'PLATFORM_USER' };
    }

    // Verificar CompanyUser (usuario interno del fabricante)
    const companyUser = await this.prisma.client.companyUser.findUnique({ where: { email } });
    if (companyUser && await bcrypt.compare(pass, companyUser.passwordHash)) {
      const { passwordHash, ...result } = companyUser;
      return { ...result, userType: 'COMPANY_USER' };
    }

    // Verificar DistributorUser (diseñador o administrador de distribuidor)
    const distributorUser = await this.prisma.client.distributorUser.findUnique({
      where: { email },
      include: { distributor: true },
    });
    if (distributorUser && await bcrypt.compare(pass, distributorUser.passwordHash)) {
      const { passwordHash, ...result } = distributorUser;
      return { ...result, userType: 'DISTRIBUTOR_USER' };
    }

    // Verificar EndUser (usuario final)
    const endUser = await this.prisma.client.endUser.findUnique({ where: { email } });
    if (endUser && await bcrypt.compare(pass, endUser.passwordHash)) {
      const { passwordHash, ...result } = endUser;
      return { ...result, userType: 'END_USER' };
    }

    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      userType: user.userType,
      // tenantId para COMPANY_USER; distributorId para DISTRIBUTOR_USER
      tenantId: user.tenantId || null,
      distributorId: (user.distributor?.id || user.distributorId) || null,
      distributorRole: user.role || null,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        distributorId: payload.distributorId,
        distributorRole: payload.distributorRole,
      },
    };
  }

  async getMe(userId: string, userType: string) {
    if (userType === 'PLATFORM_USER') {
      const user = await this.prisma.client.platformUser.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException();
      const tenants = await this.prisma.client.tenant.findMany({ where: { status: 'ACTIVE' } });
      return {
        id: user.id,
        email: user.email,
        role: 'platform_admin',
        preferences: user.preferences,
        tenants: tenants.map((t: any) => ({
          tenantId: t.id,
          tenantName: t.name,
          access: { pricesEnabled: true, conditionsEnabled: true },
        })),
      };
    }

    if (userType === 'COMPANY_USER') {
      const user = await this.prisma.client.companyUser.findUnique({
        where: { id: userId },
        include: { tenant: true },
      });
      if (!user) throw new UnauthorizedException();
      return {
        id: user.id,
        email: user.email,
        role: 'company_admin',
        preferences: user.preferences,
        tenants: [{
          tenantId: user.tenantId,
          tenantName: (user as any).tenant.name,
          access: { pricesEnabled: true, conditionsEnabled: true },
        }],
      };
    }

    if (userType === 'END_USER') {
      const user = await this.prisma.client.endUser.findUnique({
        where: { id: userId },
        include: {
          catalogAccesses: {
            where: { active: true },
            include: { tenant: true },
          },
        },
      });
      if (!user) throw new UnauthorizedException();
      return {
        id: user.id,
        email: user.email,
        role: 'end_user',
        preferences: user.preferences,
        tenants: (user as any).catalogAccesses.map((ca: any) => ({
          tenantId: ca.tenantId,
          tenantName: ca.tenant.name,
          access: {
            pricesEnabled: ca.pricesEnabled,
            conditionsEnabled: ca.conditionsEnabled,
          },
        })),
      };
    }

    // Diseñador o usuario de una empresa distribuidora
    if (userType === 'DISTRIBUTOR_USER') {
      const user = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: {
          distributor: {
            include: {
              // Catálogos de fabricantes a los que tiene acceso el distribuidor
              catalogAccesses: {
                where: { active: true },
                include: { tenant: true },
              },
              // Reglas de markup activas del distribuidor
              priceMarkups: {
                where: { active: true },
                orderBy: { priority: 'desc' },
              },
            },
          },
        },
      });
      if (!user) throw new UnauthorizedException();

      return {
        id: user.id,
        email: user.email,
        role: 'distributor_user',
        distributorRole: user.role,
        distributorId: user.distributorId,
        distributorName: (user as any).distributor.name,
        preferences: user.preferences,
        // Lista de catálogos accesibles con su lista de precios asignada
        tenants: (user as any).distributor.catalogAccesses.map((ca: any) => ({
          tenantId: ca.tenantId,
          tenantName: ca.tenant.name,
          priceListType: ca.priceListType, // lista de precios asignada al distribuidor
          access: {
            pricesEnabled: true,  // los distribuidores siempre ven precios
            conditionsEnabled: true,
          },
        })),
        // Reglas de markup para calcular precio de venta
        priceMarkups: (user as any).distributor.priceMarkups,
      };
    }

    throw new UnauthorizedException();
  }

  async updatePreferences(userId: string, userType: string, preferences: any) {
    if (userType === 'PLATFORM_USER') {
      return this.prisma.client.platformUser.update({ where: { id: userId }, data: { preferences } });
    }
    if (userType === 'COMPANY_USER') {
      return this.prisma.client.companyUser.update({ where: { id: userId }, data: { preferences } });
    }
    if (userType === 'DISTRIBUTOR_USER') {
      return this.prisma.client.distributorUser.update({ where: { id: userId }, data: { preferences } });
    }
    if (userType === 'END_USER') {
      return this.prisma.client.endUser.update({ where: { id: userId }, data: { preferences } });
    }
    throw new UnauthorizedException('Tipo de usuario inválido');
  }
}
