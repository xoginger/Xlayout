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
  'dwg',   // AutoCAD — via dwg2dxf + assimp
]);
const GLTF_FORMATS = new Set(['glb', 'gltf']);
// Formatos que requieren Blender headless para conversión
const BLENDER_FORMATS = new Set(['skp']);
const UNSUPPORTED = new Set<string>([]);

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
      } else if (originalFormat === 'dwg') {
        rawGlbPath = await this.convertDwg(originalFilePath, rawOutputPath);
      } else if (BLENDER_FORMATS.has(originalFormat)) {
        rawGlbPath = await this.convertSkp(originalFilePath, rawOutputPath);
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

      // ── Paso 1.5: Normalizar Escala, Unidad y Merge de Meshes ──────────
      let normalizationInfo: Record<string, any> = { normalized: false, error: 'Not attempted' };
      try {
        const normalizeArgs = ['/app/scripts/gltf_normalize.js', rawGlbPath, rawGlbPath];
        if (job.data.forceUnit) {
          normalizeArgs.push(job.data.forceUnit);
        }
        
        const { stdout } = await execFileAsync('node', normalizeArgs, {
          timeout: 180_000, // 3 min — merge de meshes puede tomar tiempo en modelos complejos
        });
        normalizationInfo = JSON.parse(stdout);
        if (normalizationInfo.normalized || job.data.forceUnit) {
          this.logger.log(`📏 Escala normalizada: detectado ${normalizationInfo.detectedUnit}, escala x${normalizationInfo.scaleApplied} (maxDim original: ${normalizationInfo.originalMaxDim.toFixed(2)})`);
        } else {
          this.logger.log(`📏 Escala mantenida: detectado ${normalizationInfo.detectedUnit} (maxDim: ${normalizationInfo.originalMaxDim.toFixed(2)})`);
        }
        // Registrar optimización de meshes
        if (normalizationInfo.meshMerged) {
          this.logger.log(`🔧 Meshes optimizadas: ${normalizationInfo.drawCallReduction}`);
        }
      } catch (normErr: any) {
        this.logger.warn(`⚠️ Fallo al normalizar escala: ${normErr.message}`);
        normalizationInfo = { normalized: false, error: normErr.message };
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
        // Escala / Normalización
        normalization: normalizationInfo,
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
  
  // ── DWG: dwg2dxf → [assimp | python3 ezdxf → STL → assimp] → GLB ───────────
  // Pipeline con fallback: si assimp no puede procesar el DXF (e.g. 3DSOLID sin
  // 3DFACE), se usa ezdxf para teselar las entidades ACIS y generar un STL
  // intermedio que assimp sí puede exportar a GLB.
  private async convertDwg(inputPath: string, outputPath: string): Promise<string> {
    const tmpDxfPath = outputPath.replace('.glb', '_dwg.dxf');
    const tmpStlPath = outputPath.replace('.glb', '_dwg.stl');
    this.logger.log(`🏗️  Iniciando pipeline DWG: ${path.basename(inputPath)}`);

    try {
      // ── Paso 1: DWG → DXF usando LibreDWG ────────────────────────────────
      // Se omite -m (--minimal) porque elimina entidades 3D.
      // Se usa -y para sobreescribir archivos anteriores.
      // dwg2dxf puede devolver exit code != 0 pero generar DXF igualmente.
      try {
        await execFileAsync(
          'dwg2dxf',
          ['-y', '-o', tmpDxfPath, inputPath],
          { timeout: 120_000 },
        );
      } catch (dwgErr: any) {
        // Algunas versiones de DWG retornan exit != 0 pero generan el archivo
        this.logger.warn(`dwg2dxf terminó con código de error pero puede haber generado DXF: ${(dwgErr.message || '').substring(0, 150)}`);
      }

      // Verificar si el DXF fue generado
      let dxfResult: string;
      if (fs.existsSync(tmpDxfPath) && fs.statSync(tmpDxfPath).size > 0) {
        dxfResult = tmpDxfPath;
      } else {
        // dwg2dxf a veces ignora -o y genera el DXF junto al DWG de entrada
        const dwgDir = path.dirname(inputPath);
        const dwgBase = path.basename(inputPath, path.extname(inputPath));
        const fallbackDxf = path.join(dwgDir, `${dwgBase}.dxf`);
        if (fs.existsSync(fallbackDxf) && fs.statSync(fallbackDxf).size > 0) {
          this.logger.log(`📁 DXF encontrado en ubicación alternativa: ${path.basename(fallbackDxf)}`);
          fs.copyFileSync(fallbackDxf, tmpDxfPath);
          try { fs.unlinkSync(fallbackDxf); } catch {}
          dxfResult = tmpDxfPath;
        } else {
          throw new Error(
            'dwg2dxf no generó un archivo DXF. Verifica que el archivo DWG no esté corrupto, ' +
            'sea una versión compatible (R12–R2013) y no esté protegido con contraseña.'
          );
        }
      }

      const dxfSize = (fs.statSync(dxfResult).size / 1024).toFixed(1);
      this.logger.log(`✅ DXF intermedio: ${dxfSize} KB — ${path.basename(dxfResult)}`);

      // ── Paso 2a: Intentar DXF → GLB directamente con assimp ──────────────
      let glbPath: string;
      try {
        glbPath = await this.convertWithAssimp(dxfResult, outputPath);
        // Verificar que produjo geometría real (assimp puede generar GLB vacío)
        const quickMeta = await this.extractMetadata(glbPath);
        if (quickMeta.triangles === 0) {
          throw new Error('assimp generó GLB sin triángulos — probable DXF con solo 3DSOLID');
        }
        this.logger.log(`✅ Assimp procesó DXF directamente`);
      } catch (assimpErr: any) {
        // ── Paso 2b: Fallback — ezdxf para extraer 3DFACE/MESH/POLYFACE ────
        // assimp no soporta 3DSOLID en DXF, solo 3DFACE y POLYLINE mesh.
        // ezdxf puede teselar 3DSOLID con caras planas (poliedros).
        this.logger.warn(`Assimp no pudo procesar DXF: ${(assimpErr.message || '').substring(0, 120)}`);
        this.logger.log(`🔄 Fallback: ezdxf → STL → assimp`);

        try {
          await execFileAsync(
            'python3',
            ['/app/scripts/dwg_tessellate.py', dxfResult, tmpStlPath],
            { timeout: 120_000 },
          );
        } catch (pyErr: any) {
          const pyStderr = pyErr.stderr || pyErr.message || '';
          // Error descriptivo: el DWG tiene 3DSOLID con superficies curvas ACIS
          if (pyStderr.includes('ERROR_SIN_GEOMETRIA') || pyStderr.includes('superficies curvas')) {
            throw new Error(
              'El archivo DWG contiene sólidos 3D (3DSOLID) con superficies curvas en formato ACIS ' +
              'que no se pueden convertir automáticamente en el servidor. ' +
              'Para subir este modelo, expórtalo primero como OBJ, STL o FBX ' +
              'directamente desde AutoCAD, BricsCAD, Fusion360 o la herramienta CAD de origen.'
            );
          }
          this.logger.warn(`ezdxf no pudo teselar: ${pyStderr.substring(0, 150)}`);
        }

        // Verificar que se generó el STL
        if (!fs.existsSync(tmpStlPath) || fs.statSync(tmpStlPath).size === 0) {
          throw new Error(
            'El archivo DWG no se pudo convertir automáticamente. ' +
            'Esto ocurre cuando el DWG contiene sólidos ACIS con superficies curvas ' +
            'que requieren un motor CAD propietario para teselar. ' +
            'Solución: exportar el modelo como OBJ, STL o FBX ' +
            'directamente desde AutoCAD, BricsCAD o Fusion360.'
          );
        }

        const stlSize = (fs.statSync(tmpStlPath).size / 1024).toFixed(1);
        this.logger.log(`✅ STL intermedio generado: ${stlSize} KB`);

        // Convertir STL → GLB con assimp
        glbPath = await this.convertWithAssimp(tmpStlPath, outputPath);
        this.logger.log(`✅ Pipeline DWG completado con fallback ezdxf`);
      }

      // ── Paso 3: Validar geometría 3D real ────────────────────────────────
      const meta = await this.extractMetadata(glbPath);
      if (meta.triangles === 0) {
        throw new Error(
          'El archivo DWG no contiene geometría 3D válida (triángulos detectados = 0). ' +
          'El archivo puede ser un plano 2D, estar vacío, o contener solo líneas/texto sin sólidos. ' +
          'Exportar como OBJ o FBX directamente desde la herramienta CAD si el modelo contiene geometría 3D.'
        );
      }

      this.logger.log(`✅ Pipeline DWG completado: ${meta.triangles} triángulos | bbox=${!!meta.boundingBox}`);
      return glbPath;

    } catch (err: any) {
      const msg = err.message || '';
      // Re-lanzar errores de validación de negocio directamente sin envolver
      if (
        msg.includes('triángulos detectados = 0') ||
        msg.includes('geometría 3D') ||
        msg.includes('dwg2dxf no generó') ||
        msg.includes('no produjo geometría') ||
        msg.includes('superficies curvas') ||
        msg.includes('Teselación Python')
      ) {
        throw err;
      }
      throw new Error(`Pipeline DWG → GLB falló: ${msg}`);
    } finally {
      // Limpiar archivos temporales sin importar el resultado
      this.cleanupTempFile(tmpDxfPath);
      this.cleanupTempFile(tmpStlPath);
    }
  }

  // ── SKP: Blender headless + addon SketchUp Importer → GLB ─────────────────
  // Pipeline: SKP → Blender (import vía addon) → export GLB directo
  // El script skp_convert.py maneja la importación y validación dentro de Blender.
  private async convertSkp(inputPath: string, outputPath: string): Promise<string> {
    this.logger.log(`🔷 Iniciando pipeline SKP (Blender headless): ${path.basename(inputPath)}`);

    try {
      // Ejecutar Blender en modo background con el script de conversión
      const { stdout, stderr } = await execFileAsync('blender', [
        '--background',
        '--python', '/app/scripts/skp_convert.py',
        '--', inputPath, outputPath,
      ], {
        timeout: 180_000, // 3 minutos — modelos SKP complejos pueden tardar
      });

      // Buscar resultado JSON en la salida de Blender
      const resultLine = stdout.split('\n').find((l: string) => l.startsWith('SKP_RESULT:'));
      let skpResult: any = null;

      if (resultLine) {
        try {
          skpResult = JSON.parse(resultLine.replace('SKP_RESULT:', ''));
        } catch {
          this.logger.warn('No se pudo parsear resultado JSON del script SKP');
        }
      }

      // Verificar resultado del script
      if (skpResult && !skpResult.success) {
        throw new Error(skpResult.error || 'Error desconocido en conversión SKP');
      }

      // Verificar que el GLB fue generado
      if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
        // Intentar extraer error de stderr si el script falló sin JSON
        const stderrClean = (stderr || '').substring(0, 300);
        throw new Error(
          'Blender no generó el archivo GLB de salida. ' +
          (stderrClean ? `Detalle: ${stderrClean}` : 'El modelo SKP puede estar corrupto o vacío.')
        );
      }

      // Log metadata del script si está disponible
      if (skpResult) {
        this.logger.log(
          `✅ SKP procesado: ${skpResult.triangles} triángulos, ` +
          `${skpResult.objects} objetos, Blender ${skpResult.blenderVersion || '?'}`
        );
      }

      return outputPath;

    } catch (err: any) {
      const msg = err.message || '';

      // Re-lanzar errores descriptivos de negocio directamente
      if (
        msg.includes('geometría 3D') ||
        msg.includes('no contiene') ||
        msg.includes('addon') ||
        msg.includes('SketchUp Importer') ||
        msg.includes('vacío') ||
        msg.includes('corrupto')
      ) {
        throw err;
      }

      // Error de timeout
      if (msg.includes('TIMEOUT') || msg.includes('timed out') || msg.includes('killed')) {
        throw new Error(
          'La conversión del modelo SketchUp excedió el tiempo límite (3 minutos). ' +
          'El archivo puede ser demasiado complejo. Simplifica el modelo o exporta como OBJ/FBX desde SketchUp.'
        );
      }

      throw new Error(
        `Pipeline SKP → GLB falló: ${msg.substring(0, 300)}. ` +
        'Si el error persiste, exporta el modelo como OBJ o FBX desde SketchUp.'
      );
    }
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
    if (format === 'skp' && !msg.includes('SKP') && !msg.includes('SketchUp')) {
      msg = `Error al convertir modelo SketchUp (.skp): ${msg}`;
    } else if (msg.includes('assimp')) {
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
    if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
    if (msg.includes('blender') || msg.includes('skp') || msg.includes('sketchup')) return 'skp_conversion';
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
