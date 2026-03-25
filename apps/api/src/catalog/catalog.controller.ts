/**
 * Creado y diseñado por XO
 * XLayout System
 */

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
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';
import * as path from 'path';

// Formatos 3D aceptados — incluye IFC, WRL, XSI
const ACCEPTED_EXTENSIONS = new Set([
  'glb', 'gltf', 'obj', 'dae', 'fbx', '3ds', 'dxf', 'kmz', 'stl', 'ply',
  'ifc', 'wrl', 'xsi',
]);

// Tamaño máximo permitido para archivos 3D (50 MB)
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
// DWG: rechazado explícitamente con un mensaje claro
const DWG_NOTE = 'DWG requiere ODA Platform (licencia comercial). Use la exportación DXF desde su herramienta CAD en su lugar.';

const getFormatFromFile = (filename: string): string =>
  path.extname(filename).toLowerCase().replace('.', '');

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('catalog')
export class CatalogController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly conversionService: ConversionService,
  ) {}

  // ─── Marcas — solo PLATFORM_USER y COMPANY_USER pueden escribir ────────
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('brands')
  async createBrand(@Req() req: any, @Body() body: { name: string; description?: string; logoUrl?: string }) {
    return this.catalogService.createBrand(req.tenantId, body);
  }
  @Get('brands')
  async getBrands(@Req() req: any) { return this.catalogService.getBrands(req.tenantId); }

  // ─── Líneas ───────────────────────────────────────────────────────────────
  @Get('lines')
  async getLines(@Req() req: any) { return this.catalogService.getProductLines(req.tenantId); }

  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('lines')
  async createLine(@Req() req: any, @Body() body: { name: string }) {
    return this.catalogService.createProductLine(req.tenantId, body.name);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('lines/:id')
  async updateLine(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateProductLine(req.tenantId, id, body);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('lines/:id/status')
  async updateLineStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductLine(req.tenantId, id, { active: body.active });
  }

  // ─── Categorías ──────────────────────────────────────────────────────────
  @Get('categories')
  async getCategories(@Req() req: any) { return this.catalogService.getCategories(req.tenantId); }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: { name: string; parentId?: string }) {
    return this.catalogService.createCategory(req.tenantId, body.name, body.parentId);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('categories/:id/status')
  async updateCategoryStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateCategoryStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Productos ────────────────────────────────────────────────────────────
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('products')
  async createProduct(@Req() req: any, @Body() body: any) {
    return this.catalogService.createProduct(req.tenantId, body);
  }
  @Get('products')
  async getProducts(@Req() req: any, @Query() query: any) {
    return this.catalogService.getProducts(req.tenantId, query);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('products/:id')
  async updateProduct(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateProduct(req.tenantId, id, body);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('products/:id/status')
  async updateProductStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateProductStatus(req.tenantId, id, { active: body.active });
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('products/:id/publish')
  async publishProduct(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.publishProduct(req.tenantId, id);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('products/:id/unpublish')
  async unpublishProduct(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.unpublishProduct(req.tenantId, id);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('products/:id/prices')
  async createProductPrice(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.createProductPrice(req.tenantId, id, body);
  }

  // ─── Assets (Registro de URL — legado) ──────────────────────────────────
  @Get('assets')
  async getAssets(@Req() req: any) { return this.catalogService.getAssets(req.tenantId); }

  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('assets')
  async createAsset(@Req() req: any, @Body() body: any) {
    // Marcar assets registrados por URL como url_only (no requiere conversión)
    const asset = await this.catalogService.createAsset(req.tenantId, {
      ...body,
      conversionStatus: body.model3dUrl ? 'url_only' : 'pending',
    });
    return asset;
  }

  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Delete('assets/:id')
  async deleteAsset(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.deleteAsset(req.tenantId, id);
  }

  // ─── Assets — Carga de archivos (nuevo pipeline) ─────────────────────────
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('assets/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAsset(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { productId: string },
  ) {
    if (!file) throw new BadRequestException('No se cargó ningún archivo');
    if (!body.productId) throw new BadRequestException('productId es requerido');

    const format = getFormatFromFile(file.originalname);

    // Rechazo explícito de DWG
    if (format === 'dwg') {
      throw new BadRequestException(DWG_NOTE);
    }

    if (!ACCEPTED_EXTENSIONS.has(format)) {
      throw new BadRequestException(
        `Format '.${format}' is not supported. Accepted: ${[...ACCEPTED_EXTENSIONS].join(', ')}`
      );
    }

    // Guardar ruta del archivo original y crear registro de asset
    const originalRelativePath = `/storage/uploads/${file.filename}`;
    const absolutePath = file.path; // multer disk storage proporciona esto

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

    // Encolar trabajo de conversión asincrónicamente
    await this.conversionService.enqueueConversion({
      assetId: asset.id,
      originalFilePath: absolutePath,
      originalFormat: format,
      tenantId: req.tenantId,
    });

    return {
      ...asset,
      message: `Archivo cargado exitosamente. Conversión a GLB en curso.`,
    };
  }

  // ─── Upload 3D dedicado — validación estricta de formato y tamaño ──────────
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('assets/upload-3d')
  @UseInterceptors(FileInterceptor('file'))
  async upload3DModel(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { productId: string },
  ) {
    if (!file) throw new BadRequestException('No se cargó ningún archivo');
    if (!body.productId) throw new BadRequestException('productId es requerido');

    // Validar tamaño máximo
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`
      );
    }

    const format = getFormatFromFile(file.originalname);

    // Validar que sea un formato 3D reconocido
    if (format === 'dwg') {
      throw new BadRequestException(DWG_NOTE);
    }
    if (!ACCEPTED_EXTENSIONS.has(format)) {
      throw new BadRequestException(
        `Formato '.${format}' no es un modelo 3D soportado. Aceptados: ${[...ACCEPTED_EXTENSIONS].join(', ')}`
      );
    }

    // Reutilizar la lógica de upload existente
    return this.uploadAsset(req, file, body);
  }

  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('assets/:id/retry-conversion')
  async retryConversion(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.retryAssetConversion(req.tenantId, id, this.conversionService);
  }

  // ─── Condiciones ──────────────────────────────────────────────────────────
  @Get('conditions')
  async getConditions(@Req() req: any) { return this.catalogService.getConditions(req.tenantId); }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('conditions')
  async createCondition(@Req() req: any, @Body() body: any) {
    return this.catalogService.createCondition(req.tenantId, body);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('conditions/:id/status')
  async updateConditionStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updateConditionStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Precios ──────────────────────────────────────────────────────────────
  @Get('prices')
  async getPrices(@Req() req: any) { return this.catalogService.getPrices(req.tenantId); }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('prices/:id/status')
  async updatePriceStatus(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    return this.catalogService.updatePriceStatus(req.tenantId, id, { active: body.active });
  }

  // ─── Variantes de Producto ──────────────────────────────────────────────
  @Get('products/:productId/variants')
  async getVariants(@Req() req: any, @Param('productId') productId: string) {
    return this.catalogService.getProductVariants(req.tenantId, productId);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Post('products/:productId/variants')
  async createVariant(@Req() req: any, @Param('productId') productId: string, @Body() body: any) {
    return this.catalogService.createProductVariant(req.tenantId, productId, body);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Patch('variants/:id')
  async updateVariant(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateProductVariant(req.tenantId, id, body);
  }
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
  @Delete('variants/:id')
  async deleteVariant(@Req() req: any, @Param('id') id: string) {
    return this.catalogService.deleteProductVariant(req.tenantId, id);
  }

  // ─── Catálogo del Editor ───────────────────────────────────────────────────────
  @Get('available')
  async getAvailableCatalog(@Req() req: any) {
    return this.catalogService.getAvailableCatalog(req.user.sub, req.user.userType);
  }

  // ─── Catálogo filtrado para DISTRIBUTOR_USER ──────────────────────────────────
  // Solo DISTRIBUTOR_USER puede acceder a este endpoint
  // Se filtra automáticamente por los catálogos autorizados al distribuidor
  @UseGuards(UserTypeGuard)
  @AllowedUserTypes('DISTRIBUTOR_USER')
  @Get('distributor/products')
  async getDistributorCatalog(@Req() req: any) {
    // Forzar tipo DISTRIBUTOR_USER para garantizar filtrado correcto
    return this.catalogService.getAvailableCatalog(req.user.sub, 'DISTRIBUTOR_USER');
  }
}
