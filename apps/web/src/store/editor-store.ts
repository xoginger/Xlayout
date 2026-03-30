/**
 * Creado y diseñado por XO
 */

import { create } from 'zustand';
import { projectService } from '../services/project-service';
import stringify from 'fast-json-stable-stringify';

export type SceneItemType = 'rack' | 'shelf' | 'desk' | 'cabinet' | 'catalog-item';
export type OpeningType = 'door' | 'window' | 'opening';
export type OpeningDirection = 'left' | 'right' | 'inward' | 'outward';
export type ViewMode = '2D' | '3D';
export type DimensionUnit = 'mm' | 'cm' | 'm';
export type DimensionAlignment = 'horizontal' | 'vertical' | 'aligned' | 'free';
export type ToolType =
  | 'select' | 'multi-select' | 'pan' | 'orbit' | 'zoom' | 'move' | 'rotate' | 'scale'
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
  value: number;              // distancia calculada en metros (fuente de verdad geométrica)
  unit: DimensionUnit;        // unidad de visualización: 'mm' | 'cm' | 'm'
  offset: number;             // offset perpendicular en metros (para evitar solapamiento)
  alignment: DimensionAlignment; // alineación: horizontal, vertical, aligned, free
  label?: string;             // etiqueta manual opcional
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
  saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';
  lastSavedHash: string | null;
  isDirty?: boolean;
  isSaving?: boolean;
}

// Grupo de entidades seleccionadas
export interface GroupEntity {
  id: string;
  name: string;
  memberIds: string[];
}

// Datos del portapapeles para copiar/pegar
export interface ClipboardData {
  items: SceneItem[];
  walls: Wall[];
  lines: LineEntity[];
  rectangles: RectangleEntity[];
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
  groups: GroupEntity[];
  clipboard: ClipboardData | null;

  activeLayerId: string;
  selectedId: string | null;
  selectedIds: string[];
  selectedType: 'item' | 'wall' | 'opening' | 'dimension' | 'line' | 'rectangle' | 'face' | 'volume' | 'group' | null;
  activeTool: ToolType;
  viewMode: ViewMode;
  gridSize: number;
  snapEnabled: boolean;
  showGrid: boolean;
  catalogPanelState: 'open' | 'hidden';
  advancedMode: boolean;
  pendingOpeningType: OpeningType | null;
  exportRequest: 'image' | 'glb' | 'pdf' | null;
  blueprint: BlueprintState;
  calibrationState: CalibrationState;

  history: any[];
  historyIndex: number;

  setSaveStatus: (status: 'idle' | 'unsaved' | 'saving' | 'saved' | 'error') => void;
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
  updateDimension: (id: string, updates: Partial<DimensionLine>) => void;
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
  setCatalogPanelState: (state: 'open' | 'hidden') => void;
  toggleCatalogPanel: () => void;
  toggleAdvancedMode: () => void;
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  setDirty: (isDirty: boolean) => void;
  saveProject: (mode?: 'autosave' | 'manual') => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<void>;
  triggerExport: (type: 'image' | 'glb' | 'pdf') => void;
  clearExportRequest: () => void;

  setCalibrationState: (data: Partial<CalibrationState>) => void;
  updateBlueprint: (data: Partial<BlueprintState>) => void;
  clearBlueprint: () => void;
  setPriceType: (type: string) => void;
  
  // Nuevas acciones de Proyecto
  saveAs: (newName: string) => Promise<void>;
  exportProject: () => void;
  importProject: (jsonData: any) => void;

  // Clipboard y Grupos
  copySelection: () => void;
  pasteSelection: () => void;
  groupSelection: (name?: string) => void;
  ungroupSelection: (groupId: string) => void;
  selectGroup: (groupId: string) => void;
  
  // Quotes
  quotes: any[];
  isLoadingQuotes: boolean;
  isSavingQuote: boolean;
  fetchQuotes: () => Promise<void>;
  saveQuote: (data: any) => Promise<any>;

  // Timeline
  restoreVersion: (versionId: string) => Promise<void>;
}

export function generateSceneHash(state: Partial<EditorState>) {
  const sortById = (arr: any[]) => [...(arr || [])].sort((a, b) => a.id.localeCompare(b.id));
  return stringify({
    items: sortById(state.items || []),
    walls: sortById(state.walls || []),
    openings: sortById(state.openings || []),
    dimensions: sortById(state.dimensions || []),
    lines: sortById(state.lines || []),
    rectangles: sortById(state.rectangles || []),
    faces: sortById(state.faces || []),
    volumes: sortById(state.volumes || []),
    scenes: sortById(state.scenes || []),
    groups: sortById(state.groups || []),
    blueprint: state.blueprint || null,
  });
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: { id: 'default', name: 'New Project', priceType: 'A', saveStatus: 'idle', lastSavedHash: null, lastSavedAt: null, isDirty: false, isSaving: false },
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
  groups: [],
  clipboard: null,
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
  catalogPanelState: 'hidden' as const,
  advancedMode: false,
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
  quotes: [],
  isLoadingQuotes: false,
  isSavingQuote: false,

  setSaveStatus: (status) => set((state) => ({ project: { ...state.project, saveStatus: status } })),
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
      exportRequest: null,
    }));
  },

  setPendingOpeningType: (type) => {
    set({ pendingOpeningType: type, activeTool: type ? 'place-opening' : 'select' });
  },

  addDimension: (dim) => {
    get().saveToHistory();
    set((state) => ({ dimensions: [...state.dimensions, dim], selectedIds: [dim.id], selectedType: 'dimension' }));
  },

  updateDimension: (id, updates) => {
    set((state) => ({
      dimensions: state.dimensions.map((d) => d.id === id ? { ...d, ...updates } : d)
    }));
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
      const posOk = !updates.position || updates.position.every((v, i) => Math.abs(v - (current.position as any)[i]) > EPS);
      const rotOk = !updates.rotation || updates.rotation.every((v, i) => Math.abs(v - (current.rotation as any)[i]) > EPS);
      const scaleOk = !updates.scale || updates.scale.every((v, i) => Math.abs(v - (current.scale as any)[i]) > EPS);
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
    catalogPanelState: state.catalogPanelState === 'open' ? 'hidden' : 'open'
  })),
  toggleAdvancedMode: () => set((state) => ({ advancedMode: !state.advancedMode })),

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

  saveProject: async (mode: 'autosave' | 'manual' = 'manual') => {
    const { project, items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups } = get();
    if (project.saveStatus === 'saving' || project.isSaving) return;

    set((state) => ({ project: { ...state.project, saveStatus: 'saving', isSaving: true } }));

    try {
      const sceneState = { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups };
      const currentHash = generateSceneHash(sceneState);
      const summary = {
        totalItems: items.length,
        totalWalls: walls.length,
        totalOpenings: openings.length,
        totalLines: lines.length
      };

      // Verificación de Smart Diff Local
      if (project.id !== 'default' && project.lastSavedHash === currentHash) {
        set((state) => ({ project: { ...state.project, saveStatus: 'saved', isSaving: false, isDirty: false } }));
        return;
      }

      let projectId = project.id;
      if (projectId === 'default') {
        const newProj = await projectService.createProject({ name: project.name });
        projectId = newProj.id;
      }

      await projectService.saveVersion(projectId, sceneState, { saveMode: mode, sceneHash: currentHash, summary });

      set((state) => ({
        project: {
          ...state.project,
          id: projectId,
          saveStatus: 'saved',
          lastSavedHash: currentHash,
          lastSavedAt: new Date().toISOString(),
          isDirty: false,
          isSaving: false
        }
      }));
    } catch (e: any) {
      console.error('Failed to save project', e);
      set((state) => ({ project: { ...state.project, saveStatus: 'error', isSaving: false } }));
      throw e;
    }
  },

  saveAs: async (newName: string) => {
    const { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups, project } = get();
    set((state) => ({ project: { ...state.project, isSaving: true } }));

    try {
      // 1. Crear nuevo proyecto con el nuevo nombre
      const newProj = await projectService.createProject({ name: newName, description: `Copia de ${project.name}` });
      const sceneState = { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups };
      const currentHash = generateSceneHash(sceneState);
      const summary = { totalItems: items.length, totalWalls: walls.length, totalOpenings: openings.length, totalLines: lines.length };

      // 2. Guardar la versión actual en el nuevo proyecto
      await projectService.saveVersion(newProj.id, sceneState, { saveMode: 'manual', sceneHash: currentHash, summary });

      // 3. Cambiar el contexto del editor al nuevo proyecto
      set({
        project: {
          id: newProj.id,
          name: newProj.name,
          priceType: project.priceType || 'A',
          saveStatus: 'saved',
          lastSavedHash: currentHash,
          lastSavedAt: new Date().toISOString(),
          isDirty: false,
          isSaving: false
        }
      });
    } catch (e) {
      console.error('Failed to save as', e);
      set((state) => ({ project: { ...state.project, saveStatus: 'error', isSaving: false } }));
      throw e;
    }
  },

  exportProject: () => {
    const { project, items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups } = get();
    const data = {
      version: "2.0",
      metadata: {
        name: project.name,
        exportedAt: new Date().toISOString(),
        priceType: project.priceType
      },
      sceneState: { items, walls, openings, dimensions, lines, rectangles, faces, volumes, layers, scenes, blueprint, groups }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xlayout`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  importProject: (jsonData: any) => {
    try {
      // Soporte para formato exportado o sceneState directo
      const state = jsonData.sceneState || jsonData;
      const metadata = jsonData.metadata || {};

      if (!state.items && !state.walls) {
        throw new Error('Formato de archivo inválido');
      }

      set({
        ...state,
        project: {
          id: 'default', // Al importar, se considera un nuevo proyecto local hasta que se guarde en nube
          name: metadata.name || 'Proyecto Importado',
          priceType: metadata.priceType || 'A',
          saveStatus: 'unsaved',
          lastSavedHash: null,
          lastSavedAt: null,
          isDirty: true
        },
        history: [],
        historyIndex: -1
      });
      
      get().saveToHistory();
    } catch (e) {
      console.error('Failed to import project', e);
      alert('Error al importar: archivo no reconocido o corrupto');
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
        // Defaults seguros para campos que pueden faltar en versiones antiguas
        const defaultBlueprint = { url: null, position: [0, -0.01, 0] as [number,number,number], scale: 1, rotation: 0, opacity: 0.5, locked: false, visible: true };
        const defaultCalibration = { step: 'idle' as const };
        set({
          items: state.items || [],
          walls: state.walls || [],
          openings: state.openings || [],
          dimensions: state.dimensions || [],
          lines: state.lines || [],
          rectangles: state.rectangles || [],
          faces: state.faces || [],
          volumes: state.volumes || [],
          layers: state.layers || get().layers,
          scenes: state.scenes || [],
          guides: state.guides || [],
          groups: state.groups || [],
          blueprint: state.blueprint || defaultBlueprint,
          calibrationState: state.calibrationState || defaultCalibration,
          project: {
            id: projectData.id,
            name: projectData.name,
            priceType: projectData.priceType || 'A',
            saveStatus: 'saved',
            lastSavedHash: generateSceneHash(state),
            lastSavedAt: latestVersion.createdAt || new Date().toISOString(),
            isDirty: false,
            isSaving: false
          },
          history: [],
          historyIndex: -1
        });
        get().saveToHistory();
      } else {
        // Proyecto vacío de bd, sin versiones previas
        const emptyState = { items: [], walls: [], openings: [], dimensions: [], lines: [], rectangles: [], faces: [], volumes: [], layers: get().layers, scenes: [], groups: [], blueprint: get().blueprint };
        set({
          project: {
            id: projectData.id,
            name: projectData.name,
            priceType: projectData.priceType || 'A',
            saveStatus: 'saved',
            lastSavedHash: generateSceneHash(emptyState),
            lastSavedAt: projectData.updatedAt,
            isDirty: false,
            isSaving: false
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
      const newProj = await projectService.createProject({ name });
      const emptyState = { items: [], walls: [], openings: [], dimensions: [], lines: [], rectangles: [], faces: [], volumes: [], layers: get().layers, scenes: [], groups: [], blueprint: get().blueprint };
      set({
        project: {
          id: newProj.id,
          name: newProj.name,
          priceType: 'A',
          saveStatus: 'saved',
          lastSavedHash: generateSceneHash(emptyState),
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

  // ─── Clipboard: Copiar / Pegar selección ────────────────────────────────
  copySelection: () => {
    const { selectedIds, items, walls, lines, rectangles } = get();
    if (selectedIds.length === 0) return;

    // Snapshot solo de las entidades seleccionadas
    const clipboard: ClipboardData = {
      items: items.filter(i => selectedIds.includes(i.id)),
      walls: walls.filter(w => selectedIds.includes(w.id)),
      lines: lines.filter(l => selectedIds.includes(l.id)),
      rectangles: rectangles.filter(r => selectedIds.includes(r.id)),
    };
    set({ clipboard });
  },

  pasteSelection: () => {
    const { clipboard } = get();
    if (!clipboard) return;

    get().saveToHistory();
    const newId = () => Math.random().toString(36).substr(2, 9);
    const OFFSET: [number, number, number] = [0.5, 0, 0.5];
    const newSelectedIds: string[] = [];

    // Clonar items con nuevos IDs y offset
    const newItems = clipboard.items.map(item => {
      const id = newId();
      newSelectedIds.push(id);
      return {
        ...item,
        id,
        position: [item.position[0] + OFFSET[0], item.position[1], item.position[2] + OFFSET[2]] as [number, number, number],
      };
    });

    // Clonar walls con nuevos IDs y offset
    const newWalls = clipboard.walls.map(wall => {
      const id = newId();
      newSelectedIds.push(id);
      return {
        ...wall,
        id,
        start: [wall.start[0] + OFFSET[0], wall.start[1], wall.start[2] + OFFSET[2]] as [number, number, number],
        end: [wall.end[0] + OFFSET[0], wall.end[1], wall.end[2] + OFFSET[2]] as [number, number, number],
      };
    });

    // Clonar líneas con nuevos IDs y offset
    const newLines = clipboard.lines.map(line => {
      const id = newId();
      newSelectedIds.push(id);
      return {
        ...line,
        id,
        start: [line.start[0] + OFFSET[0], line.start[1], line.start[2] + OFFSET[2]] as [number, number, number],
        end: [line.end[0] + OFFSET[0], line.end[1], line.end[2] + OFFSET[2]] as [number, number, number],
      };
    });

    // Clonar rectángulos con nuevos IDs y offset
    const newRects = clipboard.rectangles.map(rect => {
      const id = newId();
      newSelectedIds.push(id);
      return {
        ...rect,
        id,
        start: [rect.start[0] + OFFSET[0], rect.start[1], rect.start[2] + OFFSET[2]] as [number, number, number],
        end: [rect.end[0] + OFFSET[0], rect.end[1], rect.end[2] + OFFSET[2]] as [number, number, number],
      };
    });

    set((state) => ({
      items: [...state.items, ...newItems],
      walls: [...state.walls, ...newWalls],
      lines: [...state.lines, ...newLines],
      rectangles: [...state.rectangles, ...newRects],
      selectedIds: newSelectedIds,
      selectedType: newSelectedIds.length > 1 ? 'group' : (newItems.length > 0 ? 'item' : null),
      project: { ...state.project, isDirty: true },
    }));
  },

  // ─── Agrupación de selección ────────────────────────────────────────────
  groupSelection: (name?: string) => {
    const { selectedIds, groups } = get();
    if (selectedIds.length < 2) return;

    get().saveToHistory();
    const groupId = Math.random().toString(36).substr(2, 9);
    const groupName = name || `Grupo ${groups.length + 1}`;

    set((state) => ({
      groups: [...state.groups, { id: groupId, name: groupName, memberIds: [...selectedIds] }],
      project: { ...state.project, isDirty: true },
    }));
  },

  ungroupSelection: (groupId: string) => {
    get().saveToHistory();
    set((state) => ({
      groups: state.groups.filter(g => g.id !== groupId),
      project: { ...state.project, isDirty: true },
    }));
  },

  selectGroup: (groupId: string) => {
    const group = get().groups.find(g => g.id === groupId);
    if (!group) return;
    set({
      selectedIds: [...group.memberIds],
      selectedType: 'group',
    });
  },

  // ─── Guías ─────────────────────────────────────────────────────────────
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
  },

  fetchQuotes: async () => {
    const { project } = get();
    if (!project.id || project.id === 'default') return;
    
    set({ isLoadingQuotes: true });
    try {
      const response = await projectService.getQuotes(project.id);
      set({ quotes: response, isLoadingQuotes: false });
    } catch (error) {
      console.error('Error fetching quotes:', error);
      set({ quotes: [], isLoadingQuotes: false });
    }
  },

  saveQuote: async (quoteData) => {
    const { project } = get();
    if (!project.id || project.id === 'default') {
        throw new Error('Guarda primero el proyecto para poder emitir una cotización formal');
    }

    set({ isSavingQuote: true });
    try {
      const response = await projectService.saveQuote(project.id, {
        totalAmount: quoteData.total,
        totalItems: quoteData.totalItems,
        priceType: project.priceType || 'A',
        quoteData: quoteData
      });
      
      // Actualizar lista local de quotes
      const quotes = await projectService.getQuotes(project.id);
      set({ quotes, isSavingQuote: false });
      
      return response;
    } catch (error) {
      set({ isSavingQuote: false });
      throw error;
    }
  },

  restoreVersion: async (versionId: string) => {
    const { project } = get();
    if (project.id === 'default') return;
    set((state) => ({ project: { ...state.project, isSaving: true, saveStatus: 'saving' } }));

    try {
      // Fetch historical version payload
      const version = await projectService.getVersion(project.id, versionId);
      const state = version.sceneState;

      const defaultBlueprint = { url: null, position: [0, -0.01, 0] as [number,number,number], scale: 1, rotation: 0, opacity: 0.5, locked: false, visible: true };
      const defaultCalibration = { step: 'idle' as const };

      set({
        items: state.items || [],
        walls: state.walls || [],
        openings: state.openings || [],
        dimensions: state.dimensions || [],
        lines: state.lines || [],
        rectangles: state.rectangles || [],
        faces: state.faces || [],
        volumes: state.volumes || [],
        layers: state.layers || get().layers,
        scenes: state.scenes || [],
        guides: state.guides || [],
        groups: state.groups || [],
        blueprint: state.blueprint || defaultBlueprint,
        calibrationState: state.calibrationState || defaultCalibration,
        project: {
          ...project,
          isDirty: true,
          isSaving: false
        }
      });
      // Force history push and mark as unsaved
      get().saveToHistory();
      
      // Trigger a manual save of the restored state
      await get().saveProject('manual');
    } catch (error) {
       console.error('Failed to restore version', error);
       set((state) => ({ project: { ...state.project, saveStatus: 'error', isSaving: false } }));
       throw error;
    }
  }
}));

// --- Suscripción Global para Autosave ---
useEditorStore.subscribe((state: EditorState) => {
  if (state.project.id === 'default' || state.project.saveStatus === 'unsaved' || state.project.saveStatus === 'saving' || state.project.isSaving) return;

  const currentHash = generateSceneHash(state);
  
  if (state.project.lastSavedHash && currentHash !== state.project.lastSavedHash) {
    useEditorStore.setState((s) => ({
      project: { ...s.project, saveStatus: 'unsaved' }
    }));
  }
});
