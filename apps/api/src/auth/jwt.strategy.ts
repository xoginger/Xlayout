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
      secretOrKey: process.env.JWT_SECRET || 'super_secret_jwt_key',
    });
  }

  async validate(payload: any) {
    let user;
    const { sub, userType } = payload;

    if (userType === 'PLATFORM_USER') {
      user = await this.prisma.client.platformUser.findUnique({ where: { id: sub } });
    } else if (userType === 'COMPANY_USER') {
      user = await this.prisma.client.companyUser.findUnique({ where: { id: sub } });
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
      tenantId: (user as any).tenantId || null 
    };
  }
}
