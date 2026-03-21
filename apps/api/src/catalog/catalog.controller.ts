import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, Query, Req,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { ConversionService } from '../conversion/conversion.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import * as path from 'path';

// Accepted 3D formats
const ACCEPTED_EXTENSIONS = new Set([
  'glb', 'gltf', 'obj', 'dae', 'fbx', '3ds', 'dxf', 'kmz', 'stl', 'ply',
]);
// DWG: explicitly rejected with a clear message
const DWG_NOTE = 'DWG requires ODA Platform (commercial license). Use DXF export from your CAD tool instead.';

const getFormatFromFile = (filename: string): string =>
  path.extname(filename).toLowerCase().replace('.', '');

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly conversionService: ConversionService,
  ) {}

  // ─── Brands ─────────────────────────────────────────────────────────────
  @Post('brands')
  async createBrand(@Req() req: any, @Body() body: { name: string; description?: string; logoUrl?: string }) {
    return this.catalogService.createBrand(req.tenantId, body);
  }
  @Get('brands')
  async getBrands(@Req() req: any) { return this.catalogService.getBrands(req.tenantId); }

  // ─── Lines ───────────────────────────────────────────────────────────────
  @Get('lines')
  async getLines(@Req() req: any) { return this.catalogService.getProductLines(req.tenantId); }

  @Post('lines')
  async createLine(@Req() req: any, @Body() body: { name: string }) {
    return this.catalogService.createProductLine(req.tenantId, body.name);
  }
  @Patch('lines/:id')
  async updateLine(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateProductLine(req.tenantId, id, body);
  }
  @Patch('lines/:id/status')
  async updateLineStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductLine(req.tenantId, id, { active: body.active });
  }

  // ─── Categories ──────────────────────────────────────────────────────────
  @Get('categories')
  async getCategories(@Req() req: any) { return this.catalogService.getCategories(req.tenantId); }
  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: { name: string; parentId?: string }) {
    return this.catalogService.createCategory(req.tenantId, body.name, body.parentId);
  }
  @Patch('categories/:id/status')
  async updateCategoryStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateCategoryStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Products ────────────────────────────────────────────────────────────
  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    return this.catalogService.createProduct(req.tenantId, body);
  }
  @Get('products')
  async getProducts(@Req() req: any, @Query() query: any) {
    return this.catalogService.getProducts(req.tenantId, query);
  }
  @Patch('products/:id')
  async updateProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateProduct(req.tenantId, id, body);
  }
  @Patch('products/:id/status')
  async updateProductStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductStatus(req.tenantId, id, { active: body.active });
  }
  @Patch('products/:id/publish')
  async publishProduct(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.publishProduct(req.tenantId, id);
  }
  @Patch('products/:id/unpublish')
  async unpublishProduct(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.unpublishProduct(req.tenantId, id);
  }
  @Post('products/:id/prices')
  async createProductPrice(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.createProductPrice(req.tenantId, id, body);
  }

  // ─── Assets (URL registration — legacy) ──────────────────────────────────
  @Get('assets')
  async getAssets(@Req() req: any) { return this.catalogService.getAssets(req.tenantId); }

  @Post('assets')
  async createAsset(@Req() req: any, @Body() body: any) {
    // Mark URL-registered assets as url_only (no conversion needed)
    const asset = await this.catalogService.createAsset(req.tenantId, {
      ...body,
      conversionStatus: body.model3dUrl ? 'url_only' : 'pending',
    });
    return asset;
  }

  @Delete('assets/:id')
  async deleteAsset(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.deleteAsset(req.tenantId, id);
  }

  // ─── Assets — File Upload (new pipeline) ─────────────────────────────────
  @Post('assets/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { productId: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!body.productId) throw new BadRequestException('productId is required');

    const format = getFormatFromFile(file.originalname);

    // DWG explicit rejection
    if (format === 'dwg') {
      throw new BadRequestException(DWG_NOTE);
    }

    if (!ACCEPTED_EXTENSIONS.has(format)) {
      throw new BadRequestException(
        `Format '.${format}' is not supported. Accepted: ${[...ACCEPTED_EXTENSIONS].join(', ')}`
      );
    }

    // Save original file path and create asset record
    const originalRelativePath = `/storage/uploads/${file.filename}`;
    const absolutePath = file.path; // multer disk storage provides this

    const asset = await this.catalogService.createAssetFromUpload(req.tenantId, {
      productId: body.productId,
      assetType: 'model_3d',
      originalFileUrl: originalRelativePath,
      originalFormat: format,
      conversionStatus: 'uploaded',
      metadata: {
        originalName: file.originalname,
        originalSize: file.size,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Enqueue conversion job asynchronously
    await this.conversionService.enqueueConversion({
      assetId: asset.id,
      originalFilePath: absolutePath,
      originalFormat: format,
      tenantId: req.tenantId,
    });

    return {
      ...asset,
      message: `File uploaded successfully. Conversion to GLB in progress.`,
    };
  }

  @Post('assets/:id/retry-conversion')
  async retryConversion(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.retryAssetConversion(req.tenantId, id, this.conversionService);
  }

  // ─── Conditions ──────────────────────────────────────────────────────────
  @Get('conditions')
  async getConditions(@Req() req: any) { return this.catalogService.getConditions(req.tenantId); }
  @Post('conditions')
  async createCondition(@Req() req: any, @Body() body: any) {
    return this.catalogService.createCondition(req.tenantId, body);
  }
  @Patch('conditions/:id/status')
  async updateConditionStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateConditionStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Prices ──────────────────────────────────────────────────────────────
  @Get('prices')
  async getPrices(@Req() req: any) { return this.catalogService.getPrices(req.tenantId); }
  @Patch('prices/:id/status')
  async updatePriceStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updatePriceStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Editor Catalog ───────────────────────────────────────────────────────
  @Get('available')
  async getAvailableCatalog(@Req() req: any) {
    return this.catalogService.getAvailableCatalog(req.user.sub, req.user.userType);
  }
}
