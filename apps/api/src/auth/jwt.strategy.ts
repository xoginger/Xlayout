/**
 * Creado y diseñado por XO
 * XLayout System
 */

import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (() => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no está definido. Verifica las variables de entorno.');
        return secret;
      })(),
    });
  }

  async validate(payload: any) {
    let user;
    const { sub, userType } = payload;

    if (userType === 'PLATFORM_USER') {
      user = await this.prisma.client.platformUser.findUnique({ where: { id: sub } });
    } else if (userType === 'COMPANY_USER') {
      user = await this.prisma.client.companyUser.findUnique({ where: { id: sub } });
    } else if (userType === 'DISTRIBUTOR_USER') {
      // El diseñador o administrador de un distribuidor
      user = await this.prisma.client.distributorUser.findUnique({ where: { id: sub } });
    } else if (userType === 'END_USER') {
      user = await this.prisma.client.endUser.findUnique({ where: { id: sub } });
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return { 
      sub: sub, 
      email: payload.email, 
      userType, 
      // tenantId presente para COMPANY_USER
      tenantId: (user as any).tenantId || null,
      // distributorId y rol presentes para DISTRIBUTOR_USER
      distributorId: payload.distributorId || (user as any).distributorId || null,
      distributorRole: payload.distributorRole || (userType === 'DISTRIBUTOR_USER' ? (user as any).role : null),
      // Rol interno de COMPANY_USER (TENANT_ADMIN, BUSINESS_OWNER, etc.)
      companyRole: payload.companyRole || (userType === 'COMPANY_USER' ? (user as any).role : null),
    };
  }
}
