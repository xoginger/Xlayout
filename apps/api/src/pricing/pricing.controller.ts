import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { PricingEngineService } from './pricing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingEngine: PricingEngineService) {}

  @Post('quote')
  async quote(@Req() req: any, @Body() body: { placements: any[] }) {
    return this.pricingEngine.calculateQuote(req.tenantId, body.placements);
  }

  @Get('lists')
  async getPriceLists(@Req() req: any) {
    return this.pricingEngine.getPriceLists(req.tenantId);
  }
}
