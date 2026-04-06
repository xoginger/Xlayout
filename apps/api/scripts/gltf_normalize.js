// Creado y diseñado por XO
const { NodeIO, Logger } = require('@gltf-transform/core');
const { KHRDracoMeshCompression } = require('@gltf-transform/extensions');
const { getBounds, flatten, join, dedup, prune, weld } = require('@gltf-transform/functions');
const draco3d = require('draco3d');
const fs = require('fs');

async function main() {
    const inputPath = process.argv[2];
    const outputPath = process.argv[3];
    const forceUnit = process.argv[4]; // Opcional: 'mm', 'cm', 'm', 'in'
    
    if (!inputPath || !outputPath) {
        console.error("Uso: node gltf_normalize.js <input.glb> <output.glb> [forceUnit]");
        process.exit(1);
    }
    
    if (!fs.existsSync(inputPath)) {
        console.error(`Error: El archivo de entrada no existe -> ${inputPath}`);
        process.exit(1);
    }
    
    try {
        // Configurar IO con soporte Draco para leer GLBs comprimidos
        const io = new NodeIO()
            .registerExtensions([KHRDracoMeshCompression])
            .registerDependencies({
                'draco3d.decoder': await draco3d.createDecoderModule(),
                'draco3d.encoder': await draco3d.createEncoderModule(),
            });
        const document = await io.read(inputPath);
        
        // ── Paso 1: Obtener Bounding Box global de la escena ──────────────
        const scene = document.getRoot().getDefaultScene() || document.getRoot().listScenes()[0];
        if (!scene) {
            throw new Error("El archivo no tiene escena válida");
        }
        
        const bbox = getBounds(scene);
        const width = bbox.max[0] - bbox.min[0];
        const height = bbox.max[1] - bbox.min[1];
        const depth = bbox.max[2] - bbox.min[2];
        const maxDim = Math.max(width, height, depth);
        
        let scale = 1.0;
        let detectedUnit = 'm';
        
        // ── Paso 2: Inferencia de Unidad o Fuerza Manual ──────────────────
        if (forceUnit) {
            detectedUnit = forceUnit;
            if (forceUnit === 'mm') scale = 0.001;
            else if (forceUnit === 'cm') scale = 0.01;
            else if (forceUnit === 'in') scale = 0.0254;
            else if (forceUnit === 'm') scale = 1.0;
        } else {
            // Heurística automática
            if (maxDim > 500) {
                scale = 0.001;
                detectedUnit = 'mm';
            } else if (maxDim > 5 && maxDim <= 500) {
                scale = 0.01;
                detectedUnit = 'cm';
            }
        }
        
        let normalized = false;
        
        // ── Paso 3: Aplicar BAKE de escala a los vértices y translations ──
        if (scale !== 1.0) {
            const scaledAccessors = new Set();
            
            // 3a. Escalar vértices físicamente
            for (const mesh of document.getRoot().listMeshes()) {
                for (const prim of mesh.listPrimitives()) {
                    const posAccessor = prim.getAttribute('POSITION');
                    if (posAccessor && !scaledAccessors.has(posAccessor)) {
                        const arr = posAccessor.getArray();
                        for (let i = 0; i < arr.length; i++) {
                            arr[i] *= scale;
                        }
                        posAccessor.setArray(arr);
                        scaledAccessors.add(posAccessor);
                    }
                }
            }
            
            // 3b. Escalar Translation de nodos
            for (const node of document.getRoot().listNodes()) {
                const t = node.getTranslation();
                if (t[0] !== 0 || t[1] !== 0 || t[2] !== 0) {
                    node.setTranslation([t[0] * scale, t[1] * scale, t[2] * scale]);
                }
            }
            
            normalized = true;
        }
        
        // ── Paso 4: Optimización de meshes — Reducir draw calls ───────────
        // Contar meshes antes de optimizar
        const meshCountBefore = document.getRoot().listMeshes().length;
        const nodeCountBefore = document.getRoot().listNodes().length;
        
        // Solo aplicar merge si el modelo tiene muchas meshes (umbral: >20)
        // Esto evita tocar modelos ya optimizados innecesariamente
        let meshMerged = false;
        if (meshCountBefore > 20) {
            // Descomprimir Draco antes de merge (join requiere geometría decodificada)
            // Draco se re-aplica después por gltf-pipeline en el paso de optimización
            const dracoExt = document.getRoot().listExtensionsUsed()
                .find(ext => ext.extensionName === 'KHR_draco_mesh_compression');
            if (dracoExt) dracoExt.dispose();
            
            // Silenciar logs de gltf-transform para no contaminar stdout con JSON
            document.setLogger(new Logger(Logger.Verbosity.SILENT));
            
            // 4a. Flatten: colapsar jerarquía de nodos, bake transforms en vértices
            await document.transform(flatten());
            
            // 4b. Join: fusionar meshes que comparten el mismo material en una sola
            await document.transform(join());
            
            // 4c. Weld: unificar vértices duplicados en bordes compartidos
            await document.transform(weld({ tolerance: 0.0001 }));
            
            // 4d. Dedup: eliminar accessors y buffers duplicados
            await document.transform(dedup());
            
            // 4e. Prune: eliminar nodos, materiales y texturas huérfanos
            await document.transform(prune());
            
            meshMerged = true;
        }
        
        const meshCountAfter = document.getRoot().listMeshes().length;
        const nodeCountAfter = document.getRoot().listNodes().length;
        
        // ── Paso 5: Escribir archivo de salida ────────────────────────────
        await io.write(outputPath, document);
        
        // ── Paso 6: Devolver JSON con métricas ────────────────────────────
        const response = {
            normalized,
            detectedUnit,
            scaleApplied: scale,
            originalMaxDim: maxDim,
            finalMaxDim: maxDim * scale,
            // Métricas de optimización de meshes
            meshMerged,
            meshCountBefore,
            meshCountAfter,
            nodeCountBefore,
            nodeCountAfter,
            drawCallReduction: meshMerged 
                ? `${meshCountBefore} → ${meshCountAfter} (-${((1 - meshCountAfter / meshCountBefore) * 100).toFixed(0)}%)`
                : 'N/A (ya optimizado)'
        };
        
        console.log(JSON.stringify(response));
        process.exit(0);
        
    } catch (err) {
        console.error("Error procesando GLTF en normalización:", err.message);
        process.exit(2);
    }
}

main();

