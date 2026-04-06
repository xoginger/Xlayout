/**
 * Creado y diseñado por XO
 * XLayout System — Auth Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio centralizado de autenticación con soporte para:
 * - Login multi-tipo (Platform, Company, Distributor, EndUser)
 * - JWT access tokens (corta vida) + refresh tokens (larga vida)
 * - Token exchange cross-domain via códigos de un solo uso en Redis
 * - Gestión de preferencias de usuario
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.redis.connect().catch(err => {
      console.warn('[AuthService] Redis connection failed (exchange codes disabled):', err.message);
    });
  }

  // ─── Validación de usuario (login) ──────────────────────────────────────────

  async validateUser(email: string, pass: string): Promise<any> {
    // Verificar PlatformUser
    const platformUser = await this.prisma.client.platformUser.findUnique({ where: { email } });
    if (platformUser && await bcrypt.compare(pass, platformUser.passwordHash)) {
      const { passwordHash, ...result } = platformUser;
      return { ...result, userType: 'PLATFORM_USER' };
    }

    // Verificar CompanyUser
    const companyUser = await this.prisma.client.companyUser.findUnique({ where: { email } });
    if (companyUser && await bcrypt.compare(pass, companyUser.passwordHash)) {
      const { passwordHash, ...result } = companyUser;
      return { ...result, userType: 'COMPANY_USER' };
    }

    // Verificar DistributorUser
    const distributorUser = await this.prisma.client.distributorUser.findUnique({
      where: { email },
      include: { distributor: true },
    });
    if (distributorUser && await bcrypt.compare(pass, distributorUser.passwordHash)) {
      const { passwordHash, ...result } = distributorUser;
      return { ...result, userType: 'DISTRIBUTOR_USER' };
    }

    // Verificar EndUser
    const endUser = await this.prisma.client.endUser.findUnique({ where: { email } });
    if (endUser && await bcrypt.compare(pass, endUser.passwordHash)) {
      const { passwordHash, ...result } = endUser;
      return { ...result, userType: 'END_USER' };
    }

    return null;
  }

  // ─── Login: genera access_token + refresh_token ─────────────────────────────

  async login(user: any) {
    const companyRole = user.userType === 'COMPANY_USER' ? (user.role || null) : null;

    const payload = {
      email: user.email,
      sub: user.id,
      userType: user.userType,
      tenantId: user.tenantId || null,
      distributorId: (user.distributor?.id || user.distributorId) || null,
      distributorRole: user.userType === 'DISTRIBUTOR_USER' ? (user.role || null) : null,
      companyRole,
    };

    const access_token = this.jwtService.sign(payload);

    const refresh_token = this.jwtService.sign(
      { sub: user.id, userType: user.userType, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        expiresIn: 7 * 24 * 3600, // 7 días en segundos
      },
    );

    // Auditoría: registrar login exitoso (fire-and-forget, no bloquea login)
    this.auditService.log({
      actorType: this.mapUserTypeToActorType(user.userType),
      actorId: user.id,
      tenantId: user.tenantId || undefined,
      action: 'LOGIN',
      entityType: 'AUTH',
      entityId: user.id,
      payload: { email: user.email, userType: user.userType },
    }).catch((err) => console.error('[AuditService] Error registrando login:', err.message));

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        tenantId: payload.tenantId,
        distributorId: payload.distributorId,
        distributorRole: payload.distributorRole,
        companyRole,
      },
    };
  }

  // ─── Refresh Token ──────────────────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    try {
      // Verificar que no esté revocado
      const isRevoked = await this.redis.get(`revoked:${refreshToken}`);
      if (isRevoked) {
        throw new UnauthorizedException('Token revocado');
      }

      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      });

      if (decoded.type !== 'refresh') {
        throw new UnauthorizedException('Token inválido');
      }

      // Buscar usuario actual para generar nuevo access token
      const user = await this.findUserById(decoded.sub, decoded.userType);
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Generar nuevo access token
      return this.login({ ...user, userType: decoded.userType });
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  // ─── Revocar Refresh Token (logout) ─────────────────────────────────────────

  async revokeRefreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        ignoreExpiration: true,
      });
      // Marcar como revocado en Redis. TTL = tiempo restante del token o 7 días
      const ttl = decoded.exp ? Math.max(decoded.exp - Math.floor(Date.now() / 1000), 0) : 7 * 24 * 3600;
      await this.redis.setex(`revoked:${refreshToken}`, ttl, '1');
    } catch {
      // Si el token es inválido, no hay nada que revocar
    }
  }

  // ─── Token Exchange: código de un solo uso para cross-domain ────────────────

  async createExchangeCode(userId: string, userType: string): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const data = JSON.stringify({ sub: userId, userType });
    // TTL de 30 segundos, un solo uso
    await this.redis.setex(`xchange:${code}`, 30, data);
    return code;
  }

  async redeemExchangeCode(code: string) {
    const key = `xchange:${code}`;
    const data = await this.redis.get(key);

    if (!data) {
      throw new UnauthorizedException('Código de intercambio inválido o expirado');
    }

    // Eliminar inmediatamente (un solo uso)
    await this.redis.del(key);

    const { sub, userType } = JSON.parse(data);
    const user = await this.findUserById(sub, userType);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.login({ ...user, userType });
  }

  // ─── Perfil del usuario autenticado ─────────────────────────────────────────

  async getMe(userId: string, userType: string) {
    if (userType === 'PLATFORM_USER') {
      const user = await this.prisma.client.platformUser.findUnique({ where: { id: userId } });
      if (!user) throw new UnauthorizedException();
      const tenants = await this.prisma.client.tenant.findMany({ where: { status: 'ACTIVE' } });
      return {
        id: user.id,
        email: user.email,
        userType: 'PLATFORM_USER',
        role: 'platform_admin',
        platformRole: user.role,
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
        userType: 'COMPANY_USER',
        role: 'company_admin',
        companyRole: user.role,
        tenantId: user.tenantId,
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
        userType: 'END_USER',
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

    if (userType === 'DISTRIBUTOR_USER') {
      const user = await this.prisma.client.distributorUser.findUnique({
        where: { id: userId },
        include: {
          distributor: {
            include: {
              catalogAccesses: {
                where: { active: true },
                include: { tenant: true },
              },
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
        userType: 'DISTRIBUTOR_USER',
        role: 'distributor_user',
        distributorRole: user.role,
        distributorId: user.distributorId,
        distributorName: (user as any).distributor.name,
        preferences: user.preferences,
        tenants: (user as any).distributor.catalogAccesses.map((ca: any) => ({
          tenantId: ca.tenantId,
          tenantName: ca.tenant.name,
          priceListType: ca.priceListType,
          access: {
            pricesEnabled: true,
            conditionsEnabled: true,
          },
        })),
        priceMarkups: (user as any).distributor.priceMarkups,
      };
    }

    throw new UnauthorizedException();
  }

  // ─── Preferencias ───────────────────────────────────────────────────────────

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

  // ─── Helpers privados ───────────────────────────────────────────────────────

  private async findUserById(id: string, userType: string): Promise<any> {
    switch (userType) {
      case 'PLATFORM_USER':
        return this.prisma.client.platformUser.findUnique({ where: { id } });
      case 'COMPANY_USER': {
        const cu = await this.prisma.client.companyUser.findUnique({ where: { id } });
        return cu;
      }
      case 'DISTRIBUTOR_USER': {
        const du = await this.prisma.client.distributorUser.findUnique({
          where: { id },
          include: { distributor: true },
        });
        return du;
      }
      case 'END_USER':
        return this.prisma.client.endUser.findUnique({ where: { id } });
      default:
        return null;
    }
  }

  /** Mapea userType a AuditActorType para el log de auditoría */
  private mapUserTypeToActorType(userType: string): any {
    const map: Record<string, string> = {
      PLATFORM_USER: 'PLATFORM_USER',
      COMPANY_USER: 'COMPANY_USER',
      DISTRIBUTOR_USER: 'DISTRIBUTOR_USER',
      END_USER: 'END_USER',
    };
    return map[userType] || 'SYSTEM';
  }
}
