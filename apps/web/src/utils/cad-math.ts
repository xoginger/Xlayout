import type { SceneItemType } from '@/store/editor-store';

// ─── Floor Alignment Utilities ──────────────────────────────────────────────
// Every asset uses BoxGeometry whose center is the pivot.  
// To rest on Y=0 the position.y must equal half the box height.
// These values MUST match the BoxGeometry args in SceneItemObject (Viewport.tsx).
const ITEM_HALF_HEIGHTS: Record<SceneItemType | 'default', number> = {
  rack:          1.000,   // BoxGeometry [1, 2, 0.5]    → h/2 = 1.0
  shelf:         0.900,   // BoxGeometry [1, 1.8, 0.4]  → h/2 = 0.9
  desk:          0.375,   // BoxGeometry [1.5, 0.75, 0.8] → h/2 = 0.375
  cabinet:       0.600,   // BoxGeometry [0.8, 1.2, 0.6] → h/2 = 0.6
  'catalog-item': 0.500, // fallback — catalog items use their boundingBox.height
  default:       0.500,
};

/** Returns the Y position where the pivot must sit so the item base touches Y=0. */
export const getItemHalfHeight = (type: string): number =>
  ITEM_HALF_HEIGHTS[type as SceneItemType] ?? ITEM_HALF_HEIGHTS.default;

/** Returns the item with position.y adjusted so its base rests on Y=0. */
export const placeOnFloor = <T extends { type: string; position: [number, number, number] }>(
  item: T
): T => ({
  ...item,
  position: [item.position[0], getItemHalfHeight(item.type), item.position[2]] as [number, number, number],
});

/** Clamps an item's Y so it never drops below the floor. */
export const clampToFloor = <T extends { type: string; position: [number, number, number] }>(
  item: T
): T => {
  const minY = getItemHalfHeight(item.type);
  if (item.position[1] < minY) {
    return { ...item, position: [item.position[0], minY, item.position[2]] as [number, number, number] };
  }
  return item;
};

// ─── Grid Snapping ───────────────────────────────────────────────────────────
export const snapToGrid = (value: number, gridSize: number = 0.5): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPointToGrid = (point: [number, number, number], gridSize: number = 0.5): [number, number, number] => {
  return [
    snapToGrid(point[0], gridSize),
    snapToGrid(point[1], gridSize),
    snapToGrid(point[2], gridSize)
  ];
};

export const calculateDistance = (p1: [number, number, number], p2: [number, number, number]): number => {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

export const getWallAngle = (start: [number, number, number], end: [number, number, number]): number => {
  return Math.atan2(end[2] - start[2], end[0] - start[0]);
};

export const getWallCenter = (start: [number, number, number], end: [number, number, number]): [number, number, number] => {
  return [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2
  ];
};

export const getNearestPointOnSegment = (
  point: [number, number, number],
  start: [number, number, number],
  end: [number, number, number]
): [number, number, number] => {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return start;
  let t = ((point[0] - start[0]) * dx + (point[2] - start[2]) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return [start[0] + t * dx, 0, start[2] + t * dz];
};

export const findNearestEndpoint = (
  point: [number, number, number],
  segments: { start: [number, number, number], end: [number, number, number] }[],
  threshold: number = 0.3
): [number, number, number] | null => {
  for (const seg of segments) {
    if (calculateDistance(point, seg.start) < threshold) return seg.start;
    if (calculateDistance(point, seg.end) < threshold) return seg.end;
  }
  return null;
};
