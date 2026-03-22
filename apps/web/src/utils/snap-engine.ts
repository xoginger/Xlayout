/**
 * Creado y diseñado por XO
 */

import * as THREE from 'three';
import { SceneItem, SnapPoint } from '@/store/editor-store';

export interface SnapResult {
  movingSnapPoint: SnapPoint;
  targetItem: SceneItem;
  targetSnapPoint: SnapPoint;
  distance: number;
  snappedPosition: [number, number, number];
  snappedRotation: [number, number, number];
}

/**
 * Calcula la posición mundial y la normal para un punto de snap.
 */
export function getSnapPointWorld(item: SceneItem, sp: SnapPoint) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3(...item.position);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...item.rotation));
  const scale = new THREE.Vector3(...item.scale);
  
  matrix.compose(position, quaternion, scale);

  const worldPos = new THREE.Vector3(...sp.localPosition).applyMatrix4(matrix);
  const worldNormal = new THREE.Vector3(...sp.normal).applyQuaternion(quaternion).normalize();

  return { worldPos, worldNormal };
}

/**
 * Detecta si un objeto en movimiento puede hacer snap a cualquier otro objeto en la escena.
 */
export function findModularSnap(
  movingItem: SceneItem, 
  otherItems: SceneItem[], 
  threshold: number = 0.3
): SnapResult | null {
  if (!movingItem.snapPoints || movingItem.snapPoints.length === 0) return null;

  let bestSnap: SnapResult | null = null;
  let minDistance = threshold;

  for (const targetItem of otherItems) {
    if (targetItem.id === movingItem.id) continue;
    if (!targetItem.snapPoints || targetItem.snapPoints.length === 0) continue;

    for (const msp of movingItem.snapPoints) {
      const mWorld = getSnapPointWorld(movingItem, msp);

      for (const tsp of targetItem.snapPoints) {
        // Verificación de compatibilidad
        if (msp.type !== tsp.type) continue;
        
        const tWorld = getSnapPointWorld(targetItem, tsp);
        const dist = mWorld.worldPos.distanceTo(tWorld.worldPos);

        if (dist < minDistance) {
          minDistance = dist;
          
          // Calcula la posición requerida del objeto EN MOVIMIENTO de modo que msp se alinee exactamente con tsp.
          
          // The relative vector from item origin to msp in world space (unrotated/unscaled?)
          // No, easier: 
          // New Item Pos = targetSnapPointWorldPos - (mspLocalPos rotated/scaled)
          
          const mspLocalVec = new THREE.Vector3(...msp.localPosition).multiply(new THREE.Vector3(...movingItem.scale));
          mspLocalVec.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...movingItem.rotation)));
          
          const snappedPosVec = tWorld.worldPos.clone().sub(mspLocalVec);
          
          bestSnap = {
            movingSnapPoint: msp,
            targetItem,
            targetSnapPoint: tsp,
            distance: dist,
            snappedPosition: [snappedPosVec.x, snappedPosVec.y, snappedPosVec.z],
            snappedRotation: movingItem.rotation // For now we don't auto-rotate to align normals, but we could
          };
        }
      }
    }
  }

  return bestSnap;
}
