import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('platform')
  getGlobalActivity() {
    return this.auditService.findGlobal();
  }

  @Get('company')
  getCompanyActivity(@Request() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      return [];
    }
    return this.auditService.findByTenant(tenantId);
  }
}
