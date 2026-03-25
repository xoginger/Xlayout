/**
 * Creado y diseñado por XO
 * XLayout System — Controlador de Importaciones
 *
 * Endpoints para gestión de importaciones CSV/Excel:
 * - GET /imports/template/:type → descarga plantilla CSV
 * - POST /imports/upload → carga archivo y encola procesamiento
 * - GET /imports → historial de jobs
 * - GET /imports/:id/status → estado de un job específico
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
const VALID_IMPORT_TYPES = ['catalog', 'prices', 'conditions'] as const;
type ImportType = typeof VALID_IMPORT_TYPES[number];

// ─── Plantillas CSV por tipo de importación ──────────────────────────────────
const TEMPLATES: Record<ImportType, { filename: string; content: string }> = {
  catalog: {
    filename: 'plantilla_productos_xlayout.csv',
    content: [
      'name,sku,line,category,width,depth,height,unit,price_a,price_b,price_c,price_d,price_e,currency,description',
      'Escritorio Ejecutivo Pro,ESC-001,Oficina Ejecutiva,Escritorios,1.80,0.80,0.75,m,25000,22500,20000,17500,15000,MXN,Escritorio de alta gama con pasacables',
      'Silla Ergo Max,SIL-002,Sillas,Operativa,0.65,0.65,1.20,pza,8500,7650,6800,5950,5100,MXN,Silla con soporte lumbar dinámico',
      'Librero Minimal,LIB-003,Almacenamiento,Libreros,0.90,0.35,1.80,pza,12000,10800,9600,8400,7200,MXN,Librero de 5 niveles en melamina',
    ].join('\n'),
  },
  prices: {
    filename: 'plantilla_precios_xlayout.csv',
    content: [
      'sku,priceType,currency,basePrice',
      'ESC-001,A,MXN,25000.00',
      'ESC-001,B,MXN,22500.00',
      'SIL-002,A,MXN,8500.00',
    ].join('\n'),
  },
  conditions: {
    filename: 'plantilla_condiciones_xlayout.csv',
    content: [
      'sku,line,conditionType,description,active',
      'ESC-001,,warranty,Garantía de 5 años en estructura,true',
      ',Sillas,commercial,Descuento 15% en volumen > 50,true',
    ].join('\n'),
  },
};

@UseGuards(JwtAuthGuard, TenantGuard, UserTypeGuard)
@AllowedUserTypes('PLATFORM_USER', 'COMPANY_USER')
@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  // ─── Descargar plantilla CSV según tipo ────────────────────────────────────
  @Get('template/:type')
  async downloadTemplate(
    @Param('type') type: string,
    @Res() res: any,
  ) {
    if (!VALID_IMPORT_TYPES.includes(type as ImportType)) {
      throw new BadRequestException(
        `Tipo de importación '${type}' no válido. Tipos aceptados: ${VALID_IMPORT_TYPES.join(', ')}`
      );
    }

    const template = TEMPLATES[type as ImportType];
    // Enviar CSV con BOM UTF-8 para compatibilidad con Excel
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);
    res.send(bom + template.content);
  }

  // ─── Subir archivo CSV/Excel y encolar importación ─────────────────────────
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndImport(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { type: string },
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

    // Crear job de importación con la ruta local del archivo
    const filePath = `/storage/imports/${file.filename}`;
    return this.importsService.triggerImport(
      req.tenantId,
      importType,
      filePath,
      file.originalname,
      req.user.sub,
    );
  }

  // ─── Crear job por URL (modo avanzado / legado) ────────────────────────────
  @Post()
  async triggerImport(
    @Req() req: any,
    @Body() body: { type: string; fileUrl: string },
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
    );
  }

  // ─── Historial de importaciones ────────────────────────────────────────────
  @Get()
  async getImports(@Req() req: any) {
    return this.importsService.getImportsByTenant(req.tenantId);
  }

  // ─── Estado de un job específico ───────────────────────────────────────────
  @Get(':id/status')
  async getStatus(@Param('id') id: string) {
    return this.importsService.getImportStatus(id);
  }
}
