export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

export interface ProductPlacement {
  id: string;
  productId: string;
  position: Position;
  rotation: Rotation;
  metadata?: any;
}

export interface Wall {
  id: string;
  start: Position;
  end: Position;
  thickness: number;
  height: number;
}

// The single source of truth for the entire editor
export interface LayoutSceneState {
  walls: Wall[];
  placements: ProductPlacement[];
  metadata: {
    projectId: string | null;
    version: number;
  };
}

// Command History Types for Undo/Redo Engine
export interface ICommand {
  execute(state: LayoutSceneState): LayoutSceneState;
  undo(state: LayoutSceneState): LayoutSceneState;
}

// Spatial Index Bounding Box Type (RBush compatible)
export interface SpatialBoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  id: string;      // ID of the placement or wall
  type: 'wall' | 'placement';
}
