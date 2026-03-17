import { Controller, Get, Post, Patch, Body, Param, UseGuards, Query, Req } from '@nestjs/common';
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

  @Get('lines')
  async getLines(@Req() req: any) {
    return this.catalogService.getProductLines(req.tenantId);
  }

  @Post('lines')
  async createLine(@Req() req: any, @Body() body: { name: string }) {
    return this.catalogService.createProductLine(req.tenantId, body.name);
  }

  @Patch('lines/:id/status')
  async updateLineStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductLine(req.tenantId, id, { active: body.active });
  }

  @Get('categories')
  async getCategories(@Req() req: any) {
    return this.catalogService.getCategories(req.tenantId);
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: { name: string; parentId?: string }) {
    return this.catalogService.createCategory(req.tenantId, body.name, body.parentId);
  }

  @Patch('categories/:id/status')
  async updateCategoryStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateCategoryStatus(req.tenantId, id, { active: body.active });
  }

  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    return this.catalogService.createProduct(req.tenantId, body);
  }

  @Post('products/:id/prices')
  async createProductPrice(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.createProductPrice(req.tenantId, id, body);
  }

  @Get('products')
  async getProducts(@Req() req: any, @Query() query: any) {
    return this.catalogService.getProducts(req.tenantId, query);
  }

  @Patch('products/:id/status')
  async updateProductStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductStatus(req.tenantId, id, { active: body.active });
  }

  @Get('assets')
  async getAssets(@Req() req: any) {
    return this.catalogService.getAssets(req.tenantId);
  }

  @Post('assets')
  async createAsset(@Req() req: any, @Body() body: any) {
    return this.catalogService.createAsset(req.tenantId, body);
  }

  @Get('conditions')
  async getConditions(@Req() req: any) {
    return this.catalogService.getConditions(req.tenantId);
  }

  @Post('conditions')
  async createCondition(@Req() req: any, @Body() body: any) {
    return this.catalogService.createCondition(req.tenantId, body);
  }

  @Patch('conditions/:id/status')
  async updateConditionStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateConditionStatus(req.tenantId, id, { active: body.active });
  }

  @Get('prices')
  async getPrices(@Req() req: any) {
    return this.catalogService.getPrices(req.tenantId);
  }

  @Patch('prices/:id/status')
  async updatePriceStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updatePriceStatus(req.tenantId, id, { active: body.active });
  }

  @Get('available')
  async getAvailableCatalog(@Req() req: any) {
    return this.catalogService.getAvailableCatalog(req.user.sub, req.user.userType);
  }
}
