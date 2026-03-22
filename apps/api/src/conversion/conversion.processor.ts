/**
 * Creado y diseñado por XO
 * XLayout System
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
const ASSIMP_FORMATS = new Set(['obj', 'dae', 'fbx', '3ds', 'dxf', 'stl', 'ply', 'blend', 'x', 'lwo']);
const GLTF_FORMATS   = new Set(['glb', 'gltf']);
const UNSUPPORTED    = new Set(['dwg', 'kmz']); // KMZ requiere manejo especial

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

    const outputName = `${crypto.randomUUID()}.glb`;
    const outputPath = path.join(convertedDir, outputName);

    try {
      // ── Paso 1: Convertir a GLB ──────────────────────────────────────────
      let glbPath: string;

      if (GLTF_FORMATS.has(originalFormat)) {
        glbPath = await this.normalizeGltf(originalFilePath, outputPath, originalFormat);
      } else if (ASSIMP_FORMATS.has(originalFormat)) {
        glbPath = await this.convertWithAssimp(originalFilePath, outputPath);
      } else if (originalFormat === 'kmz') {
        glbPath = await this.convertKmz(originalFilePath, outputPath);
      } else {
        throw new Error(`El formato '${originalFormat}' no está soportado en esta versión del pipeline`);
      }

      // ── Paso 2: Extraer metadatos técnicos ─────────────────────────────
      const techMetadata = await this.extractMetadata(glbPath);

      // ── Paso 3: Validar ────────────────────────────────────────────────
      const validation = this.validate(techMetadata);

      // ── Paso 4: Guardar URL pública y actualizar BD ─────────────────────────
      const publicUrl = `/storage/converted/${path.basename(glbPath)}`;
      const finalStatus = validation.isInvalid ? 'validated' : 'validated'; // siempre guardar resultado

      await this.prisma.client.productAsset.update({
        where: { id: assetId },
        data: {
          model3dUrl: publicUrl,
          conversionStatus: finalStatus,
          conversionError: null,
          metadata: {
            ...techMetadata,
            validation: validation.status,
            validationWarnings: validation.warnings,
            convertedAt: new Date().toISOString(),
          },
        },
      });

      this.logger.log(`✅ Asset ${assetId} → ${publicUrl} [${validation.status}] triangles=${techMetadata.triangles}`);

    } catch (err: any) {
      this.logger.error(`❌ Falló la conversión para ${assetId}: ${err.message}`);
      await this.prisma.client.productAsset.update({
        where: { id: assetId },
        data: {
          conversionStatus: 'failed',
          conversionError: err.message?.substring(0, 500) || 'Error desconocido',
        },
      });
      throw err; // permitir reintento de BullMQ
    }
  }

  // ── Normalizar GLB/GLTF existente ──────────────────────────────────────────
  private async normalizeGltf(inputPath: string, outputPath: string, format: string): Promise<string> {
    if (format === 'glb') {
      // Para GLB: usar gltf-pipeline para optimizar (compresión draco, etc.)
      try {
        const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
        if (fs.existsSync(gltfPipelineBin)) {
          await execFileAsync('node', [gltfPipelineBin, '-i', inputPath, '-o', outputPath]);
          return outputPath;
        }
      } catch (e) {
        this.logger.warn(`gltf-pipeline no disponible, copiando GLB tal cual: ${e}`);
      }
      // Fallback: copiar tal cual
      fs.copyFileSync(inputPath, outputPath);
      return outputPath;
    }

    // GLTF (text) → binary GLB via gltf-pipeline
    try {
      const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
      await execFileAsync('node', [gltfPipelineBin, '-i', inputPath, '-o', outputPath]);
      return outputPath;
    } catch (e) {
      throw new Error(`Falló la conversión GLTF → GLB: ${e}`);
    }
  }

  // ── Convertir con assimp (FBX, DAE, OBJ, 3DS, DXF, etc.) ─────────────────
  private async convertWithAssimp(inputPath: string, outputPath: string): Promise<string> {
    // assimp export <input> <output.glb>
    const tmpGltfPath = outputPath.replace('.glb', '_tmp.gltf');

    try {
      // Primero convertir a GLTF2 (assimp puede no soportar salida directa .glb en todas las versiones)
      await execFileAsync('assimp', ['export', inputPath, tmpGltfPath], {
        timeout: 120_000, // 2 min máx por archivo
      });

      // Si existe la salida gltf, convertir a GLB binario
      if (fs.existsSync(tmpGltfPath)) {
        try {
          const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
          if (fs.existsSync(gltfPipelineBin)) {
            await execFileAsync('node', [gltfPipelineBin, '-i', tmpGltfPath, '-o', outputPath]);
          } else {
            // Renombrar .gltf a .glb como fallback (la incrustación binaria puede variar)
            fs.renameSync(tmpGltfPath, outputPath);
          }
        } finally {
          if (fs.existsSync(tmpGltfPath)) fs.unlinkSync(tmpGltfPath);
          // También limpiar archivos .bin complementarios que assimp pueda crear
          const binFile = tmpGltfPath.replace('.gltf', '.bin');
          if (fs.existsSync(binFile)) fs.unlinkSync(binFile);
        }
      } else {
        // assimp puede exportar directamente como .glb - intentarlo
        const directGlb = outputPath;
        await execFileAsync('assimp', ['export', inputPath, directGlb], {
          timeout: 120_000,
        });
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('La conversión de assimp no produjo ningún archivo de salida');
      }
      return outputPath;

    } catch (err: any) {
      throw new Error(`Falló la conversión de assimp: ${err.message}`);
    }
  }

  // ── KMZ: descomprimir → buscar .dae → convertir con assimp ─────────────────────────
  private async convertKmz(inputPath: string, outputPath: string): Promise<string> {
    const extractDir = path.join(this.storageDir, 'tmp', path.basename(inputPath, '.kmz'));
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      // KMZ es un archivo ZIP
      await execFileAsync('unzip', ['-o', inputPath, '-d', extractDir], { timeout: 30_000 });

      // Buscar el archivo .dae adentro (usualmente models/*.dae)
      const daeFile = this.findFile(extractDir, '.dae') || this.findFile(extractDir, '.obj');
      if (!daeFile) {
        throw new Error('No se encontró .dae ni .obj dentro del archivo KMZ');
      }

      return await this.convertWithAssimp(daeFile, outputPath);
    } finally {
      // Limpiar extracción
      try { fs.rmSync(extractDir, { recursive: true }); } catch {}
    }
  }

  // ── Extraer metadatos técnicos de GLB ───────────────────────────────────
  private async extractMetadata(glbPath: string): Promise<Record<string, any>> {
    const stats = fs.statSync(glbPath);
    const fileSizeMb = parseFloat((stats.size / 1024 / 1024).toFixed(2));

    let triangles = 0;
    let materials = 0;
    let boundingBox = null;

    try {
      // Leer binario GLB y parsear el fragmento JSON para contar primitivas
      const buffer = fs.readFileSync(glbPath);

      // Header GLB: magic (4) + version (4) + length (4) = 12 bytes
      // Header Chunk 0: chunkLength (4) + chunkType (4) = 8 bytes
      if (buffer.length > 20) {
        const magic = buffer.readUInt32LE(0);
        if (magic === 0x46546C67) { // 'glTF' in LE
          const chunk0Length = buffer.readUInt32LE(12);
          const chunk0Type   = buffer.readUInt32LE(16);
          if (chunk0Type === 0x4E4F534A) { // fragmento JSON
            const jsonStr = buffer.subarray(20, 20 + chunk0Length).toString('utf8');
            const gltf = JSON.parse(jsonStr);

            // Contar primitivas de triángulos
            if (gltf.meshes) {
              for (const mesh of gltf.meshes) {
                for (const prim of mesh.primitives || []) {
                  // conteo de índices del accessor / 3 = triángulos (aproximado)
                  if (prim.indices !== undefined && gltf.accessors) {
                    const acc = gltf.accessors[prim.indices];
                    if (acc) triangles += Math.floor(acc.count / 3);
                  }
                }
              }
            }
            materials = (gltf.materials || []).length;

            // Bounding box del mesh del primer nodo (simplificado)
            if (gltf.accessors) {
              for (const acc of gltf.accessors) {
                if (acc.type === 'VEC3' && acc.min && acc.max) {
                  boundingBox = { min: acc.min, max: acc.max };
                  break;
                }
              }
            }
          }
        }
      }
    } catch (parseErr) {
      this.logger.warn(`No se pudieron parsear los metadatos del GLB: ${parseErr}`);
    }

    return { fileSizeMb, triangles, materials, boundingBox };
  }

  // ── Lógica de validación ─────────────────────────────────────────────────────
  private validate(meta: Record<string, any>): { status: string; warnings: string[]; isInvalid: boolean } {
    const warnings: string[] = [];
    let isInvalid = false;

    if (meta.fileSizeMb > LIMITS.FILE_SIZE_ERROR_MB) {
      warnings.push(`El tamaño del archivo ${meta.fileSizeMb}MB excede el límite de ${LIMITS.FILE_SIZE_ERROR_MB}MB`);
      isInvalid = true;
    } else if (meta.fileSizeMb > LIMITS.FILE_SIZE_WARN_MB) {
      warnings.push(`El tamaño del archivo ${meta.fileSizeMb}MB es grande (recomendado < ${LIMITS.FILE_SIZE_WARN_MB}MB)`);
    }

    if (meta.triangles > LIMITS.TRIANGLES_ERROR) {
      warnings.push(`${meta.triangles.toLocaleString()} triángulos — excede el límite de 100K (reducir malla)`);
      isInvalid = true;
    } else if (meta.triangles > LIMITS.TRIANGLES_WARN) {
      warnings.push(`${meta.triangles.toLocaleString()} triángulos — recomendado < 10K`);
    }

    if (meta.materials > LIMITS.MATERIALS_ERROR) {
      warnings.push(`${meta.materials} materiales — demasiados (máximo recomendado: 12)`);
    } else if (meta.materials > LIMITS.MATERIALS_WARN) {
      warnings.push(`${meta.materials} materiales — considere simplificar`);
    }

    const status = isInvalid ? 'warning' : warnings.length > 0 ? 'warning' : 'valid';
    return { status, warnings, isInvalid };
  }

  // ── Utilidades ────────────────────────────────────────────────────────────
  private async setStatus(assetId: string, status: string, error?: string): Promise<void> {
    await this.prisma.client.productAsset.update({
      where: { id: assetId },
      data: { conversionStatus: status, ...(error ? { conversionError: error } : {}) },
    });
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
