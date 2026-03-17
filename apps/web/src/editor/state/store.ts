import { create } from 'zustand';
import { LayoutSceneState, ProductPlacement, Wall, ICommand, SpatialBoundingBox } from './types';
import RBush from 'rbush';

interface EditorState {
  scene: LayoutSceneState;
  
  // Undo/Redo Engine
  history: ICommand[];
  historyIndex: number;
  executeCommand: (command: ICommand) => void;
  undo: () => void;
  redo: () => void;

  // Spatial Index
  spatialIndex: RBush<SpatialBoundingBox>;
  
  // Viewport
  viewport: { mode: '2D' | '3D' };
  setViewportMode: (mode: '2D' | '3D') => void;
}

const initialState: LayoutSceneState = {
  walls: [],
  placements: [],
  metadata: { projectId: null, version: 0 }
};

export const useEditorStore = create<EditorState>((set, get) => ({
  scene: initialState,
  viewport: { mode: '2D' },
  history: [],
  historyIndex: -1,
  spatialIndex: new RBush<SpatialBoundingBox>(),

  setViewportMode: (mode) => set((state) => ({ viewport: { ...state.viewport, mode } })),

  executeCommand: (command: ICommand) => {
    const { scene, history, historyIndex } = get();
    
    // Execute the command to get the new state
    const newState = command.execute(scene);
    
    // Truncate future history if we are in the middle of the stack
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(command);
    
    // Rebuild spatial index
    const newIndex = new RBush<SpatialBoundingBox>();
    const items: SpatialBoundingBox[] = [];
    
    newState.walls.forEach(w => {
      items.push({
        minX: Math.min(w.start.x, w.end.x) - w.thickness/2,
        maxX: Math.max(w.start.x, w.end.x) + w.thickness/2,
        minY: Math.min(w.start.y, w.end.y) - w.thickness/2,
        maxY: Math.max(w.start.y, w.end.y) + w.thickness/2,
        id: w.id,
        type: 'wall'
      });
    });
    
    newState.placements.forEach(p => {
      items.push({
        minX: p.position.x - 30,
        maxX: p.position.x + 30,
        minY: p.position.y - 30,
        maxY: p.position.y + 30,
        id: p.id,
        type: 'placement'
      });
    });
    
    newIndex.load(items);

    set({
      scene: newState,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      spatialIndex: newIndex
    });
  },

  undo: () => {
    const { history, historyIndex, scene } = get();
    if (historyIndex >= 0) {
      const command = history[historyIndex];
      const prevState = command.undo(scene);
      
      // Rebuild index
      const newIndex = new RBush<SpatialBoundingBox>();
      // ... logic to rebuild index from prevState ...
      
      set({
        scene: prevState,
        historyIndex: historyIndex - 1,
        spatialIndex: newIndex
      });
    }
  },

  redo: () => {
    const { history, historyIndex, scene } = get();
    if (historyIndex < history.length - 1) {
      const command = history[historyIndex + 1];
      const nextState = command.execute(scene);
      
      set({
        scene: nextState,
        historyIndex: historyIndex + 1
      });
    }
  }
}));
