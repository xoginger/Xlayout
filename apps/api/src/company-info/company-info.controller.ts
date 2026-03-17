import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('company/info')
@UseGuards(JwtAuthGuard)
export class CompanyInfoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  async getMetrics(@Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return { productsCount: 0, linesCount: 0, codesCount: 0, accessCount: 0, recentImports: [] };
    }

    const [
      productsCount,
      linesCount,
      codesCount,
      accessCount,
      recentImports
    ] = await Promise.all([
      this.prisma.client.product.count({ where: { tenantId } }),
      this.prisma.client.productLine.count({ where: { tenantId, active: true } }),
      this.prisma.client.activationCode.count({ where: { tenantId, active: true } }),
      this.prisma.client.catalogAccess.count({ where: { tenantId, active: true } }),
      this.prisma.client.importJob.findMany({ 
        where: { tenantId }, 
        orderBy: { createdAt: 'desc' }, 
        take: 5,
        select: { id: true, type: true, status: true, filename: true, createdAt: true }
      })
    ]);

    return {
      productsCount,
      linesCount,
      codesCount,
      accessCount,
      recentImports
    };
  }
}
