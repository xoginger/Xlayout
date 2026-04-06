/**
 * Creado y diseñado por XO
 */

/* ═══════════════════════════════════════════════════════════════════
 * useOptimizedModel — Hook React para carga optimizada de modelos 3D
 *
 * Reemplaza useGLTF() de drei con:
 * - Decodificación Draco automática
 * - Caché LRU con gestión de memoria
 * - Ref counting para cleanup automático
 * - Suspense-compatible via use() pattern
 * ═══════════════════════════════════════════════════════════════════ */

'use client';

import { useState, useEffect, useRef } from 'react';
import { ModelLoader } from '@/lib/model-loader';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** Estado del hook */
interface ModelState {
  /** Resultado GLTF parseado (null durante la carga) */
  gltf: GLTF | null;
  /** Error si la carga falló */
  error: Error | null;
  /** En proceso de carga */
  loading: boolean;
}

/**
 * Hook para cargar modelos GLTF/GLB con soporte Draco y caché LRU.
 * 
 * A diferencia de useGLTF():
 * - Soporta Draco descompression (crítico para modelos del pipeline XLayout)
 * - Gestión de memoria con ref counting y dispose automático
 * - Métricas de rendimiento accesibles via ModelLoader.getMetrics()
 *
 * @param url URL del modelo GLB/GLTF
 * @returns { gltf, error, loading }
 */
export function useOptimizedModel(url: string | undefined): ModelState {
  const [state, setState] = useState<ModelState>({
    gltf: null,
    error: null,
    loading: !!url,
  });

  // Ref para trackear la URL activa y evitar race conditions
  const activeUrlRef = useRef<string | undefined>(url);

  useEffect(() => {
    activeUrlRef.current = url;

    if (!url) {
      setState({ gltf: null, error: null, loading: false });
      return;
    }

    const loader = ModelLoader.getInstance();

    // Si ya está en caché, resolver inmediatamente
    if (loader.has(url)) {
      loader.load(url).then((gltf) => {
        if (activeUrlRef.current === url) {
          setState({ gltf, error: null, loading: false });
        }
      });
      return;
    }

    // Carga asíncrona
    setState(prev => ({ ...prev, loading: true, error: null }));

    loader.load(url)
      .then((gltf) => {
        // Solo actualizar si la URL no cambió (evitar race condition)
        if (activeUrlRef.current === url) {
          setState({ gltf, error: null, loading: false });
        } else {
          // URL cambió mientras cargaba — liberar referencia
          loader.release(url);
        }
      })
      .catch((err) => {
        if (activeUrlRef.current === url) {
          setState({
            gltf: null,
            error: err instanceof Error ? err : new Error(String(err)),
            loading: false,
          });
        }
      });

    // Cleanup: liberar referencia al desmontar o cambiar URL
    return () => {
      loader.release(url);
    };
  }, [url]);

  return state;
}

/**
 * Hook Suspense-compatible que lanza una Promise si el modelo no está listo.
 * Requiere un <Suspense> boundary superior (ya existente en Viewport.tsx).
 *
 * @param url URL del modelo GLB/GLTF
 * @returns GLTF resultado (garantizado no-null porque Suspense captura la Promise)
 */
const suspenseCache = new Map<string, { promise: Promise<GLTF>; result?: GLTF; error?: Error }>();

export function useOptimizedModelSuspense(url: string): GLTF {
  let entry = suspenseCache.get(url);

  if (!entry) {
    const loader = ModelLoader.getInstance();
    const promise = loader.load(url).then(
      (gltf) => {
        const e = suspenseCache.get(url);
        if (e) e.result = gltf;
        return gltf;
      },
      (err) => {
        const e = suspenseCache.get(url);
        if (e) e.error = err instanceof Error ? err : new Error(String(err));
        throw err;
      },
    );
    entry = { promise };
    suspenseCache.set(url, entry);
  }

  // Si hay error, relanzar
  if (entry.error) throw entry.error;

  // Si hay resultado, retornar
  if (entry.result) return entry.result;

  // Si está pendiente, lanzar la Promise para que Suspense la capture
  throw entry.promise;
}

/**
 * Limpiar el caché de suspense (para hot reload o cambio de proyecto).
 */
export function clearSuspenseCache(): void {
  suspenseCache.clear();
}
