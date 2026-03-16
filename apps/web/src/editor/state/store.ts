import { create } from 'zustand';
import { LayoutSceneState, ProductPlacement, Wall } from './types';

interface EditorState {
  scene: LayoutSceneState;
  
  // Actions / Command Receivers
  addWall: (wall: Wall) => void;
  removeWall: (id: string) => void;
  
  addPlacement: (placement: ProductPlacement) => void;
  movePlacement: (id: string, x: number, y: number, z: number) => void;
  removePlacement: (id: string) => void;

  // Viewport
  viewport: { mode: '2D' | '3D' };
  setViewportMode: (mode: '2D' | '3D') => void;
}

const initialState: LayoutSceneState = {
  walls: [],
  placements: [],
  metadata: { projectId: null, version: 0 }
};

export const useEditorStore = create<EditorState>((set) => ({
  scene: initialState,
  viewport: { mode: '2D' },

  setViewportMode: (mode) => set((state) => ({ viewport: { ...state.viewport, mode } })),

  addWall: (wall) => set((state) => ({
    scene: { ...state.scene, walls: [...state.scene.walls, wall] }
  })),

  removeWall: (id) => set((state) => ({
    scene: { ...state.scene, walls: state.scene.walls.filter(w => w.id !== id) }
  })),

  addPlacement: (placement) => set((state) => ({
    scene: { ...state.scene, placements: [...state.scene.placements, placement] }
  })),

  movePlacement: (id, x, y, z) => set((state) => ({
    scene: {
      ...state.scene,
      placements: state.scene.placements.map(p => 
        p.id === id ? { ...p, position: { x, y, z } } : p
      )
    }
  })),

  removePlacement: (id) => set((state) => ({
    scene: { ...state.scene, placements: state.scene.placements.filter(p => p.id !== id) }
  }))
}));
