import { Wall } from '@/store/editor-store';

export interface WallSnapResult {
  wall: Wall;
  offset: number;        // 0.0 – 1.0 normalized along wall
  snappedPoint: [number, number, number];
  wallAngle: number;     // radians
}

/**
 * Get the angle of a wall in radians (XZ plane).
 */
export function getWallAngle(wall: Wall): number {
  return Math.atan2(
    wall.end[2] - wall.start[2],
    wall.end[0] - wall.start[0]
  );
}

/**
 * Get wall length in the XZ plane.
 */
export function getWallLength(wall: Wall): number {
  const dx = wall.end[0] - wall.start[0];
  const dz = wall.end[2] - wall.start[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Project a point onto a wall segment and return the
 * normalized offset (0..1) and the projected point.
 */
export function projectPointOnWall(
  wall: Wall,
  point: [number, number, number]
): { offset: number; projected: [number, number, number] } {
  const sx = wall.start[0], sz = wall.start[2];
  const ex = wall.end[0],   ez = wall.end[2];
  const px = point[0],      pz = point[2];

  const dx = ex - sx;
  const dz = ez - sz;
  const lenSq = dx * dx + dz * dz;

  if (lenSq === 0) {
    return { offset: 0, projected: [sx, 0, sz] };
  }

  // Parametric t on the infinite line
  let t = ((px - sx) * dx + (pz - sz) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));

  return {
    offset: t,
    projected: [sx + t * dx, 0, sz + t * dz]
  };
}

/**
 * Find the nearest wall within a distance threshold.
 * Returns null if no wall is close enough.
 */
export function findNearestWall(
  walls: Wall[],
  point: [number, number, number],
  threshold: number = 1.5
): WallSnapResult | null {
  let best: WallSnapResult | null = null;
  let bestDist = Infinity;

  for (const wall of walls) {
    const { offset, projected } = projectPointOnWall(wall, point);
    const dx = projected[0] - point[0];
    const dz = projected[2] - point[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < threshold && dist < bestDist) {
      bestDist = dist;
      best = {
        wall,
        offset,
        snappedPoint: projected,
        wallAngle: getWallAngle(wall),
      };
    }
  }

  return best;
}
