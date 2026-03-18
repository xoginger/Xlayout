import { Opening, Wall } from '@/store/editor-store';
import { getWallLength } from './wall-snap';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate that an opening can be placed on its referenced wall.
 */
export function validateOpeningPlacement(
  opening: Opening,
  walls: Wall[]
): ValidationResult {
  // Rule 1: Opening must reference an existing wall
  const wall = walls.find(w => w.id === opening.wallId);
  if (!wall) {
    return { valid: false, reason: 'Opening must be attached to a wall.' };
  }

  // Rule 2: Opening width cannot exceed wall length
  const wallLen = getWallLength(wall);
  if (opening.width > wallLen) {
    return { valid: false, reason: `Opening width (${opening.width.toFixed(2)}m) exceeds wall length (${wallLen.toFixed(2)}m).` };
  }

  // Rule 3: Offset keeps opening fully within wall bounds
  // The opening is centered at offset, so half-width must fit both sides
  const halfWidthRatio = (opening.width / 2) / wallLen;
  if (opening.offset - halfWidthRatio < -0.01) {
    return { valid: false, reason: 'Opening extends past the start of the wall.' };
  }
  if (opening.offset + halfWidthRatio > 1.01) {
    return { valid: false, reason: 'Opening extends past the end of the wall.' };
  }

  return { valid: true };
}
