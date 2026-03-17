import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key';
    let tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, secret) as any;
          tenantId = decoded.tenantId;
        } catch (e) {
          // Ignore invalid tokens here
        }
      }
    }

    if (tenantId) {
      (req as any).tenantId = tenantId;
      PrismaService.setTenantId(tenantId, () => next());
    } else {
      next();
    }
  }
}
