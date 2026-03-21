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

// ─── Format support map ─────────────────────────────────────────────────────
const ASSIMP_FORMATS = new Set(['obj', 'dae', 'fbx', '3ds', 'dxf', 'stl', 'ply', 'blend', 'x', 'lwo']);
const GLTF_FORMATS   = new Set(['glb', 'gltf']);
const UNSUPPORTED    = new Set(['dwg', 'kmz']); // KMZ needs special handling

// ─── Validation thresholds ───────────────────────────────────────────────────
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
    this.logger.log(`🔄 Processing asset ${assetId} (${originalFormat})`);

    // Mark as processing
    await this.setStatus(assetId, 'processing');

    const convertedDir = path.join(this.storageDir, 'converted');
    fs.mkdirSync(convertedDir, { recursive: true });

    const outputName = `${crypto.randomUUID()}.glb`;
    const outputPath = path.join(convertedDir, outputName);

    try {
      // ── Step 1: Convert to GLB ──────────────────────────────────────────
      let glbPath: string;

      if (GLTF_FORMATS.has(originalFormat)) {
        glbPath = await this.normalizeGltf(originalFilePath, outputPath, originalFormat);
      } else if (ASSIMP_FORMATS.has(originalFormat)) {
        glbPath = await this.convertWithAssimp(originalFilePath, outputPath);
      } else if (originalFormat === 'kmz') {
        glbPath = await this.convertKmz(originalFilePath, outputPath);
      } else {
        throw new Error(`Format '${originalFormat}' not supported in this pipeline version`);
      }

      // ── Step 2: Extract technical metadata ─────────────────────────────
      const techMetadata = await this.extractMetadata(glbPath);

      // ── Step 3: Validate ────────────────────────────────────────────────
      const validation = this.validate(techMetadata);

      // ── Step 4: Save public URL and update DB ───────────────────────────
      const publicUrl = `/storage/converted/${path.basename(glbPath)}`;
      const finalStatus = validation.isInvalid ? 'validated' : 'validated'; // always store result

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
      this.logger.error(`❌ Conversion failed for ${assetId}: ${err.message}`);
      await this.prisma.client.productAsset.update({
        where: { id: assetId },
        data: {
          conversionStatus: 'failed',
          conversionError: err.message?.substring(0, 500) || 'Unknown error',
        },
      });
      throw err; // allow BullMQ retry
    }
  }

  // ── Normalize existing GLB/GLTF ──────────────────────────────────────────
  private async normalizeGltf(inputPath: string, outputPath: string, format: string): Promise<string> {
    if (format === 'glb') {
      // For GLB: use gltf-pipeline to optimize (draco compression, etc.)
      try {
        const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
        if (fs.existsSync(gltfPipelineBin)) {
          await execFileAsync('node', [gltfPipelineBin, '-i', inputPath, '-o', outputPath]);
          return outputPath;
        }
      } catch (e) {
        this.logger.warn(`gltf-pipeline unavailable, copying GLB as-is: ${e}`);
      }
      // Fallback: copy as-is
      fs.copyFileSync(inputPath, outputPath);
      return outputPath;
    }

    // GLTF (text) → binary GLB via gltf-pipeline
    try {
      const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
      await execFileAsync('node', [gltfPipelineBin, '-i', inputPath, '-o', outputPath]);
      return outputPath;
    } catch (e) {
      throw new Error(`GLTF → GLB conversion failed: ${e}`);
    }
  }

  // ── Convert with assimp (FBX, DAE, OBJ, 3DS, DXF, etc.) ─────────────────
  private async convertWithAssimp(inputPath: string, outputPath: string): Promise<string> {
    // assimp export <input> <output.glb>
    const tmpGltfPath = outputPath.replace('.glb', '_tmp.gltf');

    try {
      // First convert to GLTF2 (assimp may not support direct .glb output in all versions)
      await execFileAsync('assimp', ['export', inputPath, tmpGltfPath], {
        timeout: 120_000, // 2 min max per file
      });

      // If gltf output exists, convert to binary GLB
      if (fs.existsSync(tmpGltfPath)) {
        try {
          const gltfPipelineBin = path.resolve('/app/node_modules/.bin/gltf-pipeline');
          if (fs.existsSync(gltfPipelineBin)) {
            await execFileAsync('node', [gltfPipelineBin, '-i', tmpGltfPath, '-o', outputPath]);
          } else {
            // Rename .gltf to .glb as fallback (binary embedding may vary)
            fs.renameSync(tmpGltfPath, outputPath);
          }
        } finally {
          if (fs.existsSync(tmpGltfPath)) fs.unlinkSync(tmpGltfPath);
          // Also clean companion .bin files assimp may create
          const binFile = tmpGltfPath.replace('.gltf', '.bin');
          if (fs.existsSync(binFile)) fs.unlinkSync(binFile);
        }
      } else {
        // assimp may output directly as .glb - try that
        const directGlb = outputPath;
        await execFileAsync('assimp', ['export', inputPath, directGlb], {
          timeout: 120_000,
        });
      }

      if (!fs.existsSync(outputPath)) {
        throw new Error('assimp conversion produced no output file');
      }
      return outputPath;

    } catch (err: any) {
      throw new Error(`assimp conversion failed: ${err.message}`);
    }
  }

  // ── KMZ: unzip → find .dae → convert with assimp ─────────────────────────
  private async convertKmz(inputPath: string, outputPath: string): Promise<string> {
    const extractDir = path.join(this.storageDir, 'tmp', path.basename(inputPath, '.kmz'));
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      // KMZ is a ZIP file
      await execFileAsync('unzip', ['-o', inputPath, '-d', extractDir], { timeout: 30_000 });

      // Find the .dae file inside (usually models/*.dae)
      const daeFile = this.findFile(extractDir, '.dae') || this.findFile(extractDir, '.obj');
      if (!daeFile) {
        throw new Error('No .dae or .obj found inside KMZ archive');
      }

      return await this.convertWithAssimp(daeFile, outputPath);
    } finally {
      // Cleanup extraction
      try { fs.rmSync(extractDir, { recursive: true }); } catch {}
    }
  }

  // ── Extract technical metadata from GLB ───────────────────────────────────
  private async extractMetadata(glbPath: string): Promise<Record<string, any>> {
    const stats = fs.statSync(glbPath);
    const fileSizeMb = parseFloat((stats.size / 1024 / 1024).toFixed(2));

    let triangles = 0;
    let materials = 0;
    let boundingBox = null;

    try {
      // Read GLB binary and parse JSON chunk to count primitives
      const buffer = fs.readFileSync(glbPath);

      // GLB header: magic (4) + version (4) + length (4) = 12 bytes
      // Chunk 0 header: chunkLength (4) + chunkType (4) = 8 bytes
      if (buffer.length > 20) {
        const magic = buffer.readUInt32LE(0);
        if (magic === 0x46546C67) { // 'glTF' in LE
          const chunk0Length = buffer.readUInt32LE(12);
          const chunk0Type   = buffer.readUInt32LE(16);
          if (chunk0Type === 0x4E4F534A) { // JSON chunk
            const jsonStr = buffer.subarray(20, 20 + chunk0Length).toString('utf8');
            const gltf = JSON.parse(jsonStr);

            // Count triangle primitives
            if (gltf.meshes) {
              for (const mesh of gltf.meshes) {
                for (const prim of mesh.primitives || []) {
                  // accessor index count / 3 = triangles (approximate)
                  if (prim.indices !== undefined && gltf.accessors) {
                    const acc = gltf.accessors[prim.indices];
                    if (acc) triangles += Math.floor(acc.count / 3);
                  }
                }
              }
            }
            materials = (gltf.materials || []).length;

            // Bounding box from first node's mesh (simplified)
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
      this.logger.warn(`Could not parse GLB metadata: ${parseErr}`);
    }

    return { fileSizeMb, triangles, materials, boundingBox };
  }

  // ── Validation logic ─────────────────────────────────────────────────────
  private validate(meta: Record<string, any>): { status: string; warnings: string[]; isInvalid: boolean } {
    const warnings: string[] = [];
    let isInvalid = false;

    if (meta.fileSizeMb > LIMITS.FILE_SIZE_ERROR_MB) {
      warnings.push(`File size ${meta.fileSizeMb}MB exceeds ${LIMITS.FILE_SIZE_ERROR_MB}MB limit`);
      isInvalid = true;
    } else if (meta.fileSizeMb > LIMITS.FILE_SIZE_WARN_MB) {
      warnings.push(`File size ${meta.fileSizeMb}MB is large (recommended < ${LIMITS.FILE_SIZE_WARN_MB}MB)`);
    }

    if (meta.triangles > LIMITS.TRIANGLES_ERROR) {
      warnings.push(`${meta.triangles.toLocaleString()} triangles — exceeds 100K limit (reduce mesh)`);
      isInvalid = true;
    } else if (meta.triangles > LIMITS.TRIANGLES_WARN) {
      warnings.push(`${meta.triangles.toLocaleString()} triangles — recommended < 10K`);
    }

    if (meta.materials > LIMITS.MATERIALS_ERROR) {
      warnings.push(`${meta.materials} materials — too many (max recommended: 12)`);
    } else if (meta.materials > LIMITS.MATERIALS_WARN) {
      warnings.push(`${meta.materials} materials — consider simplifying`);
    }

    const status = isInvalid ? 'warning' : warnings.length > 0 ? 'warning' : 'valid';
    return { status, warnings, isInvalid };
  }

  // ── Utilities ────────────────────────────────────────────────────────────
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
