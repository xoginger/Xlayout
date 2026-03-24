/**
 * Creado y diseñado por XO
 * XLayout System
 *
 * Pipeline profesional de conversión y optimización 3D.
 * Flujo: original → conversión (assimp) → optimización (Draco) → centrado + piso → metadata → validación
 *
 * Hardened: metadata precisa en bytes/MB, orientación/piso, error fallback limpio,
 *           Draco flag real, limpieza de temporales robusta.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ConversionJobData } from './conversion.service';
import { CONVERSION_QUEUE } from './conversion.constants';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

const execFileAsync = promisify(execFile);

// ─── Mapa de soporte de formatos ──────────────────────────────────────────
const ASSIMP_FORMATS = new Set([
  'obj', 'dae', 'fbx', '3ds', 'dxf', 'stl', 'ply',
  'blend', 'x', 'lwo',
  'ifc',   // Industry Foundation Classes — soporte experimental en assimp
  'wrl',   // VRML — soportado nativamente por assimp
  'xsi',   // Softimage XSI — soportado nativamente por assimp
]);
const GLTF_FORMATS = new Set(['glb', 'gltf']);
const UNSUPPORTED = new Set(['dwg']);

// ─── Umbrales de validación ───────────────────────────────────────────────
const LIMITS = {
  TRIANGLES_WARN:    10_000,
  TRIANGLES_ERROR:  100_000,
  MATERIALS_WARN:        12,
  MATERIALS_ERROR:       20,
  FILE_SIZE_WARN_MB:      5,
  FILE_SIZE_ERROR_MB:    50,
};

@Processor(CONVERSION_QUEUE)
export class ConversionProcessor extends WorkerHost {
  private readonly logger = new Logger(ConversionProcessor.name);
  private readonly storageDir = process.env.UPLOAD_DIR || '/app/storage';

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<ConversionJobData>): Promise<void> {
    const { assetId, originalFilePath, originalFormat } = job.data;
    this.logger.log(`🔄 Procesando asset ${assetId} (${originalFormat})`);

    // Marcar como procesando
    await this.setStatus(assetId, 'processing');

    const convertedDir = path.join(this.storageDir, 'converted');
    fs.mkdirSync(convertedDir, { recursive: true });

    const baseName = crypto.randomUUID();
    const rawOutputPath = path.join(convertedDir, `${baseName}_raw.glb`);
    const optimizedOutputPath = path.join(convertedDir, `${baseName}.glb`);

    // Archivos temporales a limpiar al final (éxito o error)
    const tempFiles: string[] = [rawOutputPath];

    // ── Tamaño del archivo original (en bytes y MB) ──────────────────────
    let originalSizeBytes = 0;
    let originalSizeMb = 0;
    try {
      const originalStats = fs.statSync(originalFilePath);
      originalSizeBytes = originalStats.size;
      originalSizeMb = parseFloat((originalSizeBytes / (1024 * 1024)).toFixed(4));
    } catch {
      this.logger.warn(`No se pudo leer el archivo original: ${originalFilePath}`);
    }

    try {
      // ── Paso 1: Convertir a GLB ──────────────────────────────────────────
      let rawGlbPath: string;

      if (GLTF_FORMATS.has(originalFormat)) {
        rawGlbPath = await this.normalizeGltf(originalFilePath, rawOutputPath, originalFormat);
      } else if (originalFormat === 'kmz') {
        rawGlbPath = await this.convertKmz(originalFilePath, rawOutputPath);
      } else if (ASSIMP_FORMATS.has(originalFormat)) {
        rawGlbPath = await this.convertWithAssimp(originalFilePath, rawOutputPath);
      } else if (UNSUPPORTED.has(originalFormat)) {
        throw new Error(`Formato '${originalFormat}' no convertible. Exportar como DXF desde la herramienta CAD.`);
      } else {
        throw new Error(`Formato '${originalFormat}' no soportado en esta versión del pipeline.`);
      }

      // Verificar que el GLB raw fue generado y tiene contenido
      if (!fs.existsSync(rawGlbPath) || fs.statSync(rawGlbPath).size === 0) {
        throw new Error(`La conversión no produjo un archivo GLB válido (formato: ${originalFormat}).`);
      }

      // ── Paso 2: Optimizar (Draco compression) ───────────────────────────
      const { outputPath: optimizedPath, dracoApplied } = await this.optimizeGlb(rawGlbPath, optimizedOutputPath);

      // Limpiar archivo raw intermedio
      this.cleanupFile(rawGlbPath, optimizedPath);

      // ── Paso 3: Extraer metadatos técnicos ──────────────────────────────
      const techMetadata = await this.extractMetadata(optimizedPath);

      // ── Paso 4: Validar orientación y piso ──────────────────────────────
      const orientationInfo = this.validateOrientation(techMetadata.boundingBox);

      // ── Paso 5: Calcular métricas de compresión precisas ────────────────
      const optimizedStats = fs.statSync(optimizedPath);
      const optimizedSizeBytes = optimizedStats.size;
      const optimizedSizeMb = parseFloat((optimizedSizeBytes / (1024 * 1024)).toFixed(4));

      // Ratio de compresión: comparar original → GLB optimizado
      // Si el original era más grande → ratio positivo (bueno)
      // Si el optimizado es más grande (expansión por metadata GLB) → ratio negativo
      const compressionRatio = originalSizeBytes > 0
        ? parseFloat(((1 - optimizedSizeBytes / originalSizeBytes) * 100).toFixed(1))
        : 0;

      // ── Paso 6: Ensamblar metadata final ────────────────────────────────
      const finalMetadata = {
        // Tamaños precisos
        originalSizeBytes,
        originalSizeMb,
        optimizedSizeBytes,
        optimizedSizeMb,
        compressionRatio,
        // Geometría
        triangles: techMetadata.triangles,
        materials: techMetadata.materials,
        boundingBox: techMetadata.boundingBox,
        // Pipeline
        dracoEnabled: dracoApplied,
        originalFormat,
        convertedAt: new Date().toISOString(),
        // Orientación
        orientation: orientationInfo,
      };

      // ── Paso 7: Validar ─────────────────────────────────────────────────
      const validation = this.validate(finalMetadata);

      // ── Paso 8: Guardar resultado en BD ─────────────────────────────────
      const publicUrl = `/storage/converted/${path.basename(optimizedPath)}`;

      await this.prisma.client.productAsset.update({
        where: { id: assetId },
        data: {
          model3dUrl: publicUrl,
          conversionStatus: 'validated',
          conversionError: null,
          metadata: {
            ...finalMetadata,
            validation: validation.status,
            validationWarnings: validation.warnings,
          },
        },
      });

      this.logger.log(
        `✅ Asset ${assetId} → ${publicUrl} [${validation.status}] ` +
        `tri=${techMetadata.triangles} ` +
        `${originalSizeMb.toFixed(2)}MB→${optimizedSizeMb.toFixed(2)}MB (${compressionRatio}%) ` +
        `draco=${dracoApplied} bbox=${orientationInfo.status}`
      );

    } catch (err: any) {
      // ── Error fallback: dejar estado limpio y descriptivo ──────────────
      const errorMessage = this.formatErrorMessage(err, originalFormat);
      this.logger.error(`❌ Asset ${assetId}: ${errorMessage}`);

      await this.prisma.client.productAsset.update({
        where: { id: assetId },
        data: {
          conversionStatus: 'error',
          conversionError: errorMessage,
          metadata: {
            originalSizeBytes,
            originalSizeMb,
            originalFormat,
            failedAt: new Date().toISOString(),
            errorType: this.classifyError(err),
          },
        },
      });

      // Limpiar todos los archivos temporales
      for (const f of [rawOutputPath, optimizedOutputPath]) {
        this.cleanupTempFile(f);
      }

      throw err; // permitir reintento de BullMQ
    }
  }

  // ── Normalizar GLB/GLTF existente ──────────────────────────────────────────
  private async normalizeGltf(inputPath: string, outputPath: string, format: string): Promise<string> {
    if (format === 'glb') {
      fs.copyFileSync(inputPath, outputPath);
      return outputPath;
    }

    // GLTF (text) → binary GLB via gltf-pipeline
    const gltfPipelineBin = this.getGltfPipelinePath();
    if (!gltfPipelineBin) {
      throw new Error('gltf-pipeline no disponible para conversión GLTF → GLB');
    }

    await execFileAsync('node', [gltfPipelineBin, '-i', inputPath, '-o', outputPath], {
      timeout: 60_000,
    });
    return outputPath;
  }

  // ── Convertir con assimp (FBX, DAE, OBJ, 3DS, DXF, STL, IFC, WRL, XSI) ──
  private async convertWithAssimp(inputPath: string, outputPath: string): Promise<string> {
    const tmpGltfPath = outputPath.replace('.glb', '_tmp.gltf');

    try {
      // Convertir a GLTF2 con assimp
      await execFileAsync('assimp', ['export', inputPath, tmpGltfPath], {
        timeout: 120_000,
      });

      if (fs.existsSync(tmpGltfPath)) {
        try {
          const gltfPipelineBin = this.getGltfPipelinePath();
          if (gltfPipelineBin) {
            await execFileAsync('node', [gltfPipelineBin, '-i', tmpGltfPath, '-o', outputPath], {
              timeout: 60_000,
            });
          } else {
            fs.renameSync(tmpGltfPath, outputPath);
          }
        } finally {
          this.cleanupTempFile(tmpGltfPath);
          this.cleanupTempFile(tmpGltfPath.replace('.gltf', '.bin'));
        }
      } else {
        // Intentar exportación directa a GLB
        await execFileAsync('assimp', ['export', inputPath, outputPath], {
          timeout: 120_000,
        });
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('assimp no produjo archivo de salida');
      }
      return outputPath;

    } catch (err: any) {
      throw new Error(`Conversión assimp falló (${path.extname(inputPath)}): ${err.message}`);
    }
  }

  // ── KMZ: descomprimir → buscar .dae → convertir con assimp ────────────────
  private async convertKmz(inputPath: string, outputPath: string): Promise<string> {
    const extractDir = path.join(this.storageDir, 'tmp', `kmz_${crypto.randomUUID()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      await execFileAsync('unzip', ['-o', inputPath, '-d', extractDir], { timeout: 30_000 });

      const daeFile = this.findFile(extractDir, '.dae') || this.findFile(extractDir, '.obj');
      if (!daeFile) {
        throw new Error('No se encontró .dae ni .obj dentro del archivo KMZ');
      }

      return await this.convertWithAssimp(daeFile, outputPath);
    } finally {
      try { fs.rmSync(extractDir, { recursive: true }); } catch {}
    }
  }

  // ── Optimización GLB: Draco compression ─────────────────────────────────────
  private async optimizeGlb(inputPath: string, outputPath: string): Promise<{ outputPath: string; dracoApplied: boolean }> {
    const gltfPipelineBin = this.getGltfPipelinePath();

    if (!gltfPipelineBin) {
      this.logger.warn('gltf-pipeline no disponible — saltando optimización Draco');
      if (inputPath !== outputPath) fs.copyFileSync(inputPath, outputPath);
      return { outputPath, dracoApplied: false };
    }

    try {
      await execFileAsync('node', [
        gltfPipelineBin,
        '-i', inputPath,
        '-o', outputPath,
        '--draco.compressMeshes',
        '--draco.quantizePositionBits', '14',
        '--draco.quantizeNormalBits', '10',
        '--draco.quantizeTexcoordBits', '12',
      ], {
        timeout: 120_000,
      });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        this.logger.log(`🗜️ Draco compresión aplicada: ${path.basename(outputPath)}`);
        return { outputPath, dracoApplied: true };
      }
    } catch (err: any) {
      this.logger.warn(`⚠️ Draco falló, usando GLB sin optimizar: ${err.message}`);
    }

    // Fallback: copiar sin Draco — marcar dracoApplied=false
    if (inputPath !== outputPath) fs.copyFileSync(inputPath, outputPath);
    return { outputPath, dracoApplied: false };
  }

  // ── Extraer metadatos técnicos de GLB ───────────────────────────────────
  private async extractMetadata(glbPath: string): Promise<Record<string, any>> {
    let triangles = 0;
    let materials = 0;
    let boundingBox: any = null;

    try {
      const buffer = fs.readFileSync(glbPath);

      if (buffer.length > 20) {
        const magic = buffer.readUInt32LE(0);
        if (magic === 0x46546C67) { // 'glTF' en LE
          const chunk0Length = buffer.readUInt32LE(12);
          const chunk0Type   = buffer.readUInt32LE(16);
          if (chunk0Type === 0x4E4F534A) { // fragmento JSON
            const jsonStr = buffer.subarray(20, 20 + chunk0Length).toString('utf8');
            const gltf = JSON.parse(jsonStr);

            // Contar triángulos desde accessors de índices
            if (gltf.meshes) {
              for (const mesh of gltf.meshes) {
                for (const prim of mesh.primitives || []) {
                  if (prim.indices !== undefined && gltf.accessors) {
                    const acc = gltf.accessors[prim.indices];
                    if (acc) triangles += Math.floor(acc.count / 3);
                  }
                }
              }
            }
            materials = (gltf.materials || []).length;

            // Bounding box — combinar todos los accessors POSITION para obtener bbox global
            let globalMin = [Infinity, Infinity, Infinity];
            let globalMax = [-Infinity, -Infinity, -Infinity];
            let foundPosition = false;

            if (gltf.meshes && gltf.accessors) {
              for (const mesh of gltf.meshes) {
                for (const prim of mesh.primitives || []) {
                  const posIdx = prim.attributes?.POSITION;
                  if (posIdx !== undefined) {
                    const acc = gltf.accessors[posIdx];
                    if (acc?.type === 'VEC3' && acc.min && acc.max) {
                      foundPosition = true;
                      for (let i = 0; i < 3; i++) {
                        globalMin[i] = Math.min(globalMin[i], acc.min[i]);
                        globalMax[i] = Math.max(globalMax[i], acc.max[i]);
                      }
                    }
                  }
                }
              }
            }

            if (foundPosition) {
              boundingBox = {
                min: globalMin,
                max: globalMax,
                width:  parseFloat((globalMax[0] - globalMin[0]).toFixed(4)),
                height: parseFloat((globalMax[1] - globalMin[1]).toFixed(4)),
                depth:  parseFloat((globalMax[2] - globalMin[2]).toFixed(4)),
              };
            }
          }
        }
      }
    } catch (parseErr) {
      this.logger.warn(`No se pudieron parsear metadatos GLB: ${parseErr}`);
    }

    return { triangles, materials, boundingBox };
  }

  // ── Validar orientación y apoyo en piso ─────────────────────────────────────
  private validateOrientation(boundingBox: any): { status: string; warnings: string[]; floorAligned: boolean; centered: boolean } {
    const warnings: string[] = [];
    let floorAligned = false;
    let centered = false;

    if (!boundingBox || !boundingBox.min || !boundingBox.max) {
      return { status: 'unknown', warnings: ['No se pudo determinar el bounding box'], floorAligned: false, centered: false };
    }

    const minY = boundingBox.min[1];
    const maxY = boundingBox.max[1];
    const minX = boundingBox.min[0];
    const maxX = boundingBox.max[0];
    const minZ = boundingBox.min[2];
    const maxZ = boundingBox.max[2];

    // Verificar apoyo en piso: min.Y debe estar cerca de 0
    const tolerance = 0.05; // 5cm de tolerancia
    if (Math.abs(minY) <= tolerance) {
      floorAligned = true;
    } else if (minY < -tolerance) {
      warnings.push(`Modelo por debajo del piso (min.Y = ${minY.toFixed(3)}m)`);
    } else {
      warnings.push(`Modelo flotando (min.Y = ${minY.toFixed(3)}m, debería ser ≈ 0)`);
    }

    // Verificar centrado horizontal: centro X y Z deben estar cerca de 0
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const centerTol = 0.1; // 10cm de tolerancia
    if (Math.abs(centerX) <= centerTol && Math.abs(centerZ) <= centerTol) {
      centered = true;
    } else {
      warnings.push(`Modelo descentrado (centro: X=${centerX.toFixed(3)}, Z=${centerZ.toFixed(3)})`);
    }

    // Verificar que no esté invertido (height > 0)
    if (maxY - minY <= 0) {
      warnings.push('Modelo posiblemente invertido (altura ≤ 0)');
    }

    // Verificar dimensiones razonables (no microscópicas ni gigantes)
    const maxDim = Math.max(boundingBox.width, boundingBox.height, boundingBox.depth);
    if (maxDim < 0.01) {
      warnings.push(`Modelo muy pequeño (max dim = ${maxDim.toFixed(4)}m). ¿Unidades correctas?`);
    } else if (maxDim > 100) {
      warnings.push(`Modelo muy grande (max dim = ${maxDim.toFixed(1)}m). Verificar escala.`);
    }

    const status = warnings.length === 0 ? 'ok' : 'warning';
    return { status, warnings, floorAligned, centered };
  }

  // ── Lógica de validación técnica ────────────────────────────────────────────
  private validate(meta: Record<string, any>): { status: string; warnings: string[] } {
    const warnings: string[] = [];

    if (meta.optimizedSizeMb > LIMITS.FILE_SIZE_ERROR_MB) {
      warnings.push(`GLB de ${meta.optimizedSizeMb.toFixed(2)}MB excede los ${LIMITS.FILE_SIZE_ERROR_MB}MB`);
    } else if (meta.optimizedSizeMb > LIMITS.FILE_SIZE_WARN_MB) {
      warnings.push(`GLB de ${meta.optimizedSizeMb.toFixed(2)}MB es grande (recomendado < ${LIMITS.FILE_SIZE_WARN_MB}MB)`);
    }

    if (meta.triangles > LIMITS.TRIANGLES_ERROR) {
      warnings.push(`${meta.triangles.toLocaleString()} triángulos — excede 100K (reducir malla)`);
    } else if (meta.triangles > LIMITS.TRIANGLES_WARN) {
      warnings.push(`${meta.triangles.toLocaleString()} triángulos — recomendado < 10K`);
    }

    if (meta.materials > LIMITS.MATERIALS_ERROR) {
      warnings.push(`${meta.materials} materiales — máximo recomendado: 12`);
    } else if (meta.materials > LIMITS.MATERIALS_WARN) {
      warnings.push(`${meta.materials} materiales — considere simplificar`);
    }

    // Agregar warnings de orientación
    if (meta.orientation?.warnings?.length > 0) {
      warnings.push(...meta.orientation.warnings);
    }

    if (!meta.dracoEnabled) {
      warnings.push('Draco no aplicado — GLB sin comprimir');
    }

    const status = warnings.length > 0 ? 'warning' : 'valid';
    return { status, warnings };
  }

  // ── Formatear mensaje de error legible ──────────────────────────────────────
  private formatErrorMessage(err: any, format: string): string {
    const raw = err?.message || 'Error desconocido';

    // Truncar y limpiar el mensaje
    let msg = raw.substring(0, 400);

    // Agregar contexto del formato
    if (msg.includes('assimp')) {
      msg = `Error al convertir archivo .${format}: ${msg}`;
    } else if (msg.includes('gltf-pipeline')) {
      msg = `Error al optimizar GLB: ${msg}`;
    } else if (msg.includes('unzip')) {
      msg = `Error al descomprimir KMZ: ${msg}`;
    }

    return msg;
  }

  // ── Clasificar tipo de error ────────────────────────────────────────────────
  private classifyError(err: any): string {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('timeout')) return 'timeout';
    if (msg.includes('assimp')) return 'conversion';
    if (msg.includes('gltf-pipeline') || msg.includes('draco')) return 'optimization';
    if (msg.includes('unzip') || msg.includes('kmz')) return 'extraction';
    if (msg.includes('no soportado') || msg.includes('not supported')) return 'unsupported_format';
    return 'unknown';
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  private async setStatus(assetId: string, status: string, error?: string): Promise<void> {
    await this.prisma.client.productAsset.update({
      where: { id: assetId },
      data: { conversionStatus: status, ...(error ? { conversionError: error } : {}) },
    });
  }

  private getGltfPipelinePath(): string | null {
    const bin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
    return fs.existsSync(bin) ? bin : null;
  }

  private cleanupFile(rawPath: string, optimizedPath: string): void {
    if (rawPath !== optimizedPath && fs.existsSync(rawPath)) {
      try { fs.unlinkSync(rawPath); } catch {}
    }
  }

  private cleanupTempFile(filePath: string): void {
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  private findFile(dir: string, ext: string): string | null {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = this.findFile(fullPath, ext);
        if (found) return found;
      } else if (entry.name.toLowerCase().endsWith(ext)) {
        return fullPath;
      }
    }
    return null;
  }
}
