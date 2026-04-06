/**
 * Creado y diseñado por XO
 * XLayout System — Controlador de Importaciones v2
 *
 * Endpoints para gestión de importaciones CSV/Excel:
 * - GET  /imports/template/:type     → descarga plantilla CSV (básica o completa)
 * - POST /imports/upload             → carga archivo y encola procesamiento
 * - POST /imports/preview            → dry-run: análisis sin escritura real
 * - GET  /imports                    → historial de jobs
 * - GET  /imports/:id/status         → estado de un job específico
 */

import {
  Controller, Post, Get, Param, Body,
  UseGuards, Req, Res,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { UserTypeGuard } from '../common/guards/user-type.guard';
import { AllowedUserTypes } from '../common/decorators/user-type.decorator';

// Extensiones de archivo aceptadas para importación
const ACCEPTED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls']);

// Tipos de importación válidos
const VALID_IMPORT_TYPES = ['catalog', 'prices', 'conditions', 'commercial-relations'] as const;
type ImportType = typeof VALID_IMPORT_TYPES[number];

// Tipos de plantilla válidos (incluye variantes de catálogo)
const VALID_TEMPLATE_TYPES = ['catalog', 'catalog-basic', 'catalog-full', 'prices', 'conditions', 'commercial-relations'] as const;

// ─── Plantillas CSV profesionales ────────────────────────────────────────────

// Plantilla básica de catálogo — solo producto base
const CATALOG_BASIC_TEMPLATE = {
  filename: 'plantilla_productos_basica_xlayout.csv',
  content: [
    'sku,name,line,category,description,width,depth,height,price_a,currency',
    'ESC-001,Escritorio Ejecutivo Pro,Oficina Ejecutiva,Escritorios,Escritorio de alta gama con pasacables,1.80,0.80,0.75,25000,MXN',
    'SIL-002,Silla Ergo Max,Sillas,Operativa,Silla con soporte lumbar dinámico,0.65,0.65,1.20,8500,MXN',
    'LIB-003,Librero Minimal,Almacenamiento,Libreros,Librero de 5 niveles en melamina,0.90,0.35,1.80,12000,MXN',
    'GAB-004,Gabinete Credenza,Almacenamiento,Gabinetes,Gabinete bajo con puertas corredizas,1.20,0.45,0.72,15000,MXN',
  ].join('\n'),
};

// Plantilla completa de catálogo — productos base + variantes
const CATALOG_FULL_TEMPLATE = {
  filename: 'plantilla_productos_completa_xlayout.csv',
  content: [
    'sku,name,base_sku,variant_type,variant_name,line,category,brand,description,width,depth,height,unit,status,price_a,price_b,price_c,price_d,price_e,currency,model_3d_url,asset_2d_url,thumbnail_url',
    '# ─── Productos Base (base_sku vacío) ───',
    'LOC-100,Locker Metálico,,,,,Lockers,MetalPro,Locker industrial de acero calibre 22,0.38,0.45,1.80,pza,PUBLISHED,4500,4050,3600,3150,2700,MXN,https://storage.xlayout.io/assets/locker.glb,,https://storage.xlayout.io/assets/locker_thumb.png',
    'ESC-200,Escritorio Operativo,,,,,Escritorios,OfiLine,Escritorio operativo con cajones,1.20,0.60,0.75,pza,PUBLISHED,8500,7650,6800,5950,5100,MXN,,,',
    'SIL-300,Silla Ejecutiva,,,,,Sillas,ErgoMax,Silla ejecutiva con respaldo alto,0.65,0.68,1.25,pza,PUBLISHED,12000,10800,9600,8400,7200,MXN,,,',
    '# ─── Variantes del Locker (base_sku = LOC-100) ───',
    'LOC-101,Locker 2 Puertas,LOC-100,size,2 Puertas,,,,Locker de 2 compartimientos,0.38,0.45,1.80,pza,PUBLISHED,4500,4050,3600,3150,2700,MXN,,,',
    'LOC-102,Locker 4 Puertas,LOC-100,size,4 Puertas,,,,Locker de 4 compartimientos,0.76,0.45,1.80,pza,PUBLISHED,8200,7380,6560,5740,4920,MXN,,,',
    'LOC-103,Locker Color Arena,LOC-100,color,Arena,,,,Acabado arena mate,0.38,0.45,1.80,pza,PUBLISHED,4700,4230,3760,3290,2820,MXN,,,',
    '# ─── Variantes del Escritorio (base_sku = ESC-200) ───',
    'ESC-201,Escritorio 1.50m,ESC-200,size,1.50 metros,,,,Versión compacta 1.50m,1.50,0.60,0.75,pza,PUBLISHED,7800,7020,6240,5460,4680,MXN,,,',
    'ESC-202,Escritorio 1.80m,ESC-200,size,1.80 metros,,,,Versión amplia 1.80m,1.80,0.60,0.75,pza,PUBLISHED,9500,8550,7600,6650,5700,MXN,,,',
  ].join('\n'),
};

// Plantilla de precios
const PRICES_TEMPLATE = {
  filename: 'plantilla_precios_xlayout.csv',
  content: [
    'sku,price_type,currency,base_price',
    'ESC-001,A,MXN,25000.00',
    'ESC-001,B,MXN,22500.00',
    'ESC-001,C,MXN,20000.00',
    'SIL-002,A,MXN,8500.00',
    'SIL-002,B,MXN,7650.00',
  ].join('\n'),
};

// Plantilla de condiciones
const CONDITIONS_TEMPLATE = {
  filename: 'plantilla_condiciones_xlayout.csv',
  content: [
    'sku,line,condition_type,description,active',
    'ESC-001,,warranty,Garantía de 5 años en estructura metálica,true',
    ',Sillas,commercial,Descuento 15% en compras mayores a 50 unidades,true',
    'LOC-100,,delivery,Tiempo de entrega: 10 días hábiles,true',
  ].join('\n'),
};

// Plantilla de Relaciones Comerciales (Fabricante <-> Distribuidor)
const COMMERCIAL_RELATIONS_TEMPLATE = {
  filename: 'plantilla_relaciones_comerciales_xlayout.csv',
  content: [
    'distributor_email,distributor_name,distributor_country,distributor_phone,allowed_lists,global_discount_percent',
    'ventas@distribuidor-norte.com,Distribuidora Norte,MX,5551234567,"A,B,C",20',
    'compras@oficentro.com,Oficentro,MX,,"A,B",15',
  ].join('\n'),
};

// Mapeo de tipo → plantilla
const TEMPLATES: Record<string, { filename: string; content: string }> = {
  'catalog': CATALOG_FULL_TEMPLATE,
  'catalog-basic': CATALOG_BASIC_TEMPLATE,
  'catalog-full': CATALOG_FULL_TEMPLATE,
  'prices': PRICES_TEMPLATE,
  'conditions': CONDITIONS_TEMPLATE,
  'commercial-relations': COMMERCIAL_RELATIONS_TEMPLATE,
};

@UseGuards(JwtAuthGuard, TenantGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  // ─── Descargar plantilla CSV según tipo ────────────────────────────────
  @Get('template/:type')
  async downloadTemplate(
    @Param('type') type: string,
    @Res() res: any,
  ) {
    const template = TEMPLATES[type];
    if (!template) {
      throw new BadRequestException(
        `Tipo de plantilla '${type}' no válido. Tipos aceptados: ${Object.keys(TEMPLATES).join(', ')}`
      );
    }

    // Enviar CSV con BOM UTF-8 para compatibilidad con Excel
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    res.send(bom + template.content);
  }

  // ─── Subir archivo CSV/Excel y encolar importación ─────────────────────
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndImport(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: string; dryRun?: string },
  ) {
    // Validar que se recibió un archivo
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo. Seleccione un CSV o Excel.');
    }

    // Validar tipo de importación
    const importType = body.type as ImportType;
    if (!VALID_IMPORT_TYPES.includes(importType)) {
      throw new BadRequestException(
        `Tipo de importación '${body.type}' no válido. Tipos aceptados: ${VALID_IMPORT_TYPES.join(', ')}`
      );
    }

    // Validar extensión del archivo
    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Extensión '.${ext}' no soportada. Archivos aceptados: CSV, XLSX, XLS`
      );
    }

    // Validar tamaño máximo (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('El archivo excede el tamaño máximo de 10 MB');
    }

    // Validar que el archivo no está vacío
    if (file.size === 0) {
      throw new BadRequestException('El archivo está vacío. Verifique el contenido antes de intentar de nuevo.');
    }

    // Determinar si es dry-run
    const dryRun = body.dryRun === 'true' || body.dryRun === '1';

    // Crear job de importación con la ruta local del archivo
    const filePath = `/storage/imports/${file.filename}`;
    return this.importsService.triggerImport(
      req.tenantId,
      importType,
      filePath,
      file.originalname,
      req.user.sub,
      dryRun,
    );
  }

  // ─── Preview (dry-run) — analizar sin importar ─────────────────────────
  @Post('preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: string },
  ) {
    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo para análisis.');
    }

    const importType = body.type as ImportType;
    if (!VALID_IMPORT_TYPES.includes(importType)) {
      throw new BadRequestException(
        `Tipo de importación '${body.type}' no válido. Tipos aceptados: ${VALID_IMPORT_TYPES.join(', ')}`
      );
    }

    const ext = file.originalname.split('.').pop()?.toLowerCase() || '';
    if (!ACCEPTED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`Extensión '.${ext}' no soportada.`);
    }

    if (file.size === 0) {
      throw new BadRequestException('El archivo está vacío.');
    }

    // Siempre dry-run forzado
    const filePath = `/storage/imports/${file.filename}`;
    return this.importsService.triggerImport(
      req.tenantId,
      importType,
      filePath,
      file.originalname,
      req.user.sub,
      true, // dry-run forzado
    );
  }

  // ─── Crear job por URL (modo avanzado / legado) ────────────────────────
  @Post()
  async triggerImport(
    @Req() req: any,
    @Body() body: { type: string; fileUrl: string; dryRun?: boolean },
  ) {
    const importType = body.type as ImportType;
    if (!VALID_IMPORT_TYPES.includes(importType)) {
      throw new BadRequestException(
        `Tipo de importación '${body.type}' no válido. Tipos: ${VALID_IMPORT_TYPES.join(', ')}`
      );
    }
    if (!body.fileUrl) {
      throw new BadRequestException('fileUrl es requerido');
    }
    return this.importsService.triggerImport(
      req.tenantId,
      importType,
      body.fileUrl,
      body.fileUrl.split('/').pop() || 'upload.csv',
      req.user.sub,
      body.dryRun || false,
    );
  }

  // ─── Historial de importaciones ────────────────────────────────────────
  @Get()
  async getImports(@Req() req: any) {
    return this.importsService.getImportsByTenant(req.tenantId);
  }

  // ─── Estado de un job específico ───────────────────────────────────────
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.importsService.getImportStatus(id);
  }
}
