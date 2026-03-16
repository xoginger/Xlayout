import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Request } from 'express';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('brands')
  async createBrand(@Req() req: any, @Body() body: { name: string; description?: string; logoUrl?: string }) {
    return this.catalogService.createBrand(req.tenantId, body);
  }

  @Get('brands')
  async getBrands(@Req() req: any) {
    return this.catalogService.getBrands(req.tenantId);
  }

  @Post('lines')
  async createLine(@Body() body: { brandId: string; name: string }) {
    return this.catalogService.createProductLine(body.brandId, body.name);
  }

  @Post('categories')
  async createCategory(@Body() body: { name: string; parentId?: string }) {
    return this.catalogService.createCategory(body.name, body.parentId);
  }

  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    return this.catalogService.createProduct(req.tenantId, body);
  }

  @Get('products')
  async getProducts(@Req() req: any, @Query() query: any) {
    return this.catalogService.getProducts(req.tenantId, query);
  }
}
