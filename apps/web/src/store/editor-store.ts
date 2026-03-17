import { create } from 'zustand';

export type SceneItemType = 'rack' | 'shelf' | 'desk' | 'cabinet' | 'catalog-item';
export type OpeningType = 'door' | 'window';
export type ViewMode = '2D' | '3D';
export type ToolType = 'select' | 'pan' | 'zoom' | 'move' | 'rotate' | 'scale' | 'wall' | 'room' | 'door' | 'window' | 'product' | 'measure' | 'dimension' | 'delete' | 'duplicate' | 'line' | 'rectangle';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
}

export interface DimensionLine {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  label?: string;
}

export interface LineEntity {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  type: 'line';
}

export interface RectangleEntity {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
  depth: number;
  type: 'rectangle';
  category?: string;
  layer?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

export interface SceneItem {
  id: string;
  productId: string;
  tenantId: string;
  type: SceneItemType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  width: number;
  depth: number;
  height: number;
  label?: string;
  price?: number | null;
  hasPriceAccess?: boolean;
}

export interface Wall {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  thickness: number;
  height: number;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
}

interface EditorState {
  items: SceneItem[];
  walls: Wall[];
  openings: Opening[];
  dimensions: DimensionLine[];
  lines: LineEntity[];
  rectangles: RectangleEntity[];
  layers: Layer[];
  
  selectedId: string | null;
  selectedType: 'item' | 'wall' | 'opening' | 'dimension' | 'line' | 'rectangle' | null;
  activeTool: ToolType;
  viewMode: ViewMode;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  catalogPanelState: 'open' | 'collapsed' | 'hidden';

  history: any[];
  historyIndex: number;

  addItem: (item: SceneItem) => void;
  addWall: (wall: Wall) => void;
  addOpening: (opening: Opening) => void;
  addDimension: (dim: DimensionLine) => void;
  addLine: (line: LineEntity) => void;
  addRectangle: (rect: RectangleEntity) => void;
  updateLine: (id: string, updates: Partial<LineEntity>) => void;
  updateRectangle: (id: string, updates: Partial<RectangleEntity>) => void;
  updateItem: (id: string, updates: Partial<SceneItem>) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  toggleLayer: (id: string) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  insertSceneItem: (productData: any, tenantId: string) => void;
  select: (id: string | null, type?: any) => void;
  clearSelection: () => void;
  setActiveTool: (tool: ToolType) => void;
  setViewMode: (mode: ViewMode) => void;
  setGridSize: (size: number) => void;
  toggleSnap: () => void;
  toggleGrid: () => void;
  setCatalogPanelState: (state: 'open' | 'collapsed' | 'hidden') => void;
  toggleCatalogPanel: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  items: [],
  walls: [],
  openings: [],
  dimensions: [],
  lines: [],
  rectangles: [],
  layers: [
    { id: 'walls', name: 'Walls', visible: true, locked: false },
    { id: 'openings', name: 'Openings', visible: true, locked: false },
    { id: 'assets', name: 'Assets', visible: true, locked: false },
    { id: 'dimensions', name: 'Dimensions', visible: true, locked: false },
    { id: 'lines', name: 'Draft Lines', visible: true, locked: false },
    { id: 'rectangles', name: 'Rectangles', visible: true, locked: false },
  ],
  selectedId: null,
  selectedType: null,
  activeTool: 'select',
  viewMode: '2D',
  gridSize: 0.5,
  snapEnabled: true,
  showGrid: true,
  catalogPanelState: 'open' as const,
  history: [],
  historyIndex: -1,

  saveToHistory: () => {
    const { items, walls, openings, dimensions, lines, rectangles, layers } = get();
    const currentState = JSON.stringify({ items, walls, openings, dimensions, lines, rectangles, layers });
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(currentState);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  addItem: (item: SceneItem) => {
    get().saveToHistory();
    set((state) => ({ items: [...state.items, item], selectedId: item.id, selectedType: 'item' }));
  },

  insertSceneItem: (productData, tenantId) => {
    get().saveToHistory();
    const halfH = productData.height / 2;
    const item: SceneItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: productData.productId,
      tenantId: tenantId,
      type: 'catalog-item',
      position: [0, halfH, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      width: productData.width,
      depth: productData.depth,
      height: productData.height,
      label: productData.name,
      price: productData.price,
      hasPriceAccess: productData.hasPriceAccess
    };
    set((state) => ({ items: [...state.items, item], selectedId: item.id, selectedType: 'item' }));
  },

  addWall: (wall) => {
    get().saveToHistory();
    set((state) => ({ walls: [...state.walls, wall], selectedId: wall.id, selectedType: 'wall' }));
  },

  addOpening: (opening) => {
    get().saveToHistory();
    set((state) => ({ openings: [...state.openings, opening], selectedId: opening.id, selectedType: 'opening' }));
  },

  addDimension: (dim) => {
    get().saveToHistory();
    set((state) => ({ dimensions: [...state.dimensions, dim], selectedId: dim.id, selectedType: 'dimension' }));
  },
  
  addLine: (line) => {
    get().saveToHistory();
    set((state) => ({ lines: [...state.lines, line], selectedId: line.id, selectedType: 'line' }));
  },

  updateLine: (id, updates) => {
    set((state) => ({
      lines: state.lines.map((l) => l.id === id ? { ...l, ...updates } : l)
    }));
  },

  addRectangle: (rect) => {
    get().saveToHistory();
    set((state) => ({ rectangles: [...state.rectangles, rect], selectedId: rect.id, selectedType: 'rectangle' }));
  },

  updateRectangle: (id, updates) => {
    set((state) => ({
      rectangles: state.rectangles.map((r) => r.id === id ? { ...r, ...updates } : r)
    }));
  },

  updateItem: (id, updates) => {
    set((state) => ({
      items: state.items.map((it) => it.id === id ? { ...it, ...updates } : it)
    }));
  },

  updateWall: (id, updates) => {
    set((state) => ({
      walls: state.walls.map((w) => w.id === id ? { ...w, ...updates } : w)
    }));
  },

  toggleLayer: (id) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l)
  })),

  removeItem: (id) => {
    get().saveToHistory();
    set((state) => ({
      items: state.items.filter((it) => it.id !== id),
      walls: state.walls.filter((w) => w.id !== id),
      openings: state.openings.filter((o) => o.id !== id && o.wallId !== id),
      dimensions: state.dimensions.filter((d) => d.id !== id),
      lines: state.lines.filter((l) => l.id !== id),
      rectangles: state.rectangles.filter((r) => r.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType,
    }));
  },

  duplicateItem: (id) => {
    const state = get();
    const OFFSET: [number, number, number] = [0.5, 0, 0.5];
    const newId = () => Math.random().toString(36).substr(2, 9);

    const wall = state.walls.find((w) => w.id === id);
    if (wall) {
      get().saveToHistory();
      const dup: Wall = { ...wall, id: newId(), start: [wall.start[0]+OFFSET[0], wall.start[1], wall.start[2]+OFFSET[2]], end: [wall.end[0]+OFFSET[0], wall.end[1], wall.end[2]+OFFSET[2]] };
      set((s) => ({ walls: [...s.walls, dup], selectedId: dup.id, selectedType: 'wall' }));
      return;
    }
    const line = state.lines.find((l) => l.id === id);
    if (line) {
      get().saveToHistory();
      const dup: LineEntity = { ...line, id: newId(), start: [line.start[0]+OFFSET[0], line.start[1], line.start[2]+OFFSET[2]], end: [line.end[0]+OFFSET[0], line.end[1], line.end[2]+OFFSET[2]] };
      set((s) => ({ lines: [...s.lines, dup], selectedId: dup.id, selectedType: 'line' }));
      return;
    }
    const rect = state.rectangles.find((r) => r.id === id);
    if (rect) {
      get().saveToHistory();
      const dup: RectangleEntity = { ...rect, id: newId(), start: [rect.start[0]+OFFSET[0], rect.start[1], rect.start[2]+OFFSET[2]], end: [rect.end[0]+OFFSET[0], rect.end[1], rect.end[2]+OFFSET[2]] };
      set((s) => ({ rectangles: [...s.rectangles, dup], selectedId: dup.id, selectedType: 'rectangle' }));
      return;
    }
    const item = state.items.find((i) => i.id === id);
    if (item) {
      get().saveToHistory();
      const dup: SceneItem = { ...item, id: newId(), position: [item.position[0]+OFFSET[0], item.position[1], item.position[2]+OFFSET[2]] };
      set((s) => ({ items: [...s.items, dup], selectedId: dup.id, selectedType: 'item' }));
    }
  },

  select: (id, type = null) => set({ selectedId: id, selectedType: type }),
  clearSelection: () => set({ selectedId: null, selectedType: null }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setGridSize: (size) => set({ gridSize: size }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setCatalogPanelState: (panelState) => set({ catalogPanelState: panelState }),
  toggleCatalogPanel: () => set((state) => ({
    catalogPanelState:
      state.catalogPanelState === 'open'      ? 'collapsed' :
      state.catalogPanelState === 'collapsed' ? 'hidden'    : 'open'
  })),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = JSON.parse(history[historyIndex - 1]);
      set({ ...prevState, historyIndex: historyIndex - 1 });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      set({ ...nextState, historyIndex: historyIndex + 1 });
    }
  }
}));
