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
