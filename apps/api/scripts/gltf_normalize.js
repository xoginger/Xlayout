// Creado y diseñado por XO
const { NodeIO } = require('@gltf-transform/core');
const { getBounds } = require('@gltf-transform/functions');
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
        const io = new NodeIO();
        const document = await io.read(inputPath);
        
        // 1. Obtener Bounding Box global de la escena
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
        
        // 2. Inferencia de Unidad o Fuerza Manual
        if (forceUnit) {
            detectedUnit = forceUnit;
            if (forceUnit === 'mm') scale = 0.001;
            else if (forceUnit === 'cm') scale = 0.01;
            else if (forceUnit === 'in') scale = 0.0254;
            else if (forceUnit === 'm') scale = 1.0;
            // Si es 'm', scale=1.0 intencionalmente para restaurar unidades nativas
        } else {
            // Lógica de heurística automática
            if (maxDim > 500) {
                scale = 0.001;
                detectedUnit = 'mm';
            } else if (maxDim > 5 && maxDim <= 500) {
                scale = 0.01;
                detectedUnit = 'cm';
            }
        }
        
        // Si hay una unidad forzada a 'm', obligamos la reconstrucción de vértices si la unidad forzada es m
        // en caso de que necesitemos revertir una compresión previa. Pero normalmente si scale es 1.0, 
        // podríamos omitirlo salvo que la malla viniese de un estado defectuoso. 
        // Para simplificar, si scale==1.0, no alteramos los vértices.
        let normalized = false;
        
        // 3. Aplicar BAKE de escala a los vértices y translations
        // (Esto garantiza que la escala queda impregnada en la malla y todos los engines lo interpretan igual)
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
                        posAccessor.setArray(arr); // setArray() actualiza datos y recalcula automáticamente min/max bounds
                        scaledAccessors.add(posAccessor);
                    }
                }
            }
            
            // 3b. Escalar Translation de todos los Nodos en la jerarquía
            for (const node of document.getRoot().listNodes()) {
                const t = node.getTranslation();
                if (t[0] !== 0 || t[1] !== 0 || t[2] !== 0) {
                    node.setTranslation([t[0] * scale, t[1] * scale, t[2] * scale]);
                }
            }
            
            normalized = true;
        }
        
        // 4. Escribir archivo de salida
        await io.write(outputPath, document);
        
        // 5. Devolver JSON como stdout para ser capturado por el proceso principal
        const response = {
            normalized,
            detectedUnit,
            scaleApplied: scale,
            originalMaxDim: maxDim,
            finalMaxDim: maxDim * scale
        };
        
        console.log(JSON.stringify(response));
        process.exit(0);
        
    } catch (err) {
        console.error("Error procesando GLTF en normalización:", err.message);
        process.exit(2);
    }
}

main();
