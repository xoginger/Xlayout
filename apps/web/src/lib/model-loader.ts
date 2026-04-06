/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * ModelLoader — Singleton profesional de carga de modelos 3D
 *
 * Funcionalidades:
 * - GLTFLoader + DRACOLoader preconfigurado
 * - Caché LRU con conteo de referencias
 * - Preload paralelo con concurrencia configurable
 * - Dispose granular (geometrías, texturas, materiales)
 * - Métricas de rendimiento (hits, misses, memoria estimada)
 *
 * Uso:
 *   const loader = ModelLoader.getInstance();
 *   const gltf = await loader.load(url);
 *   loader.release(url); // decrementa ref count
 * ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ── Configuración ──────────────────────────────────────────────────
/** Máximo de modelos en caché antes de expulsar los menos usados */
const MAX_CACHE_SIZE = 50;
/** Máximo de descargas simultáneas durante preload */
const MAX_CONCURRENT_LOADS = 3;
/** CDN pública de Google para decoders Draco (WASM) */
const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

// ── Tipos internos ─────────────────────────────────────────────────
interface CacheEntry {
  /** El resultado GLTF parseado */
  gltf: GLTF;
  /** Número de SceneItems que referencian este modelo */
  refCount: number;
  /** Última vez que se accedió (para LRU) */
  lastAccess: number;
  /** Tamaño estimado en bytes (heurístico) */
  estimatedBytes: number;
}

export interface ModelLoaderMetrics {
  /** Modelos actualmente en caché */
  cachedCount: number;
  /** Total de hits de caché */
  hits: number;
  /** Total de misses (cargas nuevas) */
  misses: number;
  /** Memoria estimada total en MB */
  estimatedMemoryMB: number;
  /** URLs actualmente en descarga */
  loadingCount: number;
}

export interface PreloadProgress {
  /** Total de URLs a precargar */
  total: number;
  /** URLs completadas */
  loaded: number;
  /** URLs que fallaron */
  failed: number;
}

// ── Callbacks para progreso ────────────────────────────────────────
type PreloadCallback = (progress: PreloadProgress) => void;

// ═══════════════════════════════════════════════════════════════════
// Clase principal
// ═══════════════════════════════════════════════════════════════════
export class ModelLoader {
  private static instance: ModelLoader | null = null;

  private readonly gltfLoader: GLTFLoader;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly loading = new Map<string, Promise<GLTF>>();

  // Métricas
  private hits = 0;
  private misses = 0;

  private constructor() {
    // Configurar GLTFLoader con Draco decoder
    this.gltfLoader = new GLTFLoader();

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    dracoLoader.setDecoderConfig({ type: 'js' }); // Fallback JS si WASM no disponible
    dracoLoader.preload(); // Pre-descargar los decoders

    this.gltfLoader.setDRACOLoader(dracoLoader);
  }

  /** Obtener la instancia única del loader */
  static getInstance(): ModelLoader {
    if (!ModelLoader.instance) {
      ModelLoader.instance = new ModelLoader();
    }
    return ModelLoader.instance;
  }

  /**
   * Cargar un modelo GLB/GLTF con caché y Draco support.
   * Incrementa automáticamente el refCount.
   */
  async load(url: string): Promise<GLTF> {
    // ── Hit de caché ──
    const cached = this.cache.get(url);
    if (cached) {
      cached.refCount++;
      cached.lastAccess = Date.now();
      this.hits++;
      return cached.gltf;
    }

    // ── Ya se está cargando (dedup) ──
    const inflight = this.loading.get(url);
    if (inflight) {
      this.hits++;
      const gltf = await inflight;
      // Incrementar ref después de resolver
      const entry = this.cache.get(url);
      if (entry) entry.refCount++;
      return gltf;
    }

    // ── Miss: nueva carga ──
    this.misses++;
    const loadPromise = this.fetchAndParse(url);
    this.loading.set(url, loadPromise);

    try {
      const gltf = await loadPromise;
      const estimatedBytes = this.estimateSize(gltf);

      // Insertar en caché
      this.cache.set(url, {
        gltf,
        refCount: 1,
        lastAccess: Date.now(),
        estimatedBytes,
      });

      // Verificar si necesitamos expulsar entradas
      this.evictIfNeeded();

      return gltf;
    } finally {
      this.loading.delete(url);
    }
  }

  /**
   * Decrementar el refCount de un modelo.
   * No lo elimina del caché inmediatamente — sobrevive para potencial reuso.
   */
  release(url: string): void {
    const entry = this.cache.get(url);
    if (entry && entry.refCount > 0) {
      entry.refCount--;
    }
  }

  /**
   * Pre-descargar múltiples modelos en paralelo.
   * Los modelos se cargan al caché sin incrementar refCount (preload puro).
   */
  async preload(urls: string[], onProgress?: PreloadCallback): Promise<void> {
    const uniqueUrls = [...new Set(urls)].filter(u => !this.cache.has(u));

    if (uniqueUrls.length === 0) {
      onProgress?.({ total: urls.length, loaded: urls.length, failed: 0 });
      return;
    }

    const progress: PreloadProgress = {
      total: uniqueUrls.length,
      loaded: 0,
      failed: 0,
    };

    // Cola de concurrencia limitada
    const queue = [...uniqueUrls];
    const workers: Promise<void>[] = [];

    const processNext = async (): Promise<void> => {
      while (queue.length > 0) {
        const url = queue.shift()!;
        try {
          await this.load(url);
          // Preload: descontar la referencia que load() incrementó
          this.release(url);
          progress.loaded++;
        } catch {
          progress.failed++;
        }
        onProgress?.(progress);
      }
    };

    // Lanzar N workers concurrentes
    const concurrency = Math.min(MAX_CONCURRENT_LOADS, uniqueUrls.length);
    for (let i = 0; i < concurrency; i++) {
      workers.push(processNext());
    }

    await Promise.all(workers);
  }

  /** Obtener métricas actuales del caché */
  getMetrics(): ModelLoaderMetrics {
    let totalBytes = 0;
    for (const entry of this.cache.values()) {
      totalBytes += entry.estimatedBytes;
    }
    return {
      cachedCount: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      estimatedMemoryMB: parseFloat((totalBytes / (1024 * 1024)).toFixed(2)),
      loadingCount: this.loading.size,
    };
  }

  /** Verificar si un URL está en caché */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /** Verificar si un URL está siendo cargado */
  isLoading(url: string): boolean {
    return this.loading.has(url);
  }

  /**
   * Disponer completamente un modelo del caché.
   * Libera geometrías, materiales y texturas de GPU.
   */
  dispose(url: string): void {
    const entry = this.cache.get(url);
    if (!entry) return;

    this.disposeScene(entry.gltf.scene);
    this.cache.delete(url);
  }

  /** Limpiar todo el caché — útil al cerrar el editor */
  disposeAll(): void {
    for (const [url] of this.cache) {
      this.dispose(url);
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // ── Privados ─────────────────────────────────────────────────────

  /** Cargar y parsear un GLB/GLTF */
  private fetchAndParse(url: string): Promise<GLTF> {
    return new Promise<GLTF>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        undefined, // onProgress — manejado externamente
        (error) => {
          console.error(`[ModelLoader] Error cargando ${url}:`, error);
          reject(error);
        },
      );
    });
  }

  /** Expulsar modelos LRU si el caché excede el límite */
  private evictIfNeeded(): void {
    if (this.cache.size <= MAX_CACHE_SIZE) return;

    // Ordenar por (refCount ASC, lastAccess ASC) — expulsar los sin referencias y más viejos
    const entries = [...this.cache.entries()]
      .sort((a, b) => {
        // Prioridad: primero los que no tienen referencias
        if (a[1].refCount !== b[1].refCount) return a[1].refCount - b[1].refCount;
        // Empate: el más viejo primero
        return a[1].lastAccess - b[1].lastAccess;
      });

    // Expulsar hasta llegar al 80% del límite
    const target = Math.floor(MAX_CACHE_SIZE * 0.8);
    let toRemove = this.cache.size - target;

    for (const [url, entry] of entries) {
      if (toRemove <= 0) break;
      // No expulsar modelos con referencias activas
      if (entry.refCount > 0) continue;
      this.disposeScene(entry.gltf.scene);
      this.cache.delete(url);
      toRemove--;
    }
  }

  /** Estimar tamaño en bytes de un modelo GLTF parseado */
  private estimateSize(gltf: GLTF): number {
    let bytes = 0;

    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geo = mesh.geometry;

        // Sumar tamaño de todos los atributos de geometría
        if (geo.attributes) {
          for (const attrName of Object.keys(geo.attributes)) {
            const attr = geo.attributes[attrName];
            if (attr?.array) {
              bytes += (attr.array as ArrayLike<number>).length * 4; // Float32 = 4 bytes
            }
          }
        }

        // Sumar tamaño de índice
        if (geo.index?.array) {
          bytes += (geo.index.array as ArrayLike<number>).length * 2; // Uint16 = 2 bytes
        }

        // Sumar texturas (heurístico: width * height * 4 RGBA)
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat?.map) {
          const img = mat.map.image as { width?: number; height?: number } | undefined;
          if (img) bytes += (img.width || 256) * (img.height || 256) * 4;
        }
      }
    });

    // Mínimo 10KB para modelos muy pequeños
    return Math.max(bytes, 10240);
  }

  /** Disponer recursivamente una escena Three.js */
  private disposeScene(root: THREE.Object3D): void {
    root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;

        // Geometría
        mesh.geometry?.dispose();

        // Material(es)
        const materials = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        for (const mat of materials) {
          if (!mat) continue;
          // Disponer todas las texturas del material
          const stdMat = mat as THREE.MeshStandardMaterial;
          stdMat.map?.dispose();
          stdMat.normalMap?.dispose();
          stdMat.roughnessMap?.dispose();
          stdMat.metalnessMap?.dispose();
          stdMat.aoMap?.dispose();
          stdMat.emissiveMap?.dispose();
          stdMat.alphaMap?.dispose();
          mat.dispose();
        }
      }
    });
  }
}
