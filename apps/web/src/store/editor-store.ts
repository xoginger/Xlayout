/**
 * Creado y diseñado por XO
 */

import { create } from 'zustand';
import { projectService } from '../services/project-service';

export type SceneItemType = 'rack' | 'shelf' | 'desk' | 'cabinet' | 'catalog-item';
export type OpeningType = 'door' | 'window' | 'opening';
export type OpeningDirection = 'left' | 'right' | 'inward' | 'outward';
export type ViewMode = '2D' | '3D';
export type ToolType =
  | 'select' | 'multi-select' | 'pan' | 'zoom' | 'move' | 'rotate' | 'scale'
  | 'line' | 'rectangle' | 'circle' | 'wall'
  | 'extrude' | 'offset'
  | 'tape' | 'paint' | 'eraser' | 'dimension'
  | 'delete' | 'duplicate' | 'scale-blueprint' | 'place-opening' | 'product';

export interface SnapPoint {
  id: string;
  name: string;
  localPosition: [number, number, number];
  normal: [number, number, number];
  type: string;
  allowedConnections?: string[];
  priority?: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
}

export interface Scene {
  id: string;
  name: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  viewMode: ViewMode;
}

export interface BlueprintState {
  url: string | null;
  position: [number, number, number];
  scale: number;
  rotation: number;
  opacity: number;
  locked: boolean;
  visible: boolean;
  // Metadatos de Calibración
  calibrated?: boolean;
  calibrationPointA?: [number, number, number]; // Guardado en X,Y,Z locales del plano
  calibrationPointB?: [number, number, number];
  calibrationMeasuredDist?: number;
  calibrationRealDist?: number;
}

export interface CalibrationState {
  step: 'idle' | 'awaiting-first-point' | 'awaiting-second-point' | 'awaiting-real-distance';
  pointA?: [number, number, number]; // Coordenadas locales
  pointB?: [number, number, number]; // Coordenadas locales
  measuredDistance?: number;
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
  layerId?: string;
}

export interface Guide {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  type: 'infinite' | 'segment';
}

export interface FaceEntity {
  id: string;
  points: [number, number, number][];
  type: 'face';
  layerId?: string;
  color?: string;
  area?: number;
}

export interface VolumeEntity {
  id: string;
  basePoints: [number, number, number][];
  height: number;
  type: 'volume';
  layerId?: string;
  color?: string;
  position: [number, number, number]; // posición central para el gizmo de transformación
}

export interface RectangleEntity {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  width: number;
  depth: number;
  type: 'rectangle';
  category?: string;
  layerId?: string;
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

  // Metadatos Profesionales
  model3dUrl?: string;
  floorAnchor: number; // 0 = base, 0.5 = centro
  snapPoints?: SnapPoint[];
  resizable?: boolean;
  metadata?: Record<string, any>;
  layerId?: string;
}

export interface Wall {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  thickness: number;
  height: number;
  layerId?: string;
}

export interface Opening {
  id: string;
  wallId: string;
  type: OpeningType;
  offset: number;
  width: number;
  height: number;
  sillHeight?: number;             // solo ventanas
  openingDirection?: OpeningDirection; // solo puertas
  label?: string;
  layerId?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
  priceType?: string; // 'A', 'B', 'C', 'D', 'E'
  lastSavedAt?: string | null;
  isDirty: boolean;
  isSaving: boolean;
}

interface EditorState {
  project: ProjectInfo;
  items: SceneItem[];
  walls: Wall[];
  openings: Opening[];
  dimensions: DimensionLine[];
  lines: LineEntity[];
  rectangles: RectangleEntity[];
  faces: FaceEntity[];
  volumes: VolumeEntity[];
  layers: Layer[];
  scenes: Scene[];
  guides: Guide[];

  activeLayerId: string;
  selectedId: string | null;
  selectedIds: string[];
  selectedType: 'item' | 'wall' | 'opening' | 'dimension' | 'line' | 'rectangle' | 'face' | 'volume' | 'group' | null;
  activeTool: ToolType;
  viewMode: ViewMode;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  catalogPanelState: 'open' | 'collapsed' | 'hidden';
  pendingOpeningType: OpeningType | null;
  exportRequest: 'image' | 'glb' | 'pdf' | null;
  blueprint: BlueprintState;
  calibrationState: CalibrationState;

  history: any[];
  historyIndex: number;

  setProjectName: (name: string) => void;
  addItem: (item: SceneItem) => void;
  addWall: (wall: Wall) => void;
  addOpening: (opening: Opening) => void;
  addFace: (face: FaceEntity) => void;
  addVolume: (volume: VolumeEntity) => void;
  addScene: (scene: Scene) => void;
  updateScene: (id: string, updates: Partial<Scene>) => void;
  removeScene: (id: string) => void;
  applyScene: (id: string) => void;

  addGuide: (guide: Guide) => void;
  removeGuide: (id: string) => void;
  clearGuides: () => void;

  updateOpening: (id: string, updates: Partial<Opening>) => void;
  insertStructuralAsset: (type: OpeningType, wallId: string, offset?: number) => void;
  setPendingOpeningType: (type: OpeningType | null) => void;
  addDimension: (dim: DimensionLine) => void;
  addLine: (line: LineEntity) => void;
  addRectangle: (rect: RectangleEntity) => void;
  updateLine: (id: string, updates: Partial<LineEntity>) => void;
  updateRectangle: (id: string, updates: Partial<RectangleEntity>) => void;
  updateFace: (id: string, updates: Partial<FaceEntity>) => void;
  updateVolume: (id: string, updates: Partial<VolumeEntity>) => void;
  updateItem: (id: string, updates: Partial<SceneItem>) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;

  setActiveLayer: (id: string) => void;
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  toggleLayer: (id: string) => void;

  removeItem: (id?: string) => void;
  duplicateItem: (id?: string) => void;
  insertSceneItem: (productData: any, tenantId: string) => void;
  select: (id: string | null, type?: any, multi?: boolean) => void;
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
  setDirty: (isDirty: boolean) => void;
  saveProject: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<void>;
  triggerExport: (type: 'image' | 'glb' | 'pdf') => void;
  clearExportRequest: () => void;

  setCalibrationState: (data: Partial<CalibrationState>) => void;
  updateBlueprint: (data: Partial<BlueprintState>) => void;
  clearBlueprint: () => void;
  setPriceType: (type: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: { id: 'default', name: 'New Project', priceType: 'A', isDirty: false, isSaving: false, lastSavedAt: null },
  items: [],
  walls: [],
  openings: [],
  dimensions: [],
  lines: [],
  rectangles: [],
  faces: [],
  volumes: [],
  scenes: [],
  guides: [],
  layers: [
    { id: 'walls', name: 'Muros', visible: true, locked: false },
    { id: 'openings', name: 'Huecos', visible: true, locked: false },
    { id: 'assets', name: 'Objetos', visible: true, locked: false },
    { id: 'dimensions', name: 'Dimensiones', visible: true, locked: false },
    { id: 'lines', name: 'Líneas de boceto', visible: true, locked: false },
    { id: 'rectangles', name: 'Rectángulos', visible: true, locked: false },
    { id: 'faces', name: 'Caras', visible: true, locked: false },
    { id: 'volumes', name: 'Volúmenes', visible: true, locked: false },
  ],
  activeLayerId: 'lines',
  selectedId: null,
  selectedIds: [],
  selectedType: null,
  activeTool: 'select',
  viewMode: '2D',
  gridSize: 0.5,
  snapEnabled: true,
  showGrid: true,
  catalogPanelState: 'open' as const,
  pendingOpeningType: null,
  exportRequest: null,
  blueprint: {
    url: null,
    position: [0, -0.01, 0],
    scale: 1,
    rotation: 0,
    opacity: 0.5,
    locked: false,
    visible: true,
  },
  calibrationState: {
    step: 'idle',
  },
  history: [],
  historyIndex: -1,

  setProjectName: (name) => set((state) => ({ project: { ...state.project, name, isDirty: true } })),
  setDirty: (isDirty) => set((state) => ({ project: { ...state.project, isDirty } })),

  saveToHistory: () => {
    const { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, project, blueprint } = get();
    const currentState = JSON.stringify({ items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, project, blueprint });

    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);

    if (newHistory.length > 0 && newHistory[newHistory.length - 1] === currentState) return;

    newHistory.push(currentState);
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1, project: { ...project, isDirty: true } });
  },

  addItem: (item: SceneItem) => {
    get().saveToHistory();
    set((state) => ({ items: [...state.items, item], selectedId: item.id, selectedIds: [item.id], selectedType: 'item' }));
  },

  insertSceneItem: (productData, tenantId) => {
    get().saveToHistory();
    const floorAnchor = productData.metadata?.floorAnchor ?? 0.5;
    
    // Y siempre comienza completamente en el suelo (cero)
    const yPos = 0;

    const item: SceneItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: productData.productId,
      tenantId: tenantId,
      type: 'catalog-item',
      position: [0, yPos, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      width: productData.width,
      depth: productData.depth,
      height: productData.height,
      label: productData.name,
      price: productData.price,
      hasPriceAccess: productData.hasPriceAccess,
      model3dUrl: productData.metadata?.model3dUrl,
      floorAnchor: floorAnchor,
      snapPoints: productData.metadata?.snapPoints || [],
      resizable: productData.metadata?.resizable ?? true,
      metadata: productData.metadata,
      layerId: get().activeLayerId
    };
    set((state) => ({ items: [...state.items, item], selectedIds: [item.id], selectedType: 'item' }));
  },

  addWall: (wall) => {
    get().saveToHistory();
    set((state) => ({ walls: [...state.walls, { ...wall, layerId: 'walls' }], selectedId: wall.id, selectedIds: [wall.id], selectedType: 'wall' }));
  },

  addOpening: (opening) => {
    get().saveToHistory();
    set((state) => ({ openings: [...state.openings, { ...opening, layerId: 'openings' }], selectedId: opening.id, selectedIds: [opening.id], selectedType: 'opening' }));
  },

  addFace: (face) => {
    get().saveToHistory();
    set((state) => ({ faces: [...state.faces, { ...face, layerId: 'faces' }], selectedId: face.id, selectedIds: [face.id], selectedType: 'face' }));
  },

  addVolume: (volume) => {
    get().saveToHistory();
    set((state) => ({ volumes: [...state.volumes, { ...volume, layerId: 'volumes' }], selectedId: volume.id, selectedIds: [volume.id], selectedType: 'volume' }));
  },

  addScene: (scene) => {
    set((state) => ({ scenes: [...state.scenes, scene] }));
  },

  updateScene: (id, updates) => {
    set((state) => ({
      scenes: state.scenes.map((s) => s.id === id ? { ...s, ...updates } : s)
    }));
  },

  removeScene: (id) => {
    set((state) => ({
      scenes: state.scenes.filter((s) => s.id !== id)
    }));
  },

  applyScene: (id) => {
    const scene = get().scenes.find(s => s.id === id);
    if (scene) {
      set({ viewMode: scene.viewMode });
    }
  },

  updateOpening: (id, updates) => {
    set((state) => ({
      openings: state.openings.map((o) => o.id === id ? { ...o, ...updates } : o)
    }));
  },

  insertStructuralAsset: (type, wallId, offset = 0.5) => {
    const wall = get().walls.find(w => w.id === wallId);
    if (!wall) return;
    get().saveToHistory();
    const defaults: Record<OpeningType, Partial<Opening>> = {
      door: { width: 0.9, height: 2.1, openingDirection: 'inward' },
      window: { width: 1.2, height: 1.0, sillHeight: 0.9 },
      opening: { width: 1.0, height: 2.1 },
    };
    const base = defaults[type] || defaults.opening;
    const opening: Opening = {
      id: Math.random().toString(36).substr(2, 9),
      wallId,
      type,
      offset,
      width: base.width!,
      height: base.height!,
      sillHeight: base.sillHeight,
      openingDirection: base.openingDirection,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      layerId: 'openings'
    };
    set((state) => ({
      openings: [...state.openings, opening],
      selectedIds: [opening.id],
      selectedType: 'opening',
      activeTool: 'select',
      pendingOpeningType: null,
    }));
  },

  setPendingOpeningType: (type) => {
    set({ pendingOpeningType: type, activeTool: type ? 'place-opening' : 'select' });
  },

  addDimension: (dim) => {
    get().saveToHistory();
    set((state) => ({ dimensions: [...state.dimensions, dim], selectedIds: [dim.id], selectedType: 'dimension' }));
  },

  addLine: (line) => {
    get().saveToHistory();
    set((state) => ({ lines: [...state.lines, { ...line, layerId: 'lines' }], selectedIds: [line.id], selectedType: 'line' }));
  },

  updateLine: (id, updates) => {
    set((state) => ({
      lines: state.lines.map((l) => l.id === id ? { ...l, ...updates } : l)
    }));
  },

  addRectangle: (rect) => {
    get().saveToHistory();
    set((state) => ({ rectangles: [...state.rectangles, { ...rect, layerId: 'rectangles' }], selectedIds: [rect.id], selectedType: 'rectangle' }));
  },

  updateRectangle: (id, updates) => {
    set((state) => ({
      rectangles: state.rectangles.map((r) => r.id === id ? { ...r, ...updates } : r)
    }));
  },

  updateFace: (id, updates) => {
    set((state) => ({
      faces: state.faces.map((f) => f.id === id ? { ...f, ...updates } : f)
    }));
  },

  updateVolume: (id, updates) => {
    set((state) => ({
      volumes: state.volumes.map((v) => v.id === id ? { ...v, ...updates } : v)
    }));
  },

  updateItem: (id, updates) => {
    // Guardia de Épsilon: salta la actualización si los valores son idénticos a los
    // actuales dentro del ruido de punto flotante (delta < 1e-6 por componente).
    // Esto evita re-renderizados accidentales sin cambios desde llamadores externos.
    const current = get().items.find(it => it.id === id);
    if (current) {
      const EPS = 1e-6;
      const posOk = !updates.position || updates.position.every((v, i) => Math.abs(v - current.position[i]) > EPS);
      const rotOk = !updates.rotation || updates.rotation.every((v, i) => Math.abs(v - current.rotation[i]) > EPS);
      const scaleOk = !updates.scale || updates.scale.every((v, i) => Math.abs(v - current.scale[i]) > EPS);
      if (!posOk && !rotOk && !scaleOk) return; // nothing changed — skip
    }
    set((state) => ({
      items: state.items.map((it) => it.id === id ? { ...it, ...updates } : it)
    }));
  },

  updateWall: (id, updates) => {
    set((state) => ({
      walls: state.walls.map((w) => w.id === id ? { ...w, ...updates } : w)
    }));
  },

  setActiveLayer: (id) => set({ activeLayerId: id }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  updateLayer: (id, updates) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, ...updates } : l)
  })),

  toggleLayer: (id) => set((state) => ({
    layers: state.layers.map((l) => l.id === id ? { ...l, visible: !l.visible } : l)
  })),

  removeItem: (id) => {
    get().saveToHistory();
    const idsToRemove = id ? [id] : get().selectedIds;
    if (idsToRemove.length === 0) return;

    set((state) => ({
      items: state.items.filter((it) => !idsToRemove.includes(it.id)),
      walls: state.walls.filter((w) => !idsToRemove.includes(w.id)),
      faces: state.faces.filter((f) => !idsToRemove.includes(f.id)),
      volumes: state.volumes.filter((v) => !idsToRemove.includes(v.id)),
      openings: state.openings.filter((o) => !idsToRemove.includes(o.id) && !idsToRemove.includes(o.wallId)),
      dimensions: state.dimensions.filter((d) => !idsToRemove.includes(d.id)),
      lines: state.lines.filter((l) => !idsToRemove.includes(l.id)),
      rectangles: state.rectangles.filter((r) => !idsToRemove.includes(r.id)),
      selectedIds: state.selectedIds.filter(sid => !idsToRemove.includes(sid)),
      selectedId: state.selectedIds.filter(sid => !idsToRemove.includes(sid))[0] || null,
      selectedType: state.selectedIds.some(sid => !idsToRemove.includes(sid)) ? state.selectedType : null,
    }));
  },

  duplicateItem: (id) => {
    const state = get();
    const idsToDuplicate = id ? [id] : state.selectedIds;
    if (idsToDuplicate.length === 0) return;

    get().saveToHistory();
    const OFFSET: [number, number, number] = [0.5, 0, 0.5];
    const newId = () => Math.random().toString(36).substr(2, 9);

    const newItems: SceneItem[] = [...state.items];
    const newWalls: Wall[] = [...state.walls];
    const newLines: LineEntity[] = [...state.lines];
    const newRectangles: RectangleEntity[] = [...state.rectangles];
    const newSelectedIds: string[] = [];

    idsToDuplicate.forEach(targetId => {
      const wall = state.walls.find((w) => w.id === targetId);
      if (wall) {
        const nid = newId();
        newWalls.push({ ...wall, id: nid, start: [wall.start[0] + OFFSET[0], wall.start[1], wall.start[2] + OFFSET[2]], end: [wall.end[0] + OFFSET[0], wall.end[1], wall.end[2] + OFFSET[2]] });
        newSelectedIds.push(nid);
        return;
      }
      const line = state.lines.find((l) => l.id === targetId);
      if (line) {
        const nid = newId();
        newLines.push({ ...line, id: nid, start: [line.start[0] + OFFSET[0], line.start[1], line.start[2] + OFFSET[2]], end: [line.end[0] + OFFSET[0], line.end[1], line.end[2] + OFFSET[2]] });
        newSelectedIds.push(nid);
        return;
      }
      const rect = state.rectangles.find((r) => r.id === targetId);
      if (rect) {
        const nid = newId();
        newRectangles.push({ ...rect, id: nid, start: [rect.start[0] + OFFSET[0], rect.start[1], rect.start[2] + OFFSET[2]], end: [rect.end[0] + OFFSET[0], rect.end[1], rect.end[2] + OFFSET[2]] });
        newSelectedIds.push(nid);
        return;
      }
      const item = state.items.find((i) => i.id === targetId);
      if (item) {
        const nid = newId();
        newItems.push({ ...item, id: nid, position: [item.position[0] + OFFSET[0], item.position[1], item.position[2] + OFFSET[2]] });
        newSelectedIds.push(nid);
      }
    });

    set({ 
      items: newItems, 
      walls: newWalls, 
      lines: newLines, 
      rectangles: newRectangles, 
      selectedIds: newSelectedIds,
      selectedType: newSelectedIds.length > 1 ? 'group' : state.selectedType 
    });
  },

  select: (id, type = null, multi = false) => {
    if (!id) {
      set({ selectedId: null, selectedIds: [], selectedType: null });
      return;
    }
    set((state) => {
      if (multi || state.activeTool === 'multi-select') {
        const isSelected = state.selectedIds.includes(id);
        const newIds = isSelected 
          ? state.selectedIds.filter(sid => sid !== id)
          : [...state.selectedIds, id];
        return { 
          selectedId: newIds.length > 0 ? newIds[newIds.length - 1] : null,
          selectedIds: newIds, 
          selectedType: newIds.length > 1 ? 'group' : (newIds.length === 1 ? type : null) 
        };
      }
      return { selectedId: id, selectedIds: [id], selectedType: type };
    });
  },
  clearSelection: () => set({ selectedId: null, selectedIds: [], selectedType: null }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setGridSize: (size) => set({ gridSize: size }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  setCatalogPanelState: (panelState) => set({ catalogPanelState: panelState }),
  toggleCatalogPanel: () => set((state) => ({
    catalogPanelState:
      state.catalogPanelState === 'open' ? 'collapsed' :
        state.catalogPanelState === 'collapsed' ? 'hidden' : 'open'
  })),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = JSON.parse(history[historyIndex - 1]);
      set({
        ...prevState,
        historyIndex: historyIndex - 1,
        history,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = JSON.parse(history[historyIndex + 1]);
      set({
        ...nextState,
        historyIndex: historyIndex + 1,
        history,
      });
    }
  },



  saveProject: async () => {
    const { project, items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint } = get();
    if (project.isSaving) return;

    set((state) => ({ project: { ...state.project, isSaving: true } }));

    try {
      const sceneState = { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint };

      let projectId = project.id;
      if (projectId === 'default') {
        const newProj = await projectService.createProject(project.name);
        projectId = newProj.id;
      }

      await projectService.saveVersion(projectId, sceneState);

      set((state) => ({
        project: {
          ...state.project,
          id: projectId,
          isDirty: false,
          isSaving: false,
          lastSavedAt: new Date().toISOString()
        }
      }));
    } catch (e) {
      console.error('Failed to save project', e);
      set((state) => ({ project: { ...state.project, isSaving: false } }));
      throw e;
    }
  },

  loadProject: async (id: string) => {
    set((state) => ({ project: { ...state.project, isSaving: true } }));
    try {
      const projectData = await projectService.getProject(id);
      const latestVersion = projectData.versions && projectData.versions.length > 0
        ? projectData.versions.sort((a: any, b: any) => b.versionNum - a.versionNum)[0]
        : null;

      if (latestVersion && latestVersion.sceneState) {
        const state = latestVersion.sceneState;
        set({
          ...state,
          blueprint: state.blueprint || { url: null, position: [0, -0.01, 0], scale: 1, rotation: 0, opacity: 0.5, locked: false, visible: true },
          project: {
            id: projectData.id,
            name: projectData.name,
            isDirty: false,
            isSaving: false,
            lastSavedAt: latestVersion.createdAt
          },
          history: [],
          historyIndex: -1
        });
        get().saveToHistory();
      } else {
        // Proyecto vacío
        set({
          project: {
            id: projectData.id,
            name: projectData.name,
            isDirty: false,
            isSaving: false,
            lastSavedAt: projectData.updatedAt
          },
          items: [], walls: [], openings: [], dimensions: [], lines: [], rectangles: [], faces: [], volumes: [], layers: get().layers, scenes: [],
          history: [],
          historyIndex: -1
        });
      }
    } catch (e) {
      console.error('Failed to load project', e);
      set((state) => ({ project: { ...state.project, isSaving: false } }));
      throw e;
    }
  },

  createNewProject: async (name: string) => {
    try {
      const newProj = await projectService.createProject(name);
      set({
        project: {
          id: newProj.id,
          name: newProj.name,
          isDirty: false,
          isSaving: false,
          lastSavedAt: newProj.createdAt
        },
        items: [], walls: [], openings: [], dimensions: [], lines: [], rectangles: [], faces: [], volumes: [], layers: get().layers, scenes: [],
        history: [],
        historyIndex: -1
      });
      get().saveToHistory();
    } catch (e) {
      console.error('Failed to create project', e);
      throw e;
    }
  },

  triggerExport: (type) => set({ exportRequest: type }),
  clearExportRequest: () => set({ exportRequest: null }),

  addGuide: (guide) => set((state) => ({ guides: [...state.guides, guide] })),
  removeGuide: (id) => set((state) => ({ guides: state.guides.filter(g => g.id !== id) })),
  clearGuides: () => set({ guides: [] }),

  updateBlueprint: (data) => set((state) => ({
    blueprint: { ...state.blueprint, ...data }
  })),
  setCalibrationState: (data) => set((state) => ({
    calibrationState: { ...state.calibrationState, ...data }
  })),
  clearBlueprint: () => set({
    blueprint: {
      url: null, position: [0, -0.01, 0], scale: 1, rotation: 0, opacity: 0.5, locked: false, visible: true
    }
  }),

  setPriceType: (type) => {
    set((state) => ({
      project: { ...state.project, priceType: type, isDirty: true }
    }));
  }
}));
